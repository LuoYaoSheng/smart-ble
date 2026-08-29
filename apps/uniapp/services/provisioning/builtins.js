import { defineProvisioningProfile, getProfile, listProfiles } from './profiles.js';
import { SMART_HID_PROFILE_ID, smartHidProfile } from '../smart-hid/profile.js';
import { ESP32_DEMO_PROFILE_ID, esp32DemoProfile } from '../esp32-demo/profile.js';

const BUILTIN_PROFILES = [
  smartHidProfile,
  esp32DemoProfile
];

/** 在应用装配点显式注册内置第一方 Profile，避免 service import 副作用。 */
export function registerBuiltinProfiles() {
  for (const profile of BUILTIN_PROFILES) {
    if (!getProfile(profile.id)) {
      defineProvisioningProfile(profile);
    }
  }
  return listProfiles();
}

registerBuiltinProfiles();

export { SMART_HID_PROFILE_ID, ESP32_DEMO_PROFILE_ID };
