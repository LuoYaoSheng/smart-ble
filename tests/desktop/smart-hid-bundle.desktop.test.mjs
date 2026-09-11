/**
 * Smart HID V1 桌面 bundle 向量测试（E-WIN / T-WIN · PARITY-002 协议层）
 *
 * 镜像源：apps/uniapp/services/smart-hid/* + core/ble-core/provisioning/* +
 * core/protocols/hid-provisioning-protocol.ts（stripTypeScriptTypes 剥离后合并）。
 * 断言语义对齐 scripts/check-platform-parity.mjs js 车道（同一向量文件
 * core/protocols/smart-hid-v1-vectors.json）。
 *
 * Run: node --test tests/desktop/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require_ = createRequire(import.meta.url);
const vectors = JSON.parse(readFileSync(resolve(ROOT, 'core/protocols/smart-hid-v1-vectors.json'), 'utf8'));
const { constants, suites } = vectors;

function loadLine(relDir) {
  global.window = {};
  require_(resolve(ROOT, relDir, 'smart-hid.bundle.js'));
  const api = global.window.SmartHid;
  delete global.window;
  return api;
}

const electron = loadLine('apps/desktop/electron/public');
const tauri = loadLine('apps/desktop/tauri/src');

const patternStr = (v) => (v instanceof RegExp ? v.source : String(v));

// ---------------------------------------------------------------------------
// 0. 镜像一致
// ---------------------------------------------------------------------------

test('mirror: smart-hid.bundle.js 在两线间逐字节一致', () => {
  const a = readFileSync(resolve(ROOT, 'apps/desktop/electron/public/smart-hid.bundle.js'), 'utf8');
  const b = readFileSync(resolve(ROOT, 'apps/desktop/tauri/src/smart-hid.bundle.js'), 'utf8');
  assert.equal(a, b);
});

// ---------------------------------------------------------------------------
// 1. constants（正典契约锁）
// ---------------------------------------------------------------------------

test('constants: UUID/前缀/协议版本/正则/帧常量与向量文件一致', () => {
  const H = electron;
  assert.equal(H.SMART_HID_PROVISIONING_SERVICE_UUID, constants.serviceUuid);
  assert.equal(H.SMART_HID_CHARACTERISTIC_UUIDS.INFO, constants.characteristicUuids.info);
  assert.equal(H.SMART_HID_CHARACTERISTIC_UUIDS.INPUT, constants.characteristicUuids.input);
  assert.equal(H.SMART_HID_CHARACTERISTIC_UUIDS.STATUS, constants.characteristicUuids.status);
  assert.equal(H.SMART_HID_NAME_PREFIX, constants.namePrefix);
  assert.equal(H.PROVISIONING_CONSTANTS.PROTOCOL_VERSION, constants.protocolVersion);
  assert.equal(H.PROVISIONING_CONSTANTS.CANDIDATE_VERSION, constants.candidateVersion);
  assert.equal(patternStr(H.PROVISIONING_CONSTANTS.DEVICE_ID_PATTERN), constants.deviceIdPattern);
  assert.equal(patternStr(H.PROVISIONING_CONSTANTS.DEVICE_NAME_PATTERN), constants.deviceNamePattern);
  assert.equal(patternStr(H.PROVISIONING_CONSTANTS.TOKEN_PATTERN), constants.tokenPattern);
  assert.equal(H.FRAME_HEADER_SIZE, constants.frame.headerSize);
  assert.equal(H.MAX_CHUNK_BYTES, constants.frame.maxChunkBytes);
  assert.equal(H.DEFAULT_ATT_MTU, constants.frame.defaultAttMtu);
});

// ---------------------------------------------------------------------------
// 2. qr / candidate / framingMtu / frames（向量全跑）
// ---------------------------------------------------------------------------

test('qr: 全向量（合法/非法 URL 形状）', () => {
  for (const c of suites.qr.cases) {
    const got = electron.parsePairingQrPayload(c.input);
    if (!c.expect.ok) {
      assert.equal(got, null, `${c.id}: expected null, got ${JSON.stringify(got)}`);
    } else {
      assert.ok(got, `${c.id}: expected payload`);
      assert.deepEqual(
        { token: got.token, host: got.host, port: got.port },
        { token: c.expect.token, host: c.expect.host, port: c.expect.port },
        c.id,
      );
    }
  }
});

test('candidate: 全向量（键序锁定 JSON）', () => {
  for (const c of suites.candidate.cases) {
    if (!c.expect.ok) {
      assert.throws(() => electron.buildProvisionCandidateJson(c.input), undefined, c.id);
    } else {
      assert.equal(electron.buildProvisionCandidateJson(c.input), c.expect.json, c.id);
    }
  }
});

test('framingMtu: 全向量', () => {
  for (const c of suites.framingMtu.cases) {
    assert.equal(electron.chunkSizeForMtu(c.mtu), c.expect, c.id);
  }
});

test('frames: 全向量（分帧字节级）', () => {
  const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
  for (const c of suites.frames.cases) {
    const payload = c.payloadHex != null
      ? new Uint8Array((c.payloadHex.match(/../g) || []).map((h) => parseInt(h, 16)))
      : new Uint8Array(c.fill.length).fill(parseInt(c.fill.byte, 16));
    try {
      const got = electron.buildFrames(payload, c.chunkSize).map(hex);
      if (c.expect.ok) assert.deepEqual(got, c.expect.frames, c.id);
      else assert.fail(`${c.id}: expected throw, got ${JSON.stringify(got)}`);
    } catch (e) {
      if (c.expect.ok) assert.fail(`${c.id}: unexpected throw: ${e.message}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 3. profile 识别（F018 桌面入口基础）
// ---------------------------------------------------------------------------

test('profile: UUID 强匹配 / SHID- 前缀弱匹配 / 双无 NONE', () => {
  const H = electron;
  assert.equal(H.smartHidProfile.matchAdvertisement(
    { advertisServiceUUIDs: [constants.serviceUuid] }), H.PROFILE_MATCH.STRONG);
  assert.equal(H.smartHidProfile.matchAdvertisement({ name: 'SHID-00000001' }), H.PROFILE_MATCH.WEAK);
  assert.equal(H.smartHidProfile.matchAdvertisement({ name: 'Other', advertisServiceUUIDs: [] }), H.PROFILE_MATCH.NONE);
  assert.equal(H.smartHidProfile.presentation.chipStrong, 'Smart HID · 强匹配');
});

// ---------------------------------------------------------------------------
// 4. 状态解析与恢复动作（F022 错误分流基础）
// ---------------------------------------------------------------------------

test('status/errorRecovery: 全向量', () => {
  for (const c of suites.status.cases) {
    const got = electron.parseProvisionStatus(c.input);
    if (!c.expect.ok) {
      assert.equal(got, null, `${c.id}: expected null`);
    } else {
      assert.ok(got, c.id);
      assert.deepEqual(
        { state: got.state, step: got.step, error: got.error },
        { state: c.expect.state, step: c.expect.step, error: c.expect.error },
        c.id,
      );
    }
  }
  for (const c of suites.errorRecovery.cases) {
    assert.equal(electron.smartHidRecoveryAction(c.code), c.expect, c.id);
  }
});

// ---------------------------------------------------------------------------
// 5. T-WIN 线行为一致
// ---------------------------------------------------------------------------

test('T-WIN 线协议行为与 E-WIN 一致（抽样）', () => {
  assert.equal(tauri.chunkSizeForMtu(23), electron.chunkSizeForMtu(23));
  assert.deepEqual(
    tauri.parsePairingQrPayload('shid://pair?token=0123456789abcdef0123456789abcdef&host=192.168.1.10&port=17892'),
    electron.parsePairingQrPayload('shid://pair?token=0123456789abcdef0123456789abcdef&host=192.168.1.10&port=17892'),
  );
});
