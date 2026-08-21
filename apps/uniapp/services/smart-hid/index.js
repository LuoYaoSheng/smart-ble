/**
 * Smart HID 配网服务（基于通用配网框架的真实实现）
 *
 * 协议事实源：core/protocols/hid-provisioning-protocol.ts
 * （镜像 Smart-HID-Workspace protocols/ble/PROVISIONING_V1.md，V1 正典）
 *
 * V1 要点（与 2026-08-11 脚手架的差异）：
 *   - 三 GATT 特征（info 读+notify / input 加密写 / status 读+notify），
 *     不再有 Protocomm 字符串 endpoint
 *   - 配网候选为**单次分帧写入**：{v,wifi_ssid,wifi_password,hub_host,hub_port,token}
 *     ——不存在 setWifi / setControlHub 两段式（v1.1 旧设计，已废弃）
 *   - MQTT 凭据不经过小程序：设备连 Wi-Fi 后拿 token 调 ControlHub
 *     配对接口，凭据在响应里签发给设备
 *   - 错误码为稳定字符串（invalid_payload / pairing_expired / ...）
 *
 * 架构：Page → hidStore → smartHidService → provisioning 框架（transport/profiles）
 *      → store/ble.js（扫描）。GATT 原语统一收敛在框架层。
 */

import { useBleStore } from '../../store/ble';
import { useHidStore } from '../../store/hid';
import { logger } from '../../../../core/ble-core/utils/logger';

import {
	SMART_HID_PROVISIONING_SERVICE_UUID,
	SMART_HID_CHARACTERISTIC_UUIDS,
	SMART_HID_NAME_PREFIX,
	buildProvisionCandidateJson,
	parseDeviceInfo,
	parseProvisionStatus,
	parsePairingQrPayload
} from '../../../../core/protocols/hid-provisioning-protocol';

import {
	connect as gattConnect,
	subscribe,
	unsubscribe,
	readChar,
	writeFrames,
	utf8Encode,
	utf8Decode
} from '../provisioning/transport';
import { chunkSizeForMtu, buildFrames } from '../../../../core/ble-core/provisioning/framing';
import { defineProvisioningProfile, matchScannedDevices, getProfile } from '../provisioning/profiles';

/* ---------------- Smart HID 档案注册（首个 profile） ---------------- */

const PROFILE_ID = 'smart-hid';

defineProvisioningProfile({
	id: PROFILE_ID,
	serviceUuid: SMART_HID_PROVISIONING_SERVICE_UUID,
	characteristics: SMART_HID_CHARACTERISTIC_UUIDS,
	namePrefix: SMART_HID_NAME_PREFIX,
	notifyUuids: [SMART_HID_CHARACTERISTIC_UUIDS.INFO, SMART_HID_CHARACTERISTIC_UUIDS.STATUS],
	mtu: 247,
	parseQr: parsePairingQrPayload
});

/* ---------------- 会话与状态路由 ---------------- */

/** 当前 GATT 会话（单设备配网场景，模块级单例足够） */
let session = null;

/** status notify 处理器（挂到 store） */
let onStatusCb = null;
/** info notify 处理器（设备状态变化时 info 也会 notify） */
let onInfoCb = null;
/** 一次性等待者：等待状态满足谓词 */
const waiters = [];

function fireWaiters(status) {
	for (let i = waiters.length - 1; i >= 0; i--) {
		const w = waiters[i];
		let done = false;
		try { done = w.predicate(status); } catch (e) { /* 谓词异常视为不满足 */ }
		if (done) {
			waiters.splice(i, 1);
			clearTimeout(w.timer);
			w.resolve(status);
		}
	}
}

/** BLE 断链：清空全部等待者（避免挂到超时） */
function failAllWaiters(reason) {
	while (waiters.length) {
		const w = waiters.shift();
		clearTimeout(w.timer);
		w.reject(new Error(reason));
	}
}

function handleStatusValue(buf) {
	const text = utf8Decode(buf);
	const status = parseProvisionStatus(text);
	if (!status) {
		logger.warn(`[SmartHID] status 解析失败: ${text.slice(0, 80)}`);
		return;
	}
	const hidStore = useHidStore();
	hidStore.applyProvisionStatus(status);
	fireWaiters(status);
}

function handleInfoValue(buf) {
	const info = parseDeviceInfo(utf8Decode(buf));
	if (!info) return;
	const hidStore = useHidStore();
	hidStore.setCurrentDevice({ ...(hidStore.currentDevice || {}), ...info });
}

/**
 * 等待设备状态满足条件（由 status notify 驱动）。
 * @param {(s:object)=>boolean} predicate
 * @param {number} timeoutMs
 * @returns {Promise<object>} 满足时的 status
 */
