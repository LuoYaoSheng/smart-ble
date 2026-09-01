// tests/target/harness/contract-mutations.test.mjs
// HARNESS-C-002..014 —— 契约 Checker 故意错误 mutation 自证（scope=harness，不计入目标实现覆盖率）。

import test from 'node:test';
import assert from 'node:assert';
import { run as runContract } from '../../../scripts/target/check-target-contract.mjs';
import { run as runPages } from '../../../scripts/target/check-target-pages.mjs';
import { run as runFlows } from '../../../scripts/target/check-target-flows.mjs';
import { run as runPlatforms } from '../../../scripts/target/check-target-platforms.mjs';
import { run as runProtocols } from '../../../scripts/target/check-target-protocols.mjs';
import { run as runLanding } from '../../../scripts/target/check-target-landing-claims.mjs';
import { run as runTrace } from '../../../scripts/target/check-target-traceability.mjs';
import { snapshot, mutateJson, makeVirtualCtx } from '../lib/fixture-helper.mjs';

// ---- target-contract mutations ----
test('HARNESS-C-002 故意错误：重复 REQ ID 必须被抓', () => {
  const files = mutateJson(snapshot('contract'), 'contracts/target/product-target.json', (d) => {
    d.requirements.push(JSON.parse(JSON.stringify(d.requirements[0])));
  });
  const r = runContract(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => f.testId === 'TEST-C-001' && /REQ 重复/.test(f.message)));
});

test('HARNESS-C-003 故意错误：审批状态回退必须被抓', () => {
  const files = mutateJson(snapshot('contract'), 'contracts/target/product-target.json', (d) => {
    d.status = 'REVIEW';
    d.approved_by = null;
  });
  const r = runContract(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => f.testId === 'TEST-C-003' && /APPROVED\/user/.test(f.message)));
});

test('HARNESS-C-008 故意错误：FEAT 清空 planned_tests 必须被抓', () => {
  const files = mutateJson(snapshot('contract'), 'contracts/target/product-target.json', (d) => {
    d.features.find((f) => f.id === 'FEAT-081').planned_tests = [];
  });
  const r = runContract(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => f.testId === 'TEST-C-008' && f.message.includes('FEAT-081')));
});

test('HARNESS-C-002 故意错误：FEAT-081 从 Markdown 注销必须被抓', () => {
  const files = snapshot('contract');
  files['docs/target-product/03_TARGET_FEATURE_CATALOG.md'] =
    files['docs/target-product/03_TARGET_FEATURE_CATALOG.md'].replace(/####\s*FEAT-081[^\n]*\n/, '');
  const r = runContract(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => f.testId === 'TEST-C-001' && f.message.includes('FEAT-081')));
});

test('HARNESS-C-014 故意错误：DEC-013 扫描时长从 10 秒改 30 秒必须被抓', () => {
  const files = snapshot('contract');
  files['docs/target-product/06_TARGET_USER_FLOWS.md'] =
    files['docs/target-product/06_TARGET_USER_FLOWS.md'].replace(/10\s*秒/g, '30 秒');
  const r = runContract(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => f.testId === 'TEST-C-014' && /FLOW-002 扫描时长/.test(f.message)));
});

// ---- traceability mutations ----
test('HARNESS-C-009 故意错误：测试引用不存在的 REQ-999 必须被抓', () => {
  const files = mutateJson(snapshot('traceability'), 'contracts/target/test-traceability.json', (d) => {
    d.tests.find((t) => t.id === 'TEST-U-001').requirements.push('REQ-999');
  });
  const r = runTrace(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /悬空/.test(f.message) && /REQ-999/.test(f.message)));
});

test('HARNESS-C-008 故意错误：Must FEAT-081 失去全部测试必须被抓', () => {
  const files = mutateJson(snapshot('traceability'), 'contracts/target/test-traceability.json', (d) => {
    for (const t of d.tests) t.features = (t.features || []).filter((f) => f !== 'FEAT-081');
  });
  const r = runTrace(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /Must FEAT 100%/.test(f.message) && /FEAT-081/.test(f.message)));
});

test('HARNESS-C-009 故意错误：套件计数与实算不一致必须被抓', () => {
  const files = mutateJson(snapshot('traceability'), 'contracts/target/test-traceability.json', (d) => {
    d.tests = d.tests.slice(0, 100);
  });
  const r = runTrace(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /套件|计数之和/.test(f.message)));
});

