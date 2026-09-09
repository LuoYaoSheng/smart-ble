// tests/target/unit/history-retention-target.test.mjs
// F023（2026-09-02 用户决策，docs/specs/README.md）：已配网设备历史整链移除——
// PAGE004 历史页 / 首页面板 / 90 天 TTL / 20 条上限 / 本地持久化全部不回归（零本地持久化红线）。
// 本用例守卫该红线 + 验证仅存的内存快照清洗（S-21/REQ-065 旧口径已被 F023 取代）。
// 目标：REQ-052/065；FEAT-059/061；PAGE-004；FLOW-011；F023。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'REQ-065/052 FEAT-059/061 PAGE-004 DATA-006 F023';

// ---------- 目标层 ----------
test('目标层：smart-hid/known-devices.js', async (t) => {
  const m = await importTarget('apps/uniapp/services/smart-hid/known-devices.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));

  // F023 零持久化红线：TTL / 容量 / 持久化接口不得回归
  assert.equal('KNOWN_DEVICE_TTL_MS' in m.module, false, 'F023：KNOWN_DEVICE_TTL_MS 不得存在（90 天 TTL 已移除）');
  assert.equal('KNOWN_DEVICES_MAX' in m.module, false, 'F023：KNOWN_DEVICES_MAX 不得存在（容量上限已移除）');

  if (typeof m.module.normalizeKnownDevices !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 normalizeKnownDevices 缺失'));
  }
  // 仅存的内存快照清洗：去重（保留最新 configuredAt）+ 空 ID 过滤 + 字段兜底
  const now = Date.now();
  const out = m.module.normalizeKnownDevices([
    { deviceId: 'K1', configuredAt: now },
    { deviceId: 'K1', name: 'older', configuredAt: now - 1000 },
    { deviceId: '', configuredAt: now },
    { deviceId: 'K3' }
  ]);
  const list = out.devices ?? out;
  const ids = list.map((d) => d.deviceId);
  assert.deepEqual(ids.sort(), ['K1', 'K3'], '去重 + 空 ID 过滤');
  assert.equal(list.find((d) => d.deviceId === 'K1')?.configuredAt, now, '同 deviceId 保留最新 configuredAt');
  assert.ok(list.every((d) => typeof d.name === 'string' && d.name), '字段兜底：name 恒为非空字符串');
});
