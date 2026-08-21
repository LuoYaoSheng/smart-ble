import { computed, ref } from 'vue';
import { onHide, onLoad, onUnload } from '@dcloudio/uni-app';
import { useBleStore } from '../store/ble';

export function useBleScan() {
  const store = useBleStore();
  const filterSettings = ref({ rssi: -100, prefix: '', hideNoName: false });

  const devices = computed(() => store.scannedDevices);
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

  const start = () => {
    // #ifdef MP-WEIXIN
    wx.getSetting({
      success: (settings) => {
        if (settings.authSetting['scope.userLocation']) {
          store.startScan();
          return;
        }
        wx.authorize({
          scope: 'scope.userLocation',
          success: () => store.startScan(),
          fail: () => wx.showModal({
            title: '需要定位权限', content: '微信在部分系统上要求定位权限才能发现附近 BLE 设备。',
            confirmText: '去设置', success: (result) => { if (result.confirm) wx.openSetting(); }
          })
        });
      },
      fail: () => store.startScan()
    });
    // #endif
    // #ifndef MP-WEIXIN
    store.startScan();
    // #endif
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
