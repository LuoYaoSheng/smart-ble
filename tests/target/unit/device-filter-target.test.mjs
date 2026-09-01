// tests/target/unit/device-filter-target.test.mjs
// TEST-U-007 设备过滤器：筛选命中/不命中，N/M 双数口径（S-02 筛选空态）。
// 目标：REQ-014；FEAT-014；PAGE-001；FLOW-002。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-007 REQ-014 FEAT-014 PAGE-001 FLOW-002 S-02';

// ---------- 参照层：空筛选条件时丢弃全部设备的错误实现 ----------
function brokenFilter(devices, q) {
  return devices.filter((d) => String(d.name).includes(q)); // q 为空串时碰巧全过，但 q=undefined 时全灭
}
test('TEST-U-007 参照层：空筛选不得清空列表（N/M 口径必须保留全集）', () => {
  const devices = [{ name: 'A' }, { name: 'B' }];
  assert.equal(brokenFilter(devices).length, 0, '参照实现确实全灭');
  assert.equal(brokenFilter(devices, '').length, 2, '空串场景侥幸通过——目标要求显式处理 undefined/空为“无筛选”');
});

// ---------- 目标层 ----------
test('TEST-U-007 目标层：services/ble-runtime/device-filter.js filterBleDevices', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/device-filter.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  if (typeof m.module.filterBleDevices !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 filterBleDevices 缺失'));
  }
  const devices = [
    { deviceId: 'F1', name: 'LightBLE-Server', RSSI: -50 },
    { deviceId: 'F2', name: 'SmartHID-Dev', RSSI: -70 },
    { deviceId: 'F3', name: '', RSSI: -80 }, // 未命名
  ];
  // 无筛选 → 全量（M）
  const all = m.module.filterBleDevices(devices, {});
  assert.equal(all.length, devices.length, '无筛选条件=全集（S-02 的 M）');
  // 名称筛选 → 命中子集（N），且 N≤M
  const hit = m.module.filterBleDevices(devices, { keyword: 'LightBLE' });
  assert.ok(hit.length >= 1 && hit.length <= devices.length, '筛选结果 N 介于 1..M');
  assert.ok(hit.every((d) => String(d.name).includes('LightBLE')), '命中项匹配关键词');
  // 全不命中 → 空列表 + 上层显示 S-02（有 M 台但 N=0）
  const none = m.module.filterBleDevices(devices, { keyword: '不存在的名字' });
  assert.equal(none.length, 0, '全不命中返回空数组（触发 S-02 文案而非清空 M）');
});
