/**
 * Smart HID 第一方 Profile 服务。
 *
 * 本文件只承载 Smart HID 的会话、状态和业务流程；通用 BLE 生命周期、全局
 * callback、GATT 原语由 services/ble-runtime 与 provisioning/transport 负责。
 * 连接/写 candidate 走通用 orchestrator，便于后续多型号复用。
 */

import { watch } from 'vue';
import { useBleStore } from '../../store/ble';
import { useHidStore } from '../../store/hid';
import { createLogger } from '../logger/log-redaction.js';
import { utf8Decode } from '../../../../core/ble-core/provisioning/framing.js';
import {
  readChar,
  subscribe,
  unsubscribe
} from '../provisioning/transport.js';
import {
  connectProfileSession,
  runProvisionTransaction,
  writeProfileCandidate
} from '../provisioning/orchestrator.js';
import { getProfile, matchScannedDevices } from '../provisioning/profiles.js';
import { SMART_HID_PROFILE_ID } from './profile.js';
import { createSmartHidStatusWaiters } from './workflow.js';
import { createSmartHidWorkflow } from './workflow-engine.js';
import { runDiagnostic } from './diagnostic.js';
import { HID_ERROR_CODE, createHidError } from './errors.js';

const logger = createLogger('smart-hid');
let session = null;
let onStatusCb = null;
let onInfoCb = null;
const statusWaiters = createSmartHidStatusWaiters();
const sessionDisconnectListeners = new Set();

/** 订阅 Smart HID BLE 会话意外断开（主动 disconnect 不触发），供向导等 UI 即时反馈。 */
export function onSessionDisconnect(callback) {
  if (typeof callback !== 'function') throw new Error('disconnect listener must be a function');
  sessionDisconnectListeners.add(callback);
  return () => sessionDisconnectListeners.delete(callback);
}

function releaseSessionCallbacks() {
  if (onStatusCb) {
    unsubscribe(onStatusCb);
    onStatusCb = null;
  }
  if (onInfoCb) {
    unsubscribe(onInfoCb);
    onInfoCb = null;
  }
}

function bindSmartHidConnectedStore(deviceId, connectedSession, info = null) {
  const bleStore = useBleStore();
  const hidStore = useHidStore();
  const current = hidStore.currentDevice || {};
  bleStore.bindConnectedSession({
    deviceId,
    name: current.name || info?.device_id || 'Smart HID',
    RSSI: current.RSSI ?? 0,
    profileId: SMART_HID_PROFILE_ID
  }, connectedSession, connectedSession.services || []);
  hidStore.setSessionOnline?.(true);
}

function notifyPassiveDisconnect(reason) {
  for (const callback of [...sessionDisconnectListeners]) {
    try {
      callback(reason);
    } catch (error) {
      logger.error('session disconnect listener failed', error);
    }
  }
}

function handleSessionDisconnect(connected, reason = 'BLE 连接已断开') {
  if (session !== connected) return;
  session = null;
  releaseSessionCallbacks();
  statusWaiters.failAll(reason);
  const hidStore = useHidStore();
  hidStore.setLastError({ code: 'ble_disconnected', message: reason });
  hidStore.setSessionOnline?.(false);
  if (connected?.deviceId) {
    useBleStore().updateDeviceConnectionStatus(connected.deviceId, false);
  }
  notifyPassiveDisconnect(reason);
}

function profile() {
  const value = getProfile(SMART_HID_PROFILE_ID);
  if (!value) throw new Error('Smart HID Profile 未注册');
  return value;
}

function characteristic(alias) {
  const uuid = profile().characteristics[alias];
  if (!uuid) throw new Error(`Smart HID Profile 缺少特征 ${alias}`);
  return uuid;
}

function handleStatusValue(value) {
  const status = profile().codec.parseStatus(value);
  if (!status?.state) {
    logger.warn(`[SmartHID] status 解析失败: ${utf8Decode(value).slice(0, 80)}`);
    return;
  }
  useHidStore().applyProvisionStatus(status);
  statusWaiters.emit(status);
}

function handleInfoValue(value) {
  const info = profile().codec.parseDeviceInfo(value);
  if (!info) return;
  useHidStore().setCurrentDevice({ ...(useHidStore().currentDevice || {}), ...info });
}

export function waitForStatus(predicate, timeoutMs = 60000) {
  return statusWaiters.waitFor(predicate, timeoutMs);
}

