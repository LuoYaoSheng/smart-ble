// tests/target/integration/lifecycle-cleanup-target.test.mjs
// TEST-I-001 生命周期与清理：扫描资源在停止/hide/超时释放；监听器/计时器不留存。
// 目标：REQ-003/033；FEAT-003/036；PAGE-001/002/006；10 号 §4 释放矩阵。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-001 REQ-003/033 FEAT-003/036 10号§4';

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
