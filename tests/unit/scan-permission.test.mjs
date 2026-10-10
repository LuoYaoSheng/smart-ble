import assert from 'node:assert/strict';

import { createFakeBlePlatform } from './ble-fixture.mjs';
import {
  requestBleScanPermission,
  resetScanPermissionPlatformForTesting,
  setScanPermissionPlatformForTesting
} from '../../apps/uniapp/services/scan-permission.js';
import {
  resetBleRuntimeForTesting,
  setBlePlatformForTesting
} from '../../apps/uniapp/services/ble-runtime/index.js';

const run = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}\n    ${error.message}`);
    process.exitCode = 1;
  }
};

function setupPlatform(overrides = {}) {
  const platform = createFakeBlePlatform();
  Object.assign(platform, overrides);
  setBlePlatformForTesting(platform);
  resetBleRuntimeForTesting();
  return platform;
}

console.log('[scan permission]');

// 能力探测走可注入平台面；适配器打开始终走 ble-runtime 真实路径（平台缝注入）。
await run('returns ble_not_supported when no platform face exists (web / node)', async () => {
  setScanPermissionPlatformForTesting(null);
  try {
    const result = await requestBleScanPermission();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'ble_not_supported');
    assert.match(result.error.message, /不支持 BLE/);
  } finally {
    resetScanPermissionPlatformForTesting();
  }
});

await run('returns ok and opens the adapter when the platform is ready', async () => {
  const platform = setupPlatform();
  setScanPermissionPlatformForTesting({ openBluetoothAdapter() {} });
  try {
    const result = await requestBleScanPermission();
    assert.deepEqual(result, { ok: true });
    assert.ok(platform.calls.some((call) => call.type === 'open-adapter'));
  } finally {
    resetScanPermissionPlatformForTesting();
  }
});

await run('maps errCode 10001 to bluetooth_unavailable (bluetooth off, REQ-008)', async () => {
  setupPlatform({
    openBluetoothAdapter: (opts) => queueMicrotask(() => opts.fail?.({ errCode: 10001, errMsg: 'openBluetoothAdapter:fail not available' }))
  });
  setScanPermissionPlatformForTesting({ openBluetoothAdapter() {} });
  try {
    const result = await requestBleScanPermission();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'bluetooth_unavailable');
    assert.equal(result.error.errCode, 10001);
  } finally {
    resetScanPermissionPlatformForTesting();
  }
});

await run('maps authorization denial to bluetooth_permission_denied (REQ-007)', async () => {
  setupPlatform({
    openBluetoothAdapter: (opts) => queueMicrotask(() => opts.fail?.({ errCode: 10001, errMsg: 'openBluetoothAdapter:fail auth deny' }))
  });
  setScanPermissionPlatformForTesting({ openBluetoothAdapter() {} });
  try {
    const result = await requestBleScanPermission();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'bluetooth_permission_denied');
  } finally {
    resetScanPermissionPlatformForTesting();
  }
});

await run('preserves a generic adapter error instead of reporting a permission denial', async () => {
  setupPlatform({
    openBluetoothAdapter: (opts) => queueMicrotask(() => opts.fail?.({ errCode: 10003, errMsg: 'connection fail' }))
  });
  setScanPermissionPlatformForTesting({ openBluetoothAdapter() {} });
  try {
    const result = await requestBleScanPermission();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'bluetooth_unavailable');
    assert.equal(result.error.errCode, 10003);
  } finally {
    resetScanPermissionPlatformForTesting();
  }
});
