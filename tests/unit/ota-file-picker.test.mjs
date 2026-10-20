import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseFirmwareFile } from '../../apps/uniapp/services/ota/firmware-file-picker.js';

function androidFixture({ name = 'firmware.bin', bytes = Buffer.from([1, 2, 3]), cancel = false } = {}) {
  const closed = [], calls = [];
  let offset = 0;
  const cursor = { moveToFirst: () => true, getColumnIndex: key => key === '_display_name' ? 0 : -1, getString: () => name, close: () => closed.push('cursor') };
  const stream = { read: buffer => { if (offset >= bytes.length) return -1; const size = Math.min(buffer.length, bytes.length - offset); buffer.set(bytes.subarray(offset, offset + size)); offset += size; return size; }, close: () => closed.push('stream') };
  const chunks = [];
  const output = { write: (buffer, start, length) => chunks.push(Buffer.from(buffer.slice(start, start + length))), toByteArray: () => Buffer.concat(chunks), close: () => closed.push('output') };
  const resolver = { query: () => cursor, openInputStream: () => stream };
  const intent = { addCategory: value => calls.push(['category', value]), setType: value => calls.push(['mime', value]), addFlags: flags => calls.push(['flags', flags]) };
  let forwarded = false;
  const previous = () => { forwarded = true; };
  const activity = { onActivityResult: previous, getContentResolver: () => resolver,
    startActivityForResult: (_, request) => queueMicrotask(() => {
      activity.onActivityResult(123, 0, null);
      activity.onActivityResult(request, cancel ? 0 : -1, cancel ? null : { getData: () => ({ content: 'uri' }) });
    }),
  };
  const oldPlus = globalThis.plus, oldUni = globalThis.uni;
  globalThis.plus = { os: { name: 'Android' }, android: {
    runtimeMainActivity: () => activity, importClass() {},
    getAttribute: (klass, name) => { assert.equal(klass, 'java.lang.Byte'); assert.equal(name, 'TYPE'); return 'byte'; },
    newObject: klass => klass === 'java.io.ByteArrayOutputStream' ? output : intent,
    invoke: (target, method, ...args) => {
      if (target === 'java.lang.reflect.Array') { assert.equal(method, 'newInstance'); return new Uint8Array(args[1]); }
      if (target === 'android.util.Base64') { assert.equal(method, 'encodeToString'); return Buffer.from(args[0]).toString('base64'); }
      return target[method](...args);
    },
  } };
  globalThis.uni = { base64ToArrayBuffer: text => Uint8Array.from(Buffer.from(text, 'base64')).buffer };
  return { calls, closed, activity, previous, forwarded: () => forwarded,
    restore() { globalThis.plus = oldPlus; globalThis.uni = oldUni; } };
}

test('Android picker reads content URI bytes, restores callback and closes every native handle', async () => {
  const f = androidFixture({ bytes: Buffer.from(Array.from({ length: 20000 }, (_, i) => i % 256)) });
  try {
    const selected = await chooseFirmwareFile('.bin');
    assert.equal(selected.name, 'firmware.bin'); assert.equal(selected.data.byteLength, 20000);
    assert.deepEqual([...new Uint8Array(selected.data).slice(8190, 8195)], [254, 255, 0, 1, 2]);
    assert.deepEqual(f.closed, ['cursor', 'stream', 'output']);
    assert.equal(f.activity.onActivityResult, f.previous); assert.equal(f.forwarded(), true);
    assert.deepEqual(f.calls.find(([op]) => op === 'flags'), ['flags', 1]);
  } finally { f.restore(); }
});
test('Android picker preserves UTF-8 manifest and treats cancel as no selection', async () => {
  let f = androidFixture({ name: 'manifest.json', bytes: Buffer.from('{"hardware":"蓝牙"}') });
  try { assert.equal((await chooseFirmwareFile('.json')).data, '{"hardware":"蓝牙"}'); } finally { f.restore(); }
  f = androidFixture({ cancel: true });
  try { assert.equal(await chooseFirmwareFile('.bin'), null); assert.equal(f.activity.onActivityResult, f.previous); } finally { f.restore(); }
});
test('Android picker rejects wrong extension and oversized content without retaining file handles', async () => {
  for (const opts of [{ name: 'image.jpg' }, { bytes: Buffer.alloc(16 * 1024 * 1024 + 1) }]) {
    const f = androidFixture(opts);
    try { await assert.rejects(chooseFirmwareFile('.bin')); assert.ok(f.closed.includes('cursor')); assert.equal(f.activity.onActivityResult, f.previous); }
    finally { f.restore(); }
  }
});

test('Android picker setup failure releases its lock so the next selection can retry', async () => {
  const f = androidFixture();
  const load = globalThis.plus.android.importClass;
  globalThis.plus.android.importClass = () => { throw new Error('bridge unavailable'); };
  try {
    await assert.rejects(chooseFirmwareFile('.bin'), /bridge unavailable/);
    globalThis.plus.android.importClass = load;
    assert.equal((await chooseFirmwareFile('.bin')).name, 'firmware.bin');
  } finally { f.restore(); }
});
