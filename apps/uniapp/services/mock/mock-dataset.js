/**
 * MOCK 数据集 —— H5 视觉/状态走查专用（假数据通道，2026-09-11 UI 全面轮）。
 *
 * 来源口径：docs/specs/prototype/v1-new/mock-data/mock.js（正典演示数据集）。
 * 差异：设备对象按 uniapp 运行时形态构造（platform 原始字段 → normalizeAdvertisement
 * 归一化 + attachDeviceDisplayName），保证走真实渲染管线而非旁路注入展示结构。
 *
 * 作用域铁律：仅 services/mock/ 消费；mp-weixin / app 构建经条件编译整体剥离，
 * 生产逻辑（store/services）不得 import 本文件。
 */

import { normalizeAdvertisement } from '../ble-runtime/advertisement.js';
import { attachDeviceDisplayName } from '../ble-runtime/display-name.js';

/** 平台原始形态设备（与 onDiscovery 回调入参同构） */
const RAW_SCAN_DEVICES = [
	{
		// SHID 强匹配：广播 Smart HID 配网服务 UUID
		deviceId: 'SHID-9F3E2A1C',
		name: 'SHID-9F3E2A1C',
		RSSI: -52,
		advertisServiceUUIDs: ['9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04'],
		advertisData: '0201060E09534849442D3946334532413143',
		manufacturerData: [{ manufacturerId: 0x4C00, manufacturerSpecificData: '1005090A1800' }]
	},
	{
		deviceId: 'D8:A6:3A:41:F2:09',
		name: 'Mi Smart Band 8',
		RSSI: -66,
		advertisServiceUUIDs: [],
		advertisData: '0201061009' + asciiHex('Mi Smart Band 8')
	},
	{
		// 未命名设备：触发「未命名 BLE · ID后四位」兜底链
		deviceId: 'EF:6B:12:0C:AA:77',
		name: '',
		RSSI: -78,
		advertisServiceUUIDs: [],
		advertisData: '020106020A04'
	},
	{
		// SHID 弱匹配：名称前缀命中、无配网服务 UUID
		deviceId: 'SHID-BENCH-02',
		name: 'SHID-BENCH-02',
		RSSI: -59,
		advertisServiceUUIDs: ['0000ffe0-0000-1000-8000-00805f9b34fb'],
		advertisData: '0201060C09534849442D42454E43482D3032',
		serviceData: { FFE0: '0001' }
	},
	{
		// ESP32 演示 Profile：namePrefix 命中
		deviceId: 'BLEToolkit-Server',
		name: 'BLEToolkit-Server',
		RSSI: -47,
		advertisServiceUUIDs: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'],
		advertisData: '0201061109' + asciiHex('BLEToolkit-Server')
	},
	{
		// 无广播负载数据（advertisement 字段缺失态）
		deviceId: 'C4:11:9E:02:3B:5F',
		name: '',
		RSSI: -85
	}
];

