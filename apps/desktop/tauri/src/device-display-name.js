//
// SmartBLE Desktop - BLE 设备显示名批准链（F005）
//
// apps/uniapp/services/ble-runtime/device-display-name.js 的锁定镜像
// （E-WIN/T-WIN 共用同一字节）。批准链（REQ-013 / FEAT-013）：
// name → localName → AD 0x09 → AD 0x08 → Profile → manufacturer → 未命名 BLE · ID后四位。
// 差异仅模块形式：uniapp 为 ESM，桌面为无构建传统脚本，挂全局
// window.SmartBLEDisplayName。
//


const AD_SHORT_LOCAL_NAME = 0x08;
const AD_COMPLETE_LOCAL_NAME = 0x09;
const MAX_DISPLAY_NAME_LENGTH = 128;

function normalizeDisplayName(value) {
  if (value == null) return '';
  const text = String(value).trim();
  if (!text) return '';
  if (text.length <= MAX_DISPLAY_NAME_LENGTH) return text;
  return text.slice(0, MAX_DISPLAY_NAME_LENGTH);
}

function toUint8Array(value) {
  if (value == null) return null;
  try {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (Array.isArray(value)) {
      return Uint8Array.from(value.map((b) => Number(b) & 0xff));
    }
    if (typeof value === 'string') {
      const compact = value.replace(/\s+/g, '');
      if (!compact) return new Uint8Array(0);
      if (/^(?:[0-9a-fA-F]{2})+$/.test(compact)) {
        const out = new Uint8Array(compact.length / 2);
        for (let i = 0; i < out.length; i += 1) {
          out[i] = parseInt(compact.slice(i * 2, i * 2 + 2), 16);
        }
        return out;
      }
      // UTF-8 string as raw text bytes (not AD structure)
      return null;
    }
    if (typeof value === 'object' && value.hex && typeof value.hex === 'string') {
      return toUint8Array(value.hex);
    }
  } catch {
    return null;
  }
  return null;
}

function decodeUtf8(bytes) {
  if (!bytes || !bytes.length) return '';
  try {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
  } catch {
    /* fall through */
  }
  try {
    let s = '';
    for (let i = 0; i < bytes.length; i += 1) s += `%${bytes[i].toString(16).padStart(2, '0')}`;
    return decodeURIComponent(s);
  } catch {
    try {
      return String.fromCharCode(...bytes);
    } catch {
      return '';
    }
  }
}

function parseAdStructures(bytes) {
  const found = { complete: '', short: '' };
  if (!bytes || !bytes.length) return found;
  let i = 0;
  while (i < bytes.length) {
    const length = bytes[i];
    if (!length || i + length >= bytes.length) break;
    const type = bytes[i + 1];
    const data = bytes.subarray(i + 2, i + 1 + length);
    if (type === AD_COMPLETE_LOCAL_NAME && !found.complete) {
      found.complete = normalizeDisplayName(decodeUtf8(data));
    } else if (type === AD_SHORT_LOCAL_NAME && !found.short) {
      found.short = normalizeDisplayName(decodeUtf8(data));
    }
    i += 1 + length;
  }
  return found;
}

function namesFromAdvertisementDataList(list) {
  const found = { complete: '', short: '' };
  if (!Array.isArray(list)) return found;
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const type = Number(item.type);
    const value = normalizeDisplayName(item.value ?? item.data ?? item.name);
    if (!value) continue;
    if (type === AD_COMPLETE_LOCAL_NAME && !found.complete) found.complete = value;
    if (type === AD_SHORT_LOCAL_NAME && !found.short) found.short = value;
  }
  return found;
}

/**
 * 从广播字节 / hex / 结构化 advertisementData 提取 Local Name。
 * @returns {{ complete: string, short: string }}
 */
