import assert from 'node:assert/strict';
import { createWxPeripheralServerController } from '../../apps/uniapp/services/wx-peripheral-server.js';

function createHarness(failures = {}) {
  const calls = [];
  const server = {
    startAdvertising(options) {
      calls.push(['start', options.advertiseRequest, options.powerLevel]);
      queueMicrotask(() => failures.start ? options.fail?.(failures.start) : options.success?.({}));
    },
    stopAdvertising(options) {
      calls.push(['stop']);
      queueMicrotask(() => failures.stop ? options.fail?.(failures.stop) : options.success?.({}));
    },
    close(options) {
      calls.push(['close']);
      queueMicrotask(() => failures.close ? options.fail?.(failures.close) : options.success?.({}));
    }
  };
  const platform = {
    createBLEPeripheralServer(options) {
      calls.push(['create']);
      queueMicrotask(() => failures.create ? options.fail?.(failures.create) : options.success?.({ server }));
    }
  };
  return { calls, platform };
}

const run = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

console.log('[wx peripheral server]');

await run('creates once, starts, stops, closes, and can re-enter with a new server', async () => {
  const { calls, platform } = createHarness();
  const controller = createWxPeripheralServerController({ platform });
  await controller.ensureCreated();
  await controller.ensureCreated();
  await controller.start({ deviceName: 'SmartBLE' }, 'medium');
  await controller.stop();
  await controller.close();
  await controller.ensureCreated();
  assert.deepEqual(calls.map(([type]) => type), ['create', 'start', 'stop', 'close', 'create']);
  assert.equal(controller.snapshot().advertising, false);
});

await run('surfaces create/start failures without claiming ownership or advertising', async () => {
  const createFailure = createHarness({ create: { errMsg: 'unsupported' } });
  const createController = createWxPeripheralServerController({ platform: createFailure.platform });
  await assert.rejects(createController.ensureCreated(), (error) => error.errMsg === 'unsupported');
  assert.equal(createController.snapshot().hasServer, false);

  const startFailure = createHarness({ start: { errMsg: 'bad payload' } });
  const startController = createWxPeripheralServerController({ platform: startFailure.platform });
  await assert.rejects(startController.start({}, 'low'), (error) => error.errMsg === 'bad payload');
  assert.equal(startController.snapshot().advertising, false);
});

await run('close still runs after stop failure and releases a successfully closed server', async () => {
  const { calls, platform } = createHarness({ stop: { errMsg: 'already stopped' } });
  const controller = createWxPeripheralServerController({ platform });
  await controller.start({ deviceName: 'SmartBLE' }, 'low');
  await controller.close();
  assert.deepEqual(calls.map(([type]) => type), ['create', 'start', 'stop', 'close']);
  assert.equal(controller.snapshot().hasServer, false);
});

await run('concurrent close calls share one stop/close lifecycle', async () => {
  const { calls, platform } = createHarness();
  const controller = createWxPeripheralServerController({ platform });
  await controller.start({ deviceName: 'SmartBLE' }, 'low');
  await Promise.all([controller.close(), controller.close(), controller.close()]);
  assert.deepEqual(calls.map(([type]) => type), ['create', 'start', 'stop', 'close']);
  assert.equal(controller.snapshot().hasServer, false);
});
