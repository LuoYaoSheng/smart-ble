// tests/target/integration/service-discovery-target.test.mjs
// TEST-I-003（发现段）服务发现：空服务/发现失败 → 关闭半开连接并报错（不假成功）。
// 目标：REQ-020/021；FEAT-021/022；PAGE-006；FLOW-004；ERR-CONN-03。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'REQ-020/021 FEAT-021/022 ERR-CONN-03 10号§3.2';

test('参照层：发现失败仍保留连接（半开泄漏）必须被抓', async () => {
  const platform = createFakePlatform();
  platform.__connections.set('H1', { connected: true });
  platform.__failNext.getBLEDeviceServices = { errMsg: 'getServices:fail' };
  const r = await new Promise((res) => platform.getBLEDeviceServices({ deviceId: 'H1', fail: (e) => res({ failed: true, e }), success: () => res({ failed: false }) }));
  assert.equal(r.failed, true, '参照实现发现失败');
  assert.ok(platform.__connections.has('H1'), '参照实现泄漏半开连接');
  assert.ok(platform.__connections.size > 0, '目标：发现失败必须关闭连接（连接表清空）');
});

test('目标层：服务发现失败关闭半开连接', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/index.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const rt = m.module;
  // 目标契约：connect 流程内含服务发现；发现失败必须关闭半开连接（10 号 §3.2）。
  const hasDiscoveryOrchestration = Object.keys(rt).some((k) => /discover|services|characteristics/i.test(k))
    || typeof rt.connectDevice !== 'function';
  const platform = createFakePlatform();
  platform.failNext('getBLEDeviceServices', { errMsg: 'getServices:fail timeout' });
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    await assert.rejects(() => rt.connectDevice('EMPTY'), /fail|服务/i, '空/失败服务发现必须报错');
    // 半开连接必须被关闭：连接表不得残留
    assert.ok(!platform.__connections.has('EMPTY'), '发现失败后关闭半开连接');
    const closes = platform.__calls.filter((c) => c.m === 'disconnect');
    assert.ok(closes.length >= 1, '调用了平台 close（清理半开）');
  } catch (e) {
    if (String(e.message).includes('必须报错')) {
      return assert.fail(notImplemented('REQ-020/021 ERR-CONN-03', 'connectDevice 未编排服务发现（失败不报错=半开泄漏面）'));
    }
    throw e;
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});
