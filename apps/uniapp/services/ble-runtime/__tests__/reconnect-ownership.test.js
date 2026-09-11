/**
 * F012 重连所有权契约钉子（uniapp 线）。
 *
 * 三层契约（docs/specs/08_development/API_SPEC.md）：
 * - §13/C-8 被动断线重连：runtime reconnect-manager 独占，1s/3s/5s ×3；C-9 用户主动断开永不重连
 * - §7 connect：连接失败自动重试 3 次退避 n×2s（页面层 composable 执行）
 * - §6 initialize：初始化失败指数退避 3 次 1s/2s/4s
 * - §7 subscribeConnectionState：listener → unsubscribe，重复注册可检测
 *
 * 运行：node --experimental-default-type=module --test services/ble-runtime/__tests__/reconnect-ownership.test.js
 * （源码为无 type 标记的 ESM，需该 flag；全部被测模块为纯 JS，无 uni/wx/plus 依赖）
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BACKOFF_MS,
  MAX_RECONNECT_ATTEMPTS,
  shouldReconnect,
  DISCONNECT_REASON,
} from '../reconnect-policy.js';
import { createSessionRegistry, getSessionRegistry } from '../session-registry.js';
import { createReconnectManager, RECONNECT_TX_STATE } from '../reconnect-manager.js';
import {
  subscribeConnectionState,
  getRuntimeSession,
  resetBleRuntimeForTesting,
} from '../index.js';

test('C-8 契约钉子：重连退避 1s/3s/5s ×3', () => {
  assert.deepEqual([...BACKOFF_MS], [1000, 3000, 5000]);
  assert.equal(MAX_RECONNECT_ATTEMPTS, 3);
});

test('C-8/C-9 策略：被动断线按档退避，用户主动断开永不重连，3 次耗尽', () => {
  assert.deepEqual(shouldReconnect({ reason: DISCONNECT_REASON.USER_REQUEST }), { reconnect: false });
  assert.equal(shouldReconnect({ reason: DISCONNECT_REASON.REMOTE_LOST, attempt: 0 }).delay, 1000);
  assert.equal(shouldReconnect({ reason: DISCONNECT_REASON.REMOTE_LOST, attempt: 2 }).delay, 5000);
  assert.equal(shouldReconnect({ reason: DISCONNECT_REASON.REMOTE_LOST, attempt: 3 }).exhausted, true);
});

test('reconnect-manager 独占重连：REMOTE_LOST 排期 1s/3s/5s，3 次失败后 EXHAUSTED', async () => {
  const timers = new Map();
  let seq = 0;
  let connectCalls = 0;
  const manager = createReconnectManager({
    setTimeout: (fn, delay) => {
      seq += 1;
      timers.set(seq, { fn, delay });
      return seq;
    },
    clearTimeout: (id) => timers.delete(id),
    connect: async () => {
      connectCalls += 1;
      throw new Error('connect failed');
    },
  });

  const tx0 = manager.scheduleReconnect('DEV-1', { reason: DISCONNECT_REASON.REMOTE_LOST });
  assert.equal(tx0.state, RECONNECT_TX_STATE.SCHEDULED);
  assert.equal(tx0.nextDelay, 1000);

  const fire = async () => {
    const [id, timer] = [...timers.entries()][0];
    timers.delete(id);
    timer.fn();
    await new Promise((resolve) => setImmediate(resolve));
  };

  await fire();
  let tx = manager.getReconnectState('DEV-1');
  assert.equal(tx.attempt, 1);
  assert.equal(tx.nextDelay, 3000);

  await fire();
  tx = manager.getReconnectState('DEV-1');
  assert.equal(tx.attempt, 2);
  assert.equal(tx.nextDelay, 5000);

  await fire();
  tx = manager.getReconnectState('DEV-1');
  assert.equal(tx.state, RECONNECT_TX_STATE.EXHAUSTED);
  assert.equal(connectCalls, 3);
  assert.equal(timers.size, 0);
});

test('session-registry.subscribe：created/updated/removed 事件携带 connectionState/reconnectState', () => {
  const registry = createSessionRegistry();
  const events = [];
  const unsubscribe = registry.subscribe((session, phase) => {
    events.push({ phase, connectionState: session.connectionState, reconnectState: session.reconnectState });
  });

  registry.createSession({ deviceId: 'DEV-2', connectionState: 'CONNECTING' });
  registry.updateSession('DEV-2', { connectionState: 'READY', reconnectState: 'SCHEDULED' });
  registry.removeSession('DEV-2');

  assert.deepEqual(events.map((event) => event.phase), ['created', 'updated', 'removed']);
  assert.equal(events[1].connectionState, 'READY');
  assert.equal(events[1].reconnectState, 'SCHEDULED');

  unsubscribe();
  registry.createSession({ deviceId: 'DEV-3' });
  assert.equal(events.length, 3);
});

test('subscribeConnectionState（API_SPEC §7）：事件经 registry 单例透出，重复注册去重，可退订', () => {
  resetBleRuntimeForTesting();
  const registry = getSessionRegistry();
  const events = [];
  const listener = (event) => events.push(event);

  const teardownA = subscribeConnectionState(listener);
  const teardownB = subscribeConnectionState(listener);
  assert.equal(teardownA, teardownB); // 重复注册可检测：同一 listener 复用同一订阅

  registry.createSession({ deviceId: 'DEV-CS', connectionState: 'DISCOVERING' });
  registry.updateSession('DEV-CS', { connectionState: 'READY', reconnectState: 'RECONNECTING' });

  assert.ok(events.some((event) => event.deviceId === 'DEV-CS' && event.reconnectState === 'RECONNECTING'));

  teardownA();
  registry.updateSession('DEV-CS', { reconnectState: 'EXHAUSTED' });
  assert.ok(!events.some((event) => event.reconnectState === 'EXHAUSTED'));

  registry.removeSession('DEV-CS');
});

test('getRuntimeSession 导出：活会话返回，dead 会话返回 null', () => {
  const registry = getSessionRegistry();
  registry.createSession({ deviceId: 'DEV-RT', connectionState: 'READY' });
  registry.updateSession('DEV-RT', {
    runtime: { deviceId: 'DEV-RT', dead: false, disconnectCallbacks: new Set() },
  });
  assert.equal(getRuntimeSession('DEV-RT')?.dead, false);

  registry.updateSession('DEV-RT', { runtime: { deviceId: 'DEV-RT', dead: true } });
  assert.equal(getRuntimeSession('DEV-RT'), null);
  registry.removeSession('DEV-RT');
});
