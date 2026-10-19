/**
 * OTA 契约桌面镜像测试（E-WIN / T-WIN · R-1/R-2 对齐）
 *
 * 镜像源：core/apple/SmartHidCore/Sources/SmartHidCore/OtaContract.swift（Apple 双端共享）。
 * 锁定：
 * 1. 两线 ota-contract.js 逐字节一致；
 * 2. R-2 状态分类器吃固件真实 notifyStatus 帧形状（含 failed/aborted 漏检回归）；
 * 3. R-1 start 帧构造（manifest 有/无 → target/target_version 省略语义）；
 * 4. manifest 六字段解析（legacy version 兼容 + 四类校验错误）；
 * 5. sha256Hex 已知向量（与 Swift CryptoKit 同源事实）。
 *
 * Run: node --test tests/desktop/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { webcrypto } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require_ = createRequire(import.meta.url);

if (!globalThis.crypto) globalThis.crypto = webcrypto;

function loadLine(relDir) {
  global.window = {};
  require_(resolve(ROOT, relDir, 'ota-contract.js'));
  const api = global.window.SmartBLEOtaContract;
  delete global.window;
  return api;
}

const electron = loadLine('apps/desktop/electron/public');
const tauri = loadLine('apps/desktop/tauri/src');
const OC = electron;

// ---------------------------------------------------------------------------
// 1. 镜像一致
// ---------------------------------------------------------------------------

test('mirror: ota-contract.js 在两线间逐字节一致', () => {
  const a = readFileSync(resolve(ROOT, 'apps/desktop/electron/public/ota-contract.js'), 'utf8');
  const b = readFileSync(resolve(ROOT, 'apps/desktop/tauri/src/ota-contract.js'), 'utf8');
  assert.equal(a, b);
});

test('mirror: 两线 index.html 均在 OtaDialog 之前引入 ota-contract.js', () => {
  for (const rel of ['apps/desktop/electron/public/index.html', 'apps/desktop/tauri/src/index.html']) {
    const html = readFileSync(resolve(ROOT, rel), 'utf8');
    const iContract = html.indexOf('ota-contract.js');
    const iDialog = html.indexOf('components/OtaDialog.js');
    assert.ok(iContract > 0 && iDialog > 0 && iContract < iDialog, `${rel} 加载顺序错误`);
  }
});

// ---------------------------------------------------------------------------
// 2. R-2 状态分类器（固件 notifyStatus 真实帧形状）
// ---------------------------------------------------------------------------

test('R-2: ready 帧触发 ready', () => {
  assert.equal(OC.OtaStatusClassifier.classify('{"type":"ota","status":"ready","max_chunk":180}'), 'ready');
});

test('R-2: success + rebooting 触发 success', () => {
  assert.equal(OC.OtaStatusClassifier.classify('{"type":"ota","status":"success","rebooting":true}'), 'success');
});

test('R-2: error 帧（code/detail）触发 error', () => {
  assert.equal(
    OC.OtaStatusClassifier.classify('{"type":"ota","status":"error","code":"OTA_ERR_STATE","detail":"missing_target"}'),
    'error',
  );
});

test('R-2 回归: "failed" 整值不在旧精确匹配集合 → 子串匹配必须命中', () => {
  assert.equal(OC.OtaStatusClassifier.classify('{"event":"failed","code":"OTA_ERR_STATE"}'), 'error');
});

test('R-2 回归: "aborted"（固件 abort 通知）必须命中错误类', () => {
  assert.equal(OC.OtaStatusClassifier.classify('{"type":"ota","status":"aborted"}'), 'error');
});

test('R-2: 版本串等无关帧静默忽略（null）', () => {
  assert.equal(OC.OtaStatusClassifier.classify('1.0.1-cdc'), null);
  assert.equal(OC.OtaStatusClassifier.classify('{"type":"ota","state":"receiving","received":180}'), null);
});

test('R-2: 文本帧直配同样子串匹配', () => {
  assert.equal(OC.OtaStatusClassifier.classify('Device ready'), 'ready');
  assert.equal(OC.OtaStatusClassifier.classify('transfer failed'), 'error');
});

// ---------------------------------------------------------------------------
// 3. R-1 start 帧构造
// ---------------------------------------------------------------------------

test('R-1: 完整 manifest → 六键契约帧', () => {
  const p = OC.OtaStartPayload.build({
    manifestTarget: 'lightble-peripheral',
    manifestVersion: '1.0.1',
    fileSize: 1024,
    chunkSize: 180,
    sha256: 'a'.repeat(64),
  });
  assert.deepEqual(Object.keys(p), ['op', 'size', 'chunk_size', 'sha256', 'target', 'target_version']);
  assert.equal(p.op, 'start');
  assert.equal(p.target, 'lightble-peripheral');
  assert.equal(p.target_version, '1.0.1');
});

test('R-1: 无 manifest → 省略 target/target_version（不伪造枚举/版本）', () => {
  const p = OC.OtaStartPayload.build({
    manifestTarget: null,
    manifestVersion: null,
    fileSize: 512,
    chunkSize: 180,
    sha256: 'b'.repeat(64),
  });
  assert.ok(!('target' in p));
  assert.ok(!('target_version' in p));
  assert.equal(p.op, 'start');
});

test('R-1: 非枚举 target 不进帧', () => {
  const p = OC.OtaStartPayload.build({
    manifestTarget: '1.0.5', // 旧版把版本号当 target 的病，构造层拦截
    manifestVersion: null,
    fileSize: 8,
    chunkSize: 180,
    sha256: 'c'.repeat(64),
  });
  assert.ok(!('target' in p));
});

test('R-1: display 不泄露 sha256 全文', () => {
  const p = OC.OtaStartPayload.build({ manifestTarget: 'lightble-observer', manifestVersion: '2.0.0', fileSize: 3, chunkSize: 180, sha256: 'd'.repeat(64) });
  const d = OC.OtaStartPayload.display(p);
  assert.ok(!d.includes('dddd'));
  assert.ok(d.includes('target=lightble-observer'));
});

// ---------------------------------------------------------------------------
// 4. manifest 解析（六字段 + legacy 兼容 + 四类错误）
// ---------------------------------------------------------------------------

const SIZE = 2048;
const SHA = 'e'.repeat(64);

test('manifest: 契约六字段全过（firmware_version 键）', () => {
  const r = OC.OtaManifest.parse(
    { format_version: '1', target: 'lightble-peripheral', hardware: 'esp32s3', firmware_version: '1.0.1', size: SIZE, sha256: SHA },
    SIZE, SHA,
  );
  assert.equal(r.ok, true);
  assert.equal(r.target, 'lightble-peripheral');
  assert.equal(r.version, '1.0.1');
  assert.deepEqual(r.ignoredKeys, []);
});

test('manifest: legacy "version" 键兼容', () => {
  const r = OC.OtaManifest.parse({ target: 'lightble-observer', version: '0.9.0' }, SIZE, SHA);
  assert.equal(r.ok, true);
  assert.equal(r.version, '0.9.0');
});

test('manifest: target 非枚举 → invalid_target', () => {
  const r = OC.OtaManifest.parse({ target: 'esp32' }, SIZE, SHA);
  assert.equal(r.ok, false);
  assert.equal(r.code, 'invalid_target');
});

test('manifest: 非 SemVer → invalid_semver', () => {
  const r = OC.OtaManifest.parse({ firmware_version: 'v1.0' }, SIZE, SHA);
  assert.equal(r.ok, false);
  assert.equal(r.code, 'invalid_semver');
  // 预发布段合法
  assert.equal(OC.OtaManifest.isSemVer('1.0.1-cdc'), true);
});

test('manifest: size 不符 → size_mismatch；sha 不符 → hash_mismatch', () => {
  assert.equal(OC.OtaManifest.parse({ size: 999 }, SIZE, SHA).code, 'size_mismatch');
  assert.equal(OC.OtaManifest.parse({ sha256: 'f'.repeat(64) }, SIZE, SHA).code, 'hash_mismatch');
});

// ---------------------------------------------------------------------------
// 5. sha256 已知向量 + hex 助手
// ---------------------------------------------------------------------------

test('sha256Hex: 已知向量（空串 / abc）与 Swift CryptoKit 同源事实', async () => {
  const enc = new TextEncoder();
  assert.equal(await OC.OtaManifest.sha256Hex(enc.encode('')),
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(await OC.OtaManifest.sha256Hex(enc.encode('abc')),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('hexToBytes/bytesToUtf8: notify 值 hex → 文本', () => {
  const text = '{"type":"ota","status":"ready"}';
  const hex = Array.from(new TextEncoder().encode(text)).map((b) => b.toString(16).padStart(2, '0')).join('');
  assert.equal(OC.bytesToUtf8(OC.hexToBytes(hex)), text);
});

test('T-WIN 线 API 行为与 E-WIN 一致', () => {
  assert.equal(
    tauri.OtaStatusClassifier.classify('{"status":"failed"}'),
    electron.OtaStatusClassifier.classify('{"status":"failed"}'),
  );
});
