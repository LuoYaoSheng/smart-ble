import { utf8Encode } from '../../../core/ble-core/provisioning/framing.js';

export const MAX_LEGACY_ADVERTISING_BYTES = 31;

export const DEFAULT_ADVERTISING_PAYLOAD = Object.freeze({
  deviceName: 'SmartBLE',
  serviceUuid: 'FFE0',
  manufacturerId: '0001',
  manufacturerData: 'BLE'
});

export function normalizeServiceUuid(value) {
  const uuid = String(value || '').trim();
  if (!uuid) return '';
  if (/^[0-9a-f]{4}$/i.test(uuid) || /^[0-9a-f]{8}$/i.test(uuid)) return uuid.toUpperCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    return uuid.toUpperCase();
  }
  throw new Error('Service UUID 格式无效');
}

export function parseManufacturerId(value) {
  const id = String(value || '').trim();
  if (!id) return null;
  if (!/^[0-9a-f]{1,4}$/i.test(id)) throw new Error('厂商 ID 必须是 1-4 位 HEX');
  return Number.parseInt(id, 16);
}

export function manufacturerDataBuffer(value) {
  const bytes = utf8Encode(String(value || ''));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

const serviceUuidBytes = (uuid) => {
  const compact = uuid.replace(/-/g, '');
  if (compact.length === 4) return 2;
  if (compact.length === 8) return 4;
  return 16;
};

export function analyzeAdvertisingPayload(input = {}, options = {}) {
  const includeDeviceName = options.includeDeviceName ?? true;
  const includeServiceUuid = options.includeServiceUuid ?? true;
  const maxBytes = options.maxBytes ?? MAX_LEGACY_ADVERTISING_BYTES;
  const errors = [];
  const parts = { deviceName: 0, serviceUuid: 0, manufacturerData: 0 };
  const deviceName = String(input.deviceName || '');
  const manufacturerData = String(input.manufacturerData || '');

  let serviceUuid = '';
  try {
    serviceUuid = normalizeServiceUuid(input.serviceUuid);
  } catch (error) {
    errors.push(error.message);
  }

  let manufacturerId = null;
  try {
    manufacturerId = parseManufacturerId(input.manufacturerId);
  } catch (error) {
    errors.push(error.message);
  }
  if (manufacturerData && manufacturerId == null) errors.push('填写厂商数据时必须提供厂商 ID');

  if (includeDeviceName && deviceName) parts.deviceName = 2 + utf8Encode(deviceName).byteLength;
  if (includeServiceUuid && serviceUuid) parts.serviceUuid = 2 + serviceUuidBytes(serviceUuid);
  if (manufacturerId != null || manufacturerData) {
    parts.manufacturerData = 2 + 2 + utf8Encode(manufacturerData).byteLength;
  }

  const totalBytes = parts.deviceName + parts.serviceUuid + parts.manufacturerData;
  if (totalBytes > maxBytes) errors.push(`广播包 ${totalBytes} 字节，超过 ${maxBytes} 字节限制`);

  return {
    valid: errors.length === 0,
    errors,
    totalBytes,
    parts,
    normalized: { deviceName, serviceUuid, manufacturerId, manufacturerData }
  };
}