export function waitForStatus(predicate, timeoutMs = 60000) {
	return new Promise((resolve, reject) => {
		const w = { predicate, resolve, timer: null };
		w.timer = setTimeout(() => {
			const idx = waiters.indexOf(w);
			if (idx >= 0) waiters.splice(idx, 1);
			reject(new Error(`等待设备状态超时（${timeoutMs}ms）`));
		}, timeoutMs);
		waiters.push(w);
	});
}

/* ---------------- 公开能力 ---------------- */

/**
 * 扫描附近 Smart HID 设备（通用框架按 profile 匹配：serviceUuid 或 SHID- 名前缀）。
 */
export async function scanSmartHid() {
	const bleStore = useBleStore();
	const hidStore = useHidStore();

	logger.info('[SmartHID] scanSmartHid start');
	await bleStore.startScan();

	const matched = matchScannedDevices(bleStore.scannedDevices || []);
	const devices = matched.map(({ device }) => device);
	hidStore.setSmartDevices(devices);
	logger.info(`[SmartHID] scanSmartHid done, found ${devices.length}`);
	return devices;
}

/**
 * 建立 GATT 连接：服务/特征发现 + MTU + notify 订阅 + 读 Device Info。
 * 解析结果合并进 hidStore.currentDevice。
 */
export async function connect(deviceId) {
	const hidStore = useHidStore();
	const profile = getProfile(PROFILE_ID);
	logger.info(`[SmartHID] connect ${deviceId}`);

	session = await gattConnect(deviceId, {
		serviceUuid: profile.serviceUuid,
		characteristicUuids: Object.values(profile.characteristics),
		mtu: profile.mtu,
		notifyUuids: profile.notifyUuids
	});

	if (onStatusCb) unsubscribe(SMART_HID_CHARACTERISTIC_UUIDS.STATUS, onStatusCb);
	if (onInfoCb) unsubscribe(SMART_HID_CHARACTERISTIC_UUIDS.INFO, onInfoCb);
	onStatusCb = handleStatusValue;
	onInfoCb = handleInfoValue;
	await subscribe(session, SMART_HID_CHARACTERISTIC_UUIDS.STATUS, onStatusCb);
	await subscribe(session, SMART_HID_CHARACTERISTIC_UUIDS.INFO, onInfoCb);

	session.onDisconnect(() => {
		session = null;
		failAllWaiters('BLE 连接已断开');
		hidStore.setLastError({ code: 'ble_disconnected', message: 'BLE 连接已断开' });
	});

	const info = await getDeviceInfo();
	hidStore.setCurrentStep(2);
	return { deviceId, info };
}

/** 读取 Device Info 特征 → 解析 → 存 store */
export async function getDeviceInfo() {
	const hidStore = useHidStore();
	if (!session) return hidStore.currentDevice;
	const text = await readChar(session, SMART_HID_CHARACTERISTIC_UUIDS.INFO);
	const info = parseDeviceInfo(text);
	if (!info) {
		logger.warn(`[SmartHID] info 解析失败: ${String(text).slice(0, 80)}`);
		return hidStore.currentDevice;
	}
	hidStore.setCurrentDevice({ ...(hidStore.currentDevice || {}), ...info });
	logger.info(`[SmartHID] device ${info.device_id} fw=${info.firmware} state=${info.state}`);
	return info;
}

/**
 * 下发配网候选（单次分帧写入 Provision Input）。
 *
 * 仅负责写入；设备随后的 connecting_wifi → pairing → mqtt_connecting → ready
 * 由 status notify 驱动（页面用 waitForStatus / hidStore.progress 观察）。
 *
 * 加密链路：写入特征要求加密（NimBLE bonding Just Works）。Android 首次
 * 写入可能因未配对失败并触发系统配对弹窗——失败 kind=encrypt 时等 2s 重试一次。
 */
export async function provisionCandidate(input) {
	const hidStore = useHidStore();
	if (!session || session.dead) throw new Error('BLE 未连接');

	const json = buildProvisionCandidateJson(input); // 校验失败抛错（含中文原因）
	hidStore.setLastError(null);

	const bytes = utf8Encode(json);
	const frames = buildFrames(bytes, chunkSizeForMtu(session.mtu));
	logger.info(`[SmartHID] provision candidate ${bytes.length}B → ${frames.length} 帧 (mtu=${session.mtu})`);

	try {
		await writeFrames(session, SMART_HID_CHARACTERISTIC_UUIDS.INPUT, frames);
	} catch (e) {
		if (e && e.kind === 'encrypt') {
			// Android：首次加密写触发系统配对弹窗，等用户确认后重试一次
			logger.warn('[SmartHID] 加密写失败，等待系统配对后重试');
			await new Promise((r) => setTimeout(r, 2000));
			await writeFrames(session, SMART_HID_CHARACTERISTIC_UUIDS.INPUT, frames);
		} else {
			hidStore.setLastError({ code: e.kind || 'write_failed', message: e.tip || e.message });
			throw e;
		}
	}
	return { ok: true, frames: frames.length, bytes: bytes.length };
}

