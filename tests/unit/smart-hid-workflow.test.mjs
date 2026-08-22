import assert from 'node:assert/strict';
import {
  classifySmartHidStatus,
  createSmartHidStatusWaiters,
  describeSmartHidStatus,
  runSmartHidProvisionTransaction,
  smartHidRecoveryAction
} from '../../apps/uniapp/services/smart-hid/workflow.js';

const run = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

console.log('[smart hid workflow]');

await run('maps every stable error to one canonical recovery action and message', () => {
  const expected = {
    invalid_payload: 'form',
    wifi_failed: 'form',
    controlhub_unreachable: 'pairing',
    pairing_invalid: 'pairing',
    pairing_expired: 'pairing',
    pairing_used: 'pairing',
    mqtt_invalid: 'diagnostics',
    storage_failed: 'retry'
  };
  for (const [code, action] of Object.entries(expected)) {
    assert.equal(smartHidRecoveryAction(code), action, code);
    assert.ok(describeSmartHidStatus({ state: 'error', error: code }).includes('失败') || describeSmartHidStatus({ state: 'error', error: code }).includes('请'));
  }
  assert.equal(smartHidRecoveryAction('ble_disconnected'), 'retry');
  assert.equal(smartHidRecoveryAction('timeout'), 'retry');
});

await run('classifies ready, progress, recovery, malformed, and error states', () => {
  assert.deepEqual(classifySmartHidStatus({ state: 'ready', error: null }), { phase: 'ready', terminal: true });
  assert.deepEqual(classifySmartHidStatus({ state: 'provisioning', step: 'connecting_wifi', error: null }), { phase: 'connecting_wifi', terminal: false });
  assert.deepEqual(classifySmartHidStatus({ state: 'recovery', error: null }), { phase: 'recovery', terminal: true });
  assert.deepEqual(classifySmartHidStatus({ state: 'error', error: 'wifi_failed' }), { phase: 'error', terminal: true, error: 'wifi_failed' });
  assert.deepEqual(classifySmartHidStatus(null), { phase: 'unknown', terminal: false });
});

await run('waiters resolve immediate status, time out, cancel, and fail together on disconnect', async () => {
  const waiters = createSmartHidStatusWaiters();
  const immediate = waiters.waitFor((status) => status.state === 'ready', 100);
  waiters.emit({ state: 'ready', error: null });
  assert.deepEqual(await immediate, { state: 'ready', error: null });
  assert.equal(waiters.size, 0);

  await assert.rejects(waiters.waitFor(() => false, 5), /超时/);
  const cancelled = waiters.waitFor(() => true, 100);
  cancelled.cancel('user cancelled');
  await assert.rejects(cancelled, /user cancelled/);

  const first = waiters.waitFor(() => true, 100);
  const second = waiters.waitFor(() => true, 100);
  waiters.failAll('BLE 连接已断开');
  await assert.rejects(first, /断开/);
  await assert.rejects(second, /断开/);
  assert.equal(waiters.size, 0);
});

await run('creates the result waiter before write so an immediate terminal status is not lost', async () => {
  const order = [];
  let resolveResult;
  const result = await runSmartHidProvisionTransaction({
    createWaiter() {
      order.push('waiter');
      const waiter = new Promise((resolve) => { resolveResult = resolve; });
      waiter.cancel = () => {};
      return waiter;
    },
    async writeCandidate(waiter) {
      order.push('write');
      resolveResult({ ok: true, status: { state: 'ready', error: null } });
      assert.ok(waiter);
    }
  });

  assert.deepEqual(order, ['waiter', 'write']);
  assert.equal(result.ok, true);
});
