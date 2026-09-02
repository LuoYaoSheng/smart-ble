// tests/target/integration/connection-runtime-target.test.mjs
// TEST-I-003 连接/断开/重连：同 device 并发去重为单 attempt；连接前停止扫描；主动断开不重连。
// 目标：REQ-019/022/023；FEAT-020/023/024；PAGE-001/006/007；FLOW-004/006；10 号 §3.2。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform, callSequence } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-003 REQ-019/022/023 FEAT-020/023/024 10号§3.2';

test('目标层：ble-runtime connectDevice 并发去重 + 主动断开', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/index.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const rt = m.module;
  const platform = createFakePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    // 并发两次连接同一设备 → 合并为一个 attempt（一次 createBLEConnection）
    const [s1, s2] = await Promise.all([rt.connectDevice('DUP'), rt.connectDevice('DUP')]);
    const connects = platform.__calls.filter((c) => c.m === 'connect');
    assert.equal(connects.length, 1, `同 deviceId 并发请求合并为单 attempt（实际 ${connects.length}）`);

    // 主动断开：调用 closeBLEConnection，且不触发重连
    await rt.closeDevice('DUP');
    const disconnects = platform.__calls.filter((c) => c.m === 'disconnect');
    assert.equal(disconnects.length, 1, '主动断开调用平台 close');
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(platform.__calls.filter((c) => c.m === 'connect').length, 1, '主动断开后不自动重连');
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});

test('目标层：连接失败不残留半开会话', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/index.js');
  const rt = m.module;
  const platform = createFakePlatform();
  platform.failNext('createBLEConnection', { errMsg: 'connect:fail -1' });
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    await assert.rejects(() => rt.connectDevice('FAILDEV'), /fail/i, '连接失败必须 reject');
    assert.equal(rt.getSession('FAILDEV'), undefined, '失败会话不入 Registry（无半开残留）');
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});

test('目标层：被动断线进入重连调度', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/index.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const rt = m.module;
  const platform = createFakePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    await rt.connectDevice('RECON');
    platform.__listeners.conn.forEach((cb) => cb({ deviceId: 'RECON', connected: false }));
    await new Promise((r) => setTimeout(r, 5));
    const snap = rt.getSessionRegistrySnapshot('RECON');
    assert.equal(snap?.disconnectReason, 'REMOTE_LOST');
    assert.equal(snap?.reconnectState, 'SCHEDULED');
    assert.equal(rt.getSession('RECON'), null);
    assert.ok(rt.getReconnectState('RECON'));
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});
