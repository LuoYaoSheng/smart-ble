/**
 * In-memory device route context.
 * URL only carries compact identity fields; advertisement payloads stay in the stash.
 */

const stash = new Map();
const MAX_STASH = 30;

function touch(deviceId) {
  if (!stash.has(deviceId)) return;
  const value = stash.get(deviceId);
  stash.delete(deviceId);
  stash.set(deviceId, value);
  while (stash.size > MAX_STASH) {
    const oldest = stash.keys().next().value;
    stash.delete(oldest);
  }
}

export function compactDeviceContext(device = {}) {
  const deviceId = String(device?.deviceId || '').trim();
  if (!deviceId) throw new Error('deviceId is required');
  return {
    deviceId,
    name: device.name || device.localName || '未知设备',
    localName: device.localName || '',
    RSSI: Number.isFinite(device.RSSI) ? device.RSSI : 0,
    profileId: device.profileId || ''
  };
}

export function stashDeviceRouteContext(device = {}) {
  const compact = compactDeviceContext(device);
  stash.set(compact.deviceId, {
    ...compact,
    advertisDataHex: device.advertisDataHex,
    advertisServiceUUIDs: device.advertisServiceUUIDs,
    advertisement: device.advertisement
  });
  touch(compact.deviceId);
  return compact;
}

export function buildDeviceDetailUrl(device = {}) {
  const context = stashDeviceRouteContext(device);
  const params = [
    `deviceId=${encodeURIComponent(context.deviceId)}`,
    `name=${encodeURIComponent(context.name)}`,
    `rssi=${encodeURIComponent(String(context.RSSI))}`
  ];
  if (context.profileId) {
    params.push(`profileId=${encodeURIComponent(context.profileId)}`);
  }
  return `/pages/device/detail?${params.join('&')}`;
}

export function resolveDeviceRouteContext(options = {}) {
  if (options?.deviceId) {
    let deviceId = String(options.deviceId);
    try { deviceId = decodeURIComponent(deviceId); } catch { /* keep raw */ }
    const stashed = stash.get(deviceId);
    if (stashed) {
      touch(deviceId);
      return { ...stashed };
    }

    let name = options.name ? String(options.name) : '未知设备';
    let profileId = options.profileId ? String(options.profileId) : '';
    try { name = decodeURIComponent(name); } catch { /* keep */ }
    try { profileId = profileId ? decodeURIComponent(profileId) : ''; } catch { /* keep */ }

    return {
      deviceId,
      name,
      localName: '',
      RSSI: Number(options.rssi) || 0,
      profileId
    };
  }

  if (options?.device) {
    try {
      const parsed = JSON.parse(decodeURIComponent(options.device));
      if (parsed?.deviceId) {
        stashDeviceRouteContext(parsed);
        return parsed;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function resetDeviceRouteContextForTesting() {
  stash.clear();
}
