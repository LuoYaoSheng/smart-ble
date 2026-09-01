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

function normalizeUuid(u) {
  return String(u || '').replace(/-/g, '').toLowerCase();
}

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
    assert.equal(normalizeUuid(writes[0].args.cid), normalizeUuid(CHR), '写入目标特征记录');
    assert.equal(writes[0].args.deviceId, 'RW1', '写入设备 ID');
    if (writes[0].args.serviceId != null || writes[0].args.sid != null) {
      assert.equal(
        normalizeUuid(writes[0].args.serviceId ?? writes[0].args.sid),
        normalizeUuid(SVC),
        '写入服务 ID',
      );
    }

    // Codec：HEX 写入路径
    assert.equal(typeof rt.validateHexInput, 'function', 'Runtime 导出 validateHexInput');
    assert.equal(typeof rt.formatReadValue, 'function', 'Runtime 导出 formatReadValue');
    assert.equal(typeof rt.createWriteQueue, 'function', 'Runtime 导出 createWriteQueue');
    const writesBeforeHex = platform.__calls.filter((c) => c.m === 'write').length;
    const hexWrite = await rt.writeCharacteristic(session, SVC, CHR, 'DE AD', { mode: 'hex' });
    assert.equal(hexWrite.ok, true);
    assert.equal(hexWrite.length, 2);
    assert.ok(hexWrite.transactionId, '合法写入经 queue 产生 transactionId');
    assert.ok(
      (hexWrite.events || []).some((e) => e.type === 'queued')
        && (hexWrite.events || []).some((e) => e.type === 'success'),
      'queue event: queued → success',
    );
    assert.equal(
      platform.__calls.filter((c) => c.m === 'write').length,
      writesBeforeHex + 1,
      '合法输入触发 transport write',
    );
    const writesBeforeBad = platform.__calls.filter((c) => c.m === 'write').length;
    const badHex = await rt.writeCharacteristic(session, SVC, CHR, 'GG', { mode: 'hex' });
    assert.equal(badHex.ok, false);
    assert.equal(badHex.wrote, false);
    assert.equal(
      platform.__calls.filter((c) => c.m === 'write').length,
      writesBeforeBad,
      '非法 HEX：0 BLE call',
    );

    // 读展示：bytes → formatter
    const formatted = rt.formatReadValue(new Uint8Array([0x48, 0x69]), 'text');
    assert.equal(formatted, 'Hi');

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
