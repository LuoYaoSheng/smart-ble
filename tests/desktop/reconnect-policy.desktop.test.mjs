import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

for (const path of ['electron/public', 'tauri/src', 'wails/frontend/src']) {
  test(`${path} reconnect uses the 1/3/5 second contract`, () => {
    const context = vm.createContext({ window: {}, TextEncoder, TextDecoder });
    vm.runInContext(readFileSync(new URL(`../../apps/desktop/${path}/BleUtils.js`, import.meta.url), 'utf8'), context);
    assert.deepEqual([1, 2, 3].map(context.window.BleUtils.reconnectDelay), [1000, 3000, 5000]);
    assert.throws(() => context.window.BleUtils.reconnectDelay(4));
  });
}

for (const path of ['electron/public', 'tauri/src', 'wails/frontend/src']) {
  test(`${path} reconnect implementation uses the tested delay helper`, () => {
    const source = readFileSync(new URL(`../../apps/desktop/${path}/app.js`, import.meta.url), 'utf8');
    assert.match(source, /(?:delay|delayMs)\s*=\s*window\.BleUtils(?:\s*\?\s*window\.BleUtils)?\.reconnectDelay\(nextAttempt\)/);
    assert.equal(/nextAttempt\s*\*\s*2000/.test(source), false);
  });
}

function reconnectRuntime(path) {
  const timers = new Map(); let timerId = 0, calls = 0;
  const window = { location: { search: '' } };
  const context = vm.createContext({ window, TextEncoder, TextDecoder, console, document: { getElementById: () => null, addEventListener() {} }, setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout(id) { timers.delete(id); } });
  vm.runInContext(readFileSync(new URL(`../../apps/desktop/${path}/BleUtils.js`, import.meta.url), 'utf8'), context);
  vm.runInContext(readFileSync(new URL(`../../apps/desktop/${path}/app.js`, import.meta.url), 'utf8'), context);
  const isTauri = path === 'tauri/src';
  let app;
  if (isTauri) {
    context.nativeInvoke = async command => { if (command === 'connect') { calls++; return { success: false, error: 'test failure' }; } return { success: true }; };
    vm.runInContext('invoke = nativeInvoke; addLog = () => {}; renderConnectedDevicesPanel = () => {}; discoverServices = async () => {};', context);
    app = { start: () => vm.runInContext('attemptReconnect("test")', context), cancel: () => vm.runInContext('state.reconnect.userDisconnected.add("test")', context) };
  } else {
    const prototype = vm.runInContext('App.prototype', context);
    const instance = Object.assign(Object.create(prototype), { autoReconnectEnabled: true, userDisconnected: new Set(), reconnectAttempts: new Map(), reconnectTimers: new Map(), connectedDevices: new Set(), servicesByDevice: new Map(), devices: new Map([['test', { id: 'test' }]]), currentDevice: null, addLog() {}, renderConnectedDevicesPanel() {}, updateConnectionStatus() {}, discoverServices() {} });
    window.bleAPI = { connect: async () => { calls++; return { success: false, error: 'test failure' }; }, disconnect: async () => ({ success: true }) };
    app = { start: () => instance.onDeviceDisconnected('test'), cancel: () => instance.userDisconnected.add('test') };
  }
  return { app, timers, calls: () => calls, async fire() { assert.equal(timers.size, 1); const [id, timer] = timers.entries().next().value; timers.delete(id); await timer.fn(); return timer.ms; } };
}
for (const path of ['electron/public', 'tauri/src', 'wails/frontend/src']) {
  test(`${path} repeated failures attempt exactly three reconnects at 1/3/5 seconds`, async () => {
    const run = reconnectRuntime(path);
    run.app.start(); run.app.start(); // Duplicate disconnect signals must not add attempts.
    const delays = [];
    while (run.timers.size) delays.push(await run.fire());
    assert.deepEqual(delays, [1000, 3000, 5000]);
    assert.equal(run.calls(), 3);
    run.app.start();
    assert.equal(run.timers.size, 0); // Exhaustion persists until a new connection.
  });
  test(`${path} user disconnect prevents the scheduled native reconnect`, async () => {
    const run = reconnectRuntime(path);
    run.app.start(); run.app.cancel();
    await run.fire();
    assert.equal(run.calls(), 0);
    assert.equal(run.timers.size, 0);
  });
}
