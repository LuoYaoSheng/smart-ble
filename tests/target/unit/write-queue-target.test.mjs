// tests/target/unit/write-queue-target.test.mjs
// TEST-U-011 MTU 分包 + Write Queue 事务（串行/隔离/timeout/cancel/failure）。
// 目标：REQ-027/028；FEAT-029/030；PAGE-006；FLOW-005。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-011 REQ-028 FEAT-030 PAGE-006 FLOW-005';

async function loadQueue() {
  const m = await importTarget('apps/uniapp/services/ble-runtime/write-queue.js');
  if (!m.ok) assert.fail(notImplemented(IDS, m.message));
  return m.module;
}

test('TEST-U-011 目标层：services/ble-runtime/write-queue.js', async () => {
  const m = await loadQueue();
  const chunkFn = m.chunkForMtu || m.chunkBytes;
  if (typeof chunkFn !== 'function') assert.fail(notImplemented(IDS, '目标接口 chunkForMtu 缺失'));

  const data = new Uint8Array(45).fill(0x01);
  const chunks = chunkFn(data, 23);
  assert.ok(Array.isArray(chunks) && chunks.length >= 3, '45B@MTU23 → ≥3 块');
  assert.ok(chunks.every((c) => c.length <= 20), '每块 ≤ mtu-3=20');
  assert.equal(chunks.reduce((a, c) => a + c.length, 0), 45, '总字节守恒');
  assert.equal(chunks[chunks.length - 1].length, 5, '最后小块=5B 保留');

  const QueueCtor = m.WriteQueue || m.createWriteQueue;
  if (!QueueCtor) assert.fail(notImplemented(IDS, '目标接口 WriteQueue/createWriteQueue 缺失'));
});

test('TEST-U-011-01 single write success', async () => {
  const { createWriteQueue } = await loadQueue();
  const calls = [];
  const q = createWriteQueue({
    transport: async (tx) => { calls.push(tx.id); },
  });
  const { promise, id } = q.enqueueWrite({
    deviceId: 'D1',
    serviceId: 'S',
    characteristicId: 'C',
    payload: new Uint8Array([1, 2]),
  });
  const result = await promise;
  assert.equal(result.ok, true);
  assert.equal(result.state, 'SUCCESS');
  assert.equal(result.id, id);
  assert.deepEqual(calls, [id]);
});

test('TEST-U-011-02 state PENDING→WRITING→SUCCESS', async () => {
  const { createWriteQueue } = await loadQueue();
  const states = [];
  let release;
  const gate = new Promise((r) => { release = r; });
  const q = createWriteQueue({
    transport: async () => { await gate; },
  });
  q.onWriteEvent((ev) => states.push(`${ev.type}:${ev.state}`));
  const { promise, transaction } = q.enqueueWrite({
    deviceId: 'D1', payload: new Uint8Array([9]),
  });
  assert.equal(transaction.state, 'PENDING');
  await new Promise((r) => setTimeout(r, 5));
  assert.ok(states.some((s) => s.startsWith('started:WRITING')));
  release();
  const result = await promise;
  assert.equal(result.state, 'SUCCESS');
  assert.ok(states.some((s) => s.startsWith('success:SUCCESS')));
});

test('TEST-U-011-03 same device serial', async () => {
  const { createWriteQueue } = await loadQueue();
  const order = [];
  let active = 0;
  let maxActive = 0;
  const q = createWriteQueue({
    transport: async (tx) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      order.push(`start:${tx.id}`);
      await new Promise((r) => setTimeout(r, 15));
      order.push(`end:${tx.id}`);
      active -= 1;
    },
  });
  const a = q.enqueueWrite({ deviceId: 'SAME', payload: new Uint8Array([1]), id: 'A' });
  const b = q.enqueueWrite({ deviceId: 'SAME', payload: new Uint8Array([2]), id: 'B' });
  const c = q.enqueueWrite({ deviceId: 'SAME', payload: new Uint8Array([3]), id: 'C' });
  await Promise.all([a.promise, b.promise, c.promise]);
  assert.equal(maxActive, 1, '同设备不得并发');
  assert.deepEqual(order, [
    'start:A', 'end:A',
    'start:B', 'end:B',
    'start:C', 'end:C',
  ]);
});

