// tests/target/integration/smart-hid-provision-target.test.mjs
// TEST-I-009 + SMART-HID-WORKFLOW-001：waiter 顺序 + discover→pair→verify→success。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-009 REQ-047~051 FEAT-057/063 FLOW-010';

const HID_SVC = '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04';
const CHR_INPUT = '9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04';
const CHR_STATUS = '9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04';

test('TEST-I-009 目标层：runProvisionTransaction 顺序（waiter 先注册）', async () => {
  const m = await importTarget('apps/uniapp/services/provisioning/orchestrator.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  if (typeof m.module.runProvisionTransaction !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 runProvisionTransaction 缺失'));
  }
  const order = [];
  const result = await m.module.runProvisionTransaction({
    createWaiter: async () => { order.push('wait'); return { promise: Promise.resolve({ status: 'ready' }), cancel: () => {} }; },
    writeCandidate: async () => { order.push('write'); },
  });
  assert.deepEqual(order, ['wait', 'write'], `waiter 先注册再写入（实际 ${order.join('→')}）`);
  assert.ok(result, '事务返回结果对象');
});

test('TEST-I-009 目标层：writeProfileCandidate 分帧写入到达平台', async () => {
  const prov = await importTarget('apps/uniapp/services/provisioning/orchestrator.js');
  const profiles = await importTarget('apps/uniapp/services/provisioning/profiles.js');
  if (!prov.ok || !profiles.ok) {
    return assert.fail(notImplemented(IDS, `模块缺失：${prov.message || profiles.message}`));
  }
  if (typeof profiles.module.defineProvisioningProfile !== 'function') {
    return assert.fail(notImplemented('TEST-I-009 REQ-054', '目标接口 defineProvisioningProfile 缺失'));
  }
  profiles.module.defineProvisioningProfile({
    id: 'test-prov-target',
    serviceUuid: HID_SVC,
    transport: { inputAlias: 'INPUT', framing: 'framed-v1' },
    characteristics: { INPUT: CHR_INPUT },
    codec: {
      buildCandidate: (input) => new TextEncoder().encode(JSON.stringify(input)),
      parseDeviceInfo: () => ({}),
      parseStatus: () => ({}),
    },
  });
  const rt = (await importTarget('apps/uniapp/services/ble-runtime/index.js')).module;
  const platform = createFakePlatform({
    services: [{ uuid: HID_SVC, characteristics: [
      { uuid: CHR_INPUT, properties: { write: true } },
      { uuid: CHR_STATUS, properties: { read: true, notify: true } },
    ] }],
  });
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    const session = await prov.module.connectProfileSession('HID1', profiles.module.getProfile('test-prov-target'));
    const big = { wifi_ssid: 'TEST_SSID_2.4G', wifi_password: 'test-password', hub_host: '192.168.1.10', hub_port: 8883, device_name: 'HID-TEST', token: 'tok_test_1234' };
    if (typeof profiles.module.getProfile !== 'function') {
      return assert.fail(notImplemented('TEST-I-009 REQ-054', '目标接口 getProfile 缺失（Profile 注册表）'));
    }
    const profile = profiles.module.getProfile('test-prov-target');
    await prov.module.writeProfileCandidate(session, profile, big, { mtu: 23 }).catch((e) => ({ error: e.message }));
    const writes = platform.__calls.filter((c) => c.m === 'write');
    assert.ok(writes.length >= 1, `候选写入到达平台层（${writes.length} 帧）`);
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});

test('SMART-HID-WORKFLOW：discover → pair → verify → success', async () => {
  const m = await importTarget('apps/uniapp/services/smart-hid/workflow-engine.js');
  if (!m.ok) return assert.fail(notImplemented('SMART-HID-WORKFLOW-001', m.message));
  if (typeof m.module.createSmartHidWorkflow !== 'function') {
    return assert.fail(notImplemented('SMART-HID-WORKFLOW-001', 'createSmartHidWorkflow 缺失'));
  }
  const steps = [];
  const api = m.module.createSmartHidWorkflow({
    discover: async (input) => {
      steps.push('discover');
      return { deviceId: input.deviceId || 'HID-WF000001', name: 'SHID-WF01' };
    },
    pair: async () => {
      steps.push('pair');
      return { paired: true };
    },
    verify: async () => {
      steps.push('verify');
      return { verified: true };
    },
  });
  const events = [];
  api.onProvisionEvent((e) => events.push(e.type));
  const snap = await api.startProvision({
    deviceId: 'HID-WF000001',
    token: '9'.repeat(32),
  });
  assert.deepEqual(steps, ['discover', 'pair', 'verify']);
  assert.deepEqual(events, ['discovering', 'pairing', 'verifying', 'success']);
  assert.equal(snap.state, 'PROVISIONED');
  assert.equal(api.getProvisionState(), 'PROVISIONED');
});
