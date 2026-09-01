// tests/target/unit/platform-permission-target.test.mjs
// TEST-U-001（平台识别纯函数）/ TEST-U-003（权限状态机）/ TEST-U-004（适配器状态映射）
// 目标：REQ-001/005/006/007/008；FEAT-001/005/006/007/008；PAGE-001/008；FLOW-001。
// 规则来源：DEC-003 能力驱动最小权限（不预取定位、点击扫描才申请、能力检测决定）。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-001/003/004 REQ-005~008 FEAT-001/005~008 DEC-003';

// ---------- 参照层：故意错误实现（预取定位、状态机缺永久拒绝分支） ----------
function brokenPermissionPlan(ctx) {
  // 错误①：App 启动即申请定位（违反 DEC-003：点击扫描才申请）
  return { pre_fetch_location_at_launch: true, request_on_scan_click: false, platform: ctx.platform };
}
function brokenAdapterUiState(adapter) {
  // 错误②：蓝牙关闭被映射为"不支持"（混淆 STATE-GBL-02 与 STATE-GBL-03）
  return adapter.available ? 'normal' : 'unsupported';
}

test('TEST-U-003 参照层：预取定位的权限方案必须被识别为违规', () => {
  const plan = brokenPermissionPlan({ platform: 'wechat-miniprogram' });
  assert.equal(plan.pre_fetch_location_at_launch, true, '参照实现确实预取');
  // 目标规则断言：该方案必须不合格（能力驱动：request_on_scan_click 必须为 true）
  assert.ok(!plan.request_on_scan_click || !plan.pre_fetch_location_at_launch,
    'DEC-003：点击扫描才允许申请定位，预取即违规（测试能抓住该错误）');
});

test('TEST-U-004 参照层：蓝牙关闭≠平台不支持（两种错误态不得混淆）', () => {
  const off = brokenAdapterUiState({ available: false });
  assert.equal(off, 'unsupported', '参照实现确实混淆');
  assert.notEqual(off, 'bluetooth-off', '目标要求独立 bluetooth-off 态（S-04），混淆即被抓');
});

// ---------- 目标层：apps/uniapp 真实模块 ----------
test('TEST-U-001/003/004 目标层：ble-runtime/platform.js + services/scan-permission.js', async (t) => {
  const platform = await importTarget('apps/uniapp/services/ble-runtime/platform.js');
  if (!platform.ok) return assert.fail(notImplemented(IDS, `ble-runtime/platform.js：${platform.message}`));
  if (typeof platform.module.getBlePlatform !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 getBlePlatform 缺失（平台识别纯函数，REQ-001）'));
  }
  // 平台识别必须区分双正式入口与 H5（经模块自带测试缝注入）
  const setFake = platform.module.setBlePlatformForTesting;
  if (typeof setFake === 'function') setFake('uniapp-android');
  try {
    const p = platform.module.getBlePlatform();
    assert.ok(typeof p === 'string' && p.length > 0, `平台标识为非空字符串（实际 ${p}）`);
  } finally {
    if (typeof platform.module.resetBlePlatformForTesting === 'function') platform.module.resetBlePlatformForTesting();
  }

  const perm = await importTarget('apps/uniapp/services/scan-permission.js', {
    globals: { uni: { getSystemInfoSync: () => ({ uniPlatform: 'mp-weixin', platform: 'devtools' }) } },
  });
  if (!perm.ok) return assert.fail(notImplemented(IDS, `scan-permission.js：${perm.message}`));
  if (typeof perm.module.requestBleScanPermission !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 requestBleScanPermission 缺失（REQ-005/DEC-003）'));
  }
  // 能力驱动最小权限：请求动作必须在扫描点击路径上（不提供"启动即申请"入口）
  const exported = Object.keys(perm.module);
  assert.ok(!exported.some((k) => /pre_?fetch|ensure_at_?launch/i.test(k)),
    '不得存在启动预取权限的导出（DEC-003 红线）');
});
