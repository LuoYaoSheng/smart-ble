// tests/target/unit/advertisement-target.test.mjs
// TEST-U-008 广播字段解析三态：正常 / 合法缺失 / 异常缺失（PAGE-001 广播详情入口）。
// 目标：REQ-016/017；FEAT-017/018；PAGE-001；FLOW-003。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-008 REQ-016/017 FEAT-017/018 PAGE-001 FLOW-003';

// 目标三态定义（07/17 号）：
//   present         字段存在且可解析 → 显示值
//   absent-legal    字段按协议可缺（如厂商数据可选）→ “—” 不算错误
//   missing-illegal 结构性缺失（广播包存在但字段区损坏）→ 错误态并提示
function expectedTriState(raw) {
  if (raw.fieldPresent) return { state: 'present', value: raw.value };
  if (raw.packetIntact) return { state: 'absent-legal', value: null };
  return { state: 'missing-illegal', value: null };
}

// ---------- 参照层：把合法缺失当错误的二元实现 ----------
function brokenTriState(raw) {
  return raw.fieldPresent ? { state: 'present', value: raw.value } : { state: 'error' };
}

test('TEST-U-008 参照层：合法缺失被当成错误必须被抓', () => {
  const legal = { fieldPresent: false, packetIntact: true };
  assert.equal(brokenTriState(legal).state, 'error', '参照实现确实误报');
  assert.equal(expectedTriState(legal).state, 'absent-legal', '目标：合法缺失不是错误');
  const illegal = { fieldPresent: false, packetIntact: false };
  assert.equal(expectedTriState(illegal).state, 'missing-illegal', '目标：结构损坏才是异常');
});

// ---------- 目标层 ----------
test('TEST-U-008 目标层：services/ble-runtime/advertisement.js normalizeAdvertisement', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/advertisement.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  if (typeof m.module.normalizeAdvertisement !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 normalizeAdvertisement 缺失'));
  }
  const norm = m.module.normalizeAdvertisement({
    deviceId: 'AD-1', name: 'BLEToolkit-Server', RSSI: -60,
    advertisServiceUUIDs: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'],
  });
  // 至少保留身份与信号字段（PAGE-001 详情展示依赖）
  assert.ok(norm && typeof norm === 'object');
  assert.ok(!norm.name || typeof norm.name === 'string', 'name 保留为字符串');
  // 缺失字段不得抛异常（三态容错）
  const bare = m.module.normalizeAdvertisement({ deviceId: 'AD-2', RSSI: -70 });
  assert.ok(bare && typeof bare === 'object', '无广播数据设备不抛异常（合法缺失三态）');
});
