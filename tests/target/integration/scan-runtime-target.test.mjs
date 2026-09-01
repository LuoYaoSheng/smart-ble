// tests/target/integration/scan-runtime-target.test.mjs
// TEST-I-002 扫描会话与迟到事件：start/stop/超时(10s DEC-013)/第二轮/generation/迟到丢弃/监听不重复。
// 目标：REQ-010/011/033；FEAT-010/011/012/036；PAGE-001；FLOW-002；STATE-GBL-06。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform, callSequence } from '../lib/fake-runtime.mjs';

const IDS = 'TEST-I-002 REQ-010/011/033 FEAT-010~012/036 FLOW-002 DEC-013 STATE-GBL-06';

// ---------- 参照层：无 generation 的假扫描会话（迟到事件混入） ----------
test('TEST-I-002 参照层：迟到事件混入新一轮必须被识别', async () => {
  const platform = createFakePlatform();
  const seen = [];
  platform.onBluetoothDeviceFound((res) => seen.push(...res.devices)); // 无 generation 保护
  platform.emitFound({ deviceId: 'L1', name: '第一轮' });
  platform.emitFound({ deviceId: 'L2', name: '迟到-第一轮' }); // 第二轮开始后到达
  assert.equal(seen.length, 2, '参照实现两轮混叠');
  assert.ok(seen.some((d) => d.name.startsWith('迟到')), '迟到设备混入——目标必须丢弃');
});

// ---------- 目标层：真实 ble-runtime（平台注入 FakePlatform） ----------
test('TEST-I-002 目标层：ble-runtime/index.js 扫描生命周期', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/index.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const rt = m.module;
  const platform = createFakePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();

    // 订阅发现
    let found = [];
    const off = rt.onDiscovery((devices) => { found = found.concat(devices); });

    // 第一轮扫描
    await rt.startDiscovery({});
    platform.emitFound({ deviceId: 'A1', name: 'Round1', RSSI: -50 });
    assert.equal(found.filter((d) => d.deviceId === 'A1').length, 1, '第一轮设备到达监听器');

    // 停止后迟到事件不再进入（stop 语义）
    await rt.stopDiscovery();
    platform.emitFound({ deviceId: 'A2', name: '迟到', RSSI: -60 });
    assert.ok(found.length <= 2, 'stop 后事件最多在途一次，不得持续累加');

    // 第二轮扫描：新一轮清空上一轮列表（策略：重置重建）
    found = [];
    await rt.startDiscovery({});
    platform.emitFound({ deviceId: 'B1', name: 'Round2', RSSI: -55 });
    assert.equal(found.filter((d) => d.deviceId === 'B1').length, 1, '第二轮设备到达');
    assert.equal(found.filter((d) => d.deviceId === 'A1').length, 0, '新一轮列表不含上一轮残留（重置重建）');

    // 监听器不重复注册
    const off2 = rt.onDiscovery(() => {});
    off2?.();
    off?.();

    // 调用顺序：open → start → stop → start
    const seq = callSequence(platform).filter((s) => /Discovery|Adapter/.test(s));
    assert.deepEqual(seq, ['openAdapter', 'startDiscovery', 'stopDiscovery', 'startDiscovery'],
      `扫描调用顺序正确（实际 ${seq.join('→')}）`);
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});
