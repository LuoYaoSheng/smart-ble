const requireDeviceId = (deviceId) => {
  const value = String(deviceId || '');
  if (!value) throw new Error('deviceId is required');
  return value;
};

export function buildHidProvisionUrl(deviceId) {
  return `/pages/hid/add?deviceId=${encodeURIComponent(requireDeviceId(deviceId))}`;
}

export function buildHidDiagnosticsUrl(deviceId) {
  return `/pages/hid/diagnostics?deviceId=${encodeURIComponent(requireDeviceId(deviceId))}`;
}

export function buildGenericDeviceDetailUrl(device) {
  const context = {
    deviceId: requireDeviceId(device?.deviceId),
    name: device?.name || device?.localName || 'Smart HID',
    localName: device?.localName,
    RSSI: Number.isFinite(device?.RSSI) ? device.RSSI : 0,
    advertisDataHex: device?.advertisDataHex,
    advertisServiceUUIDs: device?.advertisServiceUUIDs,
    advertisement: device?.advertisement,
    profileId: device?.profileId
  };
  return `/pages/device/detail?device=${encodeURIComponent(JSON.stringify(context))}`;
}