/** ASCII → hex 字符串（构造名称类 advertisData 用） */
function asciiHex(text) {
	return [...text].map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** 归一化后的扫描设备（生产管线同构） */
export const scanDevices = RAW_SCAN_DEVICES.map((raw) =>
	attachDeviceDisplayName({
		...raw,
		connected: false,
		advertisement: normalizeAdvertisement(raw)
	})
);

/** P007 已连接会话（connectedDevicesMap 值形态） */
export const connectedSessions = [
	{
		deviceId: 'D8:A6:3A:41:F2:09',
		name: 'Mi Smart Band 8',
		RSSI: -66,
		isConnected: true,
		profileId: '',
		services: [],
		meta: '已连接 · 可进行 GATT 调试'
	},
	{
		deviceId: 'BLEToolkit-Server',
		name: 'BLEToolkit-Server',
		RSSI: -47,
		isConnected: true,
		profileId: 'esp32-demo',
		services: [],
		meta: '已连接 · 可进行 GATT 调试'
	},
	{
		deviceId: 'SHID-9F3E2A1C',
		name: 'SHID-9F3E2A1C',
		RSSI: -52,
		isConnected: true,
		profileId: 'smart-hid',
		services: [],
		meta: '已连接 · Smart HID 配网会话'
	}
];

/** P006 GATT 服务树（4 服务 7 特征，SIG 标准名 + OTA 服务；运行时 services 形态） */
export const gattServices = [
	{
		uuid: '00001800-0000-1000-8000-00805f9b34fb',
		name: '通用访问',
		characteristics: [
			{ uuid: '00002a00-0000-1000-8000-00805f9b34fb', name: '设备名', properties: { read: true } },
			{ uuid: '00002a01-0000-1000-8000-00805f9b34fb', name: '外观', properties: { read: true } }
		]
	},
	{
		uuid: '0000180f-0000-1000-8000-00805f9b34fb',
		name: '电池服务',
		characteristics: [
			{ uuid: '00002a19-0000-1000-8000-00805f9b34fb', name: '电量', properties: { read: true, notify: true } }
		]
	},
	{
		uuid: '4fafc201-1fb5-459e-8fcc-c5c9c331914d',
		name: 'OTA 服务',
		characteristics: [
			{ uuid: 'beb5483e-36e1-4688-b7f5-ea07361b2628', name: 'OTA 控制', properties: { write: true, notify: true } },
			{ uuid: 'beb5483e-36e1-4688-b7f5-ea07361b2629', name: 'OTA 数据', properties: { write: true } },
			{ uuid: 'beb5483e-36e1-4688-b7f5-ea07361b2630', name: '版本回读', properties: { read: true } }
		]
	},
	{
		uuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
		name: '串口透传',
		characteristics: [
			{ uuid: '0000ffe1-0000-1000-8000-00805f9b34fb', name: '透传通道', properties: { read: true, write: true, notify: true } }
		]
	}
];

/** P003 Smart HID 会话快照（currentDevice 形态） */
export const hidCurrentDevice = {
	deviceId: 'SHID-9F3E2A1C',
	name: 'SHID-9F3E2A1C',
	hardware: 'ESP32-S3',
	firmware: '1.0.5',
	protocol: 'V1',
	lastWifi: 'Office-5G',
	lastHub: '192.168.1.8:17892',
	configuredAt: Date.now()
};

/** P005 诊断五项（正典状态映射：3 ok / 1 warn / 1 fail 演示混排） */
export const diagnosticRows = [
	{ key: 'ble', label: 'BLE 链路', state: 'ok', detail: 'RSSI -52 dBm · MTU 247' },
	{ key: 'wifi', label: 'Wi-Fi 连接', state: 'ok', detail: 'Office-5G · IP 192.168.1.42' },
	{ key: 'hub', label: 'ControlHub', state: 'warn', detail: '延迟 820ms（阈值 500ms）' },
	{ key: 'conn', label: '控制连接', state: 'ok', detail: 'MQTT 已连接' },
	{ key: 'usb', label: '设备 Ready 状态', state: 'fail', detail: 'error: usb_not_ready（码 0x07）' }
];

/** P008 广播会话日志样例（六色 chip 各一） */
export const broadcastLogs = [
	{ type: '系统', message: '检查支持：当前平台支持 BLE 外围模式' },
	{ type: '成功', message: '广播已开启（SmartBLE · 6/31 字节）' },
	{ type: '接收', message: 'observer: 中心设备 RSSI -58' },
	{ type: '写入', message: '更新厂商数据 → 0001/BLE' },
	{ type: '错误', message: 'errCode 10001：请先开启系统蓝牙' },
	{ type: '系统', message: '广播已停止' }
];

/** P002 配网错误码表（F022 八码摘四，供错误态演示） */
export const provisionErrors = {
	wifi_failed: { message: '设备侧报告 Wi-Fi 连接失败，请核对 SSID 与密码后重试。', row: 'wifi', recovery: 'form' },
	pairing_expired: { message: '配对码已过期，请重新扫描 ControlHub 配对码。', row: 'hub', recovery: 'pairing' },
	controlhub_unreachable: { message: '无法连接 ControlHub（192.168.1.8:17892），请确认主机在线或运行诊断。', row: 'conn', recovery: 'diagnostics' },
	timeout: { message: '等待设备确认超时（60s），可重试下发。', row: 'usb', recovery: 'retry' }
};
