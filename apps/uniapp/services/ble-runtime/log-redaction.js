/**
 * BLE Runtime 日志脱敏桥 — 实现位于 services/logger。
 */
export {
  REDACT_PLACEHOLDER,
  sanitizeLogValue,
  sanitizeLogObject,
  sanitizeLogString,
  createLogger,
  redact,
  redactLogEntry,
} from '../logger/log-redaction.js';
