// OTA Manager for UniApp (ESP32 Firmware Flash Protocol)
// Matches Flutter's MTU 247 + 20ms chunk ruleset.
// Success requires an explicit device status notification — byte transfer alone is not enough.

import {
  getSession,
  setMtu,
  setNotifyEnabled,
  subscribe,
  writeValue
} from '../services/ble-runtime/index.js';

export const OTA_UUIDS = {
  SERVICE_OTA: "4fafc201-1fb5-459e-8fcc-c5c9c331914d",
  CHAR_CTRL: "beb5483e-36e1-4688-b7f5-ea07361b26c0",
  CHAR_DATA: "beb5483e-36e1-4688-b7f5-ea07361b26c1",
  CHAR_STATUS: "beb5483e-36e1-4688-b7f5-ea07361b26c2"
};

const DEFAULT_CONFIRM_TIMEOUT_MS = 30000;

const defaultRuntime = { getSession, setMtu, setNotifyEnabled, subscribe, writeValue };

function toUint8Array(value) {
  if (value == null) return new Uint8Array();
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value)) return Uint8Array.from(value);
  return new Uint8Array();
}

function decodeUtf8(bytes) {
  if (typeof TextDecoder === 'function') {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
  let text = '';
  for (let i = 0; i < bytes.length; i += 1) text += String.fromCharCode(bytes[i]);
  try {
    return decodeURIComponent(escape(text));
  } catch {
    return text;
  }
}

/**
 * Parse OTA status notification payload.
 * Accepts documented `{ "status": "success" }` and Flutter-shaped `{ "type":"ota", "status":"..." }`.
 * @returns {{ kind: 'success'|'failure'|'progress'|'ignored', message?: string, raw?: object } }
 */
export function parseOtaStatusPayload(value) {
  const bytes = toUint8Array(value);
  if (!bytes.length) return { kind: 'ignored' };

  let text = decodeUtf8(bytes).trim();
  if (!text) return { kind: 'ignored' };

  // Some stacks wrap JSON in a trailing null.
  if (text.charCodeAt(text.length - 1) === 0) text = text.slice(0, -1).trim();

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { kind: 'ignored' };
  }

  if (!payload || typeof payload !== 'object') return { kind: 'ignored' };
  if (payload.type != null && payload.type !== 'ota') return { kind: 'ignored' };

  const status = String(payload.status || '').toLowerCase();
  if (status === 'success') return { kind: 'success', message: payload.message, raw: payload };
  if (status === 'error' || status === 'failed' || status === 'failure') {
    return { kind: 'failure', message: payload.message || payload.error || '设备报告 OTA 失败', raw: payload };
  }
  if (status === 'progress' || status === 'ready' || status === 'accepted' || status === 'verified') {
    return { kind: 'progress', message: payload.message, raw: payload };
  }
  return { kind: 'ignored', raw: payload };
}

export class OtaManager {
  constructor(deviceId, logCallback, options = {}) {
    this.deviceId = deviceId;
    this.logCallback = logCallback || (() => {});
    this.isTransmitting = false;
    this.totalBytes = 0;
    this.sentBytes = 0;
    this._statusUnsubscribe = null;
    this._statusSession = null;
    this._progressCallback = null;
    this._statusEnabled = false;
    this._confirmResolve = null;
    this._confirmReject = null;
    this._confirmTimer = null;
    this._pendingTerminal = null;
    this.runtime = options.runtime || defaultRuntime;
    this.delay = options.delay || ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.confirmTimeoutMs = Number.isFinite(options.confirmTimeoutMs)
      ? options.confirmTimeoutMs
      : DEFAULT_CONFIRM_TIMEOUT_MS;
  }

  get session() {
    const session = this.runtime.getSession(this.deviceId);
    if (!session) throw new Error('OTA requires an active BLE session');
    return session;
  }

  log(msg) {
    this.logCallback('OTA', msg);
  }

  _clearConfirmWait(result) {
    if (this._confirmTimer) {
      clearTimeout(this._confirmTimer);
      this._confirmTimer = null;
    }
    const resolve = this._confirmResolve;
    const reject = this._confirmReject;
    this._confirmResolve = null;
    this._confirmReject = null;
    if (result?.ok && resolve) resolve(result);
    else if (result && !result.ok && reject) reject(new Error(result.error || 'OTA confirmation failed'));
  }

  _settleTerminal(result) {
    if (this._confirmResolve || this._confirmReject) {
      this._clearConfirmWait(result);
      return;
    }
    this._pendingTerminal = result;
  }

  _handleStatusValue(value) {
    const parsed = parseOtaStatusPayload(value);
    if (parsed.kind === 'ignored') {
      const bytes = toUint8Array(value);
      this.log(`OTA Status Data: ${Array.from(bytes).join(',')}`);
      return;
    }

    this.log(`OTA Status: ${parsed.kind}${parsed.message ? ` (${parsed.message})` : ''}`);

    if (parsed.kind === 'progress' && this._progressCallback && parsed.raw?.percent != null) {
      const percent = Number(parsed.raw.percent);
      if (Number.isFinite(percent) && this.totalBytes > 0) {
        const sent = Math.min(this.totalBytes, Math.floor((percent / 100) * this.totalBytes));
        this._progressCallback(sent, this.totalBytes, { phase: 'device', percent });
      }
      return;
    }

    if (parsed.kind === 'success') {
      this._settleTerminal({ ok: true, status: parsed.raw });
      return;
    }

    if (parsed.kind === 'failure') {
      this.isTransmitting = false;
      this._settleTerminal({ ok: false, error: parsed.message || '设备报告 OTA 失败' });
    }
  }

