// OTA Manager for UniApp (ESP32 Firmware Flash Protocol)
// Matches Flutter's MTU 247 + 20ms chunk ruleset.

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

const defaultRuntime = { getSession, setMtu, setNotifyEnabled, subscribe, writeValue };

export class OtaManager {
  constructor(deviceId, logCallback, options = {}) {
    this.deviceId = deviceId;
    this.logCallback = logCallback || (() => {});
    this.isTransmitting = false;
    this.totalBytes = 0;
    this.sentBytes = 0;
    this._statusCallback = null;
    this._statusUnsubscribe = null;
    this._statusSession = null;
    this._progressCallback = null;
    this._statusEnabled = false;
    this.runtime = options.runtime || defaultRuntime;
    this.delay = options.delay || ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  get session() {
    const session = this.runtime.getSession(this.deviceId);
    if (!session) throw new Error('OTA requires an active BLE session');
    return session;
  }

  log(msg) {
    this.logCallback('OTA', msg);
  }

  // Request MTU expansion
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

  // Subscribe to status
  async setupStatusListener(onProgress, onError, onSuccess) {
    this._progressCallback = onProgress;
    
    this._statusUnsubscribe?.();
    this._statusCallback = (res) => {
      const value = Array.from(new Uint8Array(res));
      this.log(`OTA Status Data: ${value.join(',')}`);
    };
    const session = this.session;
    this._statusSession = session;
    this._statusUnsubscribe = await this.runtime.subscribe(
      session,
      OTA_UUIDS.SERVICE_OTA,
      OTA_UUIDS.CHAR_STATUS,
      this._statusCallback
    );
    this._statusEnabled = true;
  }

  async startOta(fileBuffer, onProgress, onError, onSuccess) {
    try {
      if (!fileBuffer || !Number.isFinite(fileBuffer.byteLength) || fileBuffer.byteLength <= 0) {
        throw new Error('firmware file is empty');
      }
      if (this.isTransmitting) throw new Error('OTA transfer already in progress');
      this.isTransmitting = true;
      this.totalBytes = fileBuffer.byteLength;
      this.sentBytes = 0;

      await this.requestMtu();
      if (!this.isTransmitting) throw new Error('OTA Cancelled');
      await this.setupStatusListener(onProgress, onError, onSuccess);
      if (!this.isTransmitting) throw new Error('OTA Cancelled');

      this.log(`Starting OTA transfer: ${this.totalBytes} bytes`);

      // 1. Send start command to CTRL (Optional depending on ESP32 specific flash logic, we use standard start)
      // Usually, just sending to Data char is enough for basic OTA
      
      // 2. Start chunking (max 180 bytes per chunk as per Flutter spec)
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
          this._progressCallback(this.sentBytes, this.totalBytes);
        }

        // Mandatory 20ms delay
        await this.delay(20);
      }

      this.log('OTA Flash successful!');
      if (onSuccess) onSuccess();
      return { ok: true, sentBytes: this.sentBytes, totalBytes: this.totalBytes };

    } catch (e) {
      this.log(`OTA Error: ${e.message}`);
      if (onError) onError(e.message);
      return { ok: false, error: e };
    } finally {
      this.isTransmitting = false;
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
    }
  }

  cancel() {
    this.isTransmitting = false;
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
