/**
 * 目标契约入口：display-name.js（FEAT-013 / TEST-U-006）。
 * 实现位于 device-display-name.js。
 */

export {
  normalizeDisplayName,
  extractLocalNameFromAdvertisement,
  resolveDeviceDisplayName,
  attachDeviceDisplayName,
} from './device-display-name.js';

import { resolveDeviceDisplayName } from './device-display-name.js';

/** @returns {string} 显示名字符串（TEST-U-006） */
export function resolveDisplayName(device) {
  return resolveDeviceDisplayName(device).displayName;
}

export default resolveDisplayName;
