import assert from 'node:assert/strict';
import {
  createNotifyToggleController,
  encodeWritePayload,
  formatDeviceLogExport
} from '../../apps/uniapp/services/device-session-operations.js';

const run = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

console.log('[device session operations]');

await run('encodes UTF-8 and strict even-length HEX payloads', () => {
  assert.deepEqual([...new Uint8Array(encodeWritePayload('text', '蓝牙'))], [0xE8, 0x93, 0x9D, 0xE7, 0x89, 0x99]);
  assert.deepEqual([...new Uint8Array(encodeWritePayload('hex', 'AA 00 ff'))], [0xAA, 0x00, 0xFF]);
  assert.throws(() => encodeWritePayload('hex', 'ABC'), /HEX/);
  assert.throws(() => encodeWritePayload('hex', 'GG'), /HEX/);
  assert.throws(() => encodeWritePayload('hex', ''), /empty/i);
});

await run('formats device logs and keeps empty export explicit', () => {
  assert.equal(formatDeviceLogExport([]), '');
  assert.equal(formatDeviceLogExport([
    { timestamp: '10:00:00', type: 'send', message: 'AA' },
    { timestamp: '10:00:01', type: 'receive', message: 'BB' }
  ]), '[10:00:00] [send] AA\n[10:00:01] [receive] BB');
});

await run('serializes repeated Notify toggles and disables remote state during cleanup', async () => {
  const calls = [];
  let finishSubscribe;
  const controller = createNotifyToggleController({
    subscribe: () => new Promise((resolve) => {
      finishSubscribe = () => {
        calls.push('subscribed');
        resolve(() => calls.push('unsubscribed'));
      };
    }),
    disable: async () => calls.push('disabled')
  });
  const target = { session: { dead: false }, serviceId: 'S', characteristicId: 'C', callback: () => {} };
  const first = controller.toggle(target);
  const duplicate = controller.toggle(target);
  await new Promise((resolve) => setTimeout(resolve, 0));
  finishSubscribe();
  assert.equal(await first, true);
  assert.equal(await duplicate, true);
  assert.deepEqual(calls, ['subscribed']);

  await controller.dispose();
  assert.deepEqual(calls, ['subscribed', 'disabled', 'unsubscribed']);
  assert.equal(controller.size, 0);
});

await run('a completed second toggle disables one active Notify subscription', async () => {
  const calls = [];
  const controller = createNotifyToggleController({
    subscribe: async () => () => calls.push('unsubscribed'),
    disable: async () => calls.push('disabled')
  });
  const target = { session: { dead: false }, serviceId: 'S', characteristicId: 'C', callback: () => {} };
  assert.equal(await controller.toggle(target), true);
  assert.equal(await controller.toggle(target), false);
  assert.deepEqual(calls, ['disabled', 'unsubscribed']);
});
