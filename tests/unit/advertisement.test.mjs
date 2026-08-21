import assert from 'node:assert/strict';
import { normalizeAdvertisement, normalizeByteField } from '../../apps/uniapp/services/ble-runtime/advertisement.js';

console.log('[advertisement snapshot]');
assert.equal(normalizeByteField(undefined).state, 'not_provided');
assert.equal(normalizeByteField(new ArrayBuffer(0)).state, 'empty');
assert.deepEqual(normalizeByteField(new Uint8Array([0, 15, 255]).buffer), {
  state: 'bytes', present: true, byteLength: 3, length: 3, hex: '000fff'
});

const snapshot = normalizeAdvertisement({
  deviceId: 'd1', localName: 'Demo', RSSI: -42,
  advertisServiceUUIDs: ['ABCD'],
  advertisData: new Uint8Array([1, 2]).buffer,
  manufacturerData: [{ manufacturerId: 76, manufacturerSpecificData: new Uint8Array([3]).buffer }],
  serviceData: { '180f': new Uint8Array([99]).buffer }
}, 123);
assert.equal(snapshot.serviceUuids[0], 'abcd');
assert.equal(snapshot.manufacturerData[0].companyId, 76);
assert.equal(snapshot.manufacturerData[0].value.hex, '03');
assert.equal(snapshot.serviceData[0].serviceUuid, '180f');
assert.equal(snapshot.serviceData[0].value.hex, '63');
assert.equal(snapshot.observedAt, 123);
console.log('  ✓ absence, empty bytes, raw bytes, manufacturer and service data are distinct');
