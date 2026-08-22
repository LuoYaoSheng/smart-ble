import assert from 'node:assert/strict';
import {
  DEFAULT_ADVERTISING_PAYLOAD,
  analyzeAdvertisingPayload,
  manufacturerDataBuffer,
  normalizeServiceUuid
} from '../../apps/uniapp/utils/advertising-payload.js';

const run = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

console.log('[advertising payload]');

run('accepts empty, 16-bit, 32-bit, and canonical 128-bit service UUIDs', () => {
  assert.equal(normalizeServiceUuid(''), '');
  assert.equal(normalizeServiceUuid('ffe0'), 'FFE0');
  assert.equal(normalizeServiceUuid('1234abcd'), '1234ABCD');
  assert.equal(normalizeServiceUuid('0000ffe0-0000-1000-8000-00805f9b34fb'), '0000FFE0-0000-1000-8000-00805F9B34FB');
  assert.throws(() => normalizeServiceUuid('not-a-uuid'), /UUID/);
});

run('counts UTF-8 bytes and all AD structure overhead', () => {
  const ascii = analyzeAdvertisingPayload({
    deviceName: 'SmartBLE',
    serviceUuid: 'FFE0',
    manufacturerId: '0001',
    manufacturerData: 'BLE'
  });
  assert.equal(ascii.totalBytes, 21);
  assert.equal(ascii.valid, true);

  const unicode = analyzeAdvertisingPayload({ deviceName: '蓝牙', manufacturerId: '0001', manufacturerData: '猫' });
  assert.equal(unicode.parts.deviceName, 8);
  assert.equal(unicode.parts.manufacturerData, 7);
});

run('accepts exactly 31 bytes and rejects 32 bytes', () => {
  const atLimit = analyzeAdvertisingPayload({ deviceName: 'A'.repeat(29) });
  const overLimit = analyzeAdvertisingPayload({ deviceName: 'A'.repeat(30) });
  assert.equal(atLimit.totalBytes, 31);
  assert.equal(atLimit.valid, true);
  assert.equal(overLimit.totalBytes, 32);
  assert.equal(overLimit.valid, false);
  assert.ok(overLimit.errors.some((message) => message.includes('31')));
});

run('rejects malformed manufacturer ID or data without an ID', () => {
  assert.equal(analyzeAdvertisingPayload({ manufacturerId: 'GG', manufacturerData: 'BLE' }).valid, false);
  assert.equal(analyzeAdvertisingPayload({ manufacturerData: 'BLE' }).valid, false);
  assert.deepEqual([...new Uint8Array(manufacturerDataBuffer('蓝'))], [0xE8, 0x93, 0x9D]);
});

run('ships a valid default that matches the first-run fields', () => {
  const result = analyzeAdvertisingPayload(DEFAULT_ADVERTISING_PAYLOAD);
  assert.equal(result.valid, true);
  assert.equal(result.totalBytes, 21);
});
