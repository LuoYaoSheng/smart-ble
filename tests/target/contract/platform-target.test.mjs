// tests/target/contract/platform-target.test.mjs
// TEST-C-004 —— 平台矩阵测试（真实 PASS + 状态越界/降级缺说明被抓）。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-platforms.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';
import { snapshot, mutateJson, makeVirtualCtx } from '../lib/fixture-helper.mjs';

test('TEST-C-004 真实仓库：平台契约自检通过', () => {
  const r = run(makeCtx());
  assert.ok(r.pass, `失败：\n${r.failures.map((f) => f.message).join('\n')}`);
});

test('TEST-C-004 故意错误：h5 被标 VERIFIED 必须被抓（UNSUPPORTED 平台不得宣传可用）', () => {
  const files = mutateJson(snapshot('platforms'), 'contracts/target/platform-target.json', (d) => {
    d.platforms.find((p) => p.id === 'h5').public_status_target = 'VERIFIED';
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /h5 目标公开状态/.test(f.message)));
});

test('TEST-C-004 故意错误：状态词越界必须被抓', () => {
  const files = mutateJson(snapshot('platforms'), 'contracts/target/platform-target.json', (d) => {
    d.platforms.find((p) => p.id === 'ios-app').public_status_target = 'BETA';
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /五词表/.test(f.message)));
});

test('TEST-C-004 故意错误：正式入口降级无说明必须被抓', () => {
  const files = mutateJson(snapshot('platforms'), 'contracts/target/platform-target.json', (d) => {
    // 挑一个双正式入口真实降级（Adapted）的能力：此类必须有降级说明
    const cap = d.capabilities.find((x) => x.wechat === 'Adapted' && (x.degradation_ui || '').trim());
    cap.degradation_ui = '';
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /degradation_ui 空/.test(f.message)));
});

test('TEST-C-004 故意错误：能力值越界必须被抓', () => {
  const files = mutateJson(snapshot('platforms'), 'contracts/target/platform-target.json', (d) => {
    d.capabilities[0].wechat = 'Partial';
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /值在值域内/.test(f.message)));
});
