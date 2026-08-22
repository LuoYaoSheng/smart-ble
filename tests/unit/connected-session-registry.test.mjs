import assert from 'node:assert/strict';
import { createConnectedSessionRegistry } from '../../apps/uniapp/services/connected-session-registry.js';

function createSession(deviceId) {
  const disconnectCallbacks = new Set();
  let unsubscribeCalls = 0;
  return {
    deviceId,
    dead: false,
    onDisconnect(callback) {
      disconnectCallbacks.add(callback);
      return () => {
        if (disconnectCallbacks.delete(callback)) unsubscribeCalls += 1;
      };
    },
    disconnect(reason = 'passive') {
      this.dead = true;
      for (const callback of [...disconnectCallbacks]) callback(reason);
      disconnectCallbacks.clear();
    },
    get callbackCount() {
      return disconnectCallbacks.size;
    },
    get unsubscribeCalls() {
      return unsubscribeCalls;
    }
  };
}

const run = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

console.log('[connected session registry]');

run('binds one session and reuses it without duplicate callbacks', () => {
  const registry = createConnectedSessionRegistry();
  const session = createSession('A');

  assert.equal(registry.bind('A', session), session);
  assert.equal(registry.bind('A', session), session);
  assert.equal(registry.get('A'), session);
  assert.equal(session.callbackCount, 1);
  assert.equal(registry.size, 1);
});

run('replacement unsubscribes the old callback and ignores its later disconnect', () => {
  const changes = [];
  const registry = createConnectedSessionRegistry({
    onDisconnect: (event) => changes.push(event)
  });
  const first = createSession('A');
  const replacement = createSession('A');

  registry.bind('A', first);
  registry.bind('A', replacement);
  assert.equal(first.callbackCount, 0);
  assert.equal(first.unsubscribeCalls, 1);
  assert.equal(registry.get('A'), replacement);

  first.disconnect('old-session');
  assert.equal(registry.get('A'), replacement);
  assert.deepEqual(changes, []);
});

run('passive or active disconnect removes only the current session and emits one sync event', () => {
  const changes = [];
  const registry = createConnectedSessionRegistry({
    onDisconnect: (event) => changes.push(event)
  });
  const passive = createSession('A');
  const active = createSession('B');
  registry.bind('A', passive);
  registry.bind('B', active);

  passive.disconnect('radio lost');
  active.disconnect('BLE 连接已主动关闭');

  assert.equal(registry.get('A'), null);
  assert.equal(registry.get('B'), null);
  assert.deepEqual(changes.map(({ deviceId, reason }) => [deviceId, reason]), [
    ['A', 'radio lost'],
    ['B', 'BLE 连接已主动关闭']
  ]);
});

run('remove unsubscribes callbacks and can guard against stale-session removal', () => {
  const registry = createConnectedSessionRegistry();
  const first = createSession('A');
  const replacement = createSession('A');
  registry.bind('A', first);
  registry.bind('A', replacement);

  assert.equal(registry.remove('A', first), false);
  assert.equal(registry.get('A'), replacement);
  assert.equal(registry.remove('A', replacement), true);
  assert.equal(registry.get('A'), null);
  assert.equal(replacement.callbackCount, 0);
  assert.equal(replacement.unsubscribeCalls, 1);
});

run('rejects invalid or already-dead sessions', () => {
  const registry = createConnectedSessionRegistry();
  assert.throws(() => registry.bind('', createSession('A')), /deviceId/);
  assert.throws(() => registry.bind('A', null), /session/);
  const dead = createSession('A');
  dead.dead = true;
  assert.throws(() => registry.bind('A', dead), /dead/);
});
