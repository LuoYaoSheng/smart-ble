import assert from 'node:assert/strict';
import { createScanSessionController } from '../../apps/uniapp/services/ble-runtime/scan-session.js';

const tick = () => new Promise((resolve) => queueMicrotask(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

console.log('[scan session]');

{
  const states = [];
  const controller = createScanSessionController({
    open: async () => {},
    stop: async () => {},
    start: async () => {},
    onState: (state) => states.push(state)
  });
  const completion = controller.start({ duration: 60000 });
  await tick();
  await tick();
  const result = await controller.stop('user');
  assert.deepEqual(result, await completion);
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'user');
  assert.deepEqual(states, ['starting', 'scanning', 'stopping', 'idle']);
  assert.equal(controller.snapshot(), null);
  console.log('  ✓ manual stop finishes the active session and returns to idle');
}

{
  const calls = [];
  const controller = createScanSessionController({
    open: async () => calls.push('open'),
    stop: async () => calls.push('stop'),
    start: async () => calls.push('start')
  });
  const first = controller.start({ duration: 60000 });
  await tick();
  await tick();
  await controller.stop('test');
  assert.equal((await first).ok, true);
  const second = controller.start({ duration: 60000 });
  await tick();
  await tick();
  await controller.stop('test');
  assert.equal((await second).sessionId, 2);
  assert.deepEqual(calls, ['open', 'stop', 'start', 'stop', 'open', 'stop', 'start', 'stop']);
  console.log('  ✓ two scans are serialized and receive independent session IDs');
}

{
  const opening = deferred();
  let starts = 0;
  const controller = createScanSessionController({
    open: () => opening.promise,
    stop: async () => {},
    start: async () => { starts += 1; }
  });
  const completion = controller.start({ duration: 60000 });
  await tick();
  const stopped = controller.stop('page_hide');
  opening.resolve();
  assert.equal((await stopped).ok, true);
  assert.equal((await completion).reason, 'page_hide');
  assert.equal(starts, 0);
  console.log('  ✓ stopping during adapter open cannot create an orphan scan');
}

{
  let starts = 0;
  const controller = createScanSessionController({
    open: async () => {},
    stop: async () => {},
    start: async () => { starts += 1; }
  });
  const first = controller.start({ duration: 60000 });
  const duplicate = controller.start({ duration: 60000 });
  await tick();
  await tick();
  await controller.stop('duplicate_test');
  const [firstResult, duplicateResult] = await Promise.all([first, duplicate]);
  assert.equal(starts, 1);
  assert.equal(firstResult.sessionId, duplicateResult.sessionId);
  assert.equal(firstResult.reason, 'duplicate_test');
  console.log('  ✓ duplicate start joins one active session without a second discovery');
}

{
  const controller = createScanSessionController({
    open: async () => {}, stop: async () => {}, start: async () => { throw Object.assign(new Error('denied'), { errCode: 10001 }); }
  });
  const result = await controller.start();
  assert.equal(result.ok, false);
  assert.equal(result.error.errCode, 10001);
  assert.equal(result.reason, 'start_failed');
  assert.equal(controller.snapshot(), null);
  console.log('  ✓ start errors stay distinguishable from an empty successful scan');
}

{
  let stops = 0;
  const controller = createScanSessionController({
    open: async () => {},
    start: async () => {},
    stop: async () => {
      stops += 1;
      if (stops === 2) throw Object.assign(new Error('stop failed'), { errCode: 10008 });
    }
  });
  const completion = controller.start({ duration: 60000 });
  await tick();
  await tick();
  const result = await controller.stop('user');
  assert.deepEqual(result, await completion);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'user');
  assert.equal(result.error.errCode, 10008);
  assert.equal(controller.snapshot(), null);
  console.log('  ✓ stop failure is explicit and still releases controller ownership');
}

{
  const calls = [];
  const controller = createScanSessionController({
    open: async () => calls.push('open'),
    stop: async () => calls.push('stop'),
    start: async () => calls.push('start')
  });
  const result = await controller.start({ duration: 20 });
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'timeout');
  assert.deepEqual(calls, ['open', 'stop', 'start', 'stop']);
  console.log('  ✓ timed scans auto-stop and preserve the timeout reason');
}
