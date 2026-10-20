/**
 * OTA Manager — Firmware Package Contract BLE transaction state machine.
 * STATUS subscribe → CTRL start → ready → DATA → CTRL commit → success → verify.
 *
 * 纯核心：不 import ble-runtime（由 utils/ota_manager.js 注入 defaultRuntime）。
 */

import { validateFirmwarePackage, ERROR_CODES, toUint8Array } from './package-validator.js';
import { parseFirmwarePackage } from './firmware-package.js';
import { createLogger } from '../logger/log-redaction.js';

const log = createLogger('ota-manager');

export const OTA_UUIDS = Object.freeze({
  SERVICE_OTA: '4fafc201-1fb5-459e-8fcc-c5c9c331914d',
  CHAR_CTRL: 'beb5483e-36e1-4688-b7f5-ea07361b26c0',
  CHAR_DATA: 'beb5483e-36e1-4688-b7f5-ea07361b26c1',
  CHAR_STATUS: 'beb5483e-36e1-4688-b7f5-ea07361b26c2',
});

export const DEVICE_INFO_UUIDS = Object.freeze({
  SERVICE: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  CHAR_CONTROL: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
});

export const OTA_STATE = Object.freeze({
  IDLE: 'IDLE',
  VALIDATING: 'VALIDATING',
  CONNECTING: 'CONNECTING',
  SUBSCRIBING: 'SUBSCRIBING',
  STARTING: 'STARTING',
  READY: 'READY',
  TRANSFERRING: 'TRANSFERRING',
  COMMITTING: 'COMMITTING',
  VERIFYING: 'VERIFYING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

const OTA_OWNER = Object.freeze({ type: 'WORKFLOW', id: 'ota-manager' });
const DEFAULT_CONFIRM_TIMEOUT_MS = 30000;
const DEFAULT_READY_TIMEOUT_MS = 30000;
const DEFAULT_CHUNK_DELAY_MS = 20;
const DEFAULT_MTU = 247;
const DEFAULT_CHUNK_SIZE = 180;
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function createOtaRuntime(runtime = {}) {
  return {
    getSession: runtime.getSession,
    setMtu: runtime.setMtu,
    setNotifyEnabled: runtime.setNotifyEnabled,
    subscribe: runtime.subscribe,
    subscribeConnectionState: runtime.subscribeConnectionState,
    writeValue: runtime.writeValue,
    readValue: runtime.readValue,
    closeDevice: runtime.closeDevice,
    connectDevice: runtime.connectDevice,
    setSessionOwner: runtime.setSessionOwner,
    cancelReconnect: runtime.cancelReconnect,
    chunkForMtu: runtime.chunkForMtu,
  };
}

function normUuid(value) {
  return String(value || '').replace(/-/g, '').toLowerCase();
}

function sameUuid(a, b) {
  return normUuid(a) === normUuid(b);
}

function decodeUtf8(bytes) {
  const data = toUint8Array(bytes);
  if (typeof TextDecoder === 'function') {
    return new TextDecoder('utf-8', { fatal: false }).decode(data);
  }
  let text = '';
  for (let i = 0; i < data.length; i += 1) text += String.fromCharCode(data[i]);
  try {
    return decodeURIComponent(escape(text));
  } catch {
    return text;
  }
}

function encodeJson(value) {
  const text = JSON.stringify(value);
  const bytes = typeof TextEncoder === 'function'
    ? new TextEncoder().encode(text)
    : Uint8Array.from([...text].map((ch) => ch.charCodeAt(0)));
  return bytes.buffer;
}

/**
 * Parse OTA status notification payload.
 * @returns {{ kind: 'success'|'failure'|'ready'|'progress'|'ignored', message?: string, raw?: object }}
 */
export function parseOtaStatusPayload(value) {
  const bytes = toUint8Array(value);
  if (!bytes.length) return { kind: 'ignored' };

  let text = decodeUtf8(bytes).trim();
  if (!text) return { kind: 'ignored' };
  if (text.charCodeAt(text.length - 1) === 0) text = text.slice(0, -1).trim();

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { kind: 'ignored' };
  }

  if (!payload || typeof payload !== 'object') return { kind: 'ignored' };
  if (payload.type !== 'ota') return { kind: 'ignored' };

  const status = String(payload.status || '').toLowerCase();
  if (status === 'success') return { kind: 'success', message: payload.message, raw: payload };
  if (status === 'ready') return { kind: 'ready', message: payload.message, raw: payload };
  if (status === 'error' || status === 'failed' || status === 'failure' || status === 'aborted') {
    return { kind: 'failure', message: payload.detail || payload.message || payload.error || '设备报告 OTA 失败', raw: payload };
  }
  if (status === 'progress' || status === 'accepted' || status === 'verified') {
    return { kind: 'progress', message: payload.message, raw: payload };
  }
  return { kind: 'ignored', raw: payload };
}

function packageValidationError(result) {
  const first = result?.errors?.[0];
  return {
    ok: false,
    code: first?.code || ERROR_CODES.OTA_PACKAGE_INVALID,
    reason: first?.message || 'OTA package invalid',
    error: first?.message || 'OTA package invalid',
    errors: result?.errors || [],
  };
}

export async function validateOtaPackage(pkg, options = {}) {
  const result = await validateFirmwarePackage(pkg, options);
  if (result.valid) {
    return { ok: true, manifest: result.manifest, sha256: result.sha256, errors: [] };
  }
  return packageValidationError(result);
}

export class OtaManager {
  constructor(deviceId, logCallback, options = {}) {
    this.deviceId = deviceId;
    this.logCallback = logCallback || (() => {});
    this.options = options;
    this.runtime = createOtaRuntime(options.runtime || {});
    this.delay = options.delay || ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.confirmTimeoutMs = Number.isFinite(options.confirmTimeoutMs)
      ? options.confirmTimeoutMs
      : DEFAULT_CONFIRM_TIMEOUT_MS;
    this.readyTimeoutMs = Number.isFinite(options.readyTimeoutMs)
      ? options.readyTimeoutMs
      : (Number.isFinite(options.OTA_READY_TIMEOUT) ? options.OTA_READY_TIMEOUT : DEFAULT_READY_TIMEOUT_MS);

    this._state = OTA_STATE.IDLE;
    this._eventListeners = new Set();
    this.isTransmitting = false;
    this.totalBytes = 0;
    this.sentBytes = 0;
    this._statusUnsubscribe = null;
    this._statusSession = null;
    this._statusEnabled = false;
    this._statusWait = null;
    this._statusTimer = null;
    this._progressCallback = null;
    this._started = false;
    this._cancelled = false;
    this._targetVersion = null;
    this._pendingStatus = null;
  }

  get session() {
    const session = this.runtime.getSession(this.deviceId);
    if (!session) throw new Error('OTA requires an active BLE session');
    return session;
  }

  log(msg) {
    this.logCallback('OTA', msg);
  }

  getOtaState() {
    return this._state;
  }

  onOtaEvent(callback) {
    if (typeof callback !== 'function') return () => {};
    this._eventListeners.add(callback);
    return () => this._eventListeners.delete(callback);
  }

  _emit(event, payload = {}) {
    const envelope = { event, ...payload };
    for (const listener of this._eventListeners) {
      try {
        listener(envelope);
      } catch (error) {
        log.error('event listener failed', error);
      }
    }
  }

  _setState(next) {
    this._state = next;
  }

  validatePackage(pkg, options = {}) {
    return validateOtaPackage(pkg, { ...options, device: options.device || this.options.device });
  }

  validateOtaPackage(pkg, options = {}) {
    return this.validatePackage(pkg, options);
  }

  _resolveInput(input, options = {}) {
    if (input instanceof ArrayBuffer || input instanceof Uint8Array || ArrayBuffer.isView(input)) {
      return {
        pkg: parseFirmwarePackage({ firmware: input, manifest: options.manifest }),
      };
    }
    if (input && typeof input === 'object') {
      return {
        pkg: parseFirmwarePackage(input),
      };
    }
    throw new Error('invalid OTA input');
  }

  _handleStatusValue(value) {
    const parsed = parseOtaStatusPayload(value);
    if (parsed.kind === 'ignored') {
      const bytes = toUint8Array(value);
      this.log(`OTA Status Data: ${Array.from(bytes).join(',')}`);
      return;
    }

    this.log(`OTA Status: ${parsed.kind}${parsed.message ? ` (${parsed.message})` : ''}`);
    if (parsed.kind === 'success' && this._state === OTA_STATE.COMMITTING) this._flashCommitted = true;

    if (parsed.kind === 'progress' && this._progressCallback && parsed.raw?.percent != null) {
      const percent = Number(parsed.raw.percent);
      if (Number.isFinite(percent) && this.totalBytes > 0) {
        const sent = Math.min(this.totalBytes, Math.floor((percent / 100) * this.totalBytes));
        this._progressCallback(sent, this.totalBytes, { phase: 'device', percent });
      }
    }

    if (parsed.kind === 'failure') {
      this.isTransmitting = false;
      this._pendingFailure = Object.assign(new Error(parsed.message || '设备报告 OTA 失败'), { code: 'OTA_DEVICE_FAILED' });
      if (this._statusWait) {
        clearTimeout(this._statusTimer);
        this._statusTimer = null;
        const message = parsed.message || '设备报告 OTA 失败';
        this._statusWait.reject(Object.assign(new Error(message), { code: 'OTA_DEVICE_FAILED' }));
        this._statusWait = null;
      }
      return;
    }

    if (this._statusWait && this._statusWait.expected.has(parsed.kind)) {
      clearTimeout(this._statusTimer);
      this._statusTimer = null;
      const waiter = this._statusWait;
      this._statusWait = null;
      waiter.resolve(parsed);
      return;
    }

    if ((parsed.kind === 'ready' && this._state === OTA_STATE.STARTING)
      || (parsed.kind === 'success' && this._state === OTA_STATE.COMMITTING)) {
      this._pendingStatus = parsed;
    }
  }

  _waitForStatus(expectedKinds, timeoutMs, label) {
    if (this._pendingFailure) return Promise.reject(this._pendingFailure);
    const expected = new Set(Array.isArray(expectedKinds) ? expectedKinds : [expectedKinds]);
    if (this._pendingStatus && expected.has(this._pendingStatus.kind)) {
      const pending = this._pendingStatus;
      this._pendingStatus = null;
      return Promise.resolve(pending);
    }

    return new Promise((resolve, reject) => {
      this._statusWait = {
        expected: new Set(Array.isArray(expectedKinds) ? expectedKinds : [expectedKinds]),
        resolve,
        reject,
      };
      this._statusTimer = setTimeout(() => {
        this._statusWait = null;
        this._statusTimer = null;
        reject(new Error(label || '等待设备 OTA 确认超时'));
      }, timeoutMs);
    });
  }

  _clearStatusWait(reason = null) {
    if (this._statusTimer) {
      clearTimeout(this._statusTimer);
      this._statusTimer = null;
    }
    if (this._statusWait) {
      const { reject } = this._statusWait;
      this._statusWait = null;
      if (reason && reject) {
        reject(new Error(reason));
      }
    }
  }

  async setupStatusListener(onProgress) {
    this._progressCallback = onProgress;
    this._connectionUnsubscribe?.();
    this._connectionUnsubscribe = this.runtime.subscribeConnectionState?.((event) => {
      if (event.deviceId !== this.deviceId || event.connectionState !== 'DISCONNECTED') return;
      if (this._flashCommitted) this._rebootDisconnected = true;
      else if (this.isTransmitting) {
        this._pendingFailure = new Error('OTA 传输期间设备断开，升级结果未确认');
        this.isTransmitting = false;
        this._clearStatusWait(this._pendingFailure.message);
      }
    });
    this._statusUnsubscribe?.();
    const session = this.session;
    this._statusSession = session;
    this._statusUnsubscribe = await this.runtime.subscribe(
      session,
      OTA_UUIDS.SERVICE_OTA,
      OTA_UUIDS.CHAR_STATUS,
      (value) => this._handleStatusValue(value),
    );
    this._statusEnabled = true;
    this._emit('subscribed', {});
  }

  async requestMtu() {
    try {
      await this.runtime.setMtu(this.session, DEFAULT_MTU);
      this.log(`MTU expanded to ${DEFAULT_MTU}`);
      return true;
    } catch (error) {
      this.log(`MTU expansion failed (or not supported): ${JSON.stringify(error)}`);
      return false;
    }
  }

  _assertExactChar(characteristicId, expected, label) {
    if (!sameUuid(characteristicId, expected)) {
      throw Object.assign(new Error(`OTA wrong characteristic UUID for ${label}`), { code: 'OTA_WRONG_UUID' });
    }
  }

  async _writeCtrl(payload) {
    this._assertExactChar(OTA_UUIDS.CHAR_CTRL, OTA_UUIDS.CHAR_CTRL, 'CTRL');
    await this.runtime.writeValue(
      this.session,
      OTA_UUIDS.SERVICE_OTA,
      OTA_UUIDS.CHAR_CTRL,
      encodeJson(payload),
      { writeType: 'write' },
    );
  }

  async _writeDataChunk(buffer) {
    this._assertExactChar(OTA_UUIDS.CHAR_DATA, OTA_UUIDS.CHAR_DATA, 'DATA');
    await this.runtime.writeValue(
      this.session,
      OTA_UUIDS.SERVICE_OTA,
      OTA_UUIDS.CHAR_DATA,
      buffer,
      { writeType: 'writeNoResponse' },
    );
  }

  _acquireOtaOwner() {
    this.runtime.setSessionOwner?.(this.deviceId, OTA_OWNER);
    this.runtime.cancelReconnect?.(this.deviceId);
  }

  _releaseOtaOwner() {
    this.runtime.setSessionOwner?.(this.deviceId, { type: 'SYSTEM', id: 'ble-runtime' });
  }

  _emitProgress(sent, total) {
    const percentage = total > 0 ? Math.min(99, Math.floor((sent / total) * 100)) : 0;
    if (this._progressCallback) {
      this._progressCallback(sent, total, { phase: 'transfer' });
    }
    this._emit('progress', { sent, total, percentage });
  }

  async _validatePackageOrThrow(pkg, options) {
    this._setState(OTA_STATE.VALIDATING);
    const result = await validateOtaPackage(pkg, { device: options.device || this.options.device });
    if (!result.ok) {
      const code = result.code || ERROR_CODES.OTA_PACKAGE_INVALID;
      throw Object.assign(new Error(result.error || result.reason || code), { code });
    }
    this._emit('validated', { manifest: result.manifest });
    return result;
  }

  async _startTransaction(manifest, binary, options) {
    if (this._pendingFailure) throw this._pendingFailure;
    if (this._cancelled || !this.isTransmitting) throw new Error('OTA Cancelled');
    const requestedChunk = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    if (!Number.isInteger(requestedChunk) || requestedChunk < 1) throw new Error('invalid chunk size');
    const chunkSize = Math.min(DEFAULT_CHUNK_SIZE, requestedChunk, Math.max(1, (this.session?.mtu || 23) - 3));
    this._chunkSize = chunkSize;
    const payload = {
      op: 'start',
      target: manifest.target,
      hardware: manifest.hardware,
      size: binary.byteLength,
      chunk_size: chunkSize,
      target_version: manifest.firmware_version,
      sha256: manifest.sha256,
    };
    this._targetVersion = payload.target_version;
    this._setState(OTA_STATE.STARTING);
    this._pendingStatus = null;
    this._started = true;
    await this._writeCtrl(payload);
    this._emit('start_sent', { payload });
  }

  async _waitReady() {
    this._setState(OTA_STATE.STARTING);
    const ready = await this._waitForStatus('ready', this.readyTimeoutMs, 'OTA ready timeout');
    const limit = ready.raw?.max_chunk;
    if (limit != null && (!Number.isInteger(limit) || limit < 1)) throw new Error('invalid max_chunk');
    this._chunkSize = Math.min(this._chunkSize, limit || this._chunkSize);
    this._setState(OTA_STATE.READY);
    this._emit('ready', {});
  }

  async _transferData(binary) {
    this._setState(OTA_STATE.TRANSFERRING);
    const chunks = [];
    const bytes = toUint8Array(binary);
    for (let offset = 0; offset < bytes.length; offset += this._chunkSize) {
      chunks.push(bytes.slice(offset, Math.min(offset + this._chunkSize, bytes.length)));
    }

    for (const chunk of chunks) {
      if (this._pendingFailure) throw this._pendingFailure;
      if (this._cancelled || !this.isTransmitting) throw new Error('OTA Cancelled');
      const payload = chunk.byteOffset === 0 && chunk.byteLength === chunk.buffer.byteLength
        ? chunk.buffer
        : chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
      await this._writeDataChunk(payload);
      this.sentBytes = Math.min(this.totalBytes, this.sentBytes + chunk.byteLength);
      this._emitProgress(this.sentBytes, this.totalBytes);
      await this.delay(DEFAULT_CHUNK_DELAY_MS);
    }
  }

  async _commitAndWaitSuccess() {
    this._pendingStatus = null;
    this._setState(OTA_STATE.COMMITTING);
    await this._writeCtrl({ op: 'commit' });
    this._emit('commit_sent', {});
    await this._waitForStatus('success', this.confirmTimeoutMs, '等待设备 OTA 确认超时');
  }

  async _verifyFirmwareVersion(expectedVersion, options) {
    this._setState(OTA_STATE.VERIFYING);
    for (let elapsed = 0; !this._rebootDisconnected && elapsed < this.confirmTimeoutMs; elapsed += 100) {
      if (this._cancelled) throw new Error('OTA Cancelled');
      const current = this.runtime.getSession(this.deviceId);
      if (!current || current.dead || current.connectionState === 'DISCONNECTED') { this._rebootDisconnected = true; break; }
      await this.delay(100);
    }
    if (!this._rebootDisconnected) throw Object.assign(new Error('设备提交后未断开重启，不能确认升级完成'), { code: 'OTA_REBOOT_TIMEOUT' });
    await this.delay(1000);
    let reconnectError;
    for (let attempt = 0; attempt < 10; attempt++) {
      if (this._cancelled) throw new Error('OTA Cancelled');
      try { await this.runtime.connectDevice(this.deviceId, { owner: OTA_OWNER, discover: true }); reconnectError = null; break; }
      catch (error) { reconnectError = error; await this.delay(1000); }
    }
    if (reconnectError) throw reconnectError;
    const session = this.runtime.getSession(this.deviceId);
    if (!session) throw Object.assign(new Error('OTA reconnect failed'), { code: 'OTA_VERIFY_FAILED' });

    const raw = await this.runtime.readValue(
      session,
      DEVICE_INFO_UUIDS.SERVICE,
      DEVICE_INFO_UUIDS.CHAR_CONTROL,
      options.verifyTimeoutMs || 5000,
    );
    const text = decodeUtf8(raw).trim();
    let info;
    try {
      info = JSON.parse(text);
    } catch {
      throw Object.assign(new Error('OTA version read failed'), { code: 'OTA_VERIFY_FAILED' });
    }
    if (info.type !== 'system_info' || info.hardware !== this._expectedHardware || info.target !== this._expectedTarget) throw new Error('OTA verification identity mismatch');
    const version = info.firmware_version;
    if (!version || version !== expectedVersion) {
      throw Object.assign(new Error('OTA_VERSION_MISMATCH'), { code: 'OTA_VERSION_MISMATCH' });
    }
  }

  _fail(message, code = 'OTA_FAILED') {
    this.isTransmitting = false;
    this._setState(OTA_STATE.FAILED);
    this._emit('failed', { error: message, code });
    const error = Object.assign(new Error(message), { code });
    throw error;
  }

  async _cleanup() {
    this._clearStatusWait();
    if (this._statusEnabled && this._statusSession) {
      await this.runtime.setNotifyEnabled(
        this._statusSession,
        OTA_UUIDS.SERVICE_OTA,
        OTA_UUIDS.CHAR_STATUS,
        false,
      ).catch((error) => this.log(`OTA status cleanup failed: ${error?.message || error}`));
    }
    this._statusEnabled = false;
    this._statusSession = null;
    this._statusUnsubscribe?.();
    this._statusUnsubscribe = null;
    this._connectionUnsubscribe?.();
    this._connectionUnsubscribe = null;
    this._progressCallback = null;
    this._started = false;
    this._pendingStatus = null;
  }

  cancel() {
    return this.cancelOta();
  }

  async cancelOta() {
    const completion = this._completionPromise;
    if (this._cancelled) {
      if (completion) await completion;
      return { ok: false, cancelled: true };
    }
    this._cancelled = true;
    this.isTransmitting = false;
    this._clearStatusWait('OTA Cancelled');

    if (this._started && this._state !== OTA_STATE.VERIFYING) {
      await this._writeCtrl({ op: 'abort' }).catch((error) => {
        this.log(`OTA abort failed: ${error?.message || error}`);
      });
    }

    this._setState(OTA_STATE.CANCELLED);
    this._emit('cancelled', {});
    await this._cleanup();
    if (completion) await completion;
    this._releaseOtaOwner();
    return { ok: false, cancelled: true };
  }

  async startOta(input, onProgress, onError, onSuccess, options = {}) {
    if (input && typeof input === 'object' && typeof onProgress === 'object' && onProgress !== null
      && typeof onProgress.onProgress !== 'function' && typeof onProgress.onError !== 'function'
      && !ArrayBuffer.isView(input) && !(input instanceof ArrayBuffer)) {
      options = onProgress;
      onProgress = options.onProgress;
      onError = options.onError;
      onSuccess = options.onSuccess;
    }

    if (this.isTransmitting || this._completionPromise) return { ok: false, code: 'OTA_BUSY', error: new Error('OTA transfer already in progress') };
    let finishTransaction;
    this._completionPromise = new Promise(resolve => { finishTransaction = resolve; });
    let result = { ok: false };
    this._cancelled = false;
    this._started = false;
    this._targetVersion = null;
    this._pendingFailure = null;
    this._pendingStatus = null;
    this._flashCommitted = false;
    this._rebootDisconnected = false;

    try {
      if (this.isTransmitting) throw new Error('OTA transfer already in progress');

      const { pkg } = this._resolveInput(input, options);
      const binary = toUint8Array(pkg.binary);
      if (!binary.byteLength) throw new Error('firmware file is empty');

      this.isTransmitting = true;
      this.totalBytes = binary.byteLength;
      this.sentBytes = 0;
      this._setState(OTA_STATE.IDLE);

      this._acquireOtaOwner();

      await this._validatePackageOrThrow(pkg, options);

      await this.requestMtu();
      if (this._pendingFailure) throw this._pendingFailure;
      if (!this.isTransmitting || this._cancelled) throw new Error('OTA Cancelled');

      this._setState(OTA_STATE.SUBSCRIBING);
      await this.setupStatusListener(onProgress);
      if (this._pendingFailure) throw this._pendingFailure;
      if (!this.isTransmitting || this._cancelled) throw new Error('OTA Cancelled');

      const manifest = pkg.manifest;
      const infoRaw = await this.runtime.readValue(this.session, DEVICE_INFO_UUIDS.SERVICE, DEVICE_INFO_UUIDS.CHAR_CONTROL, options.verifyTimeoutMs || 5000);
      if (this._pendingFailure) throw this._pendingFailure;
      if (this._cancelled || !this.isTransmitting) throw new Error('OTA Cancelled');
      const info = JSON.parse(decodeUtf8(infoRaw).trim());
      if (info.type !== 'system_info' || !SEMVER_RE.test(info.firmware_version || '') || info.hardware !== manifest.hardware || info.target !== manifest.target) throw new Error('OTA target/hardware mismatch');
      if (info.firmware_version === manifest.firmware_version) throw new Error('device already runs the selected firmware version');
      this._expectedHardware = manifest.hardware;
      this._expectedTarget = manifest.target;

      await this._startTransaction(manifest, binary, options);
      await this._waitReady();
      await this._transferData(binary);

      if (this._pendingFailure) throw this._pendingFailure;
      if (!this.isTransmitting || this._cancelled) throw new Error('OTA Cancelled');

      await this._commitAndWaitSuccess();
      await this._verifyFirmwareVersion(this._targetVersion, options);
      if (this._pendingFailure) throw this._pendingFailure;
      if (!this.isTransmitting || this._cancelled) throw new Error('OTA Cancelled');

      this._setState(OTA_STATE.SUCCESS);
      this._emit('success', { target_version: this._targetVersion });
      if (onSuccess) onSuccess();
      result = { ok: true, sentBytes: this.sentBytes, totalBytes: this.totalBytes, target_version: this._targetVersion };
      return result;
    } catch (error) {
      if (this._started && !this._cancelled && this._state !== OTA_STATE.VERIFYING) {
        try { await this._writeCtrl({ op: 'abort' }); } catch (_) {}
      }
      const message = error?.message || String(error);
      this.log(`OTA Error: ${message}`);
      if (!this._cancelled) {
        this._setState(OTA_STATE.FAILED);
        this._emit('failed', { error: message, code: error?.code || 'OTA_FAILED' });
      }
      if (onError) onError(message);
      result = { ok: false, error, code: error?.code };
      return result;
    } finally {
      this.isTransmitting = false;
      try { await this._cleanup(); this._releaseOtaOwner(); }
      finally { finishTransaction(); this._completionPromise = null; }
    }
  }
}
