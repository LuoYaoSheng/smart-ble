/**
 * BleUtils.js  —  SmartBLE Desktop Shared Utilities
 *
 * Pure functions with zero platform dependencies.
 * Auto-deployed to:
 *   apps/desktop/tauri/src/BleUtils.js
 *   apps/desktop/electron/public/BleUtils.js
 * by core/assets-generator/generate_assets.py
 *
 * DO NOT EDIT the deployed copies — edit this source file only.
 *
 * @module BleUtils
 */

'use strict';

// ─── OTA Protocol Constants ───────────────────────────────────────────────────
/** OTA service / characteristic UUIDs used by ESP32 LightBLE firmware */
const OTA_UUIDS = Object.freeze({
    SERVICE:  '4fafc201-1fb5-459e-8fcc-c5c9c331914d',
    CONTROL:  'beb5483e-36e1-4688-b7f5-ea07361b26c0',
    DATA:     'beb5483e-36e1-4688-b7f5-ea07361b26c1',
    STATUS:   'beb5483e-36e1-4688-b7f5-ea07361b26c4', // FFD4 alias
});

/** Default OTA chunk size in bytes (safe for most BLE stacks at MTU=200) */
const OTA_CHUNK_SIZE = 180;

// ─── Auto-reconnect Constants ────────────────────────────────────────────────
/** Maximum re-connect attempts before giving up (mirrors Flutter & UniApp) */
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * Get exponential backoff delay for a given attempt number.
 * @param {number} attempt  1-indexed attempt count
 * @returns {number}        Delay in milliseconds (2000 / 4000 / 6000)
 */
function reconnectDelay(attempt) {
    return attempt * 2000;
}

// ─── RSSI / Signal Quality ────────────────────────────────────────────────────
/**
 * Convert RSSI (dBm) to a 0–4 signal bar level.
 * Mirrors Flutter `RssiUtils.toSignalLevel()`.
 * @param {number} rssi
 * @returns {0|1|2|3|4}
 */
function rssiToLevel(rssi) {
    if (rssi >= -55)  return 4;
    if (rssi >= -65)  return 3;
    if (rssi >= -75)  return 2;
    if (rssi >= -85)  return 1;
    return 0;
}

/**
 * Convert RSSI to a human-readable label.
 * @param {number} rssi
 * @returns {string}  e.g. "强" | "较强" | "中" | "弱" | "极弱"
 */
function rssiToLabel(rssi) {
    const labels = ['极弱', '弱', '中', '较强', '强'];
    return labels[rssiToLevel(rssi)];
}

/**
 * Render signal bars as an emoji string (for use where SVG is unavailable).
 * @param {number} rssi
 * @returns {string}
 */
function rssiToBars(rssi) {
    const level = rssiToLevel(rssi);
    return '▂▄▆█'.slice(0, level) || '·';
}

// ─── HEX / Binary Utilities ───────────────────────────────────────────────────
/**
 * Convert a byte array (or Uint8Array) to a formatted HEX string.
 * @param {Uint8Array|number[]} bytes
 * @param {string} [sep=' ']  Separator between bytes
 * @returns {string}  e.g. "0A 1B 2C"
 */
function bytesToHex(bytes, sep = ' ') {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(sep);
}

/**
 * Convert a HEX string to a Uint8Array.
 * Tolerates spaces, dashes, and 0x/0X prefixes.
 * @param {string} hex
 * @returns {Uint8Array}
 * @throws {Error} if hex string is malformed
 */
