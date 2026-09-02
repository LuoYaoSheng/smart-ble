/**
 * Smart BLE OTA Firmware Package 校验（纯 JS，无 Vue/uni/wx 依赖）。
 * DEC-016 / PROTO-011：manifest + binary SHA256；错误包不得进入 BLE OTA Transaction。
 */

export const SUPPORTED_TARGETS = Object.freeze([
  'lightble-peripheral',
  'lightble-observer',
]);

export const MANIFEST_FIELDS = Object.freeze([
  'format_version',
  'target',
  'hardware',
  'firmware_version',
  'size',
  'sha256',
]);

export const ERROR_CODES = Object.freeze({
  OTA_PACKAGE_INVALID: 'OTA_PACKAGE_INVALID',
  OTA_TARGET_MISMATCH: 'OTA_TARGET_MISMATCH',
  OTA_HARDWARE_MISMATCH: 'OTA_HARDWARE_MISMATCH',
  OTA_VERSION_INVALID: 'OTA_VERSION_INVALID',
  OTA_SIZE_MISMATCH: 'OTA_SIZE_MISMATCH',
  OTA_HASH_MISMATCH: 'OTA_HASH_MISMATCH',
});

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SHA256_RE = /^[0-9a-f]{64}$/;

function structuredError(code, message, details = {}) {
  return { code, message, details };
}

function toUint8Array(value) {
  if (value == null) return new Uint8Array(0);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return new Uint8Array(0);
}

async function sha256Hex(bytes) {
  const data = toUint8Array(bytes);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(data).digest('hex');
}

/**
 * @param {object} manifest
 * @param {{ device?: { target?: string, hardware?: string } }} [options]
 */
export function validateFirmwareManifest(manifest, options = {}) {
  const errors = [];
  const device = options.device ?? null;

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {
      valid: false,
      errors: [structuredError(ERROR_CODES.OTA_PACKAGE_INVALID, 'manifest missing or invalid')],
    };
  }

  for (const key of Object.keys(manifest)) {
    if (!MANIFEST_FIELDS.includes(key)) {
      errors.push(structuredError(
        ERROR_CODES.OTA_PACKAGE_INVALID,
        `unexpected field: ${key}`,
        { field: key },
      ));
    }
  }

  for (const field of MANIFEST_FIELDS) {
    if (!(field in manifest)) {
      errors.push(structuredError(
        ERROR_CODES.OTA_PACKAGE_INVALID,
        `missing field: ${field}`,
        { field },
      ));
    }
  }

  if (manifest.format_version !== 1) {
    errors.push(structuredError(
      ERROR_CODES.OTA_PACKAGE_INVALID,
      'format_version must be 1',
      { field: 'format_version', value: manifest.format_version },
    ));
  }

  if (!SUPPORTED_TARGETS.includes(manifest.target)) {
    errors.push(structuredError(
      ERROR_CODES.OTA_PACKAGE_INVALID,
      'unsupported target',
      { field: 'target', value: manifest.target, allowed: [...SUPPORTED_TARGETS] },
    ));
  } else if (device?.target && manifest.target !== device.target) {
    errors.push(structuredError(
      ERROR_CODES.OTA_TARGET_MISMATCH,
      'target does not match device',
      { expected: device.target, actual: manifest.target },
    ));
  }

  if (!manifest.hardware || typeof manifest.hardware !== 'string' || !manifest.hardware.trim()) {
    errors.push(structuredError(
      ERROR_CODES.OTA_PACKAGE_INVALID,
      'hardware is required',
      { field: 'hardware' },
    ));
  } else if (device?.hardware && manifest.hardware !== device.hardware) {
    errors.push(structuredError(
      ERROR_CODES.OTA_HARDWARE_MISMATCH,
      'hardware does not match device',
      { expected: device.hardware, actual: manifest.hardware },
    ));
  }

  if (!SEMVER_RE.test(String(manifest.firmware_version ?? ''))) {
    errors.push(structuredError(
      ERROR_CODES.OTA_VERSION_INVALID,
      'firmware_version must be valid SemVer',
      { field: 'firmware_version', value: manifest.firmware_version },
    ));
  }

  if (!Number.isInteger(manifest.size) || manifest.size <= 0) {
    errors.push(structuredError(
      ERROR_CODES.OTA_PACKAGE_INVALID,
      'size must be a positive integer',
      { field: 'size', value: manifest.size },
    ));
  }

  const sha = String(manifest.sha256 ?? '');
  if (!SHA256_RE.test(sha)) {
    errors.push(structuredError(
      ERROR_CODES.OTA_PACKAGE_INVALID,
      'sha256 must be 64 lowercase hex characters',
      { field: 'sha256', value: manifest.sha256 },
    ));
  }

  return {
    valid: errors.length === 0,
    errors,
    manifest: errors.length === 0 ? { ...manifest } : null,
  };
}

/**
 * @param {object} manifest
 * @param {Uint8Array|ArrayBuffer} binary
 */
export async function validateFirmwareBinary(manifest, binary) {
  const errors = [];
  const bytes = toUint8Array(binary);

  if (!bytes.byteLength) {
    errors.push(structuredError(ERROR_CODES.OTA_PACKAGE_INVALID, 'firmware binary is empty'));
    return { valid: false, errors, sha256: null };
  }

  if (manifest && Number.isInteger(manifest.size) && bytes.byteLength !== manifest.size) {
    errors.push(structuredError(
      ERROR_CODES.OTA_SIZE_MISMATCH,
      'binary size does not match manifest.size',
      { expected: manifest.size, actual: bytes.byteLength },
    ));
  }

  const actualHash = await sha256Hex(bytes);
  if (manifest?.sha256 && actualHash !== manifest.sha256) {
    errors.push(structuredError(
      ERROR_CODES.OTA_HASH_MISMATCH,
      'binary sha256 does not match manifest.sha256',
      { expected: manifest.sha256, actual: actualHash },
    ));
  }

  return {
    valid: errors.length === 0,
    errors,
    sha256: actualHash,
  };
}

/**
 * @param {{ manifest?: object, binary?: Uint8Array|ArrayBuffer, firmware?: Uint8Array|ArrayBuffer }} pkg
 * @param {{ device?: { target?: string, hardware?: string } }} [options]
 */
export async function validateFirmwarePackage(pkg, options = {}) {
  const manifestResult = validateFirmwareManifest(pkg?.manifest, options);
  const binary = pkg?.binary ?? pkg?.firmware;
  const binaryResult = await validateFirmwareBinary(manifestResult.manifest ?? pkg?.manifest, binary);
  const errors = [...manifestResult.errors, ...binaryResult.errors];

  return {
    valid: errors.length === 0,
    errors,
    manifest: manifestResult.manifest,
    sha256: binaryResult.sha256,
  };
}

export { sha256Hex, toUint8Array };
