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
  const controller = createScanSessionController({
    open: async () => {}, stop: async () => {}, start: async () => { throw Object.assign(new Error('denied'), { errCode: 10001 }); }
  });
  const result = await controller.start();
  assert.equal(result.ok, false);
  assert.equal(result.error.errCode, 10001);
  console.log('  ✓ start errors stay distinguishable from an empty successful scan');
}
