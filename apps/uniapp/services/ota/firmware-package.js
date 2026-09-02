/**
 * Smart BLE Firmware Package 模型（manifest + firmware.bin）。
 */

import { ERROR_CODES } from './package-validator.js';

function toUint8Array(value) {
  if (value == null) return new Uint8Array(0);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array(0);
}

/**
 * @param {{ manifest?: object, binary?: Uint8Array|ArrayBuffer, firmware?: Uint8Array|ArrayBuffer }} input
 */
export function parseFirmwarePackage(input = {}) {
  const manifest = input.manifest && typeof input.manifest === 'object'
    ? { ...input.manifest }
    : null;
  const binary = toUint8Array(input.binary ?? input.firmware);
  return { manifest, binary };
}

/**
 * @param {{ manifest?: object, binary?: Uint8Array|ArrayBuffer, firmware?: Uint8Array|ArrayBuffer }} pkg
 */
export function getFirmwareMetadata(pkg) {
  const { manifest } = parseFirmwarePackage(pkg);
  if (!manifest) return null;
  return {
    format_version: manifest.format_version,
    target: manifest.target,
    hardware: manifest.hardware,
    firmware_version: manifest.firmware_version,
    size: manifest.size,
    sha256: manifest.sha256,
  };
}

/**
 * @param {{ manifest?: object, binary?: Uint8Array|ArrayBuffer, firmware?: Uint8Array|ArrayBuffer }} pkg
 * @param {{ target: string, hardware: string }} device
 */
export function isCompatibleFirmwarePackage(pkg, device) {
  const { manifest } = parseFirmwarePackage(pkg);
  if (!manifest) {
    return {
      compatible: false,
      code: ERROR_CODES.OTA_PACKAGE_INVALID,
      message: 'manifest missing',
      details: {},
    };
  }

  if (device?.target && manifest.target !== device.target) {
    return {
      compatible: false,
      code: ERROR_CODES.OTA_TARGET_MISMATCH,
      message: 'target mismatch',
      details: { expected: device.target, actual: manifest.target },
    };
  }

  if (device?.hardware && manifest.hardware !== device.hardware) {
    return {
      compatible: false,
      code: ERROR_CODES.OTA_HARDWARE_MISMATCH,
      message: 'hardware mismatch',
      details: { expected: device.hardware, actual: manifest.hardware },
    };
  }

  return {
    compatible: true,
    code: null,
    message: 'compatible',
    details: {
      target: manifest.target,
      hardware: manifest.hardware,
    },
  };
}
