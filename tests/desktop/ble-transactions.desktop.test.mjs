import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { SessionWriteQueue, callbackTransaction, WRITE_TIMEOUT_MS, READ_TIMEOUT_MS, CONNECT_TIMEOUT_MS } = require('../../apps/desktop/electron/src/main/ble-transactions.js');

const tick = () => new Promise(resolve => setImmediate(resolve));

test('native desktop deadlines match the product contract', () => {
  assert.equal(WRITE_TIMEOUT_MS, 5000);
  assert.equal(READ_TIMEOUT_MS, 3000);
  assert.equal(CONNECT_TIMEOUT_MS, 10000);
});

test('same connection is FIFO, another connection can write while it is waiting', async () => {
  const a = new SessionWriteQueue(), b = new SessionWriteQueue();
  const calls = [];
  let firstDone;
  const first = a.write(done => { calls.push('a1'); firstDone = done; });
  const second = a.write(done => { calls.push('a2'); done({ success: true }); });
  const other = b.write(done => { calls.push('b1'); done({ success: true }); });
  assert.equal((await other).success, true);
  assert.deepEqual(calls, ['a1', 'b1']);
  firstDone({ success: true });
  assert.equal((await first).success, true);
  assert.equal((await second).success, true);
  assert.deepEqual(calls, ['a1', 'b1', 'a2']);
});

test('16 includes the active write; disconnect cancels active and queued writes', async () => {
  const queue = new SessionWriteQueue();
  let activeDone;
  const writes = [queue.write(done => { activeDone = done; })];
  for (let i = 1; i < 16; i++) writes.push(queue.write(() => assert.fail('queued write ran after disconnect')));
  const overflow = await queue.write(() => assert.fail('overflow write ran'));
  assert.match(overflow.error, /queue full \(16\)/);
  queue.close();
  assert.ok((await Promise.all(writes)).every(result => !result.success && result.error === 'Device disconnected'));
  assert.equal(activeDone({ success: true }), false);
  assert.equal((await queue.write(() => {})).error, 'Device disconnected');
});

test('timeout retires the connection, cancels queued writes and ignores late native success', async () => {
  let retired = 0, late;
  const queue = new SessionWriteQueue({ timeoutMs: 15, onTimeout: () => retired++ });
  const first = queue.write(done => { late = done; });
  const next = queue.write(() => assert.fail('stale write ran'));
  assert.equal((await first).error, 'Write timed out');
  assert.equal((await next).error, 'Device disconnected');
  assert.equal(retired, 1);
  assert.equal(late({ success: true }), false);
  const replacement = new SessionWriteQueue();
  assert.equal((await replacement.write(done => done({ success: true }))).success, true);
});

test('callback operations clear resources exactly once on sync success, timeout and cancellation', async () => {
  let cleanups = 0;
  assert.equal((await callbackTransaction(done => { done({ success: true }); return () => cleanups++; }, { timeoutMs: 100 })).success, true);
  let late;
  const failed = await callbackTransaction(done => { late = done; return () => cleanups++; }, { timeoutMs: 10, label: 'Read' });
  assert.equal(failed.error, 'Read timed out');
  assert.equal(late({ success: true }), false);
  const controller = new AbortController();
  const cancelled = callbackTransaction(() => () => cleanups++, { timeoutMs: 100, signal: controller.signal });
  controller.abort();
  assert.equal((await cancelled).error, 'Device disconnected');
  await tick();
  assert.equal(cleanups, 3);
});
