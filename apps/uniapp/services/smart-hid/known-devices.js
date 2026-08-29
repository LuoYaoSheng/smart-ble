/** Smart HID known-device history normalization (non-sensitive metadata only). */

export const KNOWN_DEVICE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const KNOWN_DEVICES_MAX = 20;

/**
 * Deduplicate by deviceId (keep newest configuredAt), drop expired rows, cap list size.
 * Records without configuredAt are kept but sorted last.
 */
export function normalizeKnownDevices(devices, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : KNOWN_DEVICE_TTL_MS;
  const max = Number.isFinite(options.max) ? options.max : KNOWN_DEVICES_MAX;
  const byId = new Map();

  for (const raw of Array.isArray(devices) ? devices : []) {
    const deviceId = String(raw?.deviceId || '').trim();
    if (!deviceId) continue;

    const configuredAt = Number(raw.configuredAt) || 0;
    if (ttlMs > 0 && configuredAt > 0 && now - configuredAt > ttlMs) continue;

    const meta = {
      deviceId,
      name: raw.name || 'Smart HID',
      hardware: raw.hardware || '',
      firmware: raw.firmware || '',
      protocol: raw.protocol || '',
      lastWifi: raw.lastWifi || '',
      lastHub: raw.lastHub || '',
      configuredAt
    };

    const existing = byId.get(deviceId);
    if (!existing || meta.configuredAt >= (Number(existing.configuredAt) || 0)) {
      byId.set(deviceId, meta);
    }
  }

  return [...byId.values()]
    .sort((a, b) => (Number(b.configuredAt) || 0) - (Number(a.configuredAt) || 0))
    .slice(0, Math.max(0, max));
}
