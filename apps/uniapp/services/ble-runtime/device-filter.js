/**
 * BLE 设备列表纯函数过滤（Runtime 层统一入口）。
 * 支持：RSSI / 名称前缀 / 隐藏无名 / keyword（跨 name·localName·id·manufacturer·serviceUUID）。
 * 不修改入参数组。
 */

function asLower(value) {
  if (value == null) return '';
  return String(value).trim().toLowerCase();
}

function manufacturerToText(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  if (Array.isArray(value)) {
    return value.map((b) => Number(b).toString(16).padStart(2, '0')).join('');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function serviceUuidsToParts(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map((u) => asLower(u)).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(/[\s,;|]+/).map((u) => asLower(u)).filter(Boolean);
  }
  return [asLower(value)].filter(Boolean);
}

/**
 * 组合可检索文本（小写），供 keyword includes 匹配。
 */
export function buildDeviceSearchableText(device) {
  if (!device || typeof device !== 'object') return '';
  const parts = [
    device.deviceId,
    device.id,
    device.name,
    device.localName,
    manufacturerToText(device.manufacturerData ?? device.manufacturer),
    ...serviceUuidsToParts(device.serviceUUIDs ?? device.advertisServiceUUIDs),
  ];
  return parts.map((p) => asLower(p)).filter(Boolean).join(' ');
}

function matchesKeyword(device, keywordLower) {
  if (!keywordLower) return true;
  return buildDeviceSearchableText(device).includes(keywordLower);
}

function matchesPrefix(device, prefixLower) {
  if (!prefixLower) return true;
  const name = asLower(device?.name || '');
  const localName = asLower(device?.localName || '');
  return name.startsWith(prefixLower) || localName.startsWith(prefixLower);
}

/**
 * @param {Array<object>} devices
 * @param {{ rssi?: number, prefix?: string, hideNoName?: boolean, keyword?: string }} [settings]
 * @returns {Array<object>} 新数组
 */
export function filterBleDevices(devices = [], settings = {}) {
  const list = Array.isArray(devices) ? devices : [];
  const opts = settings && typeof settings === 'object' ? settings : {};
  const threshold = Number.isFinite(opts.rssi) ? opts.rssi : -100;
  const prefix = asLower(opts.prefix);
  const hideNoName = Boolean(opts.hideNoName);
  const keyword = asLower(opts.keyword);

  const out = [];
  const seen = new Set();

  for (const device of list) {
    if (!device || typeof device !== 'object') continue;

    const key = String(device.deviceId || device.id || '');
    if (key && seen.has(key)) continue;

    if (Number.isFinite(device.RSSI)) {
      if (device.RSSI < threshold) continue;
    } else if (threshold > -100) {
      continue;
    }

    const displayName = String(device.name || device.localName || '').trim();
    if (hideNoName && !displayName) continue;
    if (!matchesPrefix(device, prefix)) continue;
    if (!matchesKeyword(device, keyword)) continue;

    if (key) seen.add(key);
    out.push(device);
  }

  return out;
}
