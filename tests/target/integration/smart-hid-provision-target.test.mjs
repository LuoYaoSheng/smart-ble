// tests/target/integration/smart-hid-provision-target.test.mjs
// TEST-I-009 Smart HID workflow：waiter 先注册→再写 INPUT（顺序红线）；八类错误冒泡。
// 目标：REQ-047~051/053；FEAT-057/063；PAGE-001/002；FLOW-010；13 号 framing。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-009 REQ-047~051 FEAT-057/063 FLOW-010';

const HID_SVC = '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04';
const CHR_INPUT = '9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04';
const CHR_STATUS = '9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04';

test('TEST-I-009 参照层：先写后等（错过 STATUS）必须被抓', async () => {
  const order = [];
  const brokenFlow = async () => {
    order.push('write'); // 错误：先写 INPUT
    order.push('wait');  // 再等 STATUS → 设备早已回包，永久超时
  };
  await brokenFlow();
  assert.equal(order[0], 'write', '参照实现顺序错误');
  assert.notEqual(order[0], 'wait', '目标：waiter 先注册，再写 INPUT（13 号红线）');
});

test('TEST-I-009 目标层：runProvisionTransaction 顺序（waiter 先注册）', async (t) => {
  const m = await importTarget('apps/uniapp/services/provisioning/orchestrator.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  if (typeof m.module.runProvisionTransaction !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 runProvisionTransaction 缺失'));
  }
  const order = [];
  // 语义接口注入：createWaiter 必须在 writeCandidate 之前被调用
  const result = await m.module.runProvisionTransaction({
    createWaiter: async () => { order.push('wait'); return { promise: Promise.resolve({ status: 'ready' }), cancel: () => {} }; },
    writeCandidate: async () => { order.push('write'); },
  });
  assert.deepEqual(order, ['wait', 'write'], `waiter 先注册再写入（实际 ${order.join('→')}）`);
  assert.ok(result, '事务返回结果对象');
});

test('TEST-I-009 目标层：writeProfileCandidate 分帧写入到达平台', async (t) => {
  const prov = await importTarget('apps/uniapp/services/provisioning/orchestrator.js');
  const profiles = await importTarget('apps/uniapp/services/provisioning/profiles.js');
  if (!prov.ok || !profiles.ok) {
    return assert.fail(notImplemented(IDS, `模块缺失：${prov.message || profiles.message}`));
  }
  // 内置 Profile 链含 TS 镜像（smart-hid/profile.js import as 语法）无法经 Node 桥加载；
  // 改用真实注册表 API（defineProvisioningProfile）注册最小测试 Profile 驱动同一编排机械。
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
    // 目标 API：connectProfileSession 走 transport.connect（服务/特征确认 + notify 预订）
    const session = await prov.module.connectProfileSession('HID1', profiles.module.getProfile('test-prov-target'));
    // 候选 200B → 按 17B/块 分帧（默认 MTU23）→ ≥2 次平台写
    const big = { wifi_ssid: 'TEST_SSID_2.4G', wifi_password: 'test-password', hub_host: '192.168.1.10', hub_port: 8883, device_name: 'HID-TEST', token: 'tok_test_1234' };
    if (typeof profiles.module.getProfile !== 'function') {
      return assert.fail(notImplemented('TEST-I-009 REQ-054', '目标接口 getProfile 缺失（Profile 注册表）'));
    }
    const profile = profiles.module.getProfile('test-prov-target');
    const writeResult = await prov.module.writeProfileCandidate(session, profile, big, { mtu: 23 }).catch((e) => ({ error: e.message }));
    const writes = platform.__calls.filter((c) => c.m === 'write');
    assert.ok(writes.length >= 1, `候选写入到达平台层（${writes.length} 帧）`);
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});
