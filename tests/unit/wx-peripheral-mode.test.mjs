import assert from 'node:assert/strict';

import { createWxPeripheralAdapterController } from '../../apps/uniapp/services/wx-peripheral-mode.js';

const run = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

function createWxPlatform({ firstOpenError, pendingOpen, pendingClose, closeError } = {}) {
  const calls = [];
  let openCount = 0;
  const succeed = (options, result = {}) => queueMicrotask(() => options.success?.(result));

  return {
    calls,
    openBluetoothAdapter(options) {
      openCount += 1;
      calls.push({ type: 'open', mode: options.mode });
      if (pendingOpen && openCount === 1) {
        pendingOpen.promise.then(options.success, options.fail);
        return;
      }
      if (firstOpenError && openCount === 1) {
        queueMicrotask(() => options.fail?.(firstOpenError));
        return;
      }
      succeed(options);
    },
    closeBluetoothAdapter(options) {
      calls.push({ type: 'close' });
      if (pendingClose) {
        pendingClose.promise.then(options.success, options.fail);
        return;
      }
      if (closeError) {
        queueMicrotask(() => options.fail?.(closeError));
        return;
      }
      succeed(options);
    }
  };
}

console.log('[wx peripheral mode]');

await run('opens peripheral mode once and reuses controller ownership', async () => {
  const platform = createWxPlatform();
  const controller = createWxPeripheralAdapterController({ platform });

  assert.equal((await controller.open()).reused, false);
  assert.equal((await controller.open()).reused, true);
  assert.deepEqual(platform.calls, [{ type: 'open', mode: 'peripheral' }]);
  assert.equal(controller.snapshot().ownsAdapter, true);
});

await run('hands an already-open central adapter over to peripheral mode', async () => {
  const platform = createWxPlatform({ firstOpenError: { errMsg: 'openBluetoothAdapter:fail already opened' } });
  const controller = createWxPeripheralAdapterController({ platform });

  await controller.open();
  assert.deepEqual(platform.calls, [
    { type: 'open', mode: 'peripheral' },
    { type: 'close' },
    { type: 'open', mode: 'peripheral' }
  ]);
});

await run('does not close the adapter while device sessions are active', async () => {
  const platform = createWxPlatform({ firstOpenError: { errMsg: 'openBluetoothAdapter:fail already opened' } });
  const controller = createWxPeripheralAdapterController({ platform, getConnectedCount: () => 1 });

  await assert.rejects(controller.open(), (error) => error.code === 'active_connections');
  assert.deepEqual(platform.calls, [{ type: 'open', mode: 'peripheral' }]);
  assert.equal(controller.snapshot().ownsAdapter, false);
});

await run('release is idempotent and only closes an owned adapter once', async () => {
  const platform = createWxPlatform();
  const controller = createWxPeripheralAdapterController({ platform });

  await controller.open();
  assert.equal((await controller.release()).reason, 'released');
  assert.equal((await controller.release()).reason, 'not_owner');
  assert.deepEqual(platform.calls, [
    { type: 'open', mode: 'peripheral' },
    { type: 'close' }
  ]);
});

await run('page release during initialization cannot leave an orphan adapter', async () => {
  const pendingOpen = deferred();
  const platform = createWxPlatform({ pendingOpen });
  const controller = createWxPeripheralAdapterController({ platform });
  const opening = controller.open();
  const releasing = controller.release();

  pendingOpen.resolve({});
  await assert.rejects(opening, (error) => error.code === 'released_during_open');
  await releasing;
  assert.deepEqual(platform.calls, [
    { type: 'open', mode: 'peripheral' },
    { type: 'close' }
  ]);
  assert.equal(controller.snapshot().ownsAdapter, false);
});

await run('close failure remains owned and can be retried without reopening', async () => {
  const platform = createWxPlatform({ closeError: { errMsg: 'close failed' } });
  const controller = createWxPeripheralAdapterController({ platform });
  await controller.open();
  const result = await controller.release();
  assert.equal(result.reason, 'close_failed');
  assert.equal(controller.snapshot().ownsAdapter, true);
  assert.equal((await controller.open()).reused, true);
  assert.deepEqual(platform.calls.map(({ type }) => type), ['open', 'close']);
});

await run('repeated support checks share one open and release refuses a newly active connection', async () => {
  let connectedCount = 0;
  const platform = createWxPlatform();
  const controller = createWxPeripheralAdapterController({ platform, getConnectedCount: () => connectedCount });
  await Promise.all([controller.open(), controller.open(), controller.open()]);
  connectedCount = 1;
  assert.equal((await controller.release()).reason, 'active_connections');
  assert.equal(controller.snapshot().ownsAdapter, true);
  assert.deepEqual(platform.calls, [{ type: 'open', mode: 'peripheral' }]);
});

await run('concurrent release closes once and re-entry waits for a fresh peripheral open', async () => {
  const pendingClose = deferred();
  const platform = createWxPlatform({ pendingClose });
  const controller = createWxPeripheralAdapterController({ platform });
  await controller.open();
  const firstRelease = controller.release();
  const duplicateRelease = controller.release();
  const reopening = controller.open();
  pendingClose.resolve({});

  await Promise.all([firstRelease, duplicateRelease]);
  assert.equal((await reopening).reused, false);
  assert.deepEqual(platform.calls, [
    { type: 'open', mode: 'peripheral' },
    { type: 'close' },
    { type: 'open', mode: 'peripheral' }
  ]);
});
