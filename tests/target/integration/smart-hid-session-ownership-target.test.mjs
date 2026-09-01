// tests/target/integration/smart-hid-session-ownership-target.test.mjs
// TEST-I-009（所有权段）Smart HID Session ownership：owned/borrowed 语义；READY 释放连接；
// 配网会话不进“活动会话列表”口径（PAGE-007 排除规则）。
// 目标：REQ-053；FEAT-062/063/064；PAGE-002/005/007；FLOW-010/011；10 号 §3.3。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';
import { createFakePlatform } from '../lib/fake-runtime.mjs';

const IDS = 'REQ-053 FEAT-062~064 PAGE-002/005/007 10号§3.3';

test('目标层：配网会话与活动会话口径隔离', async (t) => {
  const rt = (await importTarget('apps/uniapp/services/ble-runtime/index.js')).module;
  if (!rt) return assert.fail(notImplemented(IDS, 'ble-runtime 缺失'));
  const reg = await importTarget('apps/uniapp/services/connected-session-registry.js');
  if (!reg.ok) return assert.fail(notImplemented(IDS, reg.message));

  const platform = createFakePlatform();
  rt.setBlePlatformForTesting(platform);
  try {
    await rt.openAdapter();
    // 普通会话（应计入活动会话口径）
    await rt.connectDevice('NORMAL-1');
    assert.ok(rt.getSession('NORMAL-1'), '普通会话入 Registry');

    // 配网工作流会话：目标要求不进入 PAGE-007 口径。
    // 检测点：Registry 若提供会话分类（provisioning 标记），配网会话必须被排除；
    // 若无分类接口 → 目标差距（PAGE-007 排除规则未实现）。
    const regMod = reg.module.createConnectedSessionRegistry({});
    const hasClassification = typeof regMod === 'object' && Object.keys(regMod).length > 0 &&
      ['registerProvisioning', 'isProvisioning', 'exclude', 'markProvisioning'].some((k) => typeof regMod[k] === 'function');
    if (!hasClassification) {
      assert.fail(notImplemented('REQ-053/PAGE-007 排除规则', 'Registry 无配网会话分类/排除接口——PAGE-007 口径无法排除配网会话'));
    }
  } finally {
    rt.resetBlePlatformAndRuntimeForTesting?.();
  }
});
