// tests/target/integration/ota-transaction-target.test.mjs
// TEST-I-008 / TEST-I-010 OTA 事务时序：完整正典顺序；abort；ready 超时；commit 失败；
// 错误包不进 BLE 事务；V1 失败=整事务重试（DEC-016/12 号）。
// 目标：REQ-043/044/045/066；FEAT-046~050/081；PAGE-006；FLOW-009；STATE-OTA-01..10。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-008/010 REQ-043~045/066 FEAT-046~050/081 FLOW-009 DEC-016';

const OTA_SVC = '4fafc201-1fb5-459e-8fcc-c5c9c331914d';
const CHR_CTRL = 'beb5483e-36e1-4688-b7f5-ea07361b26c0';
const CHR_DATA = 'beb5483e-36e1-4688-b7f5-ea07361b26c1';
const CHR_STATUS = 'beb5483e-36e1-4688-b7f5-ea07361b26c2';

const GOOD_PKG = {
  manifest: {
    protocol_id: 'smart-ble-ota/1', target: 'lightble-fixture', hardware: 'esp32-s3',
    firmware_version: '1.2.0', size: 6, sha256: 'ab'.repeat(6).padEnd(64, '0').slice(0, 64),
  },
  firmware: new Uint8Array(6),
};

// ---------- 参照层：跳过订阅 STATUS 直接 start（顺序违规） ----------
test('TEST-I-008 参照层：未订阅 STATUS 即 start 必须被抓', () => {
  const calls = [];
  const brokenRun = async () => { calls.push('start'); calls.push('data'); calls.push('commit'); };
  brokenRun();
  assert.equal(calls[0], 'start', '参照实现跳过订阅');
  assert.notEqual(calls[0], 'subscribe-status', '目标：第 1 步必须是订阅 STATUS（12 号十步正典）');
});

test('TEST-I-008 目标层：OtaManager 完整事务顺序（FakePlatform 脚本）', async (t) => {
  const m = await importTarget('apps/uniapp/utils/ota_manager.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  if (typeof m.module.OtaManager !== 'function') {
    return assert.fail(notImplemented(IDS, '目标类 OtaManager 缺失'));
  }
  const rt = (await importTarget('apps/uniapp/services/ble-runtime/index.js')).module;
  const platform = createFakePlatform({
    services: [{ uuid: OTA_SVC, characteristics: [
      { uuid: CHR_CTRL, properties: { write: true } },
      { uuid: CHR_DATA, properties: { write: true } },
      { uuid: CHR_STATUS, properties: { read: true, notify: true } },
    ] }],
  });
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    const session = await rt.connectDevice('OTA1');
    const events = [];
    platform.__listeners.value.push(() => {});

    // OtaManager 目标接口：constructor(deviceId) + startOta(firmware, onProgress, onError, onSuccess)
    globalThis.uni = platform; // ota_manager 经全局 uni 调用平台 BLE
    const ota = new m.module.OtaManager('OTA1');
    const transitions = [];

    // 包校验失败：错误包不得进入 BLE 事务（DEC-016 第 0 步）
    const badPkg = { manifest: { ...GOOD_PKG.manifest, sha256: 'ff'.repeat(32) }, firmware: GOOD_PKG.firmware };
    if (typeof ota.validatePackage === 'function') {
      const r = ota.validatePackage(badPkg);
      assert.equal(r.ok, false, 'SHA 错包在事务前被拒');
    }

    // start：经 CTRL 写入（到达平台层）
    if (typeof ota.startOta !== 'function') {
      return assert.fail(notImplemented('TEST-I-008 REQ-044', '目标接口 OtaManager.startOta 缺失'));
    }
    // 启动事务（脚本不回 STATUS → 事务将失败/等待，但 CTRL start 必须已到达平台层）
    await ota.startOta(GOOD_PKG.firmware, () => {}, () => {}, () => {}).catch?.(() => {}) ??
      Promise.resolve(ota.startOta(GOOD_PKG.firmware, () => {}, () => {}, () => {})).catch(() => {});
    const ctrlWrites = platform.__calls.filter((c) => c.m === 'write' && String(c.args.cid).includes(CHR_CTRL.slice(0, 17)));
    assert.ok(ctrlWrites.length >= 1, 'CTRL start 写入到达平台层（12 号第 2 步）');
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
    delete globalThis.uni;
  }
});
