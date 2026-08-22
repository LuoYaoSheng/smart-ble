import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildGenericDeviceDetailUrl,
  buildHidDiagnosticsUrl,
  buildHidProvisionUrl
} from '../../apps/uniapp/services/hid-navigation.js';

console.log('[HID navigation]');

const device = {
  deviceId: 'device A/1',
  name: 'Smart HID',
  RSSI: -42,
  firmware: '1.2.3'
};
const advancedUrl = buildGenericDeviceDetailUrl(device);
assert.match(advancedUrl, /^\/pages\/device\/detail\?device=/);
const advancedDevice = JSON.parse(decodeURIComponent(advancedUrl.split('device=')[1]));
assert.equal(advancedDevice.deviceId, device.deviceId);
assert.equal(advancedDevice.name, device.name);
assert.equal(advancedDevice.RSSI, device.RSSI);
assert.equal(advancedDevice.token, undefined);
assert.equal(buildHidDiagnosticsUrl(device.deviceId), '/pages/hid/diagnostics?deviceId=device%20A%2F1');
assert.equal(buildHidProvisionUrl(device.deviceId), '/pages/hid/add?deviceId=device%20A%2F1');
assert.throws(() => buildGenericDeviceDetailUrl({ name: 'missing id' }), /deviceId/);
console.log('  ✓ preserves selected-device context in all secondary routes');

const detailSource = readFileSync(new URL('../../apps/uniapp/pages/hid/detail.vue', import.meta.url), 'utf8');
assert.doesNotMatch(detailSource, /goAdvancedBle[\s\S]{0,180}switchTab/);
assert.match(detailSource, /buildGenericDeviceDetailUrl/);
console.log('  ✓ advanced BLE action does not fall back to the Scan Tab');

const diagnosticsSource = readFileSync(new URL('../../apps/uniapp/pages/hid/diagnostics.vue', import.meta.url), 'utf8');
assert.match(diagnosticsSource, /setDiagnostic\(null\)/);
assert.match(diagnosticsSource, /ownsConnection/);
assert.match(diagnosticsSource, /getSessionState/);
console.log('  ✓ diagnostics clears stale data and distinguishes borrowed from owned sessions');
