import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logger } from '../../../core/ble-core/utils/logger';
import { normalizeKnownDevices } from '../services/smart-hid/known-devices.js';

/**
 * Smart HID 模块 Store
 *
 * 职责：
 *   - smartDevices / currentDevice / provisionSession / hubInfo
 *   - provisionStatus / progress / knownDevices / diagnostic / lastError
 *
 * 零本地持久化（2026-09-02 决策）：knownDevices 仅为配网会话的内存快照
 * （P003「最近配置」lastWifi/lastHub 消费），冷启动为空，不落盘。
 */
export const useHidStore = defineStore('hid', () => {
	const smartDevices = ref([]);
	const currentDevice = ref(null);
	const provisionSession = ref({ active: false, startedAt: null });
	const sessionOnline = ref(false);         // Smart HID BLE 会话在线标志（service 层写入，首页计数消费）
	const hubInfo = ref(null);
	const provisionStatus = ref(null);
	const progress = ref({ wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' });
	const knownDevices = ref([]);              // 内存会话快照（原 F023 本地历史已移除，不落盘）
	const diagnostic = ref(null);
	const lastError = ref(null);

	const hasConfiguredDevice = computed(() => knownDevices.value.length > 0);

	const setSmartDevices = (list) => {
		smartDevices.value = Array.isArray(list) ? list : [];
	};

	const setCurrentDevice = (device) => {
		currentDevice.value = device ? { ...device } : null;
	};

	const setHubInfo = (info) => {
		hubInfo.value = info ? { ...info } : null;
	};

	const setProgress = (key, state) => {
		if (key in progress.value) progress.value[key] = state;
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
		if (err) logger.error(`[HID] ${err.code || ''} ${err.message || ''}`);
	};

	const clearError = () => { lastError.value = null; };

	const applyProvisionStatus = (status) => {
		if (!status || !status.state) return;
		provisionStatus.value = { ...status, at: Date.now() };
		const { state, step, error } = status;

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
		knownDevices.value = normalizeKnownDevices([meta, ...knownDevices.value]);
	};

	const removeKnownDevice = (deviceId) => {
		knownDevices.value = knownDevices.value.filter(d => d.deviceId !== deviceId);
	};

	const startProvisionSession = () => {
		provisionSession.value = { active: true, startedAt: Date.now() };
		resetProgress();
		clearError();
	};

	const endProvisionSession = () => {
		provisionSession.value = { active: false, startedAt: null };
		hubInfo.value = null;
	};

	const setSessionOnline = (online) => {
		sessionOnline.value = Boolean(online);
	};

	return {
		smartDevices,
		currentDevice,
		provisionSession,
		sessionOnline,
		hubInfo,
		provisionStatus,
		progress,
		knownDevices,
		diagnostic,
		lastError,
		hasConfiguredDevice,
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
		endProvisionSession,
		setSessionOnline
	};
});
