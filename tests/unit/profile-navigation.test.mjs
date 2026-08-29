import assert from 'node:assert/strict';
import '../../apps/uniapp/services/provisioning/builtins.js';
import {
  buildProfileActionUrl,
  buildProfileDetailUrl,
  buildConnectedDeviceOpenUrl
} from '../../apps/uniapp/services/provisioning/profile-navigation.js';
import { SMART_HID_PROFILE_ID } from '../../apps/uniapp/services/smart-hid/profile.js';
import { ESP32_DEMO_PROFILE_ID } from '../../apps/uniapp/services/esp32-demo/profile.js';

console.log('[profile navigation]');

assert.equal(
  buildProfileDetailUrl(SMART_HID_PROFILE_ID, 'hid-1'),
  '/pages/hid/detail?deviceId=hid-1'
);
assert.match(
  buildProfileActionUrl(ESP32_DEMO_PROFILE_ID, { deviceId: 'esp-1', name: 'BLEToolkit-Server' }),
  /^\/pages\/device\/detail\?/
);
assert.equal(
  buildConnectedDeviceOpenUrl({ deviceId: 'hid-2', profileId: SMART_HID_PROFILE_ID }),
  '/pages/hid/detail?deviceId=hid-2'
);
assert.match(
  buildConnectedDeviceOpenUrl({ deviceId: 'gen-1', name: 'Sensor' }),
  /^\/pages\/device\/detail\?/
);

console.log('  ✓ profile-driven routes for Smart HID and GATT-only profiles');