test('TEST-U-011-04 different device parallel', async () => {
  const { createWriteQueue } = await loadQueue();
  let active = 0;
  let maxActive = 0;
  const q = createWriteQueue({
    transport: async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 30));
      active -= 1;
    },
  });
  const p1 = q.enqueueWrite({ deviceId: 'A', payload: new Uint8Array([1]) }).promise;
  const p2 = q.enqueueWrite({ deviceId: 'B', payload: new Uint8Array([2]) }).promise;
  await Promise.all([p1, p2]);
  assert.ok(maxActive >= 2, '不同设备允许并行');
});

test('TEST-U-011-05 timeout', async () => {
  const { createWriteQueue } = await loadQueue();
  const q = createWriteQueue({
    defaultTimeout: 20,
    transport: async () => new Promise(() => {}),
  });
  const result = await q.enqueueWrite({
    deviceId: 'D1',
    payload: new Uint8Array([1]),
    timeout: 20,
  }).promise;
  assert.equal(result.state, 'TIMEOUT');
  assert.equal(result.ok, false);
});

test('TEST-U-011-06 timeout cleanup continues queue', async () => {
  const { createWriteQueue } = await loadQueue();
  let secondStarted = false;
  const q = createWriteQueue({
    transport: async (tx) => {
      if (tx.id === 'slow') return new Promise(() => {});
      secondStarted = true;
    },
  });
  const first = q.enqueueWrite({
    deviceId: 'D1', id: 'slow', payload: new Uint8Array([1]), timeout: 25,
  });
  const second = q.enqueueWrite({
    deviceId: 'D1', id: 'next', payload: new Uint8Array([2]), timeout: 500,
  });
  const r1 = await first.promise;
  const r2 = await second.promise;
  assert.equal(r1.state, 'TIMEOUT');
  assert.equal(r2.state, 'SUCCESS');
  assert.equal(secondStarted, true);
});

test('TEST-U-011-07 write reject', async () => {
  const { createWriteQueue } = await loadQueue();
  const q = createWriteQueue({
    transport: async () => { throw new Error('GATT write fail'); },
  });
  const result = await q.enqueueWrite({
    deviceId: 'D1', payload: new Uint8Array([1]),
  }).promise;
  assert.equal(result.state, 'FAILED');
  assert.match(String(result.error), /GATT write fail/);
});

test('TEST-U-011-08 continue next after failure', async () => {
  const { createWriteQueue } = await loadQueue();
  const q = createWriteQueue({
    transport: async (tx) => {
      if (tx.id === 'bad') throw new Error('boom');
    },
  });
  const bad = q.enqueueWrite({ deviceId: 'D1', id: 'bad', payload: new Uint8Array([1]) });
  const ok = q.enqueueWrite({ deviceId: 'D1', id: 'ok', payload: new Uint8Array([2]) });
  const r1 = await bad.promise;
  const r2 = await ok.promise;
  assert.equal(r1.state, 'FAILED');
  assert.equal(r2.state, 'SUCCESS');
});

test('TEST-U-011-09 cancel pending', async () => {
  const { createWriteQueue } = await loadQueue();
  let release;
  const gate = new Promise((r) => { release = r; });
  const q = createWriteQueue({
    transport: async (tx) => {
      if (tx.id === 'hold') await gate;
    },
  });
  const hold = q.enqueueWrite({ deviceId: 'D1', id: 'hold', payload: new Uint8Array([1]) });
  const pending = q.enqueueWrite({ deviceId: 'D1', id: 'pend', payload: new Uint8Array([2]) });
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(q.cancelWrite('pend'), true);
  const rPend = await pending.promise;
  assert.equal(rPend.state, 'CANCELLED');
  release();
  assert.equal((await hold.promise).state, 'SUCCESS');
});