/**
 * 扫描附近 Smart HID。扫描结果变化时持续更新 hidStore，直到本轮通用扫描结束。
 */
export async function scanSmartHid() {
  const bleStore = useBleStore();
  const hidStore = useHidStore();
  const refresh = () => {
    const matched = matchScannedDevices(bleStore.scannedDevices || []);
    hidStore.setSmartDevices(matched.map(({ device, profile: matchedProfile, matchLevel }) => ({
      ...device,
      profileId: matchedProfile.id,
      profileMatch: matchLevel
    })));
  };

  logger.info('[SmartHID] scanSmartHid start');
  const stopWatch = watch(() => bleStore.scannedDevices, refresh, { deep: true });
  try {
    const result = await bleStore.startScan(5000, 'smart-hid');
    if (!result?.ok) throw result?.error || new Error('Smart HID 扫描失败');
    refresh();
    logger.info(`[SmartHID] scanSmartHid done, found ${hidStore.smartDevices.length}`);
    return hidStore.smartDevices;
  } finally {
    stopWatch();
  }
}

/** 建立 Smart HID GATT 会话、订阅 info/status，并确认 Device Info 身份。 */
export async function connect(deviceId) {
  const selectedProfile = profile();
  logger.info(`[SmartHID] connect ${deviceId}`);

  if (session && !session.dead) {
    if (session.deviceId === deviceId) {
      try {
        const info = await getDeviceInfo();
        if (!selectedProfile.verifyDeviceInfo(info)) throw new Error('目标设备不是兼容的 Smart HID Profile');
        bindSmartHidConnectedStore(deviceId, session, info);
        return { deviceId, info };
      } catch (error) {
        await disconnect().catch(() => {});
        throw error;
      }
    }
    await disconnect();
  }

  const connected = await connectProfileSession(deviceId, selectedProfile);
  session = connected;

  try {
    if (onStatusCb) unsubscribe(onStatusCb);
    if (onInfoCb) unsubscribe(onInfoCb);
    onStatusCb = handleStatusValue;
    onInfoCb = handleInfoValue;
    await subscribe(connected, characteristic('STATUS'), onStatusCb);
    await subscribe(connected, characteristic('INFO'), onInfoCb);

    connected.onDisconnect(() => handleSessionDisconnect(connected));

    const info = await getDeviceInfo();
    if (!selectedProfile.verifyDeviceInfo(info)) {
      throw new Error('目标设备不是兼容的 Smart HID Profile，已断开连接');
    }
    bindSmartHidConnectedStore(deviceId, connected, info);
    return { deviceId, info };
  } catch (error) {
    if (session === connected) await disconnect().catch(() => {});
    else if (!connected.dead) await connected.close().catch(() => {});
    throw error;
  }
}

export async function getDeviceInfo() {
  const hidStore = useHidStore();
  if (!session) return hidStore.currentDevice;
  const text = await readChar(session, characteristic('INFO'));
  const info = profile().codec.parseDeviceInfo(text);
  if (!info) {
    logger.warn(`[SmartHID] info 解析失败: ${String(text).slice(0, 80)}`);
    return hidStore.currentDevice;
  }
  hidStore.setCurrentDevice({ ...(hidStore.currentDevice || {}), ...info });
  logger.info(`[SmartHID] device ${info.device_id} fw=${info.firmware} state=${info.state}`);
  return info;
}

/** 单次分帧写入 candidate；候选字节由 Smart HID Profile codec 生成。 */
export async function provisionCandidate(input, options = {}) {
  const hidStore = useHidStore();
  if (!session || session.dead) throw new Error('BLE 未连接');

  hidStore.setLastError(null);
  try {
    const result = await writeProfileCandidate(session, profile(), input, {
      beforeWrite: options.beforeWrite
    });
    logger.info(`[SmartHID] provision candidate ${result.bytes}B → ${result.frames} 帧 (mtu=${session.mtu}, framing=${result.framing})`);
    return result;
  } catch (error) {
    hidStore.setLastError({ code: error?.kind || 'write_failed', message: error?.tip || error?.message });
    throw error;
  }
}

/** 必须在 provisionCandidate 前调用，避免设备快速 status 在 waiter 建立前丢失。 */
export function waitForProvisionResult(timeoutMs = 60000) {
  return waitForStatus(
    (status) => profile().workflow.classifyStatus(status).terminal,
    timeoutMs
  ).then((status) => ({
    ok: status.state === 'ready' && status.error == null,
    status
  }));
}

