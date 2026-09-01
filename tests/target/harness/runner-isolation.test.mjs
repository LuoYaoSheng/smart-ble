// tests/target/harness/runner-isolation.test.mjs
// HARNESS-I-001 —— import-target 模块缓存与 globalThis 隔离自证。

import test from 'node:test';
import assert from 'node:assert';
import {
  importTarget,
  resetImportTargetCache,
  withInjectedGlobals,
} from '../lib/import-target.mjs';

test('HARNESS-I-001 同一模块连续两次不同 uni fake 不得串读', async () => {
  resetImportTargetCache();
  const rel = 'apps/uniapp/utils/ble-utils.js';
  const r1 = await importTarget(rel, { fresh: true, globals: { uni: { __tag: 'fake-a', platform: 'android' } } });
  const r2 = await importTarget(rel, { fresh: true, globals: { uni: { __tag: 'fake-b', platform: 'ios' } } });
  if (r1.ok && r2.ok) {
    assert.notStrictEqual(r1.instanceId, r2.instanceId, 'fresh 导入应产生不同实例');
  }
  assert.strictEqual(globalThis.uni, undefined, '导入后 globalThis.uni 应已恢复');
});

test('HARNESS-I-001 异常路径 globalThis 仍恢复', async () => {
  resetImportTargetCache();
  let threw = false;
  try {
    await withInjectedGlobals({ uni: { boom: 1 }, wx: { mini: 1 } }, async () => {
      assert.ok('uni' in globalThis);
      throw new Error('deliberate');
    });
  } catch {
    threw = true;
  }
  assert.ok(threw);
  assert.strictEqual(globalThis.uni, undefined);
  assert.strictEqual(globalThis.wx, undefined);
});

test('HARNESS-I-001 reset 后模块初始化重新执行', async () => {
  resetImportTargetCache();
  const rel = 'apps/uniapp/utils/ble-utils.js';
  const a = await importTarget(rel, { fresh: true });
  resetImportTargetCache();
  const b = await importTarget(rel, { fresh: true });
  if (a.ok && b.ok) {
    assert.notStrictEqual(a.instanceId, b.instanceId);
  }
});

test('HARNESS-I-001 并行导入不共享 global 注入', async () => {
  resetImportTargetCache();
  const rel = 'apps/uniapp/utils/ble-utils.js';
  await Promise.all([
    importTarget(rel, { fresh: true, globals: { uni: { id: 1 } } }),
    importTarget(rel, { fresh: true, globals: { uni: { id: 2 } } }),
  ]);
  assert.strictEqual(globalThis.uni, undefined);
});
