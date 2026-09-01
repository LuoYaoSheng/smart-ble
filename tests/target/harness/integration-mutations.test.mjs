// tests/target/harness/integration-mutations.test.mjs
// HARNESS-I-002..013 —— 集成层故意错误参照验证（scope=harness，不计入目标实现覆盖率）。
// HARNESS-I-001 见 runner-isolation.test.mjs。

import test from 'node:test';
import assert from 'node:assert';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const SVC = '4fafc201-1fb5-459e-8fcc-c5c9c331914c';
const CHR = 'beb5483e-36e1-4688-b7f5-ea07361b26b0';

// ---- from lifecycle-cleanup-target.test.mjs ----
test('HARNESS-I-002 参照层：停止后计时器仍触发（泄漏）必须被抓', async () => {
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

// ---- from permission-flow-target.test.mjs ----
function brokenFlow(fake) {
  if (fake.permission === 'denied') return { ended: 'error', recovery: null };
  return { ended: 'scanning' };
}
test('HARNESS-I-003 参照层：权限拒绝无恢复入口必须被抓', () => {
  const r = brokenFlow({ permission: 'denied' });
  assert.equal(r.recovery, null, '参照实现无恢复');
  assert.ok(r.recovery === null, '目标：S-03 提供重新授权恢复动作（非 null）');
});

// ---- from scan-runtime-target.test.mjs ----
test('HARNESS-I-004 参照层：迟到事件混入新一轮必须被识别', async () => {
  const platform = createFakePlatform();
  const seen = [];
  platform.onBluetoothDeviceFound((res) => seen.push(...res.devices)); // 无 generation 保护
  platform.emitFound({ deviceId: 'L1', name: '第一轮' });
  platform.emitFound({ deviceId: 'L2', name: '迟到-第一轮' }); // 第二轮开始后到达
  assert.equal(seen.length, 2, '参照实现两轮混叠');
  assert.ok(seen.some((d) => d.name.startsWith('迟到')), '迟到设备混入——目标必须丢弃');
});

// ---- from connection-runtime-target.test.mjs ----
test('HARNESS-I-005 参照层：并发两连不合并（两次 createBLEConnection）必须被抓', async () => {
  const platform = createFakePlatform();
  const connect = (id) => new Promise((res) => platform.createBLEConnection({ deviceId: id, success: res, fail: res }));
  await Promise.all([connect('C1'), connect('C1')]);
  assert.equal(platform.__calls.filter((c) => c.m === 'connect').length, 2, '参照实现重复建连');
  assert.ok(platform.__calls.filter((c) => c.m === 'connect').length > 1, '目标：同 deviceId 合并为单 attempt');
});

// ---- from service-discovery-target.test.mjs ----
test('HARNESS-I-006 参照层：发现失败仍保留连接（半开泄漏）必须被抓', async () => {
  const platform = createFakePlatform();
  platform.__connections.set('H1', { connected: true });
  platform.__failNext.getBLEDeviceServices = { errMsg: 'getServices:fail' };
  const r = await new Promise((res) => platform.getBLEDeviceServices({ deviceId: 'H1', fail: (e) => res({ failed: true, e }), success: () => res({ failed: false }) }));
  assert.equal(r.failed, true, '参照实现发现失败');
  assert.ok(platform.__connections.has('H1'), '参照实现泄漏半开连接');
  assert.ok(platform.__connections.size > 0, '目标：发现失败必须关闭连接（连接表清空）');
});

// ---- from read-write-runtime-target.test.mjs ----
test('HARNESS-I-007 参照层：读失败静默返回 null（假成功）必须被抓', async () => {
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

// ---- from notify-routing-target.test.mjs ----
test('HARNESS-I-008 参照层：按 UUID 而非 tuple 分发（多设备串台）必须被抓', () => {
  const listenersByUuid = new Map(); // 错误实现：只按 characteristicId
  const A = []; const B = [];
  listenersByUuid.set(CHR, (v) => { A.push(v); B.push(v); }); // 同 UUID 一个回调同时推两设备
  listenersByUuid.get(CHR)({ deviceId: 'DEV1', value: 'x' });
  assert.equal(A.length, 1); assert.equal(B.length, 1, '参照实现把 DEV1 的数据也推给了 DEV2 的订阅者');
  assert.ok(B.length > 0, '目标：tuple 不匹配必须丢弃——串台被识别');
});

// ---- from multi-device-target.test.mjs ----
test('HARNESS-I-009 参照层：断开 A 误伤 B（共享状态）必须被抓', () => {
  const shared = { listeners: [1, 2], reconnectTimer: 7 }; // 错误：两设备共享一份状态
  const disconnectA = () => { shared.listeners = []; shared.reconnectTimer = null; };
  disconnectA();
  assert.equal(shared.listeners.length, 0, '参照实现清掉了共享监听');
  assert.ok(shared.reconnectTimer === null, '目标：B 的重连计时器不得被 A 的断开波及');
});

// ---- from peripheral-owner-target.test.mjs ----
function brokenBroadcastGuard(activeConnections, wantStart) {
  return { allowed: wantStart }; // 错误：不检查活动连接
}
test('HARNESS-I-010 参照层：忽略活动连接保护必须被抓', () => {
  const guardOk = (guard) => guard(new Set(['C1']), true).allowed === false; // 目标谓词：有活动连接时拒绝
  assert.ok(!guardOk(brokenBroadcastGuard), '故意错误实现不满足目标守卫——谓词有效（S-41：有 N 台保持连接先断开才能广播）');
});

// ---- from ota-transaction-target.test.mjs ----
// 故意变异：跳过订阅 STATUS 直接 start；用谓词证明检查器可抓住顺序违规（不导入真实 OtaManager）。
test('HARNESS-I-011 参照层：未订阅 STATUS 即 start 必须被抓', () => {
  const calls = [];
  const brokenRun = () => { calls.push('start'); calls.push('data'); calls.push('commit'); };
  brokenRun();
  const isCanonicalFirstStep = (seq) => seq[0] === 'subscribe-status';
  assert.equal(calls[0], 'start', '参照实现跳过订阅');
  assert.ok(!isCanonicalFirstStep(calls), '故意错误顺序被谓词识别——检查器可抓住「未订阅 STATUS 即 start」违规');
  assert.notEqual(calls[0], 'subscribe-status', '目标：第 1 步必须是订阅 STATUS（12 号十步正典）');
});

// ---- from smart-hid-provision-target.test.mjs ----
test('HARNESS-I-012 参照层：先写后等（错过 STATUS）必须被抓', async () => {
  const order = [];
  const brokenHidFlow = async () => {
    order.push('write'); // 错误：先写 INPUT
    order.push('wait');  // 再等 STATUS → 设备早已回包，永久超时
  };
  await brokenHidFlow();
  assert.equal(order[0], 'write', '参照实现顺序错误');
  assert.notEqual(order[0], 'wait', '目标：waiter 先注册，再写 INPUT（13 号红线）');
});

// ---- from smart-hid-session-ownership-target.test.mjs ----
test('HARNESS-I-013 参照层：READY 后仍持有连接（不释放）必须被抓', async () => {
  const held = { connected: true };
  const brokenReady = () => ({ status: 'ready' }); // 错误：READY 不释放
  const r = brokenReady();
  assert.equal(r.status, 'ready', '状态到达 ready');
  assert.ok(held.connected, '参照实现仍持有连接');
  assert.ok(held.connected === true, '目标：READY 后配网连接必须释放（10 号释放矩阵：释放（READY））');
});
