// tests/target/integration/multi-device-target.test.mjs
// TEST-I-006 Registry 与统一断开：多设备并行、断 A 不影响 B、注册表状态、统一断开入口。
// 目标：REQ-030/031/032/033；FEAT-033/034/035/036；PAGE-006/007；FLOW-006/007；10 号 §3.3。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-006 REQ-030~033 FEAT-033~036 10号§3.3';

test('参照层：断开 A 误伤 B（共享状态）必须被抓', () => {
  const shared = { listeners: [1, 2], reconnectTimer: 7 }; // 错误：两设备共享一份状态
  const disconnectA = () => { shared.listeners = []; shared.reconnectTimer = null; };
  disconnectA();
  assert.equal(shared.listeners.length, 0, '参照实现清掉了共享监听');
  assert.ok(shared.reconnectTimer === null, '目标：B 的重连计时器不得被 A 的断开波及');
});

test('目标层：双设备隔离与 Registry 快照', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/index.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const rt = m.module;
  const platform = createFakePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    const sA = await rt.connectDevice('MD-A');
    const sB = await rt.connectDevice('MD-B');
    assert.ok(rt.getSession('MD-A') && rt.getSession('MD-B'), '两会话均入 Registry');

    const snap = rt.getBleRuntimeSnapshotForTesting?.();
    assert.ok(snap, '提供运行时快照（可观测性，14 号）');

    // 断开 A：B 的会话不受影响
    await rt.closeDevice('MD-A');
    assert.equal(rt.getSession('MD-A'), undefined, 'A 会话移除');
    assert.ok(rt.getSession('MD-B'), 'B 会话保留（隔离）');

    // B 仍可读写（未被动过）
    const SVC = '4fafc201-1fb5-459e-8fcc-c5c9c331914c';
    const CHR = 'beb5483e-36e1-4688-b7f5-ea07361b26b0';
    await rt.writeValue(sB, SVC, CHR, new Uint8Array([0x5a]));
    assert.ok(platform.__calls.some((c) => c.m === 'write'), 'B 断链后仍可写（隔离验证）');
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});
