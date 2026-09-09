import assert from 'node:assert/strict';
import * as knownDevices from '../../apps/uniapp/services/smart-hid/known-devices.js';
import {
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

// F023（2026-09-02 用户决策）：90 天 TTL / 容量上限 / 本地持久化移除，仅存内存快照清洗
assert.equal('KNOWN_DEVICE_TTL_MS' in knownDevices, false, 'F023：TTL 常量不得回归');
assert.equal('KNOWN_DEVICES_MAX' in knownDevices, false, 'F023：容量上限不得回归');

const now = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const normalized = normalizeKnownDevices([
  { deviceId: 'a', name: 'Old', configuredAt: now - 95 * DAY },
  { deviceId: 'b', name: 'Keep', configuredAt: now - 1000 },
  { deviceId: 'b', name: 'Newer', configuredAt: now },
  { deviceId: '', name: 'bad' },
  { deviceId: 'c', name: 'NoTime' }
]);
assert.equal(normalized.find((item) => item.deviceId === 'a')?.name, 'Old', 'F023：无 TTL，内存快照不按时限清理');
assert.equal(normalized.find((item) => item.deviceId === 'b')?.name, 'Newer');
assert.equal(normalized.find((item) => item.deviceId === 'c')?.name, 'NoTime');
assert.equal(normalized.some((item) => item.deviceId === ''), false);

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

console.log('  ✓ known-device snapshot dedupe (F023 no-TTL/no-persist) and compact device routes');
