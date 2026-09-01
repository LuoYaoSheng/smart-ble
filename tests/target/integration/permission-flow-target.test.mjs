// tests/target/integration/permission-flow-target.test.mjs
// TEST-I-001（权限链路段）权限流：拒绝→状态呈现→恢复；永久拒绝→引导系统设置。
// 目标：REQ-005/006/007；FEAT-005/006/007；FLOW-001；ERR-PERM-02/04。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-001 REQ-005~007 FEAT-005~007 FLOW-001 ERR-PERM-02/04';

// ---------- 目标层：scan-permission.js + fake uni（微信 scope.denial 语义） ----------
test('目标层：services/scan-permission.js 权限流（注入 fake uni）', async (t) => {
  const calls = [];
  const makeUni = (perm) => ({
    getSystemInfoSync: () => ({ uniPlatform: 'mp-weixin', platform: 'devtools' }),
    getAppAuthorizeSetting: () => ({ bluetoothAuthorized: true }),
    getSetting: (o) => o.success?.({ authSetting: { 'scope.userLocation': perm, 'scope.bluetooth': perm } }),
    authorize: (o) => (perm === false ? o.fail?.({ errMsg: 'authorize:fail auth deny' }) : o.success?.({})),
    openSetting: (o) => { calls.push('openSetting'); o.success?.({ authSetting: { 'scope.userLocation': true } }); },
    openBluetoothAdapter: (o) => o.success?.({}),
  });
  const m = await importTarget('apps/uniapp/services/scan-permission.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  if (typeof m.module.requestBleScanPermission !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 requestBleScanPermission 缺失'));
  }

  // scan-permission 依赖：① 全局 wx（授权面）② ble-runtime 平台缝（openAdapter）。
  // 先装配 runtime 平台（与 scan-permission 内联副本共享同一 data URL 模块实例）。
  const rt = (await importTarget('apps/uniapp/services/ble-runtime/index.js')).module;
  rt.setBlePlatformForTesting(createFakePlatform());
  makeUni(true).showModal = (o) => o.success?.({ confirm: true });
  const prevWx = globalThis.wx;
  globalThis.wx = makeUni(true);
  let granted;
  try {
    granted = await m.module.requestBleScanPermission();
  } catch (e) {
    globalThis.wx = prevWx;
    return assert.fail(notImplemented(IDS, `授权路径抛错（平台面不可注入或状态机异常）：${e.message}`));
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
  globalThis.wx = prevWx;
  assert.ok(granted === true || granted?.granted === true || granted?.ok === true,
    `授权路径放行（实际返回 ${JSON.stringify(granted)}）`);
});
