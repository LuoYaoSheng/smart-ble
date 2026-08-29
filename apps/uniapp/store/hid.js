import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { logger } from '../../../core/ble-core/utils/logger';
import {
	KNOWN_DEVICES_MAX,
	normalizeKnownDevices
} from '../services/smart-hid/known-devices.js';

/**
 * Smart HID 模块 Store
 *
 * 职责：
 *   - smartDevices / currentDevice / provisionSession / hubInfo
 *   - provisionStatus / progress / knownDevices / diagnostic / lastError
 *
 * 敏感字段（hubInfo.token / Wi-Fi 密码等）不写入持久化存储。
 */
export const useHidStore = defineStore('hid', () => {
	const KNOWN_DEVICES_KEY = 'smart_ble.smart_hid.known_devices.v1';
	const loadKnownDevices = () => {
		try {
			const value = uni.getStorageSync(KNOWN_DEVICES_KEY);
			return normalizeKnownDevices(Array.isArray(value) ? value : []);
		} catch {
			return [];
		}
	};
	const persistKnownDevices = (devices) => {
		const normalized = normalizeKnownDevices(devices);
		try { uni.setStorageSync(KNOWN_DEVICES_KEY, normalized); } catch (error) {
			logger.warning(`[HID] 保存非敏感设备历史失败: ${error?.message || 'unknown'}`);
		}
		return normalized;
	};

	const smartDevices = ref([]);
	const currentDevice = ref(null);
	const provisionSession = ref({ active: false, startedAt: null });
	const hubInfo = ref(null);
	const provisionStatus = ref(null);
	const progress = ref({ wifi: 'pending', hub: 'pending', conn: 'pending', usb: 'pending' });
	const knownDevices = ref(loadKnownDevices());
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
		knownDevices.value = normalizeKnownDevices([meta, ...knownDevices.value], {
			max: KNOWN_DEVICES_MAX
		});
		persistKnownDevices(knownDevices.value);
	};

	const removeKnownDevice = (deviceId) => {
		knownDevices.value = knownDevices.value.filter(d => d.deviceId !== deviceId);
		persistKnownDevices(knownDevices.value);
	};

	const pruneKnownDevices = (now = Date.now()) => {
		knownDevices.value = persistKnownDevices(
			normalizeKnownDevices(knownDevices.value, { now })
		);
		return knownDevices.value;
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

	return {
		smartDevices,
		currentDevice,
		provisionSession,
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
		pruneKnownDevices,
		startProvisionSession,
		endProvisionSession
	};
});
