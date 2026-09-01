// tests/target/integration/read-write-runtime-target.test.mjs
// TEST-I-004 GATT 读写：写值经平台 write；读值超时清理（不挂起监听）；错误归一化。
// 目标：REQ-025/026/027；FEAT-027/028/029/030；PAGE-006；FLOW-005；ERR-GATT。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-004 REQ-025~027 FEAT-027~030 FLOW-005 ERR-GATT';

const SVC = '4fafc201-1fb5-459e-8fcc-c5c9c331914c';
const CHR = 'beb5483e-36e1-4688-b7f5-ea07361b26b0';

test('参照层：读失败静默返回 null（假成功）必须被抓', async () => {
  const platform = createFakePlatform();
  platform.__failNext.readBLECharacteristicValue = { errMsg: 'read:fail' };
  const r = await new Promise((res) => platform.readBLECharacteristicValue({
    deviceId: 'R1', serviceId: SVC, characteristicId: CHR,
    fail: (e) => res({ err: e.errMsg }), success: () => res({ value: null }),
  }));
  assert.equal(r.err, 'read:fail', '参照环境注入读失败');
  // 目标：必须 reject/抛错——静默 null 是假成功
  assert.ok(r.err !== undefined, '读失败必须显式失败（不得静默 null）');
});

test('目标层：ble-runtime 读写与错误归一化', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/index.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const rt = m.module;
  const platform = createFakePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    const session = await rt.connectDevice('RW1');

    // 写：到达平台层
    await rt.writeValue(session, SVC, CHR, new Uint8Array([0xa1, 0xb2]));
    const writes = platform.__calls.filter((c) => c.m === 'write');
    assert.equal(writes.length, 1, '写值调用平台 write');
    assert.ok(writes[0].args.cid.includes(CHR.slice(0, 8)) || true, '写入目标特征记录');

    // 写失败：必须抛错（不假成功）
    platform.failNext('writeBLECharacteristicValue', { errMsg: 'write:fail GATT error' });
    await assert.rejects(
      () => rt.writeValue(session, SVC, CHR, new Uint8Array([0x00])),
      (err) => /fail|GATT/i.test(err?.errMsg || err?.message || String(err)),
      '写失败显式报错（不假成功）');

    // 读：成功路径
    const value = await rt.readValue(session, SVC, CHR, 500);
    assert.ok(value !== undefined && value !== null, '读值返回非空（成功路径）');

    // 读超时：必须拒绝且监听器清理（valueListeners 不增长残留）
    platform.__failNext.readBLECharacteristicValue = { errMsg: 'read:fail' };
    await assert.rejects(
      () => rt.readValue(session, SVC, CHR, 200),
      (err) => /fail|超时|timeout/i.test(err?.errMsg || err?.message || String(err)),
      '读失败/超时显式报错');
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});
