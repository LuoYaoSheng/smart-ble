/**
 * BLE GATT Codec（纯函数）：HEX/TEXT 校验与编解码、Read 展示、Write payload 归一化。
 * 不实现 MTU 分包；暴露 length 供 write-queue / OTA 使用。
 */

const HEX_ERROR = {
  EMPTY_HEX: 'EMPTY_HEX',
  INVALID_HEX_CHARACTER: 'INVALID_HEX_CHARACTER',
  ODD_HEX_LENGTH: 'ODD_HEX_LENGTH',
};

function toUint8Array(value) {
  if (value == null) return new Uint8Array(0);
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (Array.isArray(value)) {
    return Uint8Array.from(value.map((b) => Number(b) & 0xff));
  }
  return null;
}

/** 规范化 HEX：去空白/冒号/换行，转大写 */
export function normalizeHexString(value) {
  if (value == null) return '';
  return String(value)
    .replace(/[\s:_\-]+/g, '')
    .toUpperCase();
}

/**
 * @returns {{ valid: boolean, error: string|null, code?: string, normalized?: string }}
 */
export function validateHexInput(value) {
  if (value == null || String(value).trim() === '') {
    return { valid: false, error: 'EMPTY_HEX', code: HEX_ERROR.EMPTY_HEX };
  }
  const normalized = normalizeHexString(value);
  if (!normalized) {
    return { valid: false, error: 'EMPTY_HEX', code: HEX_ERROR.EMPTY_HEX };
  }
  if (!/^[0-9A-F]*$/.test(normalized)) {
    return { valid: false, error: 'INVALID_HEX_CHARACTER', code: HEX_ERROR.INVALID_HEX_CHARACTER };
  }
  if (normalized.length % 2 !== 0) {
    return { valid: false, error: 'ODD_HEX_LENGTH', code: HEX_ERROR.ODD_HEX_LENGTH };
  }
  return { valid: true, error: null, normalized };
}

/**
 * @returns {{ ok: boolean, data?: Uint8Array, error?: string, code?: string }}
 */
export function parseHexInput(value) {
  const check = validateHexInput(value);
  if (!check.valid) {
    return { ok: false, error: check.error, code: check.code };
  }
  const hex = check.normalized;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return { ok: true, data: out };
}

/** UTF-8 编码；空字符串允许 → 空 Uint8Array */
export function encodeTextInput(value) {
  const text = value == null ? '' : String(value);
  try {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(text);
    }
  } catch {
    /* fall through */
  }
  const bytes = [];
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        const cp = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        bytes.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f),
        );
        i += 1;
        continue;
      }
      bytes.push(0xef, 0xbf, 0xbd);
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return Uint8Array.from(bytes);
}

/** 安全 UTF-8 解码；失败降级为空或替换 */
export function decodeBytes(bytes) {
  const arr = toUint8Array(bytes);
  if (!arr) return '';
  if (!arr.length) return '';
  try {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8', { fatal: false }).decode(arr);
    }
  } catch {
    /* fall through */
  }
  try {
    let s = '';
    for (let i = 0; i < arr.length; i += 1) s += `%${arr[i].toString(16).padStart(2, '0')}`;
    return decodeURIComponent(s);
  } catch {
    try {
      return String.fromCharCode(...arr);
    } catch {
      return '';
    }
  }
}

function formatHexGrouped(bytes) {
  const arr = toUint8Array(bytes) || new Uint8Array(0);
  return [...arr].map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

function looksLikeText(text, byteLength) {
  if (text == null) return false;
  if (byteLength === 0) return true;
  if (!text.length && byteLength > 0) return false;
  // Reject if mostly replacement / control noise
  let printable = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c === 0xfffd) continue;
    if (c === 0x09 || c === 0x0a || c === 0x0d || (c >= 0x20 && c !== 0x7f)) printable += 1;
  }
  return printable / Math.max(text.length, 1) >= 0.8;
}

/**
 * @param {Uint8Array|ArrayBuffer|number[]} bytes
 * @param {'hex'|'text'|'auto'} [mode='auto']
 */
export function formatReadValue(bytes, mode = 'auto') {
  const arr = toUint8Array(bytes) || new Uint8Array(0);
  const hex = formatHexGrouped(arr);
  const text = decodeBytes(arr);
  const m = String(mode || 'auto').toLowerCase();
  if (m === 'hex') return hex;
  if (m === 'text') return text;
  // auto: prefer text when it looks valid
  if (looksLikeText(text, arr.length)) return text;
  return hex;
}

/**
 * Write payload 归一化。
 * @param {string|Uint8Array|ArrayBuffer|number[]} input
 * @param {'hex'|'text'|string} [mode]
 * @returns {{ ok: boolean, bytes?: Uint8Array, length?: number, error?: string, code?: string }}
 */
export function normalizeGattPayload(input, mode = 'hex') {
  if (input instanceof Uint8Array || input instanceof ArrayBuffer || ArrayBuffer.isView(input) || Array.isArray(input)) {
    const bytes = toUint8Array(input) || new Uint8Array(0);
    return { ok: true, bytes, length: bytes.length };
  }

  const m = String(mode || 'hex').toLowerCase();
  if (m === 'text') {
    const bytes = encodeTextInput(input);
    return { ok: true, bytes, length: bytes.length };
  }

  // hex（默认）
  const parsed = parseHexInput(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, code: parsed.code, length: 0 };
  }
  return { ok: true, bytes: parsed.data, length: parsed.data.length };
}

/**
 * Characteristic properties 约束（REQ-024 / TEST-U-009）。
 * @param {string[]} properties
 * @param {string} operation read|write|subscribe|notify|indicate
 */
export function validateCharacteristicProperties(properties, operation) {
  const props = new Set(
    (Array.isArray(properties) ? properties : [])
      .map((p) => String(p || '').toLowerCase())
      .filter(Boolean),
  );
  const op = String(operation || '').toLowerCase();
  if (op === 'subscribe' || op === 'notify') {
    return props.has('notify') || props.has('indicate');
  }
  if (op === 'indicate') return props.has('indicate');
  if (op === 'write') {
    return props.has('write') || props.has('writewithoutresponse') || props.has('write_without_response');
  }
  if (op === 'read') return props.has('read');
  return props.has(op);
}

export const canOperate = validateCharacteristicProperties;

/** 兼容旧布尔式调用：isValidHex / validateHexInput('AABB') === true */
export function isValidHex(value) {
  return validateHexInput(value).valid;
}

export { HEX_ERROR };
