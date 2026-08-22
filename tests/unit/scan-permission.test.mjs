import assert from 'node:assert/strict';

import { createFakeBlePlatform } from './ble-fixture.mjs';
import { requestBleScanPermission } from '../../apps/uniapp/services/scan-permission.js';
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

function setupPlatform() {
  const platform = createFakeBlePlatform();
  setBlePlatformForTesting(platform);
  resetBleRuntimeForTesting();
  return platform;
}

function installWx(overrides = {}) {
  let authorizeCalls = 0;
  let openSettingCalls = 0;
  let openAppAuthorizeSettingCalls = 0;
  globalThis.wx = {
    getAppAuthorizeSetting() {
      return { bluetoothAuthorized: 'authorized' };
    },
    getSetting(opts) {
      queueMicrotask(() => opts.success?.({ authSetting: { 'scope.userLocation': true } }));
    },
    authorize(opts) {
      authorizeCalls += 1;
      queueMicrotask(() => opts.success?.());
    },
    showModal(opts) {
      queueMicrotask(() => opts.success?.({ confirm: false, cancel: true }));
    },
    openSetting() {
      openSettingCalls += 1;
    },
    openAppAuthorizeSetting(opts = {}) {
      openAppAuthorizeSettingCalls += 1;
      queueMicrotask(() => opts.complete?.({}));
    },
    ...overrides
  };

  return {
    get authorizeCalls() {
      return authorizeCalls;
    },
    get openSettingCalls() {
      return openSettingCalls;
    },
    get openAppAuthorizeSettingCalls() {
      return openAppAuthorizeSettingCalls;
    }
  };
}

console.log('[scan permission]');

await run('returns ok when bluetooth and location permission are ready', async () => {
  const platform = setupPlatform();
  installWx();

  const result = await requestBleScanPermission();
  assert.deepEqual(result, { ok: true });
  assert.ok(platform.calls.some((call) => call.type === 'open-adapter'));
});

await run('requests location after an undetermined bluetooth authorization can open the adapter', async () => {
  const platform = setupPlatform();
  let authorizeCalls = 0;
  installWx({
    getAppAuthorizeSetting() {
      return { bluetoothAuthorized: 'not determined' };
    },
    getSetting(opts) {
      queueMicrotask(() => opts.success?.({ authSetting: {} }));
    },
    authorize(opts) {
      authorizeCalls += 1;
      queueMicrotask(() => opts.success?.());
    }
  });

  const result = await requestBleScanPermission();
  assert.deepEqual(result, { ok: true });
  assert.ok(platform.calls.some((call) => call.type === 'open-adapter'));
  assert.equal(authorizeCalls, 1);
});

await run('shows a modal when bluetooth is unavailable before scan starts', async () => {
  const platform = setupPlatform();
  let shownModal = null;
  platform.openBluetoothAdapter = (opts) => queueMicrotask(() => opts.fail?.({ errCode: 10001, errMsg: 'not available' }));
  installWx({
    showModal(opts) {
      shownModal = opts;
      queueMicrotask(() => opts.success?.({ confirm: false, cancel: true }));
    }
  });

  const result = await requestBleScanPermission();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'bluetooth_unavailable');
  assert.equal(shownModal?.title, '无法开始扫描');
});

await run('preserves a generic adapter error instead of reporting a permission denial', async () => {
  const platform = setupPlatform();
  let shownModal = null;
  platform.openBluetoothAdapter = (opts) => queueMicrotask(() => opts.fail?.({ errCode: 10003, errMsg: 'connection fail' }));
  const wxTracker = installWx({
    showModal(opts) {
      shownModal = opts;
      queueMicrotask(() => opts.success?.({ confirm: false, cancel: true }));
    }
  });

  const result = await requestBleScanPermission();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'bluetooth_unavailable');
  assert.equal(result.error.errCode, 10003);
  assert.equal(shownModal?.title, '无法开始扫描');
  assert.equal(wxTracker.openAppAuthorizeSettingCalls, 0);
});

await run('opens app authorization settings when bluetooth permission was denied', async () => {
  const platform = setupPlatform();
  let shownModal = null;
  const wxTracker = installWx({
    getAppAuthorizeSetting() {
      return { bluetoothAuthorized: 'denied' };
    },
    showModal(opts) {
      shownModal = opts;
      queueMicrotask(() => opts.success?.({ confirm: true, cancel: false }));
    }
  });

  const result = await requestBleScanPermission();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'bluetooth_permission_denied');
  assert.equal(shownModal?.title, '需要蓝牙权限');
  assert.equal(wxTracker.openAppAuthorizeSettingCalls, 1);
  assert.equal(platform.calls.some((call) => call.type === 'open-adapter'), false);
});

await run('waits for bluetooth settings to return before resolving a denied permission check', async () => {
  setupPlatform();
  let finishSettings;
  let settled = false;
  installWx({
    getAppAuthorizeSetting() {
      return { bluetoothAuthorized: 'denied' };
    },
    showModal(opts) {
      queueMicrotask(() => opts.success?.({ confirm: true, cancel: false }));
    },
    openAppAuthorizeSetting(opts) {
      finishSettings = opts.complete;
    }
  });

  const permission = requestBleScanPermission().then((result) => {
    settled = true;
    return result;
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(settled, false);
  assert.equal(typeof finishSettings, 'function');
  finishSettings({});

  const result = await permission;
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'bluetooth_permission_denied');
});

await run('opens settings guidance when location permission is denied', async () => {
  setupPlatform();
  let shownModal = null;
  const wxTracker = installWx({
    getSetting(opts) {
      queueMicrotask(() => opts.success?.({ authSetting: { 'scope.userLocation': false } }));
    },
    authorize(opts) {
      queueMicrotask(() => opts.fail?.({ errMsg: 'authorize:fail auth deny' }));
    },
    showModal(opts) {
      shownModal = opts;
      queueMicrotask(() => opts.success?.({ confirm: true, cancel: false }));
    }
  });

  const result = await requestBleScanPermission();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'location_permission_denied');
  assert.equal(shownModal?.title, '需要定位权限');
  assert.equal(wxTracker.openSettingCalls, 1);
});
