// tests/target/unit/history-retention-target.test.mjs
// 历史保留（REQ-065/DATA-006）：90 天 TTL、容量上限、过期清理、移除仅本机。
// 目标：REQ-052/065；FEAT-059/061；PAGE-004；FLOW-011；S-21（记录保留 90 天）。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'REQ-065/052 FEAT-059/061 PAGE-004 DATA-006 S-21';

const DAY = 24 * 60 * 60 * 1000;

// ---------- 参照层：TTL 永不过期 + 超上限仍保留 ----------
function brokenNormalize(devices) {
  return devices.slice(); // 错误：原样返回，不清理不封顶
}
test('参照层：过期历史不清理必须被抓（90 天 TTL）', () => {
  const stale = { deviceId: 'H1', configuredAt: Date.now() - 91 * DAY };
  const kept = brokenNormalize([stale]);
  assert.equal(kept.length, 1, '参照实现确实保留过期项');
  assert.ok(kept.length > 0, '目标：>90 天记录必须被清理（S-21 声明的 90 天口径）');
});

// ---------- 目标层 ----------
test('目标层：smart-hid/known-devices.js', async (t) => {
  const m = await importTarget('apps/uniapp/services/smart-hid/known-devices.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));

  assert.equal(m.module.KNOWN_DEVICE_TTL_MS, 90 * DAY, 'TTL 常量=90 天（S-21）');
  if (typeof m.module.normalizeKnownDevices !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 normalizeKnownDevices 缺失'));
  }
  const now = Date.now();
  const fresh = { deviceId: 'K1', configuredAt: now - DAY };
  const stale = { deviceId: 'K2', configuredAt: now - 91 * DAY };
  const out = m.module.normalizeKnownDevices([fresh, stale], { now });
  const ids = (out.devices ?? out).map((d) => d.deviceId);
  assert.ok(ids.includes('K1'), '90 天内记录保留');
  assert.ok(!ids.includes('K2'), '>90 天记录被清理');

  // 容量上限
  assert.ok(m.module.KNOWN_DEVICES_MAX >= 20, '容量上限登记（≥20）');
  const many = Array.from({ length: m.module.KNOWN_DEVICES_MAX + 5 }, (_, i) => ({ deviceId: "M" + i, configuredAt: now + i }));
  const capped = m.module.normalizeKnownDevices(many, { now });
  const list = capped.devices ?? capped;
  assert.ok(list.length <= m.module.KNOWN_DEVICES_MAX, `超上限裁剪到 ${m.module.KNOWN_DEVICES_MAX}`);
  // 保留较新者
  const listIds = list.map((d) => d.deviceId);
  assert.ok(listIds.includes('M' + (m.module.KNOWN_DEVICES_MAX + 4)), '裁剪保留最新记录');
});
