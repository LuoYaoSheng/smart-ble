import { computed, ref } from 'vue';
import { onHide, onLoad, onUnload } from '@dcloudio/uni-app';
import { useBleStore } from '../store/ble';
import { matchScannedDevices } from '../services/provisioning/profiles.js';

export function requestBleScanPermission() {
  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    wx.getSetting({
      success: (settings) => {
        if (settings.authSetting['scope.userLocation']) return resolve(true);
        wx.authorize({
          scope: 'scope.userLocation', success: () => resolve(true),
          fail: () => wx.showModal({
            title: '需要定位权限', content: '微信在部分系统上要求定位权限才能发现附近 BLE 设备。',
            confirmText: '去设置', success: (result) => { if (result.confirm) wx.openSetting(); resolve(false); },
            fail: () => resolve(false)
          })
        });
      },
      fail: () => resolve(true)
    });
  });
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve(true);
  // #endif
}

export function useBleScan() {
  const store = useBleStore();
  const filterSettings = ref({ rssi: -100, prefix: '', hideNoName: false });

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
  const filteredDevices = computed(() => devices.value.filter((device) => {
    if (device.RSSI < filterSettings.value.rssi) return false;
    if (filterSettings.value.hideNoName && !device.name) return false;
    const prefix = filterSettings.value.prefix.trim().toLowerCase();
    return !prefix || String(device.name || '').toLowerCase().startsWith(prefix);
  }));

  const checkBluetoothState = () => {
    uni.getBluetoothAdapterState({
      success: (result) => store.setBleState(result.available ? 'on' : 'off'),
      fail: () => store.setBleState('off')
    });
  };

  const start = async () => {
    if (await requestBleScanPermission()) return store.startScan();
    return { ok: false, reason: 'permission_denied' };
  };

  const stop = (reason = 'user') => store.stopScan(reason);
  const toggle = () => store.isScanning ? stop('user') : start();
  const prepareConnect = async () => { await stop('connect'); };

  onLoad(checkBluetoothState);
  onHide(() => stop('page_hide'));
  onUnload(() => stop('page_unload'));

  return {
    filterSettings, devices, filteredDevices,
    connectedDevices: computed(() => store.connectedDevicesList),
    isScanning: computed(() => store.isScanning),
    scanError: computed(() => store.scanError),
    bleState: computed(() => store.bleState),
    start, stop, toggle, prepareConnect
  };
}
