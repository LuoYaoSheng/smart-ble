/**
 * MOCK 桥 —— H5 假数据通道入口（2026-09-11 UI 全面轮）。
 *
 * 激活条件（三重门）：H5 条件编译引用 + URL 携带 ?mock=1 + 显式 import 安装。
 * mp-weixin / app 构建不含本文件，生产逻辑零改动。
 *
 * 使用（Playwright 驱动）：
 *   1. 打开 #/pages/index/index?mock=1（任一页面均可，建议首页）
 *   2. await window.__MOCK__.seed('p006', 'ready')   // 种 store + 数据集上下文
 *   3. await window.__MOCK__.go('/pages/device/detail?deviceId=...')  // SPA 内跳转
 *   4. await window.__MOCK__.set('p005', { diagnosticState: 'live' }) // 页面本地靶标
 *
 * 口径：数据来自 mock-dataset.js（原型正典演示集的 uniapp 运行时形态），
 * 经真实渲染管线（normalizeAdvertisement / profile 匹配 / store computed）呈现，
 * 不旁路组件结构 —— 截图证据可作 code-level 视觉对照，不折算真机 VISUAL_PASS。
 */

import { useBleStore } from '../../store/ble';
import { useHidStore } from '../../store/hid';
import { getPageTargets } from './mock-registry.js';
import {
	scanDevices,
	connectedSessions,
	gattServices,
	hidCurrentDevice,
	diagnosticRows,
	broadcastLogs,
	provisionErrors
} from './mock-dataset.js';

export function mockQueryEnabled() {
	try {
		if (typeof location === 'undefined') return false;
		// H5 hash 路由：query 在 hash 段（#/pages/x?mock=1）；history 路由在 search 段
		const searchQuery = new URLSearchParams(location.search).get('mock');
		if (searchQuery === '1') return true;
		const hash = location.hash || '';
		const queryIndex = hash.indexOf('?');
		return queryIndex >= 0 && new URLSearchParams(hash.slice(queryIndex + 1)).get('mock') === '1';
	} catch {
		return false;
	}
}

function resolveStores() {
	const app = typeof getApp === 'function' ? getApp() : null;
	const pinia = app?.$vm?.$?.appContext?.config?.globalProperties?.$pinia;
	if (!pinia) return null;
	return { ble: useBleStore(pinia), hid: useHidStore(pinia) };
}

function seedScanned(stores, count = scanDevices.length) {
	stores.ble.scannedDevices = scanDevices.slice(0, count);
}

function seedConnectedMap(stores, list) {
	const map = stores.ble.connectedDevicesMap;
	Object.keys(map).forEach((key) => delete map[key]);
	list.forEach((device) => { map[device.deviceId] = { ...device, services: device.services || [] }; });
}

function seedP001(stores, preset) {
	const ble = stores.ble;
	ble.scannedDevices = [];
	ble.scanError = null;
	ble.isScanning = false;
	ble.setBleState('on');
	switch (preset) {
		case 'idle': break;
		case 'scanning':
			ble.isScanning = true;
			seedScanned(stores, 3);
			break;
		case 'complete':
			seedScanned(stores);
			// hasScanned 由页面靶标补（或经 isScanning 翻转派生）
			break;
		case 'failed':
			ble.scanError = { code: 10006, message: '定位权限未授权，无法进行 BLE 扫描。' };
			seedScanned(stores, 0);
			break;
		case 'ble-off': ble.setBleState('off'); break;
		case 'unsupported': ble.setBleState('unsupported'); break;
		case 'filter-empty':
			seedScanned(stores);
			break;
		default: throw new Error(`p001 unknown preset: ${preset}`);
	}
}

