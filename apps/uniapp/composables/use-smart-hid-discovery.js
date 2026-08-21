import { computed, ref } from 'vue';
import { useHidStore } from '../store/hid';
import { smartHidService } from '../services/smart-hid/index.js';
import { requestBleScanPermission } from './use-ble-scan.js';

export function useSmartHidDiscovery() {
  const store = useHidStore();
  const scanning = ref(false);
  const error = ref(null);
  const scan = async () => {
    if (scanning.value) return;
    error.value = null;
    scanning.value = true;
    try {
      if (!await requestBleScanPermission()) return;
      await smartHidService.scanSmartHid();
    } catch (reason) {
      error.value = reason;
    } finally {
      scanning.value = false;
    }
  };
  const continueWith = (device) => {
    store.setCurrentDevice(device);
    uni.navigateTo({ url: `/pages/hid/add?deviceId=${encodeURIComponent(device.deviceId)}` });
  };
  return { devices: computed(() => store.smartDevices), scanning, error, scan, continueWith };
}
