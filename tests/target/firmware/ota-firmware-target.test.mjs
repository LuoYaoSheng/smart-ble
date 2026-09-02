// tests/target/firmware/ota-firmware-target.test.mjs
// TEST-FW-OTA OTA 固件服务端事务：op/start/ready/DATA/commit/SHA256/abort/version。

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { OtaFirmwareSimulator, CHR_CTRL, CHR_DATA, STATES } from './lib/ota-firmware-simulator.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FW_DIR = `${ROOT}/hardware/esp32/LightBLE`;
const FW_FILES = [
  `${FW_DIR}/src/main.cpp`,
  `${FW_DIR}/src/ota_server.cpp`,
  `${FW_DIR}/include/ota_server.h`,
];

function readFirmwareSources() {
  return FW_FILES.filter(existsSync).map((p) => readFileSync(p, 'utf8')).join('\n');
}

const GOOD_MANIFEST = {
  target: 'lightble-peripheral',
  firmware_version: '1.2.0',
};
const FIRMWARE = Buffer.from([1, 2, 3, 4, 5, 6]);
const FIRMWARE_SHA = createHash('sha256').update(FIRMWARE).digest('hex');

test('1 OTA service + CTRL/DATA/STATUS UUID 存在于固件源码', () => {
  const src = readFirmwareSources();
  assert.match(src, /4fafc201-1fb5-459e-8fcc-c5c9c331914d/);
  assert.match(src, /beb5483e-36e1-4688-b7f5-ea07361b26c0/);
  assert.match(src, /beb5483e-36e1-4688-b7f5-ea07361b26c1/);
  assert.match(src, /beb5483e-36e1-4688-b7f5-ea07361b26c2/);
});

test('2 固件 CTRL 支持 op:start（非 action）', () => {
  const src = readFirmwareSources();
  assert.match(src, /"op"/);
  assert.match(src, /strcmp\(op,\s*"start"\)/);
  assert.doesNotMatch(src, /doc\["action"\]/);
});

test('3 invalid target 拒绝', () => {
  const sim = new OtaFirmwareSimulator();
  const r = sim.ctrlStart({
    target: 'wrong-target',
    size: 6,
    chunk_size: 180,
    target_version: '1.0.0',
    sha256: FIRMWARE_SHA,
  });
  assert.equal(r.ok, false);
});

test('4 invalid hash 格式拒绝', () => {
  const sim = new OtaFirmwareSimulator();
  const r = sim.ctrlStart({
    target: 'lightble-peripheral',
    size: 6,
    chunk_size: 180,
    target_version: '1.0.0',
    sha256: 'not-a-hash',
  });
  assert.equal(r.ok, false);
});

test('5 start 后 ready', () => {
  const sim = new OtaFirmwareSimulator();
  sim.ctrlStart({
    target: 'lightble-peripheral',
    size: 6,
    chunk_size: 180,
    target_version: '1.2.0',
    sha256: FIRMWARE_SHA,
  });
  assert.ok(sim.statusEvents.some((e) => e.status === 'ready'));
  assert.equal(sim.state, STATES.RECEIVING);
});

test('6 DATA 顺序写入', () => {
  const sim = new OtaFirmwareSimulator();
  sim.runHappyPath(FIRMWARE, GOOD_MANIFEST);
  const dataWrites = sim.writes.filter((w) => w.chr === CHR_DATA);
  assert.equal(dataWrites.length, 1);
  const ctrlStartIdx = sim.writes.findIndex((w) => w.op === 'start');
  const firstDataIdx = sim.writes.findIndex((w) => w.chr === CHR_DATA);
  assert.ok(ctrlStartIdx >= 0 && firstDataIdx > ctrlStartIdx);
});

test('7 progress 事件', () => {
  const sim = new OtaFirmwareSimulator();
  sim.ctrlStart({
    target: 'lightble-peripheral',
    size: 6,
    chunk_size: 180,
    target_version: '1.2.0',
    sha256: FIRMWARE_SHA,
  });
  sim.dataWrite(FIRMWARE);
  assert.ok(sim.statusEvents.some((e) => e.status === 'progress'));
});

