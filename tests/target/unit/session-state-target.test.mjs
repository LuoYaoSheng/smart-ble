// tests/target/unit/session-state-target.test.mjs
// TEST-U-005 扫描 generation/去重/RSSI 更新 + Session Registry subscription_count（DEC-017）。
// 目标：REQ-011/012/033；FEAT-011/012/036；PAGE-001/006/007；FLOW-002；10 号 §3.1/§3.3。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-005 REQ-011/012/033 FEAT-011/012/036 DEC-017 10号§3.1/3.3';

// ---------- 目标层 ----------
test('TEST-U-005 目标层：ble-runtime/scan-session.js + device-collection.js', async (t) => {
  const ss = await importTarget('apps/uniapp/services/ble-runtime/scan-session.js');
  if (!ss.ok) return assert.fail(notImplemented(IDS, ss.message));
  if (typeof ss.module.createScanSessionController !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 createScanSessionController 缺失'));
  }

  const dc = await importTarget('apps/uniapp/services/ble-runtime/device-collection.js');
  if (dc.ok && typeof dc.module.mergeDeviceCollection === 'function') {
    // 去重：同 deviceId 合并，RSSI 取新值，不产生重复行
    const merged = dc.module.mergeDeviceCollection(
      [{ deviceId: 'D1', RSSI: -50, name: 'A' }],
      [{ deviceId: 'D1', RSSI: -60 }, { deviceId: 'D2', RSSI: -70 }],
    );
    const d1 = merged.filter((d) => d.deviceId === 'D1');
    assert.equal(d1.length, 1, '同 deviceId 去重为一行');
    assert.equal(d1[0].RSSI, -60, 'RSSI 取最新值');
  } else {
    assert.fail(notImplemented('TEST-U-005 REQ-012 FEAT-012', '目标接口 mergeDeviceCollection 缺失'));
  }
});

test('TEST-U-005 目标层：connected-session-registry.js subscription_count（DEC-017）', async (t) => {
  const m = await importTarget('apps/uniapp/services/connected-session-registry.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  if (typeof m.module.createConnectedSessionRegistry !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 createConnectedSessionRegistry 缺失'));
  }
  const reg = m.module.createConnectedSessionRegistry({});
  const session = { deviceId: 'R1', serviceId: 'S', close: async () => {} };
  reg.register?.(session) ?? reg.add?.(session);
  // subscription_count 初始 0（PAGE-007：0 不显示徽标）
  const snap = reg.snapshot?.() ?? reg.list?.() ?? reg.sessions?.() ?? [];
  const row = Array.isArray(snap) ? snap[0] : Object.values(snap)[0];
  if (!row || !('subscription_count' in row)) {
    return assert.fail(notImplemented('TEST-U-005 REQ-030/DATA-003 DEC-017', 'Registry 快照缺 subscription_count 字段'));
  }
  assert.equal(row.subscription_count, 0, '新会话 subscription_count=0');
});
