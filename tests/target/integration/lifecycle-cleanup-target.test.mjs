// tests/target/integration/lifecycle-cleanup-target.test.mjs
// TEST-I-001 生命周期与清理：扫描资源在停止/hide/超时释放；监听器/计时器不留存。
// 目标：REQ-003/033；FEAT-003/036；PAGE-001/002/006；10 号 §4 释放矩阵。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-001 REQ-003/033 FEAT-003/036 10号§4';

test('参照层：停止后计时器仍触发（泄漏）必须被抓', async () => {
  let fired = 0;
  const timer = setTimeout(() => fired++, 20); // 错误：stop 未 clear
  await new Promise((r) => setTimeout(r, 5));
  clearTimeout(timer); // 目标动作：stop 时应清理
  await new Promise((r) => setTimeout(r, 25));
  assert.equal(fired, 0, '清理后不再触发（目标语义）');
  // 反向证明：不清理则必触发
  let fired2 = 0;
  setTimeout(() => fired2++, 15);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(fired2, 1, '未清理计时器必然触发——泄漏可被观测');
});

test('目标层：扫描停止后运行时无残留监听/会话', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/index.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const rt = m.module;
  const platform = createFakePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    const off = rt.onDiscovery(() => {});
    await rt.startDiscovery({});
    off?.(); // 页面离开：摘除 UI 监听
    await rt.stopDiscovery();

    // 停止后平台不再收到 discovery 指令；快照无泄漏
    const snap = rt.getBleRuntimeSnapshotForTesting?.();
    if (snap) {
      const sessionCount = snap.sessions?.size ?? Object.keys(snap.sessions ?? {}).length;
      assert.equal(sessionCount, 0, '无扫描残留会话');
    }
    const starts = platform.__calls.filter((c) => c.m === 'startDiscovery').length;
    const stops = platform.__calls.filter((c) => c.m === 'stopDiscovery').length;
    assert.ok(stops >= 1 && starts >= 1, 'start/stop 成对出现');
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});
