import { defineProvisioningProfile, getProfile } from './profiles.js';
import { SMART_HID_PROFILE_ID, smartHidProfile } from '../smart-hid/profile.js';

/** 在应用装配点显式注册内置第一方 Profile，避免 service import 副作用。 */
export function registerBuiltinProfiles() {
  if (!getProfile(SMART_HID_PROFILE_ID)) {
    defineProvisioningProfile(smartHidProfile);
  }
  return getProfile(SMART_HID_PROFILE_ID);
}

registerBuiltinProfiles();