test('8 overflow 拒绝', () => {
  const sim = new OtaFirmwareSimulator();
  sim.ctrlStart({
    target: 'lightble-peripheral',
    size: 2,
    chunk_size: 180,
    target_version: '1.2.0',
    sha256: createHash('sha256').update(Buffer.from([1, 2, 3])).digest('hex'),
  });
  const r = sim.dataWrite(Buffer.from([1, 2, 3]));
  assert.equal(r.ok, false);
});

test('9 wrong size on commit', () => {
  const sim = new OtaFirmwareSimulator();
  sim.ctrlStart({
    target: 'lightble-peripheral',
    size: 6,
    chunk_size: 180,
    target_version: '1.2.0',
    sha256: FIRMWARE_SHA,
  });
  sim.dataWrite(Buffer.from([1, 2]));
  const r = sim.ctrlCommit();
  assert.equal(r.ok, false);
  assert.ok(sim.statusEvents.some((e) => e.code === 'OTA_SIZE_MISMATCH'));
});

test('10 commit success', () => {
  const sim = new OtaFirmwareSimulator();
  const r = sim.runHappyPath(FIRMWARE, GOOD_MANIFEST);
  assert.equal(r.ok, true);
  assert.ok(sim.statusEvents.some((e) => e.status === 'success'));
});

test('11 hash mismatch on commit', () => {
  const sim = new OtaFirmwareSimulator();
  sim.ctrlStart({
    target: 'lightble-peripheral',
    size: 6,
    chunk_size: 180,
    target_version: '1.2.0',
    sha256: 'aa'.repeat(32),
  });
  sim.dataWrite(FIRMWARE);
  const r = sim.ctrlCommit();
  assert.equal(r.ok, false);
});

test('12 abort 清理', () => {
  const sim = new OtaFirmwareSimulator();
  sim.ctrlStart({
    target: 'lightble-peripheral',
    size: 6,
    chunk_size: 180,
    target_version: '1.2.0',
    sha256: FIRMWARE_SHA,
  });
  sim.ctrlAbort();
  assert.ok(sim.statusEvents.some((e) => e.status === 'aborted'));
  assert.equal(sim.receivedSize, 0);
});

test('13 version update after success', () => {
  const sim = new OtaFirmwareSimulator();
  sim.runHappyPath(FIRMWARE, GOOD_MANIFEST);
  assert.equal(sim.firmwareVersion, '1.2.0');
});

test('14 disconnect 语义（源码含 onDisconnect）', () => {
  const src = readFirmwareSources();
  assert.match(src, /onDisconnect/);
  assert.match(src, /OTA_ERR_STATE|disconnect/);
});

test('15 fault injection flags 存在于固件', () => {
  const src = readFirmwareSources();
  assert.match(src, /OtaFaultFlags|wrongSize|wrongHash|commitFail/);
});

test('Fake Client：start→ready→data→commit 完整路径', () => {
  const sim = new OtaFirmwareSimulator();
  const r = sim.runHappyPath(FIRMWARE, GOOD_MANIFEST);
  assert.equal(r.ok, true);
  assert.equal(sim.writes.filter((w) => w.chr === CHR_CTRL && w.op === 'commit').length, 1);
});

test('Fake Client：fault wrongHash', () => {
  const sim = new OtaFirmwareSimulator();
  sim.faults.wrongHash = true;
  sim.ctrlStart({
    target: 'lightble-peripheral',
    size: FIRMWARE.length,
    chunk_size: 180,
    target_version: '1.2.0',
    sha256: FIRMWARE_SHA,
  });
  sim.dataWrite(FIRMWARE);
  const r = sim.ctrlCommit();
  assert.equal(r.ok, false);
});

test('固件源码：SHA256 commit 校验 + NVS 版本', () => {
  const src = readFirmwareSources();
  assert.match(src, /OTA_HASH_MISMATCH|sha256_mismatch|mbedtls_sha256/);
  assert.match(src, /Preferences|fw_version|activeFirmwareVersion/);
});

test('固件源码：串口 JSON ota 事件', () => {
  const src = readFirmwareSources();
  assert.match(src, /"type"\]\s*=\s*"ota"|doc\["type"\]\s*=\s*"ota"/);
  assert.match(src, /Serial\.println/);
});

export const CASE_META = {
  suite: 'ota-firmware',
  target_ids: ['TEST-FW-OTA', 'PROTO-003', 'OTA-FIRMWARE-001'],
};
