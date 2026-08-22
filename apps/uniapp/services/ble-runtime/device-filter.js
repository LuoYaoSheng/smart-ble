export function filterBleDevices(devices = [], settings = {}) {
  const threshold = Number.isFinite(settings.rssi) ? settings.rssi : -100;
  const prefix = String(settings.prefix || '').trim().toLowerCase();
  const hideNoName = Boolean(settings.hideNoName);

  return devices.filter((device) => {
    if (Number.isFinite(device?.RSSI)) {
      if (device.RSSI < threshold) return false;
    } else if (threshold > -100) {
      return false;
    }

    const name = String(device?.name || device?.localName || '').trim();
    if (hideNoName && !name) return false;
    return !prefix || name.toLowerCase().startsWith(prefix);
  });
}
