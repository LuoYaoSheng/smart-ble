// tests/target/unit/gatt-codec-target.test.mjs
// TEST-U-009 属性约束；TEST-U-010 HEX 编码校验；RUNTIME-GATT-CODEC-001 全量 Codec。
// 目标：REQ-024/026；FEAT-026/028；PAGE-006；FLOW-005。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-009/010 REQ-024/026 FEAT-026/028 PAGE-006 FLOW-005';

async function loadCodec() {
  const m = await importTarget('apps/uniapp/services/ble-runtime/gatt-codec.js');
  if (!m.ok) assert.fail(notImplemented(IDS, m.message));
  return m.module;
}

async function loadRuntime() {
  const m = await importTarget('apps/uniapp/services/ble-runtime/index.js');
  if (!m.ok) assert.fail(notImplemented(IDS, m.message));
  return m.module;
}

// ---------- 原 TEST-U-009/010（ble-utils 再导出） ----------
test('TEST-U-009/010 目标层：utils/ble-utils.js + 属性约束目标接口', async () => {
  const m = await importTarget('apps/uniapp/utils/ble-utils.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));

  const hexFn = m.module.validateHexInput || m.module.parseHexInput || m.module.isValidHex;
  if (typeof hexFn !== 'function') {
    assert.fail(notImplemented('TEST-U-010 REQ-026 FEAT-028', '目标接口 validateHexInput/parseHexInput 缺失'));
  } else {
    const ok = hexFn('AABBCC');
    assert.ok(ok === true || ok?.valid === true || ok?.ok === true, '合法 HEX 通过');
    const bad = hexFn('AA ZZ');
    assert.ok(bad === false || bad === null || (bad && (bad.ok === false || bad.valid === false)), '非法 HEX 必须整体拒绝（不静默修正）');
  }

  const propFn = m.module.validateCharacteristicProperties || m.module.canOperate;
  if (typeof propFn !== 'function') {
    assert.fail(notImplemented('TEST-U-009 REQ-024 FEAT-026', '目标接口 validateCharacteristicProperties 缺失'));
  } else {
    assert.equal(propFn(['read', 'write'], 'write'), true);
    assert.equal(propFn(['read'], 'write'), false);
    assert.equal(propFn(['notify'], 'subscribe'), true);
    assert.equal(propFn(['read'], 'subscribe'), false);
  }
});

test('TEST-U-010-01 HEX spaced AA BB CC', async () => {
  const { parseHexInput, validateHexInput } = await loadCodec();
  assert.equal(validateHexInput('AA BB CC').valid, true);
  const r = parseHexInput('AA BB CC');
  assert.equal(r.ok, true);
  assert.deepEqual([...r.data], [0xaa, 0xbb, 0xcc]);
});

test('TEST-U-010-02 HEX colon AA:BB:CC', async () => {
  const { parseHexInput } = await loadCodec();
  const r = parseHexInput('AA:BB:CC');
  assert.equal(r.ok, true);
  assert.deepEqual([...r.data], [0xaa, 0xbb, 0xcc]);
});

test('TEST-U-010-03 HEX lower aabbcc', async () => {
  const { parseHexInput, validateHexInput } = await loadCodec();
  assert.equal(validateHexInput('aabbcc').normalized, 'AABBCC');
  assert.deepEqual([...(parseHexInput('aabbcc').data)], [0xaa, 0xbb, 0xcc]);
});

test('TEST-U-010-04 HEX spaces only separators', async () => {
  const { parseHexInput } = await loadCodec();
  assert.deepEqual([...(parseHexInput('A A B B C C').data)], [0xaa, 0xbb, 0xcc]);
});

test('TEST-U-010-05 HEX newlines', async () => {
  const { parseHexInput } = await loadCodec();
  assert.deepEqual([...(parseHexInput('AA\nBB\r\nCC').data)], [0xaa, 0xbb, 0xcc]);
});

test('TEST-U-010-06 invalid character', async () => {
  const { validateHexInput, parseHexInput } = await loadCodec();
  const v = validateHexInput('AA GG');
  assert.equal(v.valid, false);
  assert.equal(v.code, 'INVALID_HEX_CHARACTER');
  assert.equal(parseHexInput('AA ZZ').ok, false);
});

test('TEST-U-010-07 odd length', async () => {
  const { validateHexInput } = await loadCodec();
  const v = validateHexInput('ABC');
  assert.equal(v.valid, false);
  assert.equal(v.code, 'ODD_HEX_LENGTH');
  assert.equal(validateHexInput('A').code, 'ODD_HEX_LENGTH');
});

test('TEST-U-010-08 empty', async () => {
  const { validateHexInput } = await loadCodec();
  assert.equal(validateHexInput('').code, 'EMPTY_HEX');
  assert.equal(validateHexInput('   ').code, 'EMPTY_HEX');
  assert.equal(validateHexInput(null).code, 'EMPTY_HEX');
});

test('TEST-U-010-09 large payload', async () => {
  const { parseHexInput, normalizeGattPayload } = await loadCodec();
  const hex = 'AB'.repeat(256);
  const r = parseHexInput(hex);
  assert.equal(r.ok, true);
  assert.equal(r.data.length, 256);
  const n = normalizeGattPayload(hex, 'hex');
  assert.equal(n.length, 256);
});

test('TEST-U-010-10 no mutation of input', async () => {
  const { parseHexInput, validateHexInput } = await loadCodec();
  const input = 'aa bb cc';
  const snapshot = input;
  parseHexInput(input);
  validateHexInput(input);
  assert.equal(input, snapshot);
});

test('TEST-U-010-11 TEXT utf8 plain', async () => {
  const { encodeTextInput, decodeBytes } = await loadCodec();
  const bytes = encodeTextInput('hello');
  assert.deepEqual([...bytes], [0x68, 0x65, 0x6c, 0x6c, 0x6f]);
  assert.equal(decodeBytes(bytes), 'hello');
});

test('TEST-U-010-12 TEXT chinese', async () => {
  const { encodeTextInput, decodeBytes } = await loadCodec();
  const bytes = encodeTextInput('你好');
  assert.equal(decodeBytes(bytes), '你好');
});

test('TEST-U-010-13 TEXT emoji', async () => {
  const { encodeTextInput, decodeBytes } = await loadCodec();
  const bytes = encodeTextInput('😀');
  assert.equal(decodeBytes(bytes), '😀');
});

test('TEST-U-010-14 TEXT empty allowed', async () => {
  const { encodeTextInput, normalizeGattPayload } = await loadCodec();
  assert.equal(encodeTextInput('').length, 0);
  assert.equal(normalizeGattPayload('', 'text').ok, true);
  assert.equal(normalizeGattPayload('', 'text').length, 0);
});

test('TEST-U-010-15 Read hex format', async () => {
  const { formatReadValue } = await loadCodec();
  assert.equal(formatReadValue(new Uint8Array([0xaa, 0xbb, 0xcc]), 'hex'), 'AA BB CC');
});

test('TEST-U-010-16 Read text format', async () => {
  const { formatReadValue, encodeTextInput } = await loadCodec();
  assert.equal(formatReadValue(encodeTextInput('Hi'), 'text'), 'Hi');
});

test('TEST-U-010-17 Read auto format', async () => {
  const { formatReadValue, encodeTextInput } = await loadCodec();
  assert.equal(formatReadValue(encodeTextInput('Auto'), 'auto'), 'Auto');
  assert.equal(formatReadValue(new Uint8Array([0x00, 0xff, 0x01]), 'auto'), '00 FF 01');
});

test('TEST-U-010-18 invalid hex no BLE call', async () => {
  const rt = await loadRuntime();
  const { createFakePlatform } = await import('../lib/fake-runtime.mjs');
  const platform = createFakePlatform();
  const SVC = '4fafc201-1fb5-459e-8fcc-c5c9c331914c';
  const CHR = 'beb5483e-36e1-4688-b7f5-ea07361b26b0';
  platform.setServices?.('CODEC1', [{ uuid: SVC }]);
  platform.setCharacteristics?.('CODEC1', SVC, [{ uuid: CHR, properties: { write: true, read: true } }]);
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    const session = await rt.connectDevice('CODEC1');
    const before = platform.__calls.filter((c) => c.m === 'write').length;
    const result = await rt.writeCharacteristic(session, SVC, CHR, 'AA ZZ', { mode: 'hex' });
    assert.equal(result.ok, false);
    assert.equal(result.wrote, false);
    const after = platform.__calls.filter((c) => c.m === 'write').length;
    assert.equal(after, before, '非法 HEX 不得调用平台 write');
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});

test('TEST-U-010-19 valid hex BLE call', async () => {
  const rt = await loadRuntime();
  const { createFakePlatform } = await import('../lib/fake-runtime.mjs');
  const platform = createFakePlatform();
  const SVC = '4fafc201-1fb5-459e-8fcc-c5c9c331914c';
  const CHR = 'beb5483e-36e1-4688-b7f5-ea07361b26b0';
  platform.setServices?.('CODEC2', [{ uuid: SVC }]);
  platform.setCharacteristics?.('CODEC2', SVC, [{ uuid: CHR, properties: { write: true, read: true } }]);
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    const session = await rt.connectDevice('CODEC2');
    const result = await rt.writeCharacteristic(session, SVC, CHR, 'AA BB CC', { mode: 'hex' });
    assert.equal(result.ok, true);
    assert.equal(result.length, 3);
    const writes = platform.__calls.filter((c) => c.m === 'write');
    assert.ok(writes.length >= 1);
    const last = writes[writes.length - 1];
    assert.deepEqual([...last.args.value], [0xaa, 0xbb, 0xcc]);
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});

test('TEST-U-010-20 text BLE call', async () => {
  const rt = await loadRuntime();
  const { createFakePlatform } = await import('../lib/fake-runtime.mjs');
  const platform = createFakePlatform();
  const SVC = '4fafc201-1fb5-459e-8fcc-c5c9c331914c';
  const CHR = 'beb5483e-36e1-4688-b7f5-ea07361b26b0';
  platform.setServices?.('CODEC3', [{ uuid: SVC }]);
  platform.setCharacteristics?.('CODEC3', SVC, [{ uuid: CHR, properties: { write: true, read: true } }]);
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    const session = await rt.connectDevice('CODEC3');
    const result = await rt.writeCharacteristic(session, SVC, CHR, 'OK', { mode: 'text' });
    assert.equal(result.ok, true);
    const writes = platform.__calls.filter((c) => c.m === 'write');
    const last = writes[writes.length - 1];
    assert.deepEqual([...last.args.value], [0x4f, 0x4b]);
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});
