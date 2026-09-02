/**
 * Smart HID error model — unified { code, message, details }.
 */

export const HID_ERROR_CODE = Object.freeze({
  HID_DEVICE_NOT_FOUND: 'HID_DEVICE_NOT_FOUND',
  HID_PAIR_FAILED: 'HID_PAIR_FAILED',
  HID_TOKEN_EXPIRED: 'HID_TOKEN_EXPIRED',
  /** QR token lifecycle alias (memory-only 5-minute token). */
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  HID_PROFILE_INVALID: 'HID_PROFILE_INVALID',
  HID_SESSION_CONFLICT: 'HID_SESSION_CONFLICT',
  HID_TIMEOUT: 'HID_TIMEOUT',
});

const DEFAULT_MESSAGES = Object.freeze({
  [HID_ERROR_CODE.HID_DEVICE_NOT_FOUND]: 'Smart HID device not found',
  [HID_ERROR_CODE.HID_PAIR_FAILED]: 'Smart HID pairing failed',
  [HID_ERROR_CODE.HID_TOKEN_EXPIRED]: 'Smart HID pairing token expired',
  [HID_ERROR_CODE.TOKEN_EXPIRED]: 'Pairing token expired',
  [HID_ERROR_CODE.HID_PROFILE_INVALID]: 'Smart HID profile invalid',
  [HID_ERROR_CODE.HID_SESSION_CONFLICT]: 'Smart HID session ownership conflict',
  [HID_ERROR_CODE.HID_TIMEOUT]: 'Smart HID operation timed out',
});

/**
 * @param {string} code
 * @param {string} [message]
 * @param {object} [details]
 */
export function createHidError(code, message, details = {}) {
  const msg = message || DEFAULT_MESSAGES[code] || code;
  const error = new Error(msg);
  error.code = code;
  error.details = { code, message: msg, ...details };
  return error;
}

export function isHidError(error, code) {
  if (!error) return false;
  if (!code) return Boolean(error.code);
  return error.code === code || error.details?.code === code;
}
