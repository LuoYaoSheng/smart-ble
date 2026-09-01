// tests/target/harness/page-driver-integrity.test.js
// TEST-PAGE-DRIVER-001：Driver 完整性 — 禁止 fake PASS / 回填 Expected / 固定空 cleanup。

const test = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const { createFakeRuntime } = require('../pages/fixtures/runtime.fixture.js');
const {
  TargetPageDriver,
  isTargetDriverImplemented,
  getBehaviorPage,
  BLOCK_REASON,
} = require('../pages/lib/page-driver.js');

const ROOT = resolve(__dirname, '../../..');
const PAGES = `${ROOT}/tests/target/pages`;
const SPECS = `${PAGES}/specs`;
const DRIVER = `${PAGES}/lib/page-driver.js`;
const RUNTIME = `${PAGES}/driver/page-driver-runtime.js`;
const OP_RUNNER = `${PAGES}/driver/operation-runner.js`;

test('HARNESS-PDI-001 Driver runtime 文件存在且已实现', () => {
  assert.ok(existsSync(RUNTIME), 'page-driver-runtime.js');
  assert.equal(isTargetDriverImplemented(), true);
  assert.ok(BLOCK_REASON.MISSING.includes('TARGET_PAGE_DRIVER_MISSING'));
});

test('HARNESS-PDI-002 Driver 源码不回填 operation.expected_*', () => {
  const sources = [DRIVER, RUNTIME, OP_RUNNER].map((p) => readFileSync(p, 'utf8')).join('\n');
  assert.ok(!/return\s+op\.expected_ui/.test(sources));
  assert.ok(!/return\s+operation\.expected_ui/.test(sources));
  assert.ok(!/result\.ui\s*=\s*op\.expected_ui/.test(sources));
  assert.ok(!/result\.ui\s*=\s*\[\.\.\.op\.expected_ui\]/.test(sources));
  assert.ok(!/return\s+this\.entry\.exit_to/.test(sources));
  assert.ok(!/listeners:\s*0,\s*sessions:\s*0/.test(sources) || /not\.toEqual|禁止|固定/.test(sources));
});

test('HARNESS-PDI-003 cleanup 非固定空对象', async () => {
  const driver = new TargetPageDriver('PAGE-009', null);
  await driver.resetPage();
  await driver.prepareOperation('OP-P009-01');
  await driver.perform('OP-P009-01', null);
  const cleanup = driver.getCleanupSnapshot();
  assert.notDeepEqual(cleanup, { pageId: 'PAGE-009', listeners: 0, sessions: 0 });
  assert.ok(cleanup.tracked > 0 || cleanup.listeners > 0 || cleanup.sessions > 0);
});

test('HARNESS-PDI-004 navigation 非固定 exit_to 回填', async () => {
  const driver = new TargetPageDriver('PAGE-009', null);
  await driver.resetPage();
  const nav = await driver.getNavigationSnapshot();
  assert.ok(nav);
  assert.ok(String(nav.target || nav.exit_to || '').length > 0);
  const entry = JSON.parse(readFileSync(`${PAGES}/pages.manifest.json`, 'utf8'))
    .pages.find((p) => p.id === 'PAGE-009');
  assert.notEqual(JSON.stringify(nav), JSON.stringify(entry.exit_to || []));
});

test('HARNESS-PDI-005 全部 page spec 使用 Page Driver 且含 state/operation suites', () => {
  const specs = readdirSync(SPECS).filter((f) => f.endsWith('.spec.js'));
  assert.equal(specs.length, 11);
  for (const f of specs) {
    const src = readFileSync(`${SPECS}/${f}`, 'utf8');
    assert.ok(src.includes('TargetPageDriver'), f);
    assert.ok(src.includes('for (const state of behavior.states)'), f);
    assert.ok(src.includes('for (const operation of behavior.operations)'), f);
    assert.ok(!/TODO\s*\(/.test(src), f);
    assert.ok(!/slice\s*\(\s*0\s*,\s*3\s*\)/.test(src), f);
  }
});

test('HARNESS-PDI-006 FakeRuntime 可 reset 且测试间无污染', () => {
  const a = createFakeRuntime({ state: { mark: 1 } });
  a.startScan();
  a.emitDevice({ id: 'x' });
  assert.ok(a.getRuntimeEvents().length > 0);
  a.reset();
  assert.equal(a.getRuntimeEvents().length, 0);
  assert.equal(a.getDeviceEvents().length, 0);
  const b = createFakeRuntime();
  assert.notEqual(a.id, b.id);
  b.startScan();
  assert.ok(b.getRuntimeEvents().length > 0);
  assert.equal(a.getRuntimeEvents().length, 0);
});

test('HARNESS-PDI-007 perform Actual 独立于 live expected 字段读取', async () => {
  const beh = getBehaviorPage('PAGE-010');
  const op = beh.operations[0];
  const driver = new TargetPageDriver('PAGE-010', null);
  await driver.resetPage();
  await driver.prepareOperation(op.operation_id);
  const result = await driver.perform(op.operation_id, op.input_fixture);
  assert.ok(Array.isArray(result.ui));
  assert.ok(result.runtime_events.length > 0);
  assert.equal(result.status, 'executed');
  assert.notEqual(result.status, 'PASS');
});

test('HARNESS-PDI-008 两页 Driver 实例状态隔离', async () => {
  const d1 = new TargetPageDriver('PAGE-009', null);
  const d2 = new TargetPageDriver('PAGE-010', null);
  await d1.resetPage();
  await d2.resetPage();
  await d1.setState('STATE-P009-01');
  await d2.setState('STATE-P010-01');
  const s1 = await d1.getStateSnapshot();
  const s2 = await d2.getStateSnapshot();
  assert.equal(s1.state_id, 'STATE-P009-01');
  assert.equal(s2.state_id, 'STATE-P010-01');
  assert.notEqual(s1.runtime.state_id, s2.runtime.state_id);
});
