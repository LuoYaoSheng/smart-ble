import assert from 'node:assert/strict';
import {
  KNOWN_DEVICE_TTL_MS,
  normalizeKnownDevices
} from '../../apps/uniapp/services/smart-hid/known-devices.js';
import {
  buildDeviceDetailUrl,
  resetDeviceRouteContextForTesting,
  resolveDeviceRouteContext,
  stashDeviceRouteContext
} from '../../apps/uniapp/services/device-route-context.js';
import { buildGenericDeviceDetailUrl } from '../../apps/uniapp/services/hid-navigation.js';

console.log('[phase-3/4 helpers]');

const now = 1_700_000_000_000;
const normalized = normalizeKnownDevices([
  { deviceId: 'a', name: 'Old', configuredAt: now - KNOWN_DEVICE_TTL_MS - 1 },
  { deviceId: 'b', name: 'Keep', configuredAt: now - 1000 },
  { deviceId: 'b', name: 'Newer', configuredAt: now },
  { deviceId: '', name: 'bad' },
  { deviceId: 'c', name: 'NoTime' }
], { now, max: 20 });
assert.equal(normalized.some((item) => item.deviceId === 'a'), false);
assert.equal(normalized.find((item) => item.deviceId === 'b')?.name, 'Newer');
assert.equal(normalized.find((item) => item.deviceId === 'c')?.name, 'NoTime');

resetDeviceRouteContextForTesting();
const url = buildGenericDeviceDetailUrl({
  deviceId: 'dev/1',
  name: 'Demo',
  RSSI: -40,
  advertisDataHex: 'AABB',
  advertisement: { raw: true }
});
assert.match(url, /deviceId=dev%2F1/);
assert.doesNotMatch(url, /advertisDataHex|AABB/);
const resolved = resolveDeviceRouteContext({
  deviceId: 'dev%2F1',
  name: 'Demo',
  rssi: '-40'
});
assert.equal(resolved.deviceId, 'dev/1');
assert.equal(resolved.advertisDataHex, 'AABB');
assert.equal(resolved.advertisement?.raw, true);

const legacy = resolveDeviceRouteContext({
  device: encodeURIComponent(JSON.stringify({ deviceId: 'legacy', name: 'L' }))
});
assert.equal(legacy.deviceId, 'legacy');

stashDeviceRouteContext({ deviceId: 'x', name: 'X' });
assert.match(buildDeviceDetailUrl({ deviceId: 'x', name: 'X' }), /deviceId=x/);

console.log('  ✓ known-device TTL/dedupe and compact device routes');
