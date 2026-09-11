export function requestBleScanPermission() {
  if (typeof uni.openBluetoothAdapter !== 'function') {
    return Promise.resolve({
      ok: false,
      reason: 'ble_not_supported',
      error: new Error('当前平台不支持 BLE 扫描，请使用 App。')
    });
  }
  return Promise.resolve({ ok: true });
}