export function provisionAndWait(input, timeoutMs = 60000) {
  return runProvisionTransaction({
    createWaiter: () => waitForProvisionResult(timeoutMs),
    writeCandidate: (waiter) => provisionCandidate(input, { beforeWrite: () => waiter })
  });
}

export async function getStatus() {
  if (!session) return null;
  const text = await readChar(session, characteristic('STATUS'));
  const status = profile().codec.parseStatus(text);
  if (status) useHidStore().applyProvisionStatus(status);
  return status;
}

export function getSessionState() {
  return {
    connected: Boolean(session && !session.dead),
    deviceId: session && !session.dead ? session.deviceId : ''
  };
}

/** 供 UI 判断当前 Smart HID GATT 是否仍可用（重试下发前是否需要重连）。 */
export function isConnected() {
  return getSessionState().connected;
}

/** Smart HID 专属诊断映射；通用 Runtime 只提供连接与读写能力。 */
export async function diagnose() {
  const hidStore = useHidStore();
  const items = [
    { key: 'ble', label: 'BLE', state: session ? 'ok' : 'fail', detail: session ? '已连接' : '未连接（请重新连接设备）' },
    { key: 'wifi', label: 'Wi-Fi', state: 'pending', detail: '' },
    { key: 'hub', label: 'ControlHub', state: 'pending', detail: '' },
    { key: 'conn', label: '控制连接 (MQTT)', state: 'pending', detail: '' },
    { key: 'usb', label: '设备 Ready 状态', state: 'pending', detail: 'BLE 状态不等同于 USB HID 真机验收' }
  ];
  if (!session) {
    hidStore.setDiagnostic(items);
    return items;
  }

  const [info, status] = await Promise.all([getDeviceInfo().catch(() => null), getStatus().catch(() => null)]);
  const state = status?.state || '';
  const step = status?.step || '';
  const error = status?.error || null;
  const wifiReady = ['wifi_connected', 'pairing', 'pairing_success', 'mqtt_connecting', 'ready'].includes(step) || ['pairing', 'mqtt_connecting', 'ready'].includes(state);
  const hubReady = ['pairing_success', 'mqtt_connecting', 'ready'].includes(step) || ['mqtt_connecting', 'ready'].includes(state);

  items[1].state = error === 'wifi_failed' ? 'fail' : wifiReady ? 'ok' : state === 'connecting_wifi' ? 'active' : 'warn';
  items[2].state = ['pairing_invalid', 'pairing_expired', 'pairing_used', 'controlhub_unreachable'].includes(error) ? 'fail' : hubReady ? 'ok' : state === 'pairing' ? 'active' : 'warn';
  items[3].state = error === 'mqtt_invalid' ? 'fail' : state === 'ready' ? 'ok' : state === 'mqtt_connecting' ? 'active' : 'warn';
  items[4].state = state === 'ready' ? 'ok' : state ? 'warn' : 'pending';
  if (error) {
    const failed = items.find((item) => item.state === 'fail');
    if (failed) failed.detail = error;
  }
  if (info) items[0].detail = `${info.device_id} fw=${info.firmware} state=${info.state}${info.provisioned ? ' (已配网)' : ''}`;
  hidStore.setDiagnostic(items);
  return items;
}

export function cancelProvisionWait(reason = '用户已取消等待') {
  statusWaiters.failAll(reason);
}

export async function disconnect() {
  statusWaiters.failAll('BLE 已主动断开');
  releaseSessionCallbacks();
  useHidStore().setSessionOnline?.(false);
  if (session) {
    const active = session;
    const deviceId = active.deviceId;
    session = null;
    await active.close();
    logger.info('[SmartHID] disconnected');
    if (deviceId) useBleStore().updateDeviceConnectionStatus(deviceId, false);
  }
}

export const smartHidService = {
  scanSmartHid,
  connect,
  getDeviceInfo,
  provisionCandidate,
  provisionAndWait,
  waitForProvisionResult,
  waitForStatus,
  cancelProvisionWait,
  getStatus,
  getSessionState,
  isConnected,
  diagnose,
  onSessionDisconnect,
  disconnect,
  parsePairingQrPayload: (text) => profile().parseQr?.(text) || null,
  createSmartHidWorkflow,
  runDiagnostic,
  HID_ERROR_CODE,
  createHidError,
};

export {
  createSmartHidWorkflow,
  runDiagnostic,
  HID_ERROR_CODE,
  createHidError,
};

export default smartHidService;
