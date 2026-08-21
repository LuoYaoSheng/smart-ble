import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logger } from '../../../core/ble-core/utils/logger';

/**
 * Smart HID 模块 Store
 *
 * 职责：
 *   - smartDevices        BLE 扫描过滤后的 Smart HID 设备列表
 *   - currentDevice       当前选中 / 正在配置的设备（含 Device Info 字段）
 *   - provisionSession    当前配网会话状态
 *   - hubInfo             ControlHub 配对 QR 解析结果（敏感，不持久化）
 *   - provisionStatus     设备 Provision Status 最新快照（notify 驱动）
 *   - progress            W05 配置进度（由 provisionStatus 状态机映射）
 *   - knownDevices        最近配置过的设备（本地历史，非实时在线）
 *   - diagnostic          诊断结果
 *   - lastError           最近错误
 *
 * 约束：
 *   - 扫描复用 store/ble.js；GATT 原语统一走 services/provisioning 框架
 *   - BLE 协议实现在 services/smart-hid/index.js，本 store 只持有状态
 *
 * 敏感字段（hubInfo.token / Wi-Fi 密码等）不写入持久化存储。
 */
export const useHidStore = defineStore('hid', () => {
	const KNOWN_DEVICES_KEY = 'smart_ble.smart_hid.known_devices.v1';
	const loadKnownDevices = () => {
		try {
			const value = uni.getStorageSync(KNOWN_DEVICES_KEY);
			return Array.isArray(value) ? value.slice(0, 20) : [];
		} catch {
			return [];
		}
	};
	const persistKnownDevices = (devices) => {
		try { uni.setStorageSync(KNOWN_DEVICES_KEY, devices.slice(0, 20)); } catch (error) {
			logger.warning(`[HID] 保存非敏感设备历史失败: ${error?.message || 'unknown'}`);
		}
	};
	// --- State ---
	const smartDevices = ref([]);
	const currentDevice = ref(null);
	const provisionSession = ref({ active: false, startedAt: null });
	const hubInfo = ref(null);            // 敏感：不持久化。V1 形态：{ token, host, port }
	const provisionStatus = ref(null);    // 最新 { state, step, error }
	const progress = ref({ wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' });
	const knownDevices = ref(loadKnownDevices()); // 仅持久化非敏感元信息
	const diagnostic = ref(null);
	const lastError = ref(null);

	// --- Getters ---
	const hasConfiguredDevice = computed(() => knownDevices.value.length > 0);

	// --- Actions ---
	const setSmartDevices = (list) => {
		smartDevices.value = Array.isArray(list) ? list : [];
	};

	const setCurrentDevice = (device) => {
		currentDevice.value = device ? { ...device } : null;
	};

	const setHubInfo = (info) => {
		// ControlHub 配对 QR 载荷（V1）：{ token, host, port }
		// token 为一次性短期凭据，仅保存在内存中
		hubInfo.value = info ? { ...info } : null;
	};

	const setProgress = (key, state) => {
		if (key in progress.value) {
			progress.value[key] = state;
		}
	};

	const resetProgress = () => {
		progress.value = { wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' };
		provisionStatus.value = null;
	};

	const setDiagnostic = (items) => {
		diagnostic.value = Array.isArray(items) ? items : null;
	};

	const setLastError = (err) => {
		lastError.value = err ? { ...err } : null;
		if (err) {
			logger.error(`[HID] ${err.code || ''} ${err.message || ''}`);
		}
	};

	const clearError = () => { lastError.value = null; };

	/**
	 * 设备 Provision Status（V1 状态机）→ 向导进度行映射。
	 *
	 * 状态机：boot/load_config/unprovisioned/provisioning/connecting_wifi/
	 *         pairing/mqtt_connecting/ready/recovery/error
	 * 步骤：received/connecting_wifi/wifi_connected/pairing/pairing_success/
	 *       mqtt_connecting/ready
	 */
	const applyProvisionStatus = (status) => {
		if (!status || !status.state) return;
		provisionStatus.value = { ...status, at: Date.now() };
			const { state, step, error } = status;

		// 错误码 → 对应行 fail（其他行保持当前值）
		if (error) {
			const rowByCode = {
				wifi_failed: 'wifi',
				invalid_payload: 'wifi',
				controlhub_unreachable: 'hub',
				pairing_invalid: 'hub',
				pairing_expired: 'hub',
				pairing_used: 'hub',
				mqtt_invalid: 'conn',
				storage_failed: 'conn'
			};
			const row = rowByCode[error];
			if (row) progress.value[row] = 'fail';
			return;
		}

			const stateMap = {
				ready: { wifi: 'done', hub: 'done', conn: 'done', usb: 'done' },
				mqtt_connecting: { wifi: 'done', hub: 'done', conn: 'active', usb: 'pending' },
				pairing: { wifi: 'done', hub: 'active', conn: 'pending', usb: 'pending' },
				connecting_wifi: { wifi: 'active', hub: 'pending', conn: 'pending', usb: 'pending' },
				provisioning: { wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' },
			unprovisioned: { wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' },
			recovery: { wifi: 'warn', hub: 'warn', conn: 'warn', usb: 'pending' },
				error: { wifi: 'warn', hub: 'warn', conn: 'warn', usb: 'pending' }
			};
			const stepMap = {
				received: { wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' },
				connecting_wifi: { wifi: 'active' },
				wifi_connected: { wifi: 'done', hub: 'pending', conn: 'pending', usb: 'pending' },
				pairing: { wifi: 'done', hub: 'active', conn: 'pending', usb: 'pending' },
				pairing_success: { wifi: 'done', hub: 'done', conn: 'pending', usb: 'pending' },
				mqtt_connecting: { wifi: 'done', hub: 'done', conn: 'active', usb: 'pending' },
				ready: { wifi: 'done', hub: 'done', conn: 'done', usb: 'done' }
			};
			const byState = stateMap[state];
			const byStep = stepMap[step];
			if (byState || byStep) progress.value = { ...progress.value, ...byState, ...byStep };
	};

	/**
	 * 配置完成后提交到 knownDevices（本地历史，非实时在线状态）
	 * 仅保留非敏感元信息。
	 */
	const commitKnownDevice = (device) => {
		if (!device || !device.deviceId) return;
		const meta = {
			deviceId: device.deviceId,
			name: device.name || 'Smart HID',
			hardware: device.hardware || '',
			firmware: device.firmware || '',
			protocol: device.protocol || '',
			lastWifi: device.lastWifi || '',
			lastHub: device.lastHub || '',
			configuredAt: Date.now()
		};
		const idx = knownDevices.value.findIndex(d => d.deviceId === meta.deviceId);
		if (idx >= 0) {
			knownDevices.value[idx] = meta;
			} else {
				knownDevices.value.unshift(meta);
			}
			knownDevices.value = knownDevices.value.slice(0, 20);
			persistKnownDevices(knownDevices.value);
		};

		const removeKnownDevice = (deviceId) => {
			knownDevices.value = knownDevices.value.filter(d => d.deviceId !== deviceId);
			persistKnownDevices(knownDevices.value);
		};

	const startProvisionSession = () => {
		provisionSession.value = { active: true, startedAt: Date.now() };
		resetProgress();
		clearError();
	};

	const endProvisionSession = () => {
		provisionSession.value = { active: false, startedAt: null };
		// 清理敏感字段
		hubInfo.value = null;
	};

	return {
		// state
		smartDevices,
		currentDevice,
		provisionSession,
		hubInfo,
		provisionStatus,
		progress,
		knownDevices,
		diagnostic,
		lastError,
		// getters
		hasConfiguredDevice,
		// actions
		setSmartDevices,
		setCurrentDevice,
		setHubInfo,
		setProgress,
		resetProgress,
		applyProvisionStatus,
		setDiagnostic,
		setLastError,
		clearError,
		commitKnownDevice,
		removeKnownDevice,
		startProvisionSession,
		endProvisionSession
	};
});