test('TEST-U-011-10 cancel writing', async () => {
  const { createWriteQueue } = await loadQueue();
  let release;
  const gate = new Promise((r) => { release = r; });
  const q = createWriteQueue({
    transport: async () => { await gate; },
  });
  const writing = q.enqueueWrite({ deviceId: 'D1', id: 'w', payload: new Uint8Array([1]) });
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(q.cancelWrite('w'), true);
  release();
  const result = await writing.promise;
  assert.equal(result.state, 'CANCELLED');
});

test('TEST-U-011-11 clear queue', async () => {
  const { createWriteQueue } = await loadQueue();
  let release;
  const gate = new Promise((r) => { release = r; });
  const q = createWriteQueue({
    transport: async () => { await gate; },
  });
  q.enqueueWrite({ deviceId: 'D1', id: 'a', payload: new Uint8Array([1]) });
  const b = q.enqueueWrite({ deviceId: 'D1', id: 'b', payload: new Uint8Array([2]) });
  const c = q.enqueueWrite({ deviceId: 'D1', id: 'c', payload: new Uint8Array([3]) });
  await new Promise((r) => setTimeout(r, 5));
  q.clearQueue();
  assert.equal((await b.promise).state, 'CANCELLED');
  assert.equal((await c.promise).state, 'CANCELLED');
  release();
});

test('TEST-U-011-12 no promise leak on timeout', async () => {
  const { createWriteQueue } = await loadQueue();
  const q = createWriteQueue({
    transport: async () => new Promise(() => {}),
  });
  const { promise } = q.enqueueWrite({
    deviceId: 'D1', payload: new Uint8Array([1]), timeout: 15,
  });
  const result = await promise;
  assert.equal(result.state, 'TIMEOUT');
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(q.getQueueState().devices.D1?.active, null);
});

test('TEST-U-011-13 device isolation cancelDeviceWrites', async () => {
  const { createWriteQueue } = await loadQueue();
  let releaseA;
  const gateA = new Promise((r) => { releaseA = r; });
  const q = createWriteQueue({
    transport: async (tx) => {
      if (tx.deviceId === 'A') await gateA;
    },
  });
  const a = q.enqueueWrite({ deviceId: 'A', id: 'a1', payload: new Uint8Array([1]) });
  const b = q.enqueueWrite({ deviceId: 'B', id: 'b1', payload: new Uint8Array([2]) });
  await new Promise((r) => setTimeout(r, 5));
  q.cancelDeviceWrites('A');
  releaseA();
  assert.equal((await a.promise).state, 'CANCELLED');
  assert.equal((await b.promise).state, 'SUCCESS');
});

test('TEST-U-011-14 event order', async () => {
  const { createWriteQueue } = await loadQueue();
  const types = [];
  const q = createWriteQueue({
    transport: async () => {},
  });
  q.onWriteEvent((ev) => types.push(ev.type));
  await q.enqueueWrite({ deviceId: 'D1', payload: new Uint8Array([1]) }).promise;
  assert.deepEqual(types, ['queued', 'started', 'success']);
});

test('TEST-U-011-15 retry count', async () => {
  const { createWriteQueue } = await loadQueue();
  let tries = 0;
  const q = createWriteQueue({
    transport: async () => {
      tries += 1;
      if (tries < 2) throw new Error('transient');
    },
  });
  const result = await q.enqueueWrite({
    deviceId: 'D1',
    payload: new Uint8Array([1]),
    retryCount: 1,
  }).promise;
  assert.equal(result.state, 'SUCCESS');
  assert.equal(tries, 2);
  assert.ok(result.attempts >= 2);
});
