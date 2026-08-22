import { computed, ref } from 'vue';
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { useBleStore } from '../store/ble';
import { matchScannedDevices } from '../services/provisioning/profiles.js';
import { requestBleScanPermission } from '../services/scan-permission.js';
import { filterBleDevices } from '../services/ble-runtime/device-filter.js';

export function useBleScan() {
  const store = useBleStore();
  const filterSettings = ref({ rssi: -100, prefix: '', hideNoName: false });
  const autoStopSeconds = 5;

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
        profileActionDescription: match.profile.presentation.actionDescription
      } : device;
    });
  });
  const filteredDevices = computed(() => filterBleDevices(devices.value, filterSettings.value));

  const checkBluetoothState = () => {
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
      return permission;
    }

    const result = await store.startScan(autoStopSeconds * 1000, 'home-scan');
    checkBluetoothState();
    if (!result?.ok) {
      await showScanStartError(result.error);
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
    filterSettings, devices, filteredDevices,
    connectedDevices: computed(() => store.connectedDevicesList),
    isScanning: computed(() => store.isScanning),
    scanError: computed(() => store.scanError),
    bleState: computed(() => store.bleState),
    autoStopSeconds,
    start, stop, toggle, prepareConnect
  };
}
