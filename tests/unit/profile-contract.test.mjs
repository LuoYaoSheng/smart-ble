import assert from 'node:assert/strict';

import { PROFILE_MATCH, defineProvisioningProfile, resetProfilesForTesting } from '../../core/ble-core/provisioning/profile-contract.js';

const run = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

const profile = (id = 'fake-device') => ({
  id,
  version: '1',
  displayName: 'Fake Device',
  matchAdvertisement: () => PROFILE_MATCH.STRONG,
  gatt: {
    serviceUuid: 'AABBCCDD-0000-0000-0000-000000000001',
    characteristics: { info: 'AABBCCDD-0000-0000-0000-000000000002' },
    required: ['info'],
    notify: ['info']
  },
  transport: { framing: 'raw' },
  codec: {
    parseDeviceInfo: () => ({}),
    parseStatus: () => ({}),
    buildCandidate: () => new Uint8Array()
  },
  workflow: {
    classifyStatus: () => 'pending',
    recoveryAction: () => null
  }
});

console.log('[profile contract]');
resetProfilesForTesting();

run('UUID is normalized and descriptor is immutable', () => {
  const defined = defineProvisioningProfile(profile());
  assert.equal(defined.gatt.serviceUuid, 'aabbccdd-0000-0000-0000-000000000001');
  assert.equal(Object.isFrozen(defined), true);
});

run('duplicate Profile ID is rejected', () => {
  assert.throws(() => defineProvisioningProfile(profile()), /already registered/);
});

run('required characteristic aliases must exist', () => {
  resetProfilesForTesting();
  const invalid = profile('missing-char');
  invalid.gatt.required = ['status'];
  assert.throws(() => defineProvisioningProfile(invalid), /required characteristic/);
});

run('matchAdvertisement is constrained to defined match levels', () => {
  resetProfilesForTesting();
  const invalid = profile('bad-match');
  invalid.matchAdvertisement = () => 99;
  const defined = defineProvisioningProfile(invalid);
  assert.throws(() => defined.matchAdvertisement({}), /invalid match result/);
});
