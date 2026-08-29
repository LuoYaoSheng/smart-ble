import assert from 'node:assert/strict';
import {
  encodePayloadFrames,
  getFramingStrategy,
  listFramingStrategies
} from '../../core/ble-core/provisioning/framing-strategies.js';
import {
  runProvisionTransaction,
  writeProfileCandidate
} from '../../apps/uniapp/services/provisioning/orchestrator.js';

console.log('[provisioning orchestrator]');

assert.deepEqual(listFramingStrategies().sort(), ['framed-v1', 'raw']);
assert.equal(getFramingStrategy('framed-v1').name, 'framed-v1');
assert.throws(() => getFramingStrategy('unknown'), /unknown framing/);

const rawFrames = encodePayloadFrames(Uint8Array.from([1, 2, 3]), 'raw');
assert.equal(rawFrames.length, 1);
assert.deepEqual([...rawFrames[0]], [1, 2, 3]);

const framed = encodePayloadFrames(Uint8Array.from([9, 8, 7]), 'framed-v1', 23);
assert.ok(framed.length >= 1);
assert.equal(framed[0][0], 0);
assert.equal(framed[0][2], framed[0].length - 3);

const profile = {
  id: 'fake',
  characteristics: { INPUT: 'AABB0003-0000-0000-0000-000000000001' },
  transport: { framing: 'raw', inputAlias: 'INPUT' },
  codec: {
    buildCandidate: () => Uint8Array.from([0xaa, 0xbb])
  }
};

const events = [];
const result = await runProvisionTransaction({
  createWaiter: () => {
    events.push('waiter');
    const promise = Promise.resolve({ ok: true, status: { state: 'ready' } });
    promise.cancel = () => {};
    promise.catch(() => {});
    return promise;
  },
  writeCandidate: async (waiter) => {
    events.push('write');
    assert.ok(waiter);
  }
});
assert.deepEqual(events, ['waiter', 'write']);
assert.equal(result.ok, true);
console.log('  ✓ framing strategies and waiter-before-write transaction');

await assert.rejects(
  () => writeProfileCandidate({ dead: true }, profile, {}),
  /BLE 未连接/
);
console.log('  ✓ writeProfileCandidate rejects dead sessions');
