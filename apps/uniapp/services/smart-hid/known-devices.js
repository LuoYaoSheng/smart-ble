/** Smart HID 会话快照归一化（仅内存，非敏感元数据）。
 *
 * 2026-09-02 决策：F023 已配网设备历史移除（PAGE004/首页面板/90 天 TTL/20 条上限/
 * 本地持久化一并移除，应用零本地持久化）。本文件只保留 P003「最近配置」所需的
 * 内存快照清洗：按 deviceId 去重（保留最新 configuredAt）+ 字段兜底。
 */

/**
 * Deduplicate by deviceId (keep newest configuredAt) and sanitize snapshot fields.
 */
export function normalizeKnownDevices(devices) {
  const byId = new Map();

  for (const raw of Array.isArray(devices) ? devices : []) {
    const deviceId = String(raw?.deviceId || '').trim();
    if (!deviceId) continue;

    const configuredAt = Number(raw.configuredAt) || 0;
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

  return [...byId.values()].sort((a, b) => (Number(b.configuredAt) || 0) - (Number(a.configuredAt) || 0));
}
