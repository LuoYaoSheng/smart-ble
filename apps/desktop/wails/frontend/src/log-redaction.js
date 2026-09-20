//
// SmartBLE Desktop - 统一日志脱敏（F026）
//
// apps/uniapp/services/logger/log-redaction.js 的锁定镜像
// （E-WIN/T-WIN 共用同一字节；F-AND log_redaction.dart / K-AND LogRedaction.kt 同源）。
// 差异仅模块形式：uniapp 为 ESM，桌面为无构建传统脚本，挂全局
// window.SmartBLELogRedaction。接线点 = 渲染端 addLog 漏斗与主进程 debugLog。
//


const REDACT_PLACEHOLDER = '***';

const SENSITIVE_KEY_FRAGMENTS = [
  'token',
  'password',
  'passwd',
  'secret',
  'apikey',
  'privatekey',
  'credential',
  'authorization',
  'cookie',
  'qrtoken',
];

const PROTECTED_KEY_FRAGMENTS = [
  'deviceid',
  'serviceuuid',
  'characteristicuuid',
  'serviceid',
  'characteristicid',
  'firmwareversion',
  'sha256',
];

const STRING_SECRET_PATTERNS = [
  /\bauthorization\s*:\s*Bearer\s+[A-Za-z0-9._-]+/gi,
  /\bBearer\s+[A-Za-z0-9._-]+/gi,
  /\b(access_token|refresh_token|qr_token|api_key|apikey|private_key|authorization|cookie)\s*[=:]\s*[^\s,&}"']+/gi,
  /\b(token|password|passwd|secret|credential|pw)\s*[=:]\s*[^\s,&}"']+/gi,
  /"(access_token|refresh_token|qr_token|api_key|apikey|private_key|authorization|cookie)"\s*:\s*"[^"]*"/gi,
  /"(token|password|passwd|secret|credential)"\s*:\s*"[^"]*"/gi,
];

function normalizeKey(key) {
  return String(key || '').toLowerCase().replace(/[-_]/g, '');
}

function isProtectedKey(key) {
  const normalized = normalizeKey(key);
  if (!normalized) return false;
  if (PROTECTED_KEY_FRAGMENTS.includes(normalized)) return true;
  if (normalized.endsWith('uuid') && (normalized.includes('service') || normalized.includes('characteristic'))) {
    return true;
  }
  return false;
}

function isSensitiveKey(key) {
  if (isProtectedKey(key)) return false;
  const normalized = normalizeKey(key);
  if (!normalized) return false;
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function sanitizeLogValue(value, seen = new WeakSet()) {
  if (value == null) return value;
  if (typeof value === 'string') return sanitizeLogString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'function') return '[Function]';
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeLogString(value.message || ''),
      ...(value.stack ? { stack: sanitizeLogString(value.stack) } : {}),
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, seen));
  }
  if (typeof value === 'object') {
    return sanitizeLogObject(value, seen);
  }
  return value;
}

function sanitizeLogObject(input, seen = new WeakSet()) {
  if (input == null || typeof input !== 'object') {
    return sanitizeLogValue(input, seen);
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeLogValue(item, seen));
  }
  if (seen.has(input)) return '[Circular]';
  seen.add(input);

  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (isSensitiveKey(key)) {
      output[key] = REDACT_PLACEHOLDER;
      continue;
    }
    output[key] = sanitizeLogValue(value, seen);
  }
  return output;
}

function sanitizeLogString(input) {
  if (input == null) return input;
  let text = String(input);
  if (!text) return text;

  const trimmed = text.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(sanitizeLogValue(parsed));
    } catch {
      // fall through to pattern redaction
    }
  }

  let redacted = text;
  for (const pattern of STRING_SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, (match) => {
      if (/^Bearer\s+/i.test(match)) return 'Bearer ***';
      if (/^authorization\s*:\s*Bearer/i.test(match)) return 'authorization: Bearer ***';
      const label = match.split(/[=:]/)[0].trim();
      const sep = match.includes(':') && !match.includes('=') ? ':' : '=';
      return `${label}${sep}***`;
    });
  }
  return redacted;
}

function formatLogArgs(args) {
  return args.map((arg) => {
    if (typeof arg === 'string') return sanitizeLogString(arg);
    return sanitizeLogValue(arg);
  });
}

function createLogger(namespace) {
  const prefix = `[${namespace}]`;

  function write(level, args) {
    const sanitized = formatLogArgs(args);
    const fn = console[level] || console.log;
    fn.call(console, prefix, ...sanitized);
  }

  return {
    debug(...args) {
      write('debug', args);
    },
    info(...args) {
      write('log', args);
    },
    warn(...args) {
      write('warn', args);
    },
    error(...args) {
      write('error', args);
    },
  };
}

/** @deprecated 兼容 TEST-U-013 / ble-runtime 旧入口 */
function redact(entry) {
  if (typeof entry === 'string') return sanitizeLogString(entry);
  if (entry && typeof entry === 'object') return sanitizeLogObject(entry);
  return sanitizeLogValue(entry);
}

const redactLogEntry = redact;

(function (root) {
  root.SmartBLELogRedaction = { REDACT_PLACEHOLDER, sanitizeLogValue, sanitizeLogObject, sanitizeLogString, redact, redactLogEntry };
})(typeof window !== 'undefined' ? window : globalThis);