function hexToBytes(hex) {
    const clean = hex.replace(/0x/gi, '').replace(/[^0-9A-Fa-f]/g, '');
    if (clean.length % 2 !== 0) {
        throw new Error(`Hex string has odd length: "${hex}"`);
    }
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Decode a Uint8Array to a UTF-8 string, replacing invalid sequences.
 * @param {Uint8Array|ArrayBuffer} buf
 * @returns {string}
 */
function bytesToUtf8(buf) {
    try {
        return new TextDecoder('utf-8', { fatal: false }).decode(buf);
    } catch {
        // Fallback for environments without TextDecoder
        return String.fromCharCode(...new Uint8Array(buf));
    }
}

/**
 * Encode a UTF-8 string to a Uint8Array.
 * @param {string} str
 * @returns {Uint8Array}
 */
function utf8ToBytes(str) {
    return new TextEncoder().encode(str);
}

/**
 * Validate that a string is valid HEX (optionally space-separated).
 * @param {string} hex
 * @returns {boolean}
 */
function isValidHex(hex) {
    const clean = hex.replace(/\s+/g, '');
    return /^[0-9A-Fa-f]*$/.test(clean) && clean.length % 2 === 0;
}

// ─── UUID Utilities ───────────────────────────────────────────────────────────
/**
 * Normalize a UUID to lowercase with standard dashes.
 * Accepts 4, 8, or 32/36-char inputs.
 * @param {string} uuid
 * @returns {string}
 */
function normalizeUuid(uuid) {
    const clean = uuid.replace(/-/g, '').toLowerCase();
    if (clean.length === 4 || clean.length === 8) return clean;
    if (clean.length === 32) {
        return `${clean.slice(0,8)}-${clean.slice(8,12)}-${clean.slice(12,16)}-${clean.slice(16,20)}-${clean.slice(20)}`;
    }
    return uuid.toLowerCase();
}

/**
 * Compare two UUIDs ignoring case and dashes.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function uuidEqual(a, b) {
    return a.replace(/-/g, '').toLowerCase() === b.replace(/-/g, '').toLowerCase();
}

// ─── Standard BLE Name Maps ───────────────────────────────────────────────────
/**
 * Standard GATT service short-UUID → display name map.
 * Aligned with Rust `get_service_name()` in lib.rs and core/ble-core/utils/data-converter.ts.
 * @type {Record<string, string>}
 */
const BLE_SERVICE_NAMES = Object.freeze({
    '1800': '通用访问',
    '1801': '通用属性',
    '180A': '设备信息',
    '180D': '心率服务',
    '180F': '电池服务',
    '1809': '健康温度计',
    '1812': '人机界面 (HID)',
    '181C': '用户数据',
    '4FAFC201': 'OTA 升级服务',  // custom prefix match
});

/**
 * Standard GATT characteristic short-UUID → display name map.
 * Aligned with Rust `get_characteristic_name()` and data-converter.ts.
 * @type {Record<string, string>}
 */
const BLE_CHAR_NAMES = Object.freeze({
    '2A00': '设备名称',
    '2A01': '外观',
    '2A02': '隐私标志',
    '2A03': '重连地址',
    '2A04': '连接参数',
    '2A05': '服务变更',
    '2A19': '电池电量',
    '2A23': '系统标识符',
    '2A24': '型号',
    '2A25': '序列号',
    '2A26': '固件版本',
    '2A27': '硬件版本',
    '2A28': '软件版本',
    '2A29': '制造商',
    '2A37': '心率测量',
    '2A38': '身体传感器位置',
    'BEB5483E': 'OTA 控制',      // custom prefix match
});

/**
 * Resolve GATT service display name from a UUID.
 * @param {string} uuid
 * @returns {string}
 */
function getServiceName(uuid) {
    const u = uuid.replace(/-/g, '').toUpperCase();
    // Try short 4-hex match (e.g. "1800" from "00001800-...")
    const short4 = u.length >= 8 ? u.substring(4, 8) : u;
    if (BLE_SERVICE_NAMES[short4]) return BLE_SERVICE_NAMES[short4];
    // Try 8-char prefix (custom services)
    const prefix8 = u.substring(0, 8);
    if (BLE_SERVICE_NAMES[prefix8]) return BLE_SERVICE_NAMES[prefix8];
    return '未知服务';
}

/**
 * Resolve GATT characteristic display name from a UUID.
 * @param {string} uuid
 * @returns {string}
 */
function getCharName(uuid) {
    const u = uuid.replace(/-/g, '').toUpperCase();
    const short4 = u.length >= 8 ? u.substring(4, 8) : u;
    if (BLE_CHAR_NAMES[short4]) return BLE_CHAR_NAMES[short4];
    const prefix8 = u.substring(0, 8);
    if (BLE_CHAR_NAMES[prefix8]) return BLE_CHAR_NAMES[prefix8];
    return '未知特征值';
}

// ─── Misc ─────────────────────────────────────────────────────────────────────
/**
 * Promise-based sleep.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Escape HTML special characters to prevent XSS in innerHTML contexts.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format a timestamp (ms) as a locale time string.
 * @param {number} [ts=Date.now()]
 * @returns {string}  e.g. "14:03:22"
 */
function formatTime(ts = Date.now()) {
    return new Date(ts).toLocaleTimeString();
}

// ─── Exports ──────────────────────────────────────────────────────────────────
// Compatible with plain <script> tag (global) and ESM/CommonJS bundlers.
const BleUtils = {
    // Constants
    OTA_UUIDS,
    OTA_CHUNK_SIZE,
    MAX_RECONNECT_ATTEMPTS,
    BLE_SERVICE_NAMES,
    BLE_CHAR_NAMES,
    // RSSI
    rssiToLevel,
    rssiToLabel,
    rssiToBars,
    // Data conversion
    bytesToHex,
    hexToBytes,
    bytesToUtf8,
    utf8ToBytes,
    isValidHex,
    // UUID
    normalizeUuid,
    uuidEqual,
    getServiceName,
    getCharName,
    // Reconnect
    reconnectDelay,
    // Misc
    sleep,
    escapeHtml,
    formatTime,
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BleUtils;       // CommonJS (Electron main / Node test)
} else if (typeof window !== 'undefined') {
    window.BleUtils = BleUtils;      // Browser / Tauri WebView
}
