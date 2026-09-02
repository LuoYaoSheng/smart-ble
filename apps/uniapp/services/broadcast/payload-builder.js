/**
 * Broadcast payload builder — 31/32 byte budget, no silent truncate.
 */

import {
  MAX_LEGACY_ADVERTISING_BYTES,
  analyzeAdvertisingPayload,
  normalizeServiceUuid,
  parseManufacturerId,
  manufacturerDataBuffer,
  DEFAULT_ADVERTISING_PAYLOAD,
} from '../../utils/advertising-payload.js';
import { utf8Encode } from '../../../../core/ble-core/provisioning/framing.js';

export const PAYLOAD_ERROR = Object.freeze({
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INVALID_FIELD: 'INVALID_FIELD',
});

export { MAX_LEGACY_ADVERTISING_BYTES, DEFAULT_ADVERTISING_PAYLOAD, manufacturerDataBuffer };

function utf8ByteLength(value) {
  return utf8Encode(String(value || '')).byteLength;
}

function serviceDataBytes(uuid, data) {
  if (!uuid && !data) return 0;
  const compact = String(uuid || '').replace(/-/g, '');
  const uuidLen = compact.length === 4 ? 2 : compact.length === 8 ? 4 : 16;
  return 2 + uuidLen + utf8ByteLength(data);
}

export function createPayloadError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = { code, message, ...details };
  return error;
}

/**
 * Build a normalized BLE advertising payload from business fields.
 * @param {object} input
 * @param {object} [options]
 * @param {number} [options.maxBytes=31]
 * @param {boolean} [options.allow32=false] - platforms that accept 32-byte packs
 * @param {boolean} [options.includeDeviceName=true]
 * @param {boolean} [options.includeServiceUuid=true]
 */
export function buildBroadcastPayload(input = {}, options = {}) {
  const allow32 = Boolean(options.allow32);
  const maxBytes = options.maxBytes ?? (allow32 ? 32 : MAX_LEGACY_ADVERTISING_BYTES);
  const analysis = analyzeAdvertisingPayload(input, {
    includeDeviceName: options.includeDeviceName ?? true,
    includeServiceUuid: options.includeServiceUuid ?? true,
    maxBytes: Number.MAX_SAFE_INTEGER, // size gate applied below (no silent truncate)
  });

  let serviceDataUuid = '';
  let serviceData = String(input.serviceData || '');
  try {
    serviceDataUuid = input.serviceDataUuid ? normalizeServiceUuid(input.serviceDataUuid) : '';
  } catch (error) {
    analysis.errors.push(error.message);
  }

  const serviceDataPart = serviceDataBytes(serviceDataUuid, serviceData);
  const totalBytes = analysis.totalBytes + serviceDataPart;
  const parts = {
    ...analysis.parts,
    serviceData: serviceDataPart,
  };

  const overBudget = totalBytes > maxBytes;
  if (overBudget) {
    analysis.errors.push(`广播包 ${totalBytes} 字节，超过 ${maxBytes} 字节限制`);
  }

  // 32 bytes: only when explicitly allowed; otherwise PAYLOAD_TOO_LARGE
  if (totalBytes === 32 && !allow32 && maxBytes < 32) {
    // already over 31 → covered by overBudget
  }

  const valid = analysis.errors.length === 0 && !overBudget;
  const payload = {
    valid,
    errors: analysis.errors,
    totalBytes,
    overBudget,
    maxBytes,
    parts,
    manufacturerData: analysis.normalized.manufacturerData,
    manufacturerId: analysis.normalized.manufacturerId,
    serviceUuid: analysis.normalized.serviceUuid,
    deviceName: analysis.normalized.deviceName,
    serviceDataUuid,
    serviceData,
    manufacturer: analysis.normalized.manufacturerId != null
      ? {
        id: analysis.normalized.manufacturerId,
        data: analysis.normalized.manufacturerData,
      }
      : null,
    serviceDataBlock: serviceDataUuid || serviceData
      ? { uuid: serviceDataUuid, data: serviceData }
      : null,
    normalized: {
      ...analysis.normalized,
      serviceDataUuid,
      serviceData,
    },
  };

  if (!valid && overBudget) {
    payload.error = createPayloadError(
      PAYLOAD_ERROR.PAYLOAD_TOO_LARGE,
      `PAYLOAD_TOO_LARGE: ${totalBytes} > ${maxBytes}`,
      { totalBytes, maxBytes },
    );
  }

  return payload;
}

export function assertBroadcastPayload(input = {}, options = {}) {
  const payload = buildBroadcastPayload(input, options);
  if (!payload.valid) {
    throw payload.error || createPayloadError(
      PAYLOAD_ERROR.INVALID_FIELD,
      payload.errors[0] || 'invalid broadcast payload',
      { errors: payload.errors },
    );
  }
  return payload;
}

export function parseManufacturerIdSafe(value) {
  return parseManufacturerId(value);
}
