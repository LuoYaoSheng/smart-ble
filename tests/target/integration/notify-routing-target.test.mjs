// tests/target/integration/notify-routing-target.test.mjs
// TEST-I-005 Characteristic Subscription 路由与隔离（DEC-017）：
// (deviceId, serviceId, characteristicId) tuple 分发；同 UUID 多设备不串；关订阅=远程 false+本地退订。
// 目标：REQ-029；FEAT-031/032；PAGE-006/007；FLOW-005；10 号 §3.4。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-005 REQ-029 FEAT-031/032 DEC-017 10号§3.4';

const SVC = '4fafc201-1fb5-459e-8fcc-c5c9c331914c';
const CHR = 'beb5483e-36e1-4688-b7f5-ea07361b26b0';

test('目标层：ble-runtime 订阅路由与 tuple 隔离', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/index.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const rt = m.module;
  const platform = createFakePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    const s1 = await rt.connectDevice('DEV1');
    const s2 = await rt.connectDevice('DEV2');

    const got1 = []; const got2 = [];
    const off1 = await rt.subscribe(s1, SVC, CHR, (v) => got1.push(v));
    await rt.subscribe(s2, SVC, CHR, (v) => got2.push(v));

    // 同 UUID 两设备，事件按 deviceId 精确路由
    platform.emitValue('DEV1', SVC, CHR, new Uint8Array([1]));
    platform.emitValue('DEV2', SVC, CHR, new Uint8Array([2]));
    assert.equal(got1.length, 1, 'DEV1 订阅者收到 1 条（自己设备）');
    assert.equal(got2.length, 1, 'DEV2 订阅者收到 1 条（自己设备）');
    assert.equal(new Uint8Array(got1[0]?.value ?? got1[0])[0], 1, 'DEV1 收到的是 DEV1 的数据');
    assert.equal(new Uint8Array(got2[0]?.value ?? got2[0])[0], 2, 'DEV2 收到的是 DEV2 的数据');

    // 关闭订阅 = 远程 setNotify(false) + 本地退订（DEC-017 双动作；组合件= createNotifyToggleController）
    await rt.setNotifyEnabled(s1, SVC, CHR, false);
    const offNotify = platform.__calls.filter((c) => c.m === 'notify' && c.args.state === false);
    assert.equal(offNotify.length, 1, '远程退订调用 notify(state:false)');
    if (typeof off1 === 'function') off1(); // 组合层负责同时调用（页面经 toggle 控制器接线）
    platform.emitValue('DEV1', SVC, CHR, new Uint8Array([9]));
    assert.equal(got1.length, 1, '退订后 DEV1 事件不再投递（本地摘除）');

    // DEC-017 统一开关组合件：enable→subscribe、disable→disable 双语义
    const ops = await importTarget('apps/uniapp/services/device-session-operations.js');
    if (ops.ok && typeof ops.module.createNotifyToggleController === 'function') {
      const calls = [];
      const toggle = ops.module.createNotifyToggleController({
        subscribe: async (...a) => { calls.push(['subscribe', ...a]); return () => calls.push(['off']); },
        disable: async (...a) => { calls.push(['disable', ...a]); },
      });
      const target = { session: { dead: false }, serviceId: 'svc-a', characteristicId: 'chr-a' };
      await toggle.toggle(target); // 第一次：开启 → subscribe
      await toggle.toggle(target); // 第二次：关闭 → disable（远程 false + 本地退订）
      assert.ok(calls.some((c) => c[0] === 'subscribe'), 'toggle 开启走订阅缝');
      assert.ok(calls.some((c) => c[0] === 'disable'), 'toggle 关闭走统一退订缝（DEC-017）');
    }
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});