test('HARNESS-C-009 故意错误：CLAIM-031 孤儿必须被抓', () => {
  const files = mutateJson(snapshot('traceability'), 'contracts/target/test-traceability.json', (d) => {
    d.tests.find((t) => t.id === 'TEST-R-011').claims = [];
  });
  const r = runTrace(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /CLAIM 无孤立/.test(f.message) && /CLAIM-031/.test(f.message)));
});

// ---- pages mutations ----
test('HARNESS-C-005 故意错误：PAGE-002 被改成第 5 个 Tab 必须被抓', () => {
  const files = mutateJson(snapshot('pages'), 'contracts/target/pages-target.json', (d) => {
    d.pages.find((p) => p.id === 'PAGE-002').type = 'tab';
  });
  const r = runPages(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /四 Tab/.test(f.message)));
});

test('HARNESS-C-005 故意错误：路由改错必须被抓', () => {
  const files = mutateJson(snapshot('pages'), 'contracts/target/pages-target.json', (d) => {
    d.pages.find((p) => p.id === 'PAGE-006').route = '/device-detail';
  });
  const r = runPages(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /pages\//.test(f.message)));
});

test('HARNESS-C-005 故意错误：required 与 forbidden 参数冲突必须被抓', () => {
  const files = mutateJson(snapshot('pages'), 'contracts/target/pages-target.json', (d) => {
    const p = d.pages.find((x) => x.id === 'PAGE-006');
    p.forbidden_params = [...(p.forbidden_params || []), p.required_params[0]];
  });
  const r = runPages(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /冲突/.test(f.message)));
});

test('HARNESS-C-005 故意错误：删除 PAGE-004 必须被抓', () => {
  const files = mutateJson(snapshot('pages'), 'contracts/target/pages-target.json', (d) => {
    d.pages = d.pages.filter((p) => p.id !== 'PAGE-004');
  });
  const r = runPages(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /PAGE-001..010/.test(f.message)));
});

test('HARNESS-C-005 故意错误：废弃操作复活必须被抓', () => {
  const files = mutateJson(snapshot('pages'), 'contracts/target/pages-target.json', (d) => {
    const p = d.pages.find((x) => x.id === 'PAGE-001');
    const dep = p.deprecated_operations || [];
    if (dep.length) p.operations = [...(p.operations || []), dep[0]];
  });
  const r = runPages(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /废弃操作不在册/.test(f.message)));
});

// ---- flows mutations ----
test('HARNESS-C-009 故意错误：FLOW 引用不存在的页面必须被抓', () => {
  const files = mutateJson(snapshot('flows'), 'contracts/target/flows-target.json', (d) => {
    d.flows.find((f) => f.id === 'FLOW-002').pages.push('PAGE-099');
  });
  const r = runFlows(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /坏引用/.test(f.message)));
});

test('HARNESS-C-009 故意错误：清空 cancel_and_cleanup 必须被抓', () => {
  const files = mutateJson(snapshot('flows'), 'contracts/target/flows-target.json', (d) => {
    d.flows.find((f) => f.id === 'FLOW-009').cancel_and_cleanup = [];
  });
  const r = runFlows(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /取消与清理/.test(f.message)));
});

test('HARNESS-C-009 故意错误：删除 FLOW-007 编号断裂必须被抓', () => {
  const files = mutateJson(snapshot('flows'), 'contracts/target/flows-target.json', (d) => {
    d.flows = d.flows.filter((f) => f.id !== 'FLOW-007');
  });
  const r = runFlows(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /FLOW-001..014/.test(f.message)));
});

// ---- platform mutations ----
test('HARNESS-C-004 故意错误：h5 被标 VERIFIED 必须被抓', () => {
  const files = mutateJson(snapshot('platforms'), 'contracts/target/platform-target.json', (d) => {
    d.platforms.find((p) => p.id === 'h5').public_status_target = 'VERIFIED';
  });
  const r = runPlatforms(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /h5 目标公开状态/.test(f.message)));
});

test('HARNESS-C-004 故意错误：状态词越界必须被抓', () => {
  const files = mutateJson(snapshot('platforms'), 'contracts/target/platform-target.json', (d) => {
    d.platforms.find((p) => p.id === 'ios-app').public_status_target = 'BETA';
  });
  const r = runPlatforms(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /五词表/.test(f.message)));
});

