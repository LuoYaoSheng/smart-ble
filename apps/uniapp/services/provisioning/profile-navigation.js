/**
 * Profile 驱动的页面路由。
 *
 * 新增第一方设备时只改 Profile descriptor（model.routes），避免在页面里硬编码 profileId。
 */

import { getProfile } from './profiles.js';
import { buildDeviceDetailUrl } from '../device-route-context.js';

const requireDeviceId = (deviceId) => {
  const value = String(deviceId || '');
  if (!value) throw new Error('deviceId is required');
  return value;
};

function profileRouteWithDevice(route, deviceId) {
  if (!route) return '';
  return `${route}?deviceId=${encodeURIComponent(requireDeviceId(deviceId))}`;
}

/** Compact query identity + in-memory stash for advertisement fields. */
export function buildGenericDeviceDetailUrl(device) {
  return buildDeviceDetailUrl(device);
}

export function buildProfileDetailUrl(profileId, deviceId, deviceFallback = null) {
  const profile = profileId ? getProfile(profileId) : null;
  const route = profile?.model?.routes?.detail;
  if (route && deviceId) return profileRouteWithDevice(route, deviceId);
  return buildGenericDeviceDetailUrl(deviceFallback || { deviceId, profileId });
}

export function buildProfileProvisionUrl(profileId, deviceId) {
  const profile = profileId ? getProfile(profileId) : null;
  const route = profile?.model?.routes?.provision;
  if (!route) return '';
  return profileRouteWithDevice(route, deviceId);
}

export function buildProfileDiagnosticsUrl(profileId, deviceId) {
  const profile = profileId ? getProfile(profileId) : null;
  const route = profile?.model?.routes?.diagnostics;
  if (!route) return '';
  return profileRouteWithDevice(route, deviceId);
}

/**
 * 扫描卡片 Profile 主操作：有 provision 路由则进配网，否则进通用 GATT 详情。
 */
export function buildProfileActionUrl(profileId, device) {
  const provisionUrl = buildProfileProvisionUrl(profileId, device?.deviceId);
  if (provisionUrl) return provisionUrl;
  return buildGenericDeviceDetailUrl(device);
}

/** 已连接 Tab：按 Profile 详情路由，无则通用 GATT。 */
export function buildConnectedDeviceOpenUrl(device) {
  return buildProfileDetailUrl(device?.profileId, device?.deviceId, device);
}

/** Smart HID 兼容别名（逐步迁移到 buildProfile*）。 */
export function buildHidProvisionUrl(deviceId) {
  return buildProfileProvisionUrl('smart-hid', deviceId);
}

export function buildHidDetailUrl(deviceId) {
  return buildProfileDetailUrl('smart-hid', deviceId);
}

export function buildHidDiagnosticsUrl(deviceId) {
  return buildProfileDiagnosticsUrl('smart-hid', deviceId);
}
