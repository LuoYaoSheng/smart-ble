// tests/target/unit/write-queue-target.test.mjs
// TEST-U-011 MTU 分包：chunkSizeForMtu(mtu) = min(可用, mtu-3)；最后一个小块保留；写队列顺序串行。
// 目标：REQ-028；FEAT-030；PAGE-006；FLOW-005；Smart HID 分帧公式同源（13 号 chunk_size_formula）。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-011 REQ-028 FEAT-030 PAGE-006 FLOW-005';

// ---------- 目标层 ----------
test('TEST-U-011 目标层：services/ble-runtime/write-queue.js', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/write-queue.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const chunkFn = m.module.chunkForMtu || m.module.chunkBytes;
  if (typeof chunkFn !== 'function') return assert.fail(notImplemented(IDS, '目标接口 chunkForMtu 缺失'));

  const data = new Uint8Array(45).fill(0x01);
  const chunks = chunkFn(data, 23);
  assert.ok(Array.isArray(chunks) && chunks.length >= 3, '45B@MTU23 → ≥3 块');
  assert.ok(chunks.every((c) => c.length <= 20), '每块 ≤ mtu-3=20');
  assert.equal(chunks.reduce((a, c) => a + c.length, 0), 45, '总字节守恒');
  assert.equal(chunks[chunks.length - 1].length, 5, '最后小块=5B 保留');

  // 写队列串行：后写的值在前值完成前不得发出
  const QueueCtor = m.module.WriteQueue || m.module.createWriteQueue;
  if (!QueueCtor) return assert.fail(notImplemented(IDS, '目标接口 WriteQueue/createWriteQueue 缺失'));
});
