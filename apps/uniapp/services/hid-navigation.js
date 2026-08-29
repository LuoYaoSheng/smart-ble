import { buildDeviceDetailUrl } from './device-route-context.js';

const requireDeviceId = (deviceId) => {
  const value = String(deviceId || '');
  if (!value) throw new Error('deviceId is required');
  return value;
};

export function buildHidProvisionUrl(deviceId) {
	return `/pages/hid/add?deviceId=${encodeURIComponent(requireDeviceId(deviceId))}`;
}

export function buildHidDetailUrl(deviceId) {
	return `/pages/hid/detail?deviceId=${encodeURIComponent(requireDeviceId(deviceId))}`;
}

export function buildHidDiagnosticsUrl(deviceId) {
  return `/pages/hid/diagnostics?deviceId=${encodeURIComponent(requireDeviceId(deviceId))}`;
}

/** Compact query identity + in-memory stash for advertisement fields. */
export function buildGenericDeviceDetailUrl(device) {
  return buildDeviceDetailUrl(device);
}