function seedP002(stores, preset, payload = {}) {
	const hid = stores.hid;
	hid.setCurrentDevice(hidCurrentDevice);
	hid.setHubInfo(null);
	hid.resetProgress();
	hid.clearError();
	stores.ble.sessionOnline = true;
	const t = getPageTargets('p002') || {};
	const apply = (patch) => Object.entries(patch).forEach(([key, value]) => { if (t[key]) t[key].value = value; });
	switch (preset) {
		case 'connect-idle':
			apply({ phase: 'connect', connecting: false, connectionError: '' });
			break;
		case 'connect-connecting':
			apply({ phase: 'connect', connecting: true, connectionError: '' });
			break;
		case 'connect-error':
			apply({ phase: 'connect', connecting: false, connectionError: '连接超时：请确认设备已进入配网模式后重试。' });
			break;
		case 'configure':
			hid.setHubInfo({ host: '192.168.1.8', port: 17892, token: 'A1B2C3D4'.repeat(4) });
			apply({
				phase: 'configure', connectionLost: false, connectionError: '',
				deviceInfoSummary: 'smart-hid · V1 · ESP32-S3 · SHID-9F3E2A1C',
				wifiSsid: 'Office-5G', hubAddress: '192.168.1.8:17892'
			});
			break;
		case 'configure-lost':
			hid.setHubInfo({ host: '192.168.1.8', port: 17892, token: 'A1B2C3D4'.repeat(4) });
			apply({ phase: 'configure', connectionLost: true, wifiSsid: 'Office-5G', hubAddress: '192.168.1.8:17892' });
			break;
		case 'status-running':
			apply({ phase: 'status', provisioning: true, provisionDone: false, errorMessage: '', recoveryAction: '' });
			hid.applyProvisionStatus({ state: 'pairing', step: 'pairing' });
			break;
		case 'status-running-late':
			apply({ phase: 'status', provisioning: true, provisionDone: false });
			hid.applyProvisionStatus({ state: 'mqtt_connecting', step: 'mqtt_connecting' });
			break;
		case 'status-done':
			apply({ phase: 'status', provisioning: false, provisionDone: true, errorMessage: '' });
			hid.applyProvisionStatus({ state: 'ready', step: 'ready' });
			break;
		case 'status-error': {
			const code = payload.code || 'controlhub_unreachable';
			const spec = provisionErrors[code] || provisionErrors.controlhub_unreachable;
			hid.applyProvisionStatus({ state: 'error', error: code });
			hid.setLastError({ code, message: spec.message });
			apply({ phase: 'status', provisioning: false, provisionDone: false, errorMessage: spec.message, recoveryAction: spec.recovery });
			break;
		}
		default: throw new Error(`p002 unknown preset: ${preset}`);
	}
}

function seedP003(stores, preset) {
	const hid = stores.hid;
	switch (preset) {
		case 'ready':
			hid.setCurrentDevice(hidCurrentDevice);
			break;
		case 'missing':
			hid.setCurrentDevice({ deviceId: 'SHID-9F3E2A1C', name: '', hardware: '', firmware: '', protocol: '' });
			break;
		default: throw new Error(`p003 unknown preset: ${preset}`);
	}
}

function seedP005(stores, preset) {
	const hid = stores.hid;
	hid.setCurrentDevice(hidCurrentDevice);
	hid.clearError();
	switch (preset) {
		case 'idle': hid.setDiagnostic(null); break;
		case 'connected': hid.setDiagnostic(null); break;
		case 'checking': hid.setDiagnostic(null); break;
		case 'live': hid.setDiagnostic(diagnosticRows); break;
		case 'offline': hid.setDiagnostic(null); break;
		case 'error':
			hid.setDiagnostic(diagnosticRows.map((row) => ({ ...row, state: 'warn' })));
			hid.setLastError({ code: 'diagnostic_read_failed', message: '诊断读取失败：特征 10004 读取超时（3s）' });
			break;
		default: throw new Error(`p005 unknown preset: ${preset}`);
	}
	const t = getPageTargets('p005');
	if (t?.diagnosticState) t.diagnosticState.value = preset === 'connected' ? 'connected' : preset;
	if (t?.showAdvanced) t.showAdvanced.value = preset === 'error';
	if (t?.deviceId) t.deviceId.value = hidCurrentDevice.deviceId;
}

function seedP006(stores, preset) {
	const ble = stores.ble;
	seedConnectedMap(stores, []);
	const t = getPageTargets('p006') || {};
	const apply = (patch) => Object.entries(patch).forEach(([key, value]) => { if (t[key]) t[key].value = value; });
	apply({ isInitializing: false, isConnecting: false, lastConnectError: '', autoRetryExhausted: false, hasOtaService: false, logs: [] });
	const target = connectedSessions[0];
	switch (preset) {
		case 'idle': break;
		case 'connecting': apply({ isConnecting: true }); break;
		case 'ready':
			seedConnectedMap(stores, [{ ...target, services: gattServices }]);
			apply({ hasOtaService: true });
			apply({
				logs: [
					{ type: '系统', message: '连接成功：D8:A6:3A:41:F2:09', timestamp: '14:02:11' },
					{ type: '成功', message: '服务发现完成：4 服务 / 7 特征', timestamp: '14:02:12' },
					{ type: '接收', message: 'HEX: 64  TEXT: d', timestamp: '14:02:20' },
					{ type: '写入', message: 'HEX: 48 65 6C 6C 6F  TEXT: Hello', timestamp: '14:02:35' }
				]
			});
			break;
		case 'empty':
			seedConnectedMap(stores, [{ ...target, services: [] }]);
			break;
		case 'error':
			apply({ lastConnectError: '连接超时（10s）：设备无响应，已自动重试 3 次。' });
			break;
		default: throw new Error(`p006 unknown preset: ${preset}`);
	}
}

function seedP007(stores, preset) {
	const hid = stores.hid;
	hid.sessionOnline = false;
	switch (preset) {
		case 'empty': seedConnectedMap(stores, []); break;
		case 'empty-provision':
			seedConnectedMap(stores, []);
			hid.sessionOnline = true;
			break;
		case 'single': seedConnectedMap(stores, connectedSessions.slice(0, 1)); break;
		case 'multi': seedConnectedMap(stores, connectedSessions); break;
		default: throw new Error(`p007 unknown preset: ${preset}`);
	}
}

