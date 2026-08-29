import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildGenericDeviceDetailUrl,
  buildConnectedDeviceOpenUrl,
  buildProfileActionUrl,
  buildHidDetailUrl,
  buildHidDiagnosticsUrl,
  buildHidHistoryUrl,
  buildHidProvisionUrl
} from '../../apps/uniapp/services/provisioning/profile-navigation.js';
import '../../apps/uniapp/services/provisioning/builtins.js';
import { resetDeviceRouteContextForTesting } from '../../apps/uniapp/services/device-route-context.js';

console.log('[HID navigation]');

resetDeviceRouteContextForTesting();
const device = {
  deviceId: 'device A/1',
  name: 'Smart HID',
  RSSI: -42,
  firmware: '1.2.3',
  advertisDataHex: 'DEADBEEF'
};
const advancedUrl = buildGenericDeviceDetailUrl(device);
assert.match(advancedUrl, /^\/pages\/device\/detail\?deviceId=/);
assert.match(advancedUrl, /name=Smart%20HID/);
assert.doesNotMatch(advancedUrl, /DEADBEEF|advertisDataHex/);
assert.equal(buildHidDiagnosticsUrl(device.deviceId), '/pages/hid/diagnostics?deviceId=device%20A%2F1');
assert.equal(buildHidProvisionUrl(device.deviceId), '/pages/hid/add?deviceId=device%20A%2F1');
assert.equal(buildHidDetailUrl(device.deviceId), '/pages/hid/detail?deviceId=device%20A%2F1');
assert.equal(buildHidHistoryUrl(), '/pages/hid/history');
assert.equal(
  buildProfileActionUrl('smart-hid', device),
  '/pages/hid/add?deviceId=device%20A%2F1'
);
assert.equal(
  buildConnectedDeviceOpenUrl({ deviceId: 'hid-1', profileId: 'smart-hid' }),
  '/pages/hid/detail?deviceId=hid-1'
);
assert.match(buildConnectedDeviceOpenUrl({ deviceId: 'ble-1', name: 'Sensor' }), /^\/pages\/device\/detail\?/);
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

const deviceDetailSource = readFileSync(new URL('../../apps/uniapp/pages/device/detail.vue', import.meta.url), 'utf8');
assert.match(deviceDetailSource, /useDeviceSession/);
assert.doesNotMatch(deviceDetailSource, /JSON\.stringify\(device\)/);
console.log('  ✓ generic device detail uses session composable and compact routes');

const connectedSource = readFileSync(new URL('../../apps/uniapp/pages/connected/index.vue', import.meta.url), 'utf8');
assert.match(connectedSource, /buildConnectedDeviceOpenUrl/);
console.log('  ✓ connected tab routes Smart HID devices to HID detail');

const smartHidSource = readFileSync(new URL('../../apps/uniapp/services/smart-hid/index.js', import.meta.url), 'utf8');
assert.match(smartHidSource, /export function isConnected\(\)/);
assert.match(smartHidSource, /bindSmartHidConnectedStore/);
console.log('  ✓ smart HID service exposes isConnected and binds connected tab entries');

const provisioningSource = readFileSync(new URL('../../apps/uniapp/composables/use-smart-hid-provisioning.js', import.meta.url), 'utf8');
assert.match(provisioningSource, /keepSessionOnDispose/);
console.log('  ✓ provisioning preserves BLE session when opening HID detail after success');
