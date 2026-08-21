/**
 * Provisioning Profile 应用侧注册表。
 *
 * 契约校验位于 core/ble-core；这里仅提供 uni-app 扫描结果的匹配投影，
 * 不包含任何 Smart HID 业务判断。
 */

import {
  PROFILE_MATCH,
  defineProvisioningProfile,
  getProvisioningProfile,
  listProvisioningProfiles
} from '../../../../core/ble-core/provisioning/profile-contract.js';

export { PROFILE_MATCH, defineProvisioningProfile };

export function getProfile(id) {
  return getProvisioningProfile(id);
}

export function listProfiles() {
  return listProvisioningProfiles();
}

/**
 * 按已注册 Profile 匹配扫描结果。
 *
 * strong match（Service UUID）优先于 weak match（名称前缀）。调用方可以
 * 用 matchLevel 决定是否还要经 Device Info 做二次确认。
 */
export function matchScannedDevices(devices) {
  const profiles = listProfiles();
  const out = [];

  for (const device of devices || []) {
    let best = null;
    for (const profile of profiles) {
      const matchLevel = profile.matchAdvertisement(device);
      if (matchLevel === PROFILE_MATCH.NONE) continue;
      if (!best || matchLevel > best.matchLevel) {
        best = { device, profile, matchLevel };
      }
    }
    if (best) out.push(best);
  }
  return out;
}
