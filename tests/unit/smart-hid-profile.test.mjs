import assert from 'node:assert/strict';

import { PROFILE_MATCH, defineProvisioningProfile, resetProfilesForTesting } from '../../core/ble-core/provisioning/profile-contract.js';
import { smartHidProfile } from '../../apps/uniapp/services/smart-hid/profile.js';
import { classifySmartHidStatus, smartHidRecoveryAction } from '../../apps/uniapp/services/smart-hid/workflow.js';

const run = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

console.log('[smart hid profile]');
resetProfilesForTesting();

run('strong Service UUID match wins over name-only discovery', () => {
  assert.equal(smartHidProfile.matchAdvertisement({ advertisServiceUUIDs: [smartHidProfile.serviceUuid] }), PROFILE_MATCH.STRONG);
  assert.equal(smartHidProfile.matchAdvertisement({ name: 'SHID-ABCD1234' }), PROFILE_MATCH.WEAK);
  assert.equal(smartHidProfile.matchAdvertisement({ name: 'random device' }), PROFILE_MATCH.NONE);
});

run('Device Info must confirm product, protocol and device identity', () => {
  const valid = smartHidProfile.codec.parseDeviceInfo('{"product":"smart-hid","protocol":"1.0","device_id":"HID-ABCD1234","firmware":"1.1.0","state":"provisioning","provisioned":false}');
  assert.equal(smartHidProfile.verifyDeviceInfo(valid), true);
  assert.equal(smartHidProfile.verifyDeviceInfo({ ...valid, product: 'other' }), false);
  assert.equal(smartHidProfile.verifyDeviceInfo({ ...valid, protocol: '2.0' }), false);
  assert.equal(smartHidProfile.verifyDeviceInfo({ ...valid, device_id: 'wrong-id' }), false);
});

run('Profile contract accepts Smart HID as an explicit first-party Profile', () => {
  const profile = defineProvisioningProfile(smartHidProfile);
  assert.equal(profile.id, 'smart-hid');
  assert.equal(profile.codec.buildCandidate instanceof Function, true);
  assert.equal(profile.presentation.badge, 'Smart HID');
  // 文案口径 = PRD PAGE001 旅程「配置 Smart HID」（b801b56 P001 对齐后）
  assert.equal(profile.presentation.actionLabel, '配置 Smart HID');
  assert.equal(profile.presentation.actionDescription, '配置 Wi-Fi 与 ControlHub 地址');
});

run('workflow distinguishes terminal result and recovery action', () => {
  assert.deepEqual(classifySmartHidStatus({ state: 'ready', step: 'ready', error: null }), { phase: 'ready', terminal: true });
  assert.equal(smartHidRecoveryAction({ error: 'pairing_expired' }), 'pairing');
  assert.equal(smartHidRecoveryAction({ error: 'mqtt_invalid' }), 'diagnostics');
});
