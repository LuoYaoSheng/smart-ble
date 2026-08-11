import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import { logger } from '../../../core/ble-core/utils/logger';

/**
 * Smart HID 模块 Store
 *
 * 职责（依据 docs/smart-hid/MINIAPP_HID_MODULE.md §8）：
 *   - smartDevices        BLE 扫描过滤后的 Smart HID 设备列表
 *   - currentDevice       当前选中 / 正在配置的设备
 *   - provisionSession    当前配网会话状态
 *   - currentStep         Add 向导当前步骤（W01-W06）
 *   - hubInfo             ControlHub 动态 QR 解析结果（敏感，不持久化）
 *   - wifiNetworks        ESP32 Wi-Fi Scan 结果
 *   - progress            W05 配置进度
 *   - knownDevices        最近配置过的设备（本地历史，非实时在线）
 *   - diagnostic          诊断结果
 *   - lastError           最近错误
 *
 * 约束（依据 §9 BLE 复用）：
 *   - 必须复用 store/ble.js 的 BLE 能力，不直接调用 uni.writeBLECharacteristicValue
 *   - 真实 Protocomm 在 services/smart-hid/index.js 接入，本 store 只持有状态
 *
 * 敏感字段（hubInfo / Wi-Fi 密码等）不写入持久化存储。
 */
export const useHidStore = defineStore('hid', () => {
	// --- State ---
	const smartDevices = ref([]);
	const currentDevice = ref(null);
	const provisionSession = ref({ active: false, startedAt: null });
	const currentStep = ref(0);
	const hubInfo = ref(null);            // 敏感：不持久化
	const wifiNetworks = ref([]);
	const progress = ref({ wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' });
	const knownDevices = ref([]);          // 本地历史，仅记录 deviceId / name / 元信息
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
		// ControlHub 动态 QR 载荷：{ v, hub_id, host, pairing_port, token, expires_at }
		// token 为一次性短期凭据，仅保存在内存中
		hubInfo.value = info ? { ...info } : null;
	};

	const setWifiNetworks = (list) => {
		wifiNetworks.value = Array.isArray(list) ? list : [];
	};

	const setProgress = (key, state) => {
		if (key in progress.value) {
			progress.value[key] = state;
		}
	};

	const resetProgress = () => {
		progress.value = { wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' };
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
	};

	const removeKnownDevice = (deviceId) => {
		knownDevices.value = knownDevices.value.filter(d => d.deviceId !== deviceId);
	};

	const startProvisionSession = () => {
		provisionSession.value = { active: true, startedAt: Date.now() };
		currentStep.value = 0;
		resetProgress();
		clearError();
	};

	const endProvisionSession = () => {
		provisionSession.value = { active: false, startedAt: null };
		// 清理敏感字段
		hubInfo.value = null;
	};

	const setCurrentStep = (step) => {
		currentStep.value = step;
	};

	return {
		// state
		smartDevices,
		currentDevice,
		provisionSession,
		currentStep,
		hubInfo,
		wifiNetworks,
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
		setWifiNetworks,
		setProgress,
		resetProgress,
		setDiagnostic,
		setLastError,
		clearError,
		commitKnownDevice,
		removeKnownDevice,
		startProvisionSession,
		endProvisionSession,
		setCurrentStep
	};
});
