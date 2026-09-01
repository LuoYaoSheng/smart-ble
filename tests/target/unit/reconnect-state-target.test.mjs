// tests/target/unit/reconnect-state-target.test.mjs
// 重连策略纯函数（TEST-I-003 的 E1 前置）：有限重连、主动断开不重连、耗尽进入恢复态。
// 目标：REQ-022/023；FEAT-023/024；PAGE-006/007；FLOW-004/006；10 号 §5。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'REQ-022/023 FEAT-023/024 TEST-I-003(纯策略) 10号§5';

// ---------- 参照层：无限重连 + 主动断开也重连 ----------
function brokenPolicy(event) {
  return { reconnect: true, delayMs: 0, attempt: Number.POSITIVE_INFINITY }; // 错误：永远重连
}
test('参照层：主动断开触发重连必须被抓', () => {
  assert.equal(brokenPolicy({ reason: 'user-disconnect' }).reconnect, true, '参照实现确实重连');
  // 目标：主动断开（user-disconnect）绝不自动重连
  const complies = (p) => p({ reason: 'user-disconnect' }).reconnect === false;
  assert.ok(!complies(brokenPolicy), '故意错误实现不满足目标规则（主动断开不重连）——谓词有效');
  assert.ok(brokenPolicy({ reason: 'peer-lost' }).attempt === Number.POSITIVE_INFINITY, '无限重连违反有限次约束');
});

// ---------- 目标层 ----------
test('目标层：services/ble-runtime/reconnect-policy.js', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/reconnect-policy.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const fn = m.module.shouldReconnect || m.module.reconnectPolicy;
  if (typeof fn !== 'function') return assert.fail(notImplemented(IDS, '目标接口 shouldReconnect 缺失'));

  // 主动断开：不重连
  assert.equal(fn({ reason: 'user-disconnect', attempt: 0 }).reconnect ??
    fn({ reason: 'user-disconnect', attempt: 0 }), false, '主动断开不自动重连（REQ-022）');
  // 被动断开：有限次内重连
  const r1 = fn({ reason: 'peer-lost', attempt: 0 });
  assert.ok((r1 && (r1.reconnect ?? r1)) !== false, '被动断开在限额内重连（REQ-023）');
  // 耗尽：停止并进入恢复引导
  const max = m.module.MAX_RECONNECT_ATTEMPTS ?? m.module.maxAttempts ?? 3;
  const rEx = fn({ reason: 'peer-lost', attempt: max });
  assert.ok((rEx && (rEx.reconnect ?? rEx)) === false, `attempt≥${max} 后停止（有限重连）`);
});
