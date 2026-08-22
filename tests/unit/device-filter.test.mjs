import assert from 'node:assert/strict';
import { filterBleDevices } from '../../apps/uniapp/services/ble-runtime/device-filter.js';

console.log('[device filter]');

const devices = [
  { deviceId: 'A', name: 'Sensor One', RSSI: -40 },
  { deviceId: 'B', localName: 'SHID-123456', RSSI: -65 },
  { deviceId: 'C', name: '', RSSI: -90 },
  { deviceId: 'D' }
];
const snapshot = structuredClone(devices);

assert.deepEqual(filterBleDevices(devices, { rssi: -70, prefix: '', hideNoName: false }).map(({ deviceId }) => deviceId), ['A', 'B']);
assert.deepEqual(filterBleDevices(devices, { rssi: -100, prefix: 'shid-', hideNoName: false }).map(({ deviceId }) => deviceId), ['B']);
assert.deepEqual(filterBleDevices(devices, { rssi: -100, prefix: '', hideNoName: true }).map(({ deviceId }) => deviceId), ['A', 'B']);
assert.deepEqual(devices, snapshot);
console.log('  ✓ filters RSSI/name/localName without mutating source devices');