function extractLocalNameFromAdvertisement(device) {
  const empty = { complete: '', short: '' };
  if (!device || typeof device !== 'object') return empty;

  const fromList = namesFromAdvertisementDataList(
    device.advertisementData
      || device.advNames
      || device.advertisement?.advNames,
  );

  const rawCandidates = [
    device.advertisData,
    device.advertisementData,
    device.advertisement?.advertisData,
    device.advertisement?.raw,
    device.rawAdvertisement,
  ];

  let fromBytes = empty;
  for (const candidate of rawCandidates) {
    // Prefer structured list over treating list as bytes
    if (Array.isArray(candidate) && candidate[0] && typeof candidate[0] === 'object' && 'type' in candidate[0]) {
      continue;
    }
    const bytes = toUint8Array(candidate);
    if (!bytes) continue;
    fromBytes = parseAdStructures(bytes);
    if (fromBytes.complete || fromBytes.short) break;
  }

  return {
    complete: fromList.complete || fromBytes.complete || '',
    short: fromList.short || fromBytes.short || '',
  };
}

function manufacturerName(device) {
  if (!device || typeof device !== 'object') return '';
  const direct = normalizeDisplayName(device.manufacturer ?? device.manufacturerName);
  if (direct) return direct;
  // Avoid using opaque hex blobs as display names
  return '';
}

function deviceIdSuffix(device) {
  const id = String(device?.deviceId || device?.id || '');
  const cleaned = id.replace(/[^0-9A-Za-z]/g, '');
  const suffix = (cleaned || id).slice(-4).toUpperCase() || '----';
  return suffix;
}

function pick(displayName, source, confidence) {
  const name = normalizeDisplayName(displayName);
  if (!name) return null;
  return { displayName: name, source, confidence };
}

/**
 * @param {object} device
 * @returns {{ displayName: string, source: string, confidence: string }}
 */
function resolveDeviceDisplayName(device) {
  const safe = device && typeof device === 'object' ? device : {};

  // 1. device.name
  const fromName = pick(safe.name, 'deviceName', 'medium');
  if (fromName) return fromName;

  // 2. platform localName field（Complete Local Name 常见投影）
  const fromLocalField = pick(safe.localName, 'localName', 'high');
  if (fromLocalField) return fromLocalField;

  const adNames = extractLocalNameFromAdvertisement(safe);

  // 3. AD 0x09 Complete Local Name
  const from09 = pick(adNames.complete, 'localName', 'high');
  if (from09) return from09;

  // 4. AD 0x08 Shortened Local Name
  const from08 = pick(adNames.short, 'shortLocalName', 'medium');
  if (from08) return from08;

  // 5. Profile provided name
  const fromProfile = pick(safe.profileName ?? safe.profile?.displayName, 'profile', 'medium');
  if (fromProfile) return fromProfile;

  // 6. manufacturer
  const fromMfg = pick(manufacturerName(safe), 'manufacturer', 'low');
  if (fromMfg) return fromMfg;

  // 7. fallback — never empty / never "Unknown Device"
  return {
    displayName: `未命名 BLE · ${deviceIdSuffix(safe)}`,
    source: 'deviceId',
    confidence: 'low',
  };
}

/**
 * Runtime 归一化：附加 displayName 字段，不删除旧字段，不修改入参对象。
 */
function attachDeviceDisplayName(device) {
  if (!device || typeof device !== 'object') {
    const resolved = resolveDeviceDisplayName({});
    return {
      displayName: resolved.displayName,
      displayNameSource: resolved.source,
      displayNameConfidence: resolved.confidence,
    };
  }
  const resolved = resolveDeviceDisplayName(device);
  return {
    ...device,
    displayName: resolved.displayName,
    displayNameSource: resolved.source,
    displayNameConfidence: resolved.confidence,
  };
}

(function (root) {
  root.SmartBLEDisplayName = {
    normalizeDisplayName,
    extractLocalNameFromAdvertisement,
    resolveDeviceDisplayName,
    attachDeviceDisplayName,
  };
})(typeof window !== 'undefined' ? window : globalThis);