test('HARNESS-C-004 故意错误：正式入口降级无说明必须被抓', () => {
  const files = mutateJson(snapshot('platforms'), 'contracts/target/platform-target.json', (d) => {
    const cap = d.capabilities.find((x) => x.wechat === 'Adapted' && (x.degradation_ui || '').trim());
    cap.degradation_ui = '';
  });
  const r = runPlatforms(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /degradation_ui 空/.test(f.message)));
});

test('HARNESS-C-004 故意错误：能力值越界必须被抓', () => {
  const files = mutateJson(snapshot('platforms'), 'contracts/target/platform-target.json', (d) => {
    d.capabilities[0].wechat = 'Partial';
  });
  const r = runPlatforms(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /值在值域内/.test(f.message)));
});

// ---- protocol mutations ----
test('HARNESS-C-012 故意错误：OTA 步骤缺 CTRL commit 必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/ble-fixture-target.json', (d) => {
    d.ota_transaction.steps = d.ota_transaction.steps.filter((s) => !String(s).includes('commit'));
  });
  const r = runProtocols(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /OTA/.test(f.message) && (/commit|10 步|锚点/.test(f.message))));
});

test('HARNESS-C-012 故意错误：OTA 缺版本回读必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/ble-fixture-target.json', (d) => {
    d.ota_transaction.steps = d.ota_transaction.steps.map((s) => String(s).includes('firmware_version') ? '客户端读取设备信息' : s);
  });
  const r = runProtocols(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /firmware_version|严格递增|10 步|锚点/.test(f.message)));
});

test('HARNESS-C-012 故意错误：固件包缺 manifest.json 必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/ble-fixture-target.json', (d) => {
    d.ota_package.contents_min = ['firmware.bin'];
  });
  const r = runProtocols(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /DEC-016 固件包/.test(f.message)));
});

test('HARNESS-C-012 故意错误：UUID 改坏形态必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/ble-fixture-target.json', (d) => {
    d.services[0].uuid = 'not-a-uuid';
  });
  const r = runProtocols(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /UUID 形态/.test(f.message)));
});

test('HARNESS-C-013 故意错误：Smart HID token 改为持久化必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/smart-hid-target.json', (d) => {
    d.pairing_qr.token_storage = 'uni.setStorage 持久化到本地存储';
  });
  const r = runProtocols(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /token 仅内存/.test(f.message)));
});

test('HARNESS-C-013 故意错误：HID 错误类别减为 7 类必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/smart-hid-target.json', (d) => {
    d.errors = d.errors.slice(0, 7);
  });
  const r = runProtocols(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /八类错误/.test(f.message)));
});

// ---- landing mutations ----
test('HARNESS-C-010 故意错误：PREVIEW 假下载必须被抓', () => {
  const files = mutateJson(snapshot('landing'), 'contracts/target/landing-target.json', (d) => {
    d.download_rules.no_fake_download = false;
  });
  const r = runLanding(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /no_fake_download/.test(f.message)));
});

test('HARNESS-C-010 故意错误：缺产物行为不再是 NOT_RELEASED 必须被抓', () => {
  const files = mutateJson(snapshot('landing'), 'contracts/target/landing-target.json', (d) => {
    d.download_rules.missing_artifact_behavior = '显示即将上线';
  });
  const r = runLanding(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /NOT_RELEASED/.test(f.message)));
});

test('HARNESS-C-010 故意错误：VERIFIED 声明缺 SHA/URL 证据对必须被抓', () => {
  const files = mutateJson(snapshot('landing'), 'contracts/target/landing-target.json', (d) => {
    const c = d.claims.find((x) => x.id === 'CLAIM-004');
    c.public_status = 'VERIFIED';
  });
  const r = runLanding(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /VERIFIED 声明必须带/.test(f.message)));
});

test('HARNESS-C-010 故意错误：SHA 不再强制必须被抓', () => {
  const files = mutateJson(snapshot('landing'), 'contracts/target/landing-target.json', (d) => {
    d.download_rules.sha_required = false;
  });
  const r = runLanding(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /sha_required/.test(f.message)));
});

test('HARNESS-C-010 故意错误：Claim 清空 tests 必须被抓', () => {
  const files = mutateJson(snapshot('landing'), 'contracts/target/landing-target.json', (d) => {
    d.claims.find((x) => x.id === 'CLAIM-001').tests = [];
  });
  const r = runLanding(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /证据前置\/测试/.test(f.message)));
});
