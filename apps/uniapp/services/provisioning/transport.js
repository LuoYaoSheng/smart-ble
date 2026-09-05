/**
 * 通用 BLE Provisioning Transport。
 *
 * 设备无关的 GATT 生命周期由 ble-runtime 统一维护；本层只把 Profile 的
 * service/characteristic 选择投影成配网所需的简洁 API。
 */

import { utf8Decode, utf8Encode } from '../../../../core/ble-core/provisioning/framing.js';
import {
  connectDevice,
  listen as runtimeListen,
  readValue,
  setNotifyEnabled,
  writeValue as runtimeWriteValue
} from '../ble-runtime/index.js';

const callbackUnsubscribers = new Map();
const normalize = (value) => String(value || '').toLowerCase();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function charFor(session, charUuid) {
  const char = session.chars?.[normalize(charUuid)];
  if (!char) throw new Error(`配网特征缺失：${charUuid}`);
  return char.uuid;
}

/**
 * 建立配网 GATT 会话：连接、服务/特征确认、MTU 协商、可选 notify 开关。
 */
export async function connect(deviceId, options = {}) {
  const {
    serviceUuid,
    characteristicUuids = [],
    mtu = 247,
    notifyUuids = []
  } = options;

  const session = await connectDevice(deviceId, { mtu, timeout: 10000, expectedServiceUuid: serviceUuid });
  const service = session.services.find((item) => normalize(item.uuid) === normalize(serviceUuid));
  if (!service) {
    await session.close();
    throw new Error('目标设备上未找到配网服务（UUID 不匹配或设备固件过旧）');
  }

  const chars = Object.fromEntries((service.characteristics || []).map((char) => [normalize(char.uuid), char]));
  const missing = characteristicUuids.map(normalize).filter((uuid) => !chars[uuid]);
  if (missing.length) {
    await session.close();
    throw new Error(`配网特征缺失：${missing.join(', ')}`);
  }

  session.serviceId = service.uuid;
  session.chars = chars;
  try {
    for (const uuid of notifyUuids) {
      await setNotifyEnabled(session, session.serviceId, charFor(session, uuid), true);
    }
  } catch (error) {
    await session.close().catch(() => {});
    throw error;
  }
  return session;
}

/** 订阅特征值变化；callback 与 session 绑定，避免同 UUID 跨设备串线。 */
export async function subscribe(session, charUuid, callback) {
  const unsubscribe = runtimeListen(session, session.serviceId, charFor(session, charUuid), callback);
  if (typeof callback === 'function') callbackUnsubscribers.set(callback, unsubscribe);
  return unsubscribe;
}

/**
 * 兼容旧签名 unsubscribe(charUuid, callback)，同时支持新签名
 * unsubscribe(session, charUuid, callback)。实际解绑始终由 callback 对应 session 完成。
 */
export function unsubscribe(sessionOrCharUuid, charUuidOrCallback, maybeCallback) {
  const callback = typeof sessionOrCharUuid === 'function'
    ? sessionOrCharUuid
    : maybeCallback || charUuidOrCallback;
  if (typeof callback !== 'function') return;
  const unsubscribe = callbackUnsubscribers.get(callback);
  if (unsubscribe) {
    callbackUnsubscribers.delete(callback);
    unsubscribe();
  }
}

/** 读特征并按 UTF-8 解码。 */
export async function readChar(session, charUuid, timeoutMs = 3000) {
  const value = await readValue(session, session.serviceId, charFor(session, charUuid), timeoutMs);
  return utf8Decode(value);
}

/** 写单个值（默认带响应写）。 */
export async function writeValue(session, charUuid, bytes) {
  if (session.dead) throw new Error('BLE 连接已断开');
  const value = bytes instanceof ArrayBuffer
    ? bytes
    : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  try {
    await runtimeWriteValue(session, session.serviceId, charFor(session, charUuid), value);
  } catch (error) {
    throw normalizeWriteError(error);
  }
}

/** 顺序写入帧序列，避免连续写压垮部分 Android BLE 栈。 */
export async function writeFrames(session, charUuid, frames, options = {}) {
  const { intervalMs = 30 } = options;
  for (let index = 0; index < frames.length; index++) {
    if (index > 0 && intervalMs > 0) await sleep(intervalMs);
    await writeValue(session, charUuid, frames[index]);
  }
}

/** 写失败归类，供 Profile 以统一方式提示用户。 */
export function normalizeWriteError(error) {
  const message = String((error && (error.errMsg || error.message)) || '');
  const normalized = new Error(`写特征失败: ${message}`);
  if (/encrypt|auth|pair|bond|139|10006|10007/i.test(message)) {
    normalized.kind = 'encrypt';
    // V1 简化（2026-09-05）后 INPUT 为明文 write；此错误意味着设备固件
    // 仍是旧加密模型（未重烧），提示升级固件而不是引导用户去配对。
    normalized.tip = '设备固件为旧加密模型（要求配对），请重烧 V1 简化固件后重试';
  } else if (/disconnect|10008|not connect/i.test(message)) {
    normalized.kind = 'disconnect';
    normalized.tip = 'BLE 连接已断开，请重新连接设备';
  } else {
    normalized.kind = 'write';
    normalized.tip = `写入失败：${message}`;
  }
  return normalized;
}

export { utf8Decode, utf8Encode };
