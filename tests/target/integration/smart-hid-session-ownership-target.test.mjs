// tests/target/integration/smart-hid-session-ownership-target.test.mjs
// Session ownership：workflow owner → page borrow；配网会话排除 PAGE-007 口径。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'REQ-053 FEAT-062~064 PAGE-002/005/007 10号§3.3 SMART-HID-WORKFLOW-001';

test('目标层：配网会话与活动会话口径隔离', async () => {
  const rt = (await importTarget('apps/uniapp/services/ble-runtime/index.js')).module;
  if (!rt) return assert.fail(notImplemented(IDS, 'ble-runtime 缺失'));
  const reg = await importTarget('apps/uniapp/services/connected-session-registry.js');
  if (!reg.ok) return assert.fail(notImplemented(IDS, reg.message));

  const platform = createFakePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    await rt.connectDevice('NORMAL-1');
    assert.ok(rt.getSession('NORMAL-1'), '普通会话入 Registry');

    const regMod = reg.module.createConnectedSessionRegistry({});
    const hasClassification = typeof regMod === 'object' && Object.keys(regMod).length > 0 &&
      ['registerProvisioning', 'isProvisioning', 'exclude', 'markProvisioning'].some((k) => typeof regMod[k] === 'function');
    if (!hasClassification) {
      assert.fail(notImplemented('REQ-053/PAGE-007 排除规则', 'Registry 无配网会话分类/排除接口——PAGE-007 口径无法排除配网会话'));
    }

    regMod.registerProvisioning('HID-PROV-1', { connectionState: 'READY' });
    assert.equal(regMod.isProvisioning('HID-PROV-1'), true);
    const active = regMod.snapshot();
    assert.ok(!active.some((s) => s.deviceId === 'HID-PROV-1'), '配网会话不进入 PAGE-007 活动会话口径');
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});

test('SMART-HID-WORKFLOW：workflow owner → page borrow', async () => {
  const m = await importTarget('apps/uniapp/services/smart-hid/workflow-engine.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));

  let ownerAtPair = null;
  const api = m.module.createSmartHidWorkflow({
    discover: async () => ({ deviceId: 'HID-BORROW01' }),
    pair: async () => {
      ownerAtPair = api.getSessionRegistry().getOwner('HID-BORROW01');
      return { paired: true };
    },
    verify: async () => ({ verified: true }),
  });

  await api.startProvision({ token: 'a'.repeat(32) });
  assert.equal(ownerAtPair?.type, 'WORKFLOW', 'Provisioning 期间 WORKFLOW own session');
  assert.equal(api.getSessionRegistry().getOwner('HID-BORROW01'), null, '完成后 release owner');

  // Page borrows remaining session
  const borrowed = api.borrowSession('HID-BORROW01', { type: 'PAGE', id: 'PAGE-003' });
  assert.equal(borrowed, true);
  const can = api.getSessionRegistry().canDisconnect('HID-BORROW01', { type: 'PAGE', id: 'PAGE-003' });
  assert.equal(can.mode, 'borrow');
  assert.equal(can.allowed, false);
  api.releaseBorrow('HID-BORROW01', { type: 'PAGE', id: 'PAGE-003' });
});
