// tests/target/firmware/lib/ota-firmware-simulator.mjs
// Fake OTA client — 模拟 App 正典事务，验证固件状态机语义（无真实 BLE）。

import { createHash } from 'node:crypto';

export const OTA_SVC = '4fafc201-1fb5-459e-8fcc-c5c9c331914d';
export const CHR_CTRL = 'beb5483e-36e1-4688-b7f5-ea07361b26c0';
export const CHR_DATA = 'beb5483e-36e1-4688-b7f5-ea07361b26c1';
export const CHR_STATUS = 'beb5483e-36e1-4688-b7f5-ea07361b26c2';

export const STATES = {
  IDLE: 'OTA_IDLE',
  STARTING: 'OTA_STARTING',
  READY: 'OTA_READY',
  RECEIVING: 'OTA_RECEIVING',
  COMMITTING: 'OTA_COMMITTING',
  SUCCESS: 'OTA_SUCCESS',
  FAILED: 'OTA_FAILED',
  ABORTED: 'OTA_ABORTED',
};

export class OtaFirmwareSimulator {
  constructor() {
    this.state = STATES.IDLE;
    this.expectedSize = 0;
    this.receivedSize = 0;
    this.chunkSize = 180;
    this.target = '';
    this.targetVersion = '';
    this.expectedSha256 = '';
    this.buffer = Buffer.alloc(0);
    this.firmwareVersion = '1.0.0';
    this.faults = {
      wrongSize: false,
      wrongHash: false,
      commitFail: false,
    };
    this.writes = [];
    this.statusEvents = [];
  }

  #emit(status, extra = {}) {
    this.statusEvents.push({ status, ...extra });
  }

  ctrlStart(payload) {
    this.writes.push({ chr: CHR_CTRL, op: 'start', payload });
    if (this.state !== STATES.IDLE && this.state !== STATES.FAILED && this.state !== STATES.ABORTED) {
      this.state = STATES.FAILED;
      this.#emit('error', { code: 'OTA_ERR_STATE' });
      return { ok: false };
    }
    this.state = STATES.STARTING;
    const { target, size, chunk_size, target_version, sha256 } = payload;
    if (target !== 'lightble-peripheral' && target !== 'lightble-observer') {
      this.state = STATES.FAILED;
      this.#emit('error', { code: 'OTA_ERR_STATE', detail: 'invalid_target' });
      return { ok: false };
    }
    if (!size || !target_version || !sha256 || sha256.length !== 64) {
      this.state = STATES.FAILED;
      this.#emit('error', { code: 'OTA_ERR_STATE' });
      return { ok: false };
    }
    if (this.faults.wrongSize) {
      this.state = STATES.FAILED;
      this.#emit('error', { code: 'OTA_ERR_SIZE' });
      return { ok: false };
    }
    this.target = target;
    this.expectedSize = size;
    this.chunkSize = chunk_size || 180;
    this.targetVersion = target_version;
    this.expectedSha256 = sha256.toLowerCase();
    this.receivedSize = 0;
    this.buffer = Buffer.alloc(0);
    this.state = STATES.READY;
    this.#emit('ready', { max_chunk: this.chunkSize });
    this.state = STATES.RECEIVING;
    return { ok: true };
  }

  dataWrite(chunk) {
    this.writes.push({ chr: CHR_DATA, bytes: chunk.length });
    if (this.state !== STATES.RECEIVING) {
      this.state = STATES.FAILED;
      this.#emit('error', { code: 'OTA_ERR_STATE' });
      return { ok: false };
    }
    if (this.receivedSize + chunk.length > this.expectedSize) {
      this.state = STATES.FAILED;
      this.#emit('error', { code: 'OTA_ERR_SIZE', detail: 'overflow' });
      return { ok: false };
    }
    this.buffer = Buffer.concat([this.buffer, chunk]);
    this.receivedSize += chunk.length;
    this.#emit('progress', { received: this.receivedSize, total: this.expectedSize });
    return { ok: true };
  }

  ctrlCommit() {
    this.writes.push({ chr: CHR_CTRL, op: 'commit' });
    if (this.state !== STATES.RECEIVING) {
      this.state = STATES.FAILED;
      this.#emit('error', { code: 'OTA_ERR_STATE' });
      return { ok: false };
    }
    this.state = STATES.COMMITTING;
    if (this.faults.commitFail) {
      this.state = STATES.FAILED;
      this.#emit('error', { code: 'OTA_ERR_FLASH' });
      return { ok: false };
    }
    if (this.receivedSize !== this.expectedSize) {
      this.state = STATES.FAILED;
      this.#emit('error', { code: 'OTA_SIZE_MISMATCH' });
      return { ok: false };
    }
    const actual = createHash('sha256').update(this.buffer).digest('hex');
    const hashOk = this.faults.wrongHash ? false : actual === this.expectedSha256;
    if (!hashOk) {
      this.state = STATES.FAILED;
      this.#emit('error', { code: 'OTA_HASH_MISMATCH' });
      return { ok: false };
    }
    this.firmwareVersion = this.targetVersion;
    this.state = STATES.SUCCESS;
    this.#emit('success', { rebooting: true });
    this.state = STATES.IDLE;
    return { ok: true };
  }

  ctrlAbort() {
    this.writes.push({ chr: CHR_CTRL, op: 'abort' });
    this.state = STATES.ABORTED;
    this.#emit('aborted');
    this.expectedSize = 0;
    this.receivedSize = 0;
    this.buffer = Buffer.alloc(0);
    this.state = STATES.IDLE;
    return { ok: true };
  }

  runHappyPath(firmwareBytes, manifest) {
    const sha256 = createHash('sha256').update(firmwareBytes).digest('hex');
    const start = this.ctrlStart({
      op: 'start',
      target: manifest.target,
      size: firmwareBytes.length,
      chunk_size: 180,
      target_version: manifest.firmware_version,
      sha256,
    });
    if (!start.ok) return start;
    for (let offset = 0; offset < firmwareBytes.length; offset += 180) {
      const chunk = firmwareBytes.subarray(offset, Math.min(offset + 180, firmwareBytes.length));
      const r = this.dataWrite(chunk);
      if (!r.ok) return r;
    }
    return this.ctrlCommit();
  }
}
