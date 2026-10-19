// tests/target/integration/permission-flow-target.test.mjs
// TEST-I-001（权限链路段）权限流：平台能力探测 → 适配器开启 → 失败映射与恢复语义。
// 目标：REQ-005/007/008/009；FEAT-005/007/008/009；FLOW-001；ERR-PERM-02/04。
// 2026-09-14 MAC-002：随微信目标退役（MAC-001），权限状态机从微信授权面改写为
// App/H5 语义——能力探测经可注入平台面，适配器打开始终走 ble-runtime 平台缝。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-001 REQ-005/007/008/009 FEAT-005/007/008/009 FLOW-001 ERR-PERM-02/04';

async function loadService() {
  const m = await importTarget('apps/uniapp/services/scan-permission.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  if (typeof m.module.requestBleScanPermission !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 requestBleScanPermission 缺失'));
  }
  return m.module;
}

test('目标层：scan-permission.js 无平台面时诚实降级（REQ-009 / CAP-02）', async () => {
  const service = await loadService();
  service.setScanPermissionPlatformForTesting(null);
  try {
    const result = await service.requestBleScanPermission();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'ble_not_supported');
    assert.match(result.error.message, /不支持 BLE/);
  } finally {
    service.resetScanPermissionPlatformForTesting();
  }
});

test('目标层：scan-permission.js 授权路径放行且真实调用 openBluetoothAdapter', async () => {
  const service = await loadService();
  const rt = (await importTarget('apps/uniapp/services/ble-runtime/index.js')).module;
  const fake = createFakePlatform();
  rt.setBlePlatformForTesting(fake);
  service.setScanPermissionPlatformForTesting({ openBluetoothAdapter() {} });
  try {
    const granted = await service.requestBleScanPermission();
    assert.deepEqual(granted, { ok: true });
    assert.ok(fake.__calls.some((c) => c.m === 'openAdapter'), '适配器开启必须经 ble-runtime 平台缝真实发出');
  } finally {
    service.resetScanPermissionPlatformForTesting();
    rt.resetBleRuntimeForTesting?.();
  }
});

test('目标层：蓝牙关闭映射 bluetooth_unavailable（REQ-008 / ERR-PERM-04）', async () => {
  const service = await loadService();
  const rt = (await importTarget('apps/uniapp/services/ble-runtime/index.js')).module;
  const fake = createFakePlatform();
  fake.failNext('openBluetoothAdapter', { errCode: 10001, errMsg: 'openBluetoothAdapter:fail not available' });
  rt.setBlePlatformForTesting(fake);
  service.setScanPermissionPlatformForTesting({ openBluetoothAdapter() {} });
  try {
    const result = await service.requestBleScanPermission();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'bluetooth_unavailable');
    assert.equal(result.error.errCode, 10001);
  } finally {
    service.resetScanPermissionPlatformForTesting();
    rt.resetBleRuntimeForTesting?.();
  }
});

test('目标层：授权拒绝映射 bluetooth_permission_denied（REQ-007 / ERR-PERM-02）', async () => {
  const service = await loadService();
  const rt = (await importTarget('apps/uniapp/services/ble-runtime/index.js')).module;
  const fake = createFakePlatform();
  fake.failNext('openBluetoothAdapter', { errCode: 10001, errMsg: 'openBluetoothAdapter:fail auth deny' });
  rt.setBlePlatformForTesting(fake);
  service.setScanPermissionPlatformForTesting({ openBluetoothAdapter() {} });
  try {
    const result = await service.requestBleScanPermission();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'bluetooth_permission_denied');
  } finally {
    service.resetScanPermissionPlatformForTesting();
    rt.resetBleRuntimeForTesting?.();
  }
});
