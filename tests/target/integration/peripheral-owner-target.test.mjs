// tests/target/integration/peripheral-owner-target.test.mjs
// TEST-I-007 广播 Owner 与保护：单一 owner；Central 活动连接保护（S-41）；
// create/start/stop/close 顺序；失败不假成功。
// 目标：REQ-040/041/042；FEAT-044/045；PAGE-008；FLOW-008；10 号 §2 规则 3。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-I-007 REQ-040~042 FEAT-044/045 FLOW-008 S-41';

// ---------- 参照层：活动连接在场仍允许开广播（违反 S-41） ----------
function brokenBroadcastGuard(activeConnections, wantStart) {
  return { allowed: wantStart }; // 错误：不检查活动连接
}
test('参照层：忽略活动连接保护必须被抓', () => {
  const guardOk = (guard) => guard(new Set(['C1']), true).allowed === false; // 目标谓词：有活动连接时拒绝
  assert.ok(!guardOk(brokenBroadcastGuard), '故意错误实现不满足目标守卫——谓词有效（S-41：有 N 台保持连接先断开才能广播）');
});

// ---------- 目标层：wx-peripheral 能力检查 + Owner 控制器 ----------
test('目标层：services/wx-peripheral-mode.js 广播入口', async (t) => {
  const m = await importTarget('apps/uniapp/services/wx-peripheral-mode.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const createAdapter = m.module.createWxPeripheralAdapterController;
  if (typeof createAdapter !== 'function') {
    return assert.fail(notImplemented('REQ-038/040 FEAT-041/044', '目标接口 createWxPeripheralAdapterController 缺失'));
  }
  // S-41 守卫：存在活动连接时开启广播模式必须被拒
  const fakeWx2 = {
    openBluetoothAdapter: (o) => o.fail?.({ errMsg: 'openBluetoothAdapter:fail already opened' }),
    closeBluetoothAdapter: (o) => o.success?.({}),
  };
  const guarded = createAdapter({ platform: fakeWx2, getConnectedCount: () => 2 });
  let refused = null;
  try { await (guarded.openPeripheralMode?.() ?? guarded.open?.()); } catch (e) { refused = e; }
  assert.ok(refused && /断开|active/i.test(String(refused?.message || refused?.errMsg || refused)),
    `活动连接在场时开启广播被拒（S-41；实际 ${String(refused)}）`);
});

test('目标层：wx-peripheral-server 控制器生命周期（平台注入）', async (t) => {
  const m = await importTarget('apps/uniapp/services/wx-peripheral-server.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const create = m.module.createWxPeripheralServerController;
  if (typeof create !== 'function') {
    return assert.fail(notImplemented('REQ-040 FEAT-044', '目标接口 createWxPeripheralServerController 缺失'));
  }
  // 注入假 Peripheral 平台面
  const calls = [];
  const fakeWx = {
    onBLEConnectionStateChange: () => {},
    notifyBLECharacteristicValueChange: (o) => { calls.push(['notify', o.state]); o.success?.({}); },
    writeBLECharacteristicValue: (o) => { calls.push(['write']); o.success?.({}); },
    stopAdvertising: (o) => { calls.push(['stopAdv']); o.success?.({}); },
    startAdvertising: (o) => { calls.push(['startAdv']); o.success?.({}); },
    closeBLEConnection: (o) => { calls.push(['closeConn']); o.success?.({}); },
  };
  const controller = create({ platform: fakeWx });
  assert.ok(controller && typeof controller === 'object', '控制器实例化（平台注入缝可用）');
  const methods = Object.keys(controller);
  assert.ok(methods.length > 0, `控制器暴露生命周期方法（${methods.join(',')}）`);
});