  async setupStatusListener(onProgress) {
    this._progressCallback = onProgress;
    this._statusUnsubscribe?.();
    const session = this.session;
    this._statusSession = session;
    this._statusUnsubscribe = await this.runtime.subscribe(
      session,
      OTA_UUIDS.SERVICE_OTA,
      OTA_UUIDS.CHAR_STATUS,
      (value) => this._handleStatusValue(value)
    );
    this._statusEnabled = true;
  }

  _waitForDeviceConfirmation() {
    if (this._pendingTerminal) {
      const pending = this._pendingTerminal;
      this._pendingTerminal = null;
      if (pending.ok) return Promise.resolve(pending);
      return Promise.reject(new Error(pending.error || 'OTA confirmation failed'));
    }

    return new Promise((resolve, reject) => {
      this._confirmResolve = resolve;
      this._confirmReject = reject;
      this._confirmTimer = setTimeout(() => {
        this._confirmResolve = null;
        this._confirmReject = null;
        this._confirmTimer = null;
        reject(new Error('等待设备 OTA 确认超时'));
      }, this.confirmTimeoutMs);
    });
  }

  async requestMtu() {
    try {
      await this.runtime.setMtu(this.session, 247);
      this.log('MTU expanded to 247');
      return true;
    } catch (error) {
      this.log(`MTU expansion failed (or not supported): ${JSON.stringify(error)}`);
      return false;
    }
  }

  async startOta(fileBuffer, onProgress, onError, onSuccess) {
    try {
      if (!fileBuffer || !Number.isFinite(fileBuffer.byteLength) || fileBuffer.byteLength <= 0) {
        throw new Error('firmware file is empty');
      }
      if (this.isTransmitting) throw new Error('OTA transfer already in progress');
      this.isTransmitting = true;
      this._pendingTerminal = null;
      this.totalBytes = fileBuffer.byteLength;
      this.sentBytes = 0;

      await this.requestMtu();
      if (!this.isTransmitting) throw new Error('OTA Cancelled');
      await this.setupStatusListener(onProgress);
      if (!this.isTransmitting) throw new Error('OTA Cancelled');

      this.log(`Starting OTA transfer: ${this.totalBytes} bytes`);

      const CHUNK_SIZE = 180;
      const dataView = new Uint8Array(fileBuffer);

      for (let offset = 0; offset < this.totalBytes; offset += CHUNK_SIZE) {
        if (!this.isTransmitting) {
          throw new Error('OTA Cancelled');
        }

        const end = Math.min(offset + CHUNK_SIZE, this.totalBytes);
        const chunk = dataView.slice(offset, end);

        await this._writeChunk(chunk.buffer);

        this.sentBytes = end;
        if (this._progressCallback) {
          this._progressCallback(this.sentBytes, this.totalBytes, { phase: 'transfer' });
        }

        await this.delay(20);
      }

      if (!this.isTransmitting) throw new Error('OTA Cancelled');

      this.log('Firmware bytes written; waiting for device status confirmation');
      if (this._progressCallback) {
        this._progressCallback(this.sentBytes, this.totalBytes, { phase: 'confirm' });
      }

      await this._waitForDeviceConfirmation();
      if (!this.isTransmitting) throw new Error('OTA Cancelled');

      this.log('OTA Flash confirmed by device');
      if (onSuccess) onSuccess();
      return { ok: true, sentBytes: this.sentBytes, totalBytes: this.totalBytes };
    } catch (e) {
      this.log(`OTA Error: ${e.message}`);
      if (onError) onError(e.message);
      return { ok: false, error: e };
    } finally {
      this.isTransmitting = false;
      this._clearConfirmWait(null);
      if (this._statusEnabled && this._statusSession) {
        await this.runtime.setNotifyEnabled(
          this._statusSession,
          OTA_UUIDS.SERVICE_OTA,
          OTA_UUIDS.CHAR_STATUS,
          false
        ).catch((error) => this.log(`OTA status cleanup failed: ${error?.message || error}`));
      }
      this._statusEnabled = false;
      this._statusSession = null;
      this._statusUnsubscribe?.();
      this._statusUnsubscribe = null;
      this._progressCallback = null;
    }
  }

  cancel() {
    this.isTransmitting = false;
    this._clearConfirmWait({ ok: false, error: 'OTA Cancelled' });
  }

  _writeChunk(buffer) {
    return this.runtime.writeValue(
      this.session,
      OTA_UUIDS.SERVICE_OTA,
      OTA_UUIDS.CHAR_DATA,
      buffer,
      { writeType: 'writeNoResponse' }
    );
  }
}
