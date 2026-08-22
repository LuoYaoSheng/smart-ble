const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const sortableRssi = (value) => Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;

export function mergeDeviceCollection(existingDevices = [], incomingDevices = [], options = {}) {
  const { connectionStates = {}, limit = 100 } = options;
  const devicesById = new Map();

  for (const device of existingDevices) {
    if (!device?.deviceId) continue;
    devicesById.set(device.deviceId, { ...device });
  }

  for (const device of incomingDevices) {
    if (!device?.deviceId) continue;
    const existing = devicesById.get(device.deviceId);
    const connected = hasOwn(connectionStates, device.deviceId)
      ? Boolean(connectionStates[device.deviceId])
      : existing?.connected ?? device.connected ?? false;

    devicesById.set(device.deviceId, {
      ...existing,
      ...device,
      connected
    });
  }

  return Array.from(devicesById.values())
    .map((device, index) => ({ device, index }))
    .sort((left, right) => {
      const rssiDifference = sortableRssi(right.device.RSSI) - sortableRssi(left.device.RSSI);
      return Number.isNaN(rssiDifference) || rssiDifference === 0
        ? left.index - right.index
        : rssiDifference;
    })
    .slice(0, Math.max(0, limit))
    .map(({ device }) => device);
}
