import { computed, ref, watch } from 'vue';
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { useBleStore } from '../store/ble';
import { matchScannedDevices } from '../services/provisioning/profiles.js';
import { requestBleScanPermission } from '../services/scan-permission.js';
import { filterBleDevices } from '../services/ble-runtime/device-filter.js';

export function useBleScan() {
  const store = useBleStore();
  const filterSettings = ref({ rssi: -100, prefix: '', hideNoName: false });
  const autoStopSeconds = 5;
  // 「已扫描过」标记：scanLb 终态（扫描完成 · 发现 N 台）只在首个会话后出现（正典 p001 scanned）
  const hasScanned = ref(false);
  watch(() => store.isScanning, (scanning) => {
    if (scanning) hasScanned.value = true;
  });

  const devices = computed(() => {
    const matches = new Map(matchScannedDevices(store.scannedDevices).map((match) => [match.device.deviceId, match]));
    return store.scannedDevices.map((device) => {
      const match = matches.get(device.deviceId);
      return match ? {
        ...device,
        profileId: match.profile.id,
        profileName: match.profile.displayName,
        profileMatch: match.matchLevel,
        profileBadge: match.profile.presentation.badge,
        profileActionLabel: match.profile.presentation.actionLabel,
        profileActionDescription: match.profile.presentation.actionDescription,
        profileChipStrong: match.profile.presentation.chipStrong,
        profileChipWeak: match.profile.presentation.chipWeak
      } : device;
    });
  });
  const filteredDevices = computed(() => filterBleDevices(devices.value, filterSettings.value));

  const checkBluetoothState = () => {
    if (typeof uni.getBluetoothAdapterState !== 'function') {
      store.setBleState('unsupported');
      return;
    }
    uni.getBluetoothAdapterState({
      success: (result) => store.setBleState(result.available ? 'on' : 'off'),
      fail: () => {
        const systemSetting = uni.getSystemSetting?.();
        store.setBleState(systemSetting?.bluetoothEnabled ? 'on' : 'off');
      }
    });
  };

  const showScanStartError = async (error) => {
    const errCode = error?.errCode ?? error?.code;
    const content = errCode === 10001
      ? '请先打开系统蓝牙，再重新开始扫描。'
      : error?.errMsg || error?.message || '扫描启动失败，请稍后重试。';

    await new Promise((resolve) => {
      uni.showModal({
        title: '无法开始扫描',
        content,
        showCancel: false,
        complete: resolve
      });
    });
  };

  const start = async () => {
    const permission = await requestBleScanPermission();
    if (!permission.ok) {
      checkBluetoothState();
      if (permission.reason === 'ble_not_supported') {
        await showScanStartError(permission.error);
      }
      return permission;
    }

    const result = await store.startScan(autoStopSeconds * 1000, 'home-scan');
    checkBluetoothState();
    if (!result?.ok) {
      await showScanStartError(result.error);
      return result;
    }
    // 只在到点自动结束时播报终态；用户主动停止/连接前停止不额外打扰（P001-I01）
    if (result.reason === 'timeout') {
      const count = store.scannedDevices.length;
      uni.showToast({
        title: count > 0 ? `扫描完成 · 发现 ${count} 台` : '扫描完成 · 未发现设备',
        icon: 'none'
      });
    }
    return result;
  };

  const stop = (reason = 'user') => store.stopScan(reason);
  const toggle = () => store.isScanning ? stop('user') : start();
  const prepareConnect = async () => { await stop('connect'); };

  onLoad(checkBluetoothState);
  onShow(checkBluetoothState);
  onHide(() => stop('page_hide'));
  onUnload(() => stop('page_unload'));

  return {
    filterSettings, devices, filteredDevices, hasScanned,
    connectedDevices: computed(() => store.connectedDevicesList),
    isScanning: computed(() => store.isScanning),
    scanError: computed(() => store.scanError),
    bleState: computed(() => store.bleState),
    autoStopSeconds,
    start, stop, toggle, prepareConnect
  };
}
