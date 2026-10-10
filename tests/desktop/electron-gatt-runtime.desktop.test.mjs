import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const sourceURL = new URL('../../apps/desktop/electron/src/main/index.js', import.meta.url);
const realRequire = createRequire(sourceURL);
function runtime() {
  const handlers = new Map(), sent = [];
  const electron = { app: { whenReady: () => new Promise(() => {}), on() {} }, ipcMain: { handle: (name, handler) => handlers.set(name, handler) }, BrowserWindow: class {} };
  const context = vm.createContext({ require: name => name === 'electron' ? electron : realRequire(name), __dirname: new URL('../../apps/desktop/electron/src/main/', import.meta.url).pathname, Buffer, process, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, AbortController });
  vm.runInContext(readFileSync(sourceURL, 'utf8'), context);
  context.sink = sent;
  vm.runInContext("bleModule = { stopScanning() {} }; mainWindow = { isDestroyed: () => false, webContents: { isDestroyed: () => false, send: (event, data) => sink.push({event, data}) } };", context);
  return { sent, async connect(id, characteristic) {
    const service = { uuid: '180a', characteristics: [characteristic], discoverCharacteristics: (_, done) => done(null, [characteristic]) };
    const peripheral = new EventEmitter();
    Object.assign(peripheral, { id, state: 'disconnected', services: [service], connect() { this.state = 'connected'; this.emit('connect'); }, disconnect() { this.state = 'disconnected'; this.emit('disconnect'); }, discoverServices: (_, done) => done(null, [service]) });
    context.device = peripheral;
    vm.runInContext('discoveredDevices.set(device.id, device)', context);
    assert.equal((await handlers.get('ble:connect')(null, id)).success, true);
    return peripheral;
  }, call: (name, ...args) => handlers.get(`ble:${name}`)(null, ...args) };
}
function characteristic() {
  const char = new EventEmitter();
  Object.assign(char, { uuid: '2a26', properties: ['read', 'write', 'writeWithoutResponse', 'notify'], subscribe: done => done(), unsubscribe: done => done(), read: done => done(null, Buffer.alloc(0)) });
  return char;
}

test('generic and OTA native writes share one device queue, other devices write in parallel', async () => {
  const run = runtime(); const a = characteristic(), b = characteristic(); const calls = []; let firstDone;
  a.write = (bytes, mode, done) => { calls.push({ device: 'a', bytes: [...bytes], mode }); if (!firstDone) firstDone = done; else done(); };
  b.write = (bytes, mode, done) => { calls.push({ device: 'b', bytes: [...bytes], mode }); done(); };
  await run.connect('a', a); await run.connect('b', b);
  const generic = run.call('writeCharacteristic', 'a', '180a', '2a26', '61', 'hex');
  const ota = run.call('writeRaw', 'a', '180a', '2a26', [2], true);
  assert.equal((await run.call('writeRaw', 'b', '180a', '2a26', [3], false)).success, true);
  assert.deepEqual(calls.map(call => call.device), ['a', 'b']);
  firstDone();
  assert.equal((await generic).success, true); assert.equal((await ota).success, true);
  assert.deepEqual(calls.map(call => call.device), ['a', 'b', 'a']);
  assert.equal(calls[0].mode, false); assert.equal(calls[2].mode, true);
});

test('disconnect cancels an active read and all writes; late callbacks cannot emit values', async () => {
  const run = runtime(); const char = characteristic(); let writeDone, readDone;
  char.write = (_, __, done) => { writeDone = done; }; char.read = done => { readDone = done; };
  await run.connect('a', char);
  const reading = run.call('readCharacteristic', 'a', '180a', '2a26');
  const writing = run.call('writeRaw', 'a', '180a', '2a26', [1], false);
  const queued = run.call('writeRaw', 'a', '180a', '2a26', [2], false);
  assert.equal((await run.call('disconnect', 'a')).success, true);
  assert.equal((await reading).success, false); assert.equal((await writing).success, false); assert.equal((await queued).success, false);
  readDone(null, Buffer.from([9])); writeDone();
  assert.equal(run.sent.filter(item => item.event === 'ble:characteristicValueChanged').length, 0);
});

test('empty native read/notify values are valid; malformed hex is rejected before transport', async () => {
  const run = runtime(); const char = characteristic(); char.write = () => assert.fail('invalid hex reached native driver');
  await run.connect('a', char);
  assert.equal((await run.call('readCharacteristic', 'a', '180a', '2a26')).value, '');
  assert.equal((await run.call('writeCharacteristic', 'a', '180a', '2a26', 'a', 'hex')).error, 'Invalid hex');
  assert.equal((await run.call('writeCharacteristic', 'a', '180a', '2a26', 'zz', 'hex')).error, 'Invalid hex');
  assert.equal((await run.call('notifyCharacteristic', 'a', '180a', '2a26', true)).success, true);
  char.emit('data', Buffer.alloc(0), true);
  assert.equal(run.sent.at(-1).data.value, '');
  await run.call('notifyCharacteristic', 'a', '180a', '2a26', false);
  assert.equal(char.listenerCount('data'), 0);
});

test('service/characteristic discovery errors return failure instead of a fabricated empty success', async () => {
  const run = runtime(), char = characteristic();
  const peripheral = await run.connect('a', char);
  peripheral.services[0].discoverCharacteristics = (_, done) => done(new Error('native discovery failed'));
  const result = await run.call('discoverServices', 'a');
  assert.equal(result.success, false); assert.equal(result.error, 'native discovery failed');
  assert.equal(run.sent.filter(item => item.event === 'ble:servicesDiscovered').length, 0);
});

test('notify listener is ready before CCCD acknowledgement and duplicate subscribe is idempotent', async () => {
  const run = runtime(), char = characteristic(); let subscriptions = 0;
  char.subscribe = done => { subscriptions++; char.emit('data', Buffer.from([7]), true); done(); };
  await run.connect('a', char);
  assert.equal((await run.call('notifyCharacteristic', 'a', '180a', '2a26', true)).success, true);
  assert.equal(run.sent.at(-1).data.value, '07');
  assert.equal((await run.call('notifyCharacteristic', 'a', '180a', '2a26', true)).success, true);
  assert.equal(subscriptions, 1); assert.equal(char.listenerCount('data'), 1);
  const results = await Promise.all([run.call('notifyCharacteristic', 'a', '180a', '2a26', false), run.call('notifyCharacteristic', 'a', '180a', '2a26', true)]);
  assert.ok(results.every(result => result.success));
  assert.equal(subscriptions, 2); assert.equal(char.listenerCount('data'), 1);
});
