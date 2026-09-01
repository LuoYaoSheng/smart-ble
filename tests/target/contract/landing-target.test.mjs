// tests/target/contract/landing-target.test.mjs
// TEST-C-010（landing 侧）—— 公开声明门禁测试（真实 PASS + 故意错误类别 7：PREVIEW 假下载；类别 8：VERIFIED 缺 SHA）。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-landing-claims.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';
import { snapshot, mutateJson, makeVirtualCtx } from '../lib/fixture-helper.mjs';

test('TEST-C-010 真实仓库：Landing 契约自检通过', () => {
  const r = run(makeCtx());
  assert.ok(r.pass, `失败：\n${r.failures.map((f) => f.message).join('\n')}`);
});

test('TEST-C-010 故意错误⑦：PREVIEW 假下载（no_fake_download 关闭）必须被抓', () => {
  const files = mutateJson(snapshot('landing'), 'contracts/target/landing-target.json', (d) => {
    d.download_rules.no_fake_download = false;
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /no_fake_download/.test(f.message)));
});

test('TEST-C-010 故意错误⑦b：缺产物行为不再是 NOT_RELEASED 必须被抓', () => {
  const files = mutateJson(snapshot('landing'), 'contracts/target/landing-target.json', (d) => {
    d.download_rules.missing_artifact_behavior = '显示即将上线';
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /NOT_RELEASED/.test(f.message)));
});

test('TEST-C-010 故意错误⑧：VERIFIED 声明缺 SHA/URL 证据对必须被抓', () => {
  const files = mutateJson(snapshot('landing'), 'contracts/target/landing-target.json', (d) => {
    const c = d.claims.find((x) => x.id === 'CLAIM-004');
    c.public_status = 'VERIFIED'; // 无 artifact_url/sha256
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /VERIFIED 声明必须带/.test(f.message)));
});

test('TEST-C-010 故意错误：SHA 不再强制必须被抓', () => {
  const files = mutateJson(snapshot('landing'), 'contracts/target/landing-target.json', (d) => {
    d.download_rules.sha_required = false;
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /sha_required/.test(f.message)));
});

test('TEST-C-010 故意错误：Claim 清空 tests 必须被抓', () => {
  const files = mutateJson(snapshot('landing'), 'contracts/target/landing-target.json', (d) => {
    d.claims.find((x) => x.id === 'CLAIM-001').tests = [];
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /证据前置\/测试/.test(f.message)));
});
