/**
 * Smart HID 配网服务
 *
 * 依据 docs/smart-hid/MINIAPP_HID_MODULE.md §10。
 *
 * 对 UI 暴露：
 *   scanSmartHid()       扫描附近 Smart HID（用 Provisioning Service UUID 过滤）
 *   connect(deviceId)    建立 BLE 连接
 *   getDeviceInfo()      读取 hid-info/get_info → Device Info
 *   scanWifi()           触发 ESP32 Wi-Fi Scan
 *   setWifi({ssid,pwd})  写入 Wi-Fi 凭据
 *   setControlHub(info)  写入 ControlHub Pairing 信息
 *   getStatus()          查询 hid-action/get_status
 *
 * 架构约束（§9 BLE 复用）：
 *   Page → hidStore → smartHidService → bleStore / BLE Adapter
 *
 *   本服务不直接调用 uni.writeBLECharacteristicValue 等底层 BLE API，
 *   而是复用 store/ble.js 已有的扫描/连接能力。
 *
 * ⚠️ 真实 Protocomm（ESP32 的自定义 endpoint：hid-info / hub-config / hid-action）
 *    在后续 Phase 3 接入。当前为脚手架占位，函数签名稳定，内部仅做日志与状态写入。
 */

import { useBleStore } from '../../store/ble';
import { useHidStore } from '../../store/hid';
import { logger } from '../../../../core/ble-core/utils/logger';

/**
 * Smart HID Provisioning Service UUID（事实源见 core/protocols/hid-provisioning-protocol.ts）
 * 用于从 BLE 扫描结果中过滤 Smart HID 设备。
 */
import { SMART_HID_PROVISIONING_SERVICE_UUID } from '../../../../core/protocols/hid-provisioning-protocol';

/**
 * 扫描附近 Smart HID 设备。
 * 复用 bleStore.startScan()，再用 Service UUID 过滤；结果写入 hidStore.smartDevices。
 *
 * 注意：不创建第二个扫描器；不直接调 uni.startBluetoothDevicesDiscovery。
 */
export async function scanSmartHid() {
	const bleStore = useBleStore();
	const hidStore = useHidStore();

	logger.info('[SmartHID] scanSmartHid start');
	await bleStore.startScan();

	// 从 bleStore.scannedDevices 过滤出 Smart HID 设备
	// 注：startScan() 在 duration（默认 5s）后 resolve；扫描期间 onBluetoothDeviceFound
	//     持续累积结果到 scannedDevices。真实实现应在扫描期间 watch 该 ref 并实时过滤，
	//     这里仅在扫描结束后取一次快照（脚手架阶段足够，UI 真实接入时改为订阅式）。
	// 真实过滤条件：advertisServiceUUIDs 包含 SMART_HID_PROVISIONING_SERVICE_UUID
	//              或 name 匹配 /^SHID-/i
	const filtered = (bleStore.scannedDevices || []).filter((d) => {
		const uuids = d.advertisServiceUUIDs || [];
		const hasSvc = uuids.some((u) => String(u).toLowerCase() === SMART_HID_PROVISIONING_SERVICE_UUID.toLowerCase());
		const nameMatch = d.name && /^SHID-/i.test(d.name);
		return hasSvc || nameMatch;
	});

	hidStore.setSmartDevices(filtered);
	logger.info(`[SmartHID] scanSmartHid done, found ${filtered.length}`);
	return filtered;
}

/**
 * 建立 BLE 连接。真实实现委托给 BLE Adapter（与 pages/device/detail 同一路径），
 * 不直接调 uni.createBLEConnection。
 */
export async function connect(deviceId) {
	const hidStore = useHidStore();
	logger.info(`[SmartHID] connect ${deviceId}`);
	// 占位：真实实现启用 Smart HID GATT 服务通知，准备 hid-info / hub-config / hid-action endpoint
	hidStore.setCurrentStep(2);
	return { deviceId };
}

/**
 * 读取 Device Info（hid-info/get_info）。
 * 真实实现走 ESP32 Protocomm endpoint。
 */
export async function getDeviceInfo() {
	const hidStore = useHidStore();
	logger.info('[SmartHID] getDeviceInfo');
	// 占位：真实实现解析得到 { product, device_id, hardware, firmware, protocol, configured, usb_hid_ready }
	//       并 hidStore.setCurrentDevice({ ...currentDevice, ...info })
	hidStore.setCurrentStep(2);
	return hidStore.currentDevice;
}

/**
 * 触发 ESP32 Wi-Fi Scan，返回附近 AP 列表。
 */
export async function scanWifi() {
	const hidStore = useHidStore();
	logger.info('[SmartHID] scanWifi');
	// 占位：真实实现 hub-config 或专用 endpoint 触发扫描
	const placeholder = [];
	hidStore.setWifiNetworks(placeholder);
	return placeholder;
}

/**
 * 写入 Wi-Fi 凭据（敏感，仅内存）。
 */
export async function setWifi({ ssid, password }) {
	const hidStore = useHidStore();
	logger.info(`[SmartHID] setWifi ssid=${ssid}`);
	// 占位：真实实现写入 ESP32，ESP32 自行连接 Wi-Fi
	// 失败仅退回 Wi-Fi 步骤（W04），不重做 ControlHub
	hidStore.setProgress('wifi', 'active');
	return { ok: true };
}

/**
 * 写入 ControlHub Pairing 信息（来自动态 QR，token 一次性短期）。
 */
export async function setControlHub(info) {
	const hidStore = useHidStore();
	logger.info(`[SmartHID] setControlHub hub_id=${info?.hub_id}`);
	// 占位：真实实现写入 hub-config endpoint
	// Pair Token 过期 / 已用 / 拒绝 时只重新获取 ControlHub QR（W03）
	hidStore.setHubInfo(info);
	return { ok: true };
}

/**
 * 查询设备当前状态（hid-action/get_status）。
 */
export async function getStatus() {
	const hidStore = useHidStore();
	logger.info('[SmartHID] getStatus');
	// 占位：真实实现返回 Wi-Fi / Hub / ControlConnection / USB 配置状态
	//       微信切后台恢复后重新连接并 GET STATUS
	return hidStore.diagnostic;
}

/**
 * Smart HID 服务（聚合导出，便于按需 import 单个函数）
 */
export const smartHidService = {
	scanSmartHid,
	connect,
	getDeviceInfo,
	scanWifi,
	setWifi,
	setControlHub,
	getStatus
};

export default smartHidService;
