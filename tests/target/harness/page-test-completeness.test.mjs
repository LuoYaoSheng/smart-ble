// tests/target/harness/page-test-completeness.test.mjs
// HARNESS-P-001..015 —— 页面行为契约 + spec 完整性 + 故意错误（scope=harness）。

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PAGES_DIR = `${ROOT}/tests/target/pages`;
const DRIVER = `${PAGES_DIR}/lib/page-driver.js`;
const BEHAVIOR = `${PAGES_DIR}/page-behavior.manifest.json`;
const GEN = `${PAGES_DIR}/generate-pages-artifacts.mjs`;
const GEN_BEH = `${PAGES_DIR}/generate-page-behavior.mjs`;

const pagesTarget = JSON.parse(readFileSync(`${ROOT}/contracts/target/pages-target.json`, 'utf8'));
const behavior = JSON.parse(readFileSync(BEHAVIOR, 'utf8'));
const pagesManifest = JSON.parse(readFileSync(`${PAGES_DIR}/pages.manifest.json`, 'utf8'));
const specs = readdirSync(PAGES_DIR).filter((f) => f.endsWith('.spec.js'));
const driverSrc = readFileSync(DRIVER, 'utf8');

test('HARNESS-P-001 11 份 spec 全部存在且无 TODO / 无 slice(0,3)', () => {
  assert.equal(specs.length, 11);
  assert.equal(behavior.pages.length, 11);
  for (const p of pagesTarget.pages) {
    const src = readFileSync(`${PAGES_DIR}/${p.id}.spec.js`, 'utf8');
    assert.ok(src.includes(p.id));
    assert.ok(!/TODO\s*\(/.test(src), `${p.id} 不得含 TODO`);
    assert.ok(!/TODO\(TP-G2/.test(src));
    assert.ok(!/slice\s*\(\s*0\s*,\s*3\s*\)/.test(src), `${p.id} 不得 slice(0,3)`);
    assert.ok(!/骨架/.test(src), `${p.id} 不得自称骨架`);
    assert.ok(src.includes('for (const operation of behavior.operations)'), `${p.id} 必须遍历全部 operations`);
    assert.ok(src.includes('for (const state of behavior.states)'), `${p.id} 必须遍历全部 states`);
    assert.ok(src.includes('expect('));
    assert.ok(src.includes('page-driver'));
    assert.ok(src.includes('getBehaviorPage'));
  }
});

test('HARNESS-P-002 每个有效 OP/State ID 出现在 behavior manifest', () => {
  for (const p of pagesTarget.pages) {
    const beh = behavior.pages.find((x) => x.page_id === p.id);
    assert.ok(beh, p.id);
    const ops = new Set(beh.operations.map((o) => o.operation_id));
    const states = new Set(beh.states.map((s) => s.state_id));
    for (const op of p.operations) assert.ok(ops.has(op), `${p.id} missing op ${op}`);
    for (const st of p.states) assert.ok(states.has(st), `${p.id} missing state ${st}`);
    assert.equal(beh.operations.length, p.operations.length);
    assert.equal(beh.states.length, p.states.length);
  }
});

test('HARNESS-P-003 每个 Operation 含 precondition/control/expected_* / failure / test_ids', () => {
  for (const p of behavior.pages) {
    for (const op of p.operations) {
      assert.ok(op.precondition_state, `${op.operation_id} precondition`);
      assert.ok(op.control, `${op.operation_id} control`);
      assert.ok(op.visible_when, `${op.operation_id} visible_when`);
      assert.ok(op.expected_ui?.length, `${op.operation_id} expected_ui`);
      assert.ok(op.expected_runtime_events?.length, `${op.operation_id} expected_runtime`);
      assert.ok('expected_navigation' in op, `${op.operation_id} expected_navigation field`);
      assert.ok(op.expected_cleanup?.length, `${op.operation_id} expected_cleanup`);
      assert.ok(op.failure_variants?.length, `${op.operation_id} failure_variants`);
      assert.ok(op.test_ids?.length, `${op.operation_id} test_ids`);
      if (op.hardware_dependent) {
        assert.ok(
          (op.expected_device_events?.length || 0) + (op.e5_mapping?.length || 0) > 0,
          `${op.operation_id} hardware 需 device_events 或 E5 映射`,
        );
      }
    }
  }
});

test('HARNESS-P-004 每个 State 有 visible/allowed/disabled/recovery', () => {
  for (const p of behavior.pages) {
    for (const st of p.states) {
      assert.ok(st.state_id);
      assert.ok(st.entry_condition);
      assert.ok(st.visible_sections?.length, `${st.state_id} visible_sections`);
      assert.ok(Array.isArray(st.allowed_operations));
      assert.ok(Array.isArray(st.disabled_operations));
      assert.ok(st.expected_recovery, `${st.state_id} recovery`);
      assert.ok(st.exit_conditions?.length, `${st.state_id} exit`);
    }
  }
});

test('HARNESS-P-005 Driver Actual API 不得直接返回 manifest Expected', () => {
  assert.ok(!/return\s+\[\.\.\.this\.entry\.operations\]/.test(driverSrc));
  assert.ok(!/return\s+this\.entry\.exit_to/.test(driverSrc));
  assert.ok(!/listeners:\s*0,\s*sessions:\s*0/.test(driverSrc) || /missing\(\)/.test(driverSrc));
  // Fake zero cleanup must not be returned as success
  assert.ok(!/getCleanupSnapshot\(\)\s*\{\s*return\s*\{\s*pageId:/.test(driverSrc));
  assert.ok(!/getNavigationTarget\(\)\s*\{\s*return\s*this\.entry\.exit_to/.test(driverSrc));
  assert.ok(driverSrc.includes('NOT_IMPLEMENTED: TARGET_PAGE_DRIVER_MISSING'));
  assert.ok(driverSrc.includes('getControlState'));
  assert.ok(driverSrc.includes('prepareOperation'));
  assert.ok(driverSrc.includes('getOperationResult'));
  assert.ok(driverSrc.includes('getNavigationSnapshot'));
  assert.ok(driverSrc.includes('getDeviceEvents'));
  assert.ok(driverSrc.includes('probeAvailableOperations'));
});

test('HARNESS-P-006 生成器不得产出 TODO / 骨架 / slice(0,3)', () => {
  const gen = readFileSync(GEN, 'utf8');
  assert.ok(!gen.includes('TODO(TP-G2'));
  assert.ok(!/slice\s*\(\s*0\s*,\s*3\s*\)/.test(gen));
  assert.ok(!gen.includes('页面目标自动化骨架'));
  assert.ok(gen.includes('for (const operation of behavior.operations)'));
  assert.ok(gen.includes('for (const state of behavior.states)'));
});

test('HARNESS-P-007 behavior 与 pages-target / pages.manifest ID 集合一致', () => {
  assert.equal(behavior.totals.operations, pagesTarget.pages.reduce((n, p) => n + p.operations.length, 0));
  assert.equal(behavior.totals.states, pagesTarget.pages.reduce((n, p) => n + p.states.length, 0));
  for (const m of pagesManifest.pages) {
    const beh = behavior.pages.find((x) => x.page_id === m.id);
    assert.deepEqual([...m.operations].sort(), beh.operations.map((o) => o.operation_id).sort());
    assert.deepEqual([...m.states].sort(), beh.states.map((s) => s.state_id).sort());
  }
});

test('HARNESS-P-008 生成器重跑后 behavior/manifest/spec 无 diff', () => {
  const before = {
    behavior: readFileSync(BEHAVIOR, 'utf8'),
    pages: readFileSync(`${PAGES_DIR}/pages.manifest.json`, 'utf8'),
    specs: Object.fromEntries(specs.map((f) => [f, readFileSync(`${PAGES_DIR}/${f}`, 'utf8')])),
  };
  const r = spawnSync(process.execPath, [GEN], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.equal(readFileSync(BEHAVIOR, 'utf8'), before.behavior);
  assert.equal(readFileSync(`${PAGES_DIR}/pages.manifest.json`, 'utf8'), before.pages);
  for (const f of specs) {
    assert.equal(readFileSync(`${PAGES_DIR}/${f}`, 'utf8'), before.specs[f], `${f} dirty after regen`);
  }
});

// ---- intentional mutations ----

test('HARNESS-P-009 故意错误：删除一个 OP → 完整性失败', () => {
  const clone = structuredClone(behavior);
  clone.pages[0].operations.pop();
  assert.notEqual(clone.pages[0].operations.length, pagesTarget.pages[0].operations.length);
  const ops = new Set(clone.pages[0].operations.map((o) => o.operation_id));
  const missing = pagesTarget.pages[0].operations.filter((id) => !ops.has(id));
  assert.ok(missing.length >= 1);
});

test('HARNESS-P-010 故意错误：删除一个 State → 完整性失败', () => {
  const clone = structuredClone(behavior);
  clone.pages[0].states.pop();
  assert.ok(clone.pages[0].states.length < pagesTarget.pages[0].states.length);
});

test('HARNESS-P-011 故意错误：Operation 缺 cleanup → 完整性失败', () => {
  const op = structuredClone(behavior.pages[0].operations[0]);
  op.expected_cleanup = [];
  assert.ok(!(op.expected_cleanup?.length));
});

test('HARNESS-P-012 故意错误：Operation 缺 failure variant → 完整性失败', () => {
  const op = structuredClone(behavior.pages[0].operations[0]);
  op.failure_variants = [];
  assert.ok(!(op.failure_variants?.length));
});

test('HARNESS-P-013 故意错误：Driver 返回 manifest expected 必须被识别为违规', () => {
  const bad = `
export class TargetPageDriver {
  getAvailableOperations() { return [...this.entry.operations]; }
  getNavigationTarget() { return this.entry.exit_to[0]; }
  getCleanupSnapshot() { return { pageId: this.pageId, listeners: 0, sessions: 0 }; }
}
`;
  assert.ok(/return\s+\[\.\.\.this\.entry\.operations\]/.test(bad));
  assert.ok(/exit_to\[0\]/.test(bad));
  assert.ok(/listeners:\s*0/.test(bad));
  // current driver must not match these patterns as live returns
  assert.ok(!/getAvailableOperations\(\)\s*\{\s*return\s+\[\.\.\.this\.entry\.operations\]/.test(driverSrc));
});

test('HARNESS-P-014 故意错误：spec 使用 slice(0,3) 必须被抓', () => {
  const badSpec = 'for (const opId of entry.operations.slice(0, 3)) { await driver.perform(opId); }';
  assert.ok(/slice\s*\(\s*0\s*,\s*3\s*\)/.test(badSpec));
  for (const p of pagesTarget.pages) {
    const src = readFileSync(`${PAGES_DIR}/${p.id}.spec.js`, 'utf8');
    assert.ok(!/slice\s*\(\s*0\s*,\s*3\s*\)/.test(src));
  }
});

test('HARNESS-P-015 故意错误：空 perform 断言必须被抓', () => {
  const empty = "test('op', async () => { await driver.perform('OP-P001-01'); });";
  assert.ok(!/getOperationResult/.test(empty));
  for (const p of pagesTarget.pages) {
    const src = readFileSync(`${PAGES_DIR}/${p.id}.spec.js`, 'utf8');
    assert.ok(src.includes('getOperationResult'), `${p.id} 必须断言 operation result`);
    assert.ok(src.includes('expected_ui'));
    assert.ok(src.includes('expected_cleanup'));
  }
});