/**
 * 等待配网结果：ready 或任一 error（或 recovery/error 状态）。
 * @returns {Promise<{ok:boolean, status:object}>}
 */
export function waitForProvisionResult(timeoutMs = 60000) {
	return waitForStatus(
		(s) => s.state === 'ready' || s.state === 'error' || s.state === 'recovery' || s.error != null,
		timeoutMs
	).then((status) => ({ ok: status.state === 'ready' && status.error == null, status }));
}

/** 读 Provision Status 特征 */
export async function getStatus() {
	if (!session) return null;
	const text = await readChar(session, SMART_HID_CHARACTERISTIC_UUIDS.STATUS);
	const status = parseProvisionStatus(text);
	if (status) useHidStore().applyProvisionStatus(status);
	return status;
}

/**
 * 诊断：读取 info + status，映射为诊断行（diagnostics.vue 消费）。
 * 需要先 connect；未连接时返回 BLE 待检测行。
 */
export async function diagnose() {
	const hidStore = useHidStore();
	const items = [
		{ key: 'ble', label: 'BLE', state: session ? 'ok' : 'fail', detail: session ? '已连接' : '未连接（请重新连接设备）' },
		{ key: 'wifi', label: 'Wi-Fi', state: 'pending', detail: '' },
		{ key: 'hub', label: 'ControlHub', state: 'pending', detail: '' },
		{ key: 'conn', label: '控制连接 (MQTT)', state: 'pending', detail: '' },
		{ key: 'usb', label: 'USB HID', state: 'pending', detail: '' }
	];
	if (!session) {
		hidStore.setDiagnostic(items);
		return items;
	}
	const [info, status] = await Promise.all([getDeviceInfo().catch(() => null), getStatus().catch(() => null)]);
	const st = status ? status.state : '';
	const err = status ? status.error : null;

	// 状态机 → 四行映射（V1 无 USB 实时值；ready 即视为全链路就绪）
	const wifiState = (s) => (s === 'ready' || s === 'mqtt_connecting' || s === 'pairing' ? 'ok'
		: s === 'connecting_wifi' ? 'active'
		: err === 'wifi_failed' ? 'fail' : 'warn');
	const hubState = (s) => (s === 'ready' || s === 'mqtt_connecting' || s === 'pairing_success' ? 'ok'
		: s === 'pairing' ? 'active'
		: err === 'pairing_invalid' || err === 'pairing_expired' || err === 'pairing_used' || err === 'controlhub_unreachable' ? 'fail' : 'warn');
	const connState = (s) => (s === 'ready' ? 'ok'
		: s === 'mqtt_connecting' ? 'active'
		: err === 'mqtt_invalid' ? 'fail' : (s ? 'warn' : 'pending'));
	const usbState = (s) => (s === 'ready' ? 'ok' : (s ? 'warn' : 'pending'));

	items[1].state = status ? wifiState(st) : 'pending';
	items[2].state = status ? hubState(st) : 'pending';
	items[3].state = status ? connState(st) : 'pending';
	items[4].state = status ? usbState(st) : 'pending';
	if (err) {
		const hit = items.find((it) => it.state === 'fail');
		if (hit) hit.detail = err;
	}
	if (info) items[0].detail = `${info.device_id} fw=${info.firmware} state=${info.state}${info.provisioned ? ' (已配网)' : ''}`;
	hidStore.setDiagnostic(items);
	return items;
}

/** 断开当前会话 */
export async function disconnect() {
	failAllWaiters('BLE 已主动断开');
	if (onStatusCb) {
		unsubscribe(SMART_HID_CHARACTERISTIC_UUIDS.STATUS, onStatusCb);
		onStatusCb = null;
	}
	if (onInfoCb) {
		unsubscribe(SMART_HID_CHARACTERISTIC_UUIDS.INFO, onInfoCb);
		onInfoCb = null;
	}
	if (session) {
		const s = session;
		session = null;
		await s.close();
		logger.info('[SmartHID] disconnected');
	}
}

/**
 * Smart HID 服务（聚合导出）
 * 注意：旧版的 scanWifi / setWifi / setControlHub 已随 V1 单次 candidate
 * 写入移除（协议事实变化，见文件头）。
 */
export const smartHidService = {
	scanSmartHid,
	connect,
	getDeviceInfo,
	provisionCandidate,
	waitForProvisionResult,
	waitForStatus,
	getStatus,
	diagnose,
	disconnect,
	parsePairingQrPayload
};

export default smartHidService;