function seedP008(stores, preset, payload = {}) {
	const t = getPageTargets('p008') || {};
	const snapBase = t.sessionSnap?.value || {};
	const setSnap = (patch) => { if (t.sessionSnap) t.sessionSnap.value = { ...snapBase, ...patch }; };
	if (t.isSupported) t.isSupported.value = true;
	// 平台靶标默认微信（徽章六值可全渲染）；unsupported 分支用 web；payload.platform 可覆盖（如 android 表单变体）
	const setPlatform = (value) => { if (t.platform) t.platform.value = value; };
	// 表单默认值（正典 advDefaults：微信 SmartBLE/FFE0/0001/BLE → 6/31 字节预算非零）
	const seedForm = (platform) => {
		const defaults = {
			weixin: { name: 'SmartBLE', uuid: 'FFE0', mfgId: '0001', mfgData: 'BLE' },
			android: { name: 'SmartBLE-A', uuid: 'FFE0', mfgId: '0001', mfgData: 'BLE' },
			ios: { name: 'SmartBLE-I', uuid: 'FFE0', mfgId: '0001', mfgData: 'BLE' }
		}[platform === 'web' ? 'weixin' : platform] || { name: 'SmartBLE', uuid: 'FFE0', mfgId: '0001', mfgData: 'BLE' };
		if (t.deviceName) t.deviceName.value = defaults.name;
		if (t.serviceUUID) t.serviceUUID.value = defaults.uuid;
		if (t.manufacturerId) t.manufacturerId.value = defaults.mfgId;
		if (t.manufacturerData) t.manufacturerData.value = defaults.mfgData;
	};
	switch (preset) {
		case 'idle':
			setPlatform(payload.platform || 'weixin');
			seedForm(payload.platform || 'weixin');
			setSnap({ state: 'IDLE', lastError: null });
			break;
		case 'advertising':
			setPlatform(payload.platform || 'weixin');
			seedForm(payload.platform || 'weixin');
			setSnap({ state: 'ADVERTISING', startedAt: Date.now(), lastError: null });
			if (typeof t.sessionAddLog === 'function') broadcastLogs.slice(0, 4).forEach((l) => t.sessionAddLog(l.type, l.message));
			break;
		case 'stopped':
			setPlatform(payload.platform || 'weixin');
			seedForm(payload.platform || 'weixin');
			setSnap({ state: 'STOPPED', stoppedAt: Date.now(), lastError: null });
			break;
		case 'failed':
			setPlatform(payload.platform || 'weixin');
			seedForm(payload.platform || 'weixin');
			setSnap({ state: 'FAILED', lastError: { code: 'ADAPTER_FAILED', message: 'errCode 10001：请先开启系统蓝牙' } });
			if (typeof t.sessionAddLog === 'function') t.sessionAddLog('错误', 'errCode 10001：请先开启系统蓝牙');
			break;
		case 'unsupported':
			setPlatform('web');
			if (t.isSupported) t.isSupported.value = false;
			setSnap({ state: 'IDLE' });
			break;
		default: throw new Error(`p008 unknown preset: ${preset}`);
	}
}

const SEEDERS = {
	p001: seedP001,
	p002: seedP002,
	p003: seedP003,
	p005: seedP005,
	p006: seedP006,
	p007: seedP007,
	p008: seedP008
};

export function installMockBridge() {
	if (typeof window === 'undefined' || window.__MOCK__ || !mockQueryEnabled()) return false;

	window.__MOCK__ = {
		dataset: {
			scanDevices, connectedSessions, gattServices, hidCurrentDevice, diagnosticRows, broadcastLogs, provisionErrors
		},
		stores: () => resolveStores(),
		targets: getPageTargets,
		seed(pageKey, preset, payload) {
			const stores = resolveStores();
			if (!stores) throw new Error('pinia not ready');
			const seeder = SEEDERS[pageKey];
			if (!seeder) throw new Error(`unknown page key: ${pageKey}`);
			seeder(stores, preset, payload);
			return { pageKey, preset };
		},
		set(pageKey, patch) {
			const targets = getPageTargets(pageKey) || {};
			const missing = Object.keys(patch).filter((key) => !targets[key]);
			Object.entries(patch).forEach(([key, value]) => { if (targets[key]) targets[key].value = value; });
			return { applied: true, missing };
		},
		go(url) {
			return new Promise((resolve) => {
				uni.navigateTo({
					url,
					complete: () => setTimeout(resolve, 120)
				});
			});
		},
		switchTab(url) {
			return new Promise((resolve) => {
				uni.switchTab({
					url,
					complete: () => setTimeout(resolve, 120)
				});
			});
		}
	};
	console.info('[MOCK] bridge active — seed()/set()/go()/dataset ready');
	return true;
}
