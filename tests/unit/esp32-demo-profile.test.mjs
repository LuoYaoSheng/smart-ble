import assert from 'node:assert/strict';
import { PROFILE_MATCH, defineProvisioningProfile, resetProfilesForTesting } from '../../core/ble-core/provisioning/profile-contract.js';
import { esp32DemoProfile, ESP32_DEMO_PROFILE_ID } from '../../apps/uniapp/services/esp32-demo/profile.js';

const ESP32_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';

console.log('[esp32 demo profile]');

resetProfilesForTesting();
const defined = defineProvisioningProfile(esp32DemoProfile);

assert.equal(defined.id, ESP32_DEMO_PROFILE_ID);
assert.equal(defined.model.routes.detail, '/pages/device/detail');
assert.equal(defined.model.routes.provision, '');
assert.ok(defined.model.capabilities.includes('gatt-debug'));
assert.equal(
  defined.matchAdvertisement({ advertisServiceUUIDs: [ESP32_SERVICE_UUID] }),
  PROFILE_MATCH.STRONG
);
assert.equal(
  defined.matchAdvertisement({ name: 'BLEToolkit-Server-X' }),
  PROFILE_MATCH.WEAK
);

console.log('  ✓ esp32-demo registers as GATT-only profile with service UUID match');
