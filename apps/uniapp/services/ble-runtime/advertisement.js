const isBufferLike = (value) => value instanceof ArrayBuffer || ArrayBuffer.isView(value);
const utf8Bytes = (value) => {
  const encoded = encodeURIComponent(value);
  const bytes = [];
  for (let index = 0; index < encoded.length; index++) {
    if (encoded[index] === '%') {
      bytes.push(parseInt(encoded.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(encoded.charCodeAt(index));
    }
  }
  return new Uint8Array(bytes);
};

export function normalizeByteField(value) {
  if (value == null) return { state: 'not_provided', present: false, byteLength: 0, length: 0, hex: '' };
  let bytes;
  if (typeof value === 'string') {
    const compact = value.replace(/\s+/g, '');
    if (/^(?:[0-9a-f]{2})+$/i.test(compact)) {
      return { state: compact ? 'bytes' : 'empty', present: true, byteLength: compact.length / 2, length: compact.length / 2, hex: compact.toLowerCase() };
    }
    bytes = utf8Bytes(value);
  } else if (isBufferLike(value)) {
    bytes = value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  } else {
    return { state: 'not_provided', present: false, byteLength: 0, length: 0, hex: '' };
  }
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return { state: bytes.byteLength ? 'bytes' : 'empty', present: true, byteLength: bytes.byteLength, length: bytes.byteLength, hex };
}

const normalizeManufacturerData = (value) => {
  if (value == null) return [];
  const entries = Array.isArray(value) ? value : [value];
  return entries.map((item) => {
    if (isBufferLike(item) || typeof item === 'string') return { companyId: null, id: null, value: normalizeByteField(item), ...normalizeByteField(item) };
    const bytes = normalizeByteField(item?.manufacturerSpecificData ?? item?.data ?? item?.value);
    const companyId = item?.manufacturerId ?? item?.companyId ?? item?.id ?? null;
    return { companyId, id: companyId, value: bytes, ...bytes };
  });
};

const normalizeServiceData = (value) => {
  if (value == null) return [];
  if (value instanceof Map) value = Object.fromEntries(value);
  if (!Array.isArray(value) && typeof value === 'object' && !isBufferLike(value)) {
    return Object.entries(value).map(([serviceUuid, bytes]) => ({ serviceUuid, uuid: serviceUuid, value: normalizeByteField(bytes), ...normalizeByteField(bytes) }));
  }
  const entries = Array.isArray(value) ? value : [value];
  return entries.map((item) => {
    const serviceUuid = item?.serviceUuid ?? item?.uuid ?? null;
    const bytes = normalizeByteField(item?.serviceData ?? item?.data ?? item?.value ?? item);
    return { serviceUuid, uuid: serviceUuid, value: bytes, ...bytes };
  });
};

export function normalizeAdvertisement(device, observedAt = Date.now()) {
  const rawServiceUuids = device?.advertisServiceUUIDs ?? device?.serviceUuids ?? [];
  const serviceUuidList = Array.isArray(rawServiceUuids) ? rawServiceUuids : [rawServiceUuids];
  const serviceUuids = [...new Set(serviceUuidList.filter(Boolean).map((uuid) => String(uuid).toLowerCase()))];
  return {
    deviceId: String(device?.deviceId || device?.id || ''),
    localName: device?.localName || device?.name || null,
    rssi: Number.isFinite(device?.RSSI ?? device?.rssi) ? Number(device?.RSSI ?? device?.rssi) : null,
    serviceUuids,
    serviceUUIDs: serviceUuids,
    advertisData: normalizeByteField(device?.advertisData ?? device?.advertisementData),
    manufacturerData: normalizeManufacturerData(device?.manufacturerData),
    serviceData: normalizeServiceData(device?.serviceData),
    observedAt
  };
}

const hexToBytes = (hex) => {
  const out = [];
  for (let i = 0; i + 1 < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
  return out;
};

/**
 * 由平台解析字段重建 AD 结构段（与 Flutter AdvertisementSheet._segments 同口径）：
 * 小程序平台 API 不提供原始广播帧字节，逐段按 AD 类型号重组并标注来源。
 */
export function buildAdSegments(advertisement) {
  const adv = advertisement || {};
  const segments = [];
  const add = (type, name, payload) => {
    const frame = [payload.length + 1, parseInt(type.slice(2), 16), ...payload];
    segments.push({
      type,
      name,
      frameLength: frame.length,
      hex: frame.map((byte) => byte.toString(16).padStart(2, '0')).join('')
    });
  };

  const name = adv.localName;
  if (name) add('0x09', '完整本地名称', [...utf8Bytes(name)]);

  const shorts = [];
  const fulls = [];
  for (const raw of adv.serviceUuids || []) {
    const v = String(raw).trim().toLowerCase().replaceAll('-', '');
    if (v.length === 4) shorts.push(parseInt(v, 16));
    else if (v.length === 32) fulls.push(v);
  }
  if (shorts.length) {
    // 16 位 UUID 列表按小端序拼负载
    const payload = [];
    for (const id of shorts) {
      payload.push(id & 0xff, (id >> 8) & 0xff);
    }
    add('0x03', '16 位 Service UUID 列表', payload);
  }
  if (fulls.length) {
    // 128 位 UUID 列表每 UUID 按小端字节序
    const payload = [];
    for (const v of fulls) {
      for (let i = v.length; i > 0; i -= 2) payload.push(parseInt(v.slice(i - 2, i), 16));
    }
    add('0x07', '128 位 Service UUID 列表', payload);
  }

  for (const entry of adv.manufacturerData || []) {
    if (entry?.id == null || !entry?.present) continue;
    add('0xFF', '厂商数据', [entry.id & 0xff, (entry.id >> 8) & 0xff, ...hexToBytes(entry.hex)]);
  }

  for (const entry of adv.serviceData || []) {
    if (!entry?.present) continue;
    const v = String(entry.uuid || '').trim().toLowerCase().replaceAll('-', '');
    if (v.length !== 4) continue;
    const id = parseInt(v, 16);
    add('0x16', 'Service Data', [id & 0xff, (id >> 8) & 0xff, ...hexToBytes(entry.hex)]);
  }

  return segments;
}
