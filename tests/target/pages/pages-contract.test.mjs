// tests/target/pages/pages-contract.test.mjs
// TEST-P-001..012 的 TP-G1 可执行部分：页面 Manifest 与 pages-target 契约一致性。
// Playwright spec（*.spec.js）在无浏览器环境时由 verify-target 标 BLOCKED，不得计 PASS。

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const target = JSON.parse(readFileSync(`${ROOT}/contracts/target/pages-target.json`, 'utf8'));
const manifest = JSON.parse(readFileSync(`${ROOT}/tests/target/pages/pages.manifest.json`, 'utf8'));

test('TEST-P 全体：manifest 覆盖 PAGE-001..010 + WEB-001 且路由一致', () => {
  assert.equal(manifest.pages.length, target.pages.length);
  for (const p of target.pages) {
    const m = manifest.pages.find((x) => x.id === p.id);
    assert.ok(m, `${p.id} 在 manifest 中`);
    assert.equal(m.route, p.route, `${p.id} 路由一致`);
    assert.equal(m.type, p.type, `${p.id} 类型一致`);
  }
});

test('TEST-P 全体：每页断言维度齐备（首屏/空态/错误/Loading/平台差异/跳转/a11y/CTA/console）', () => {
  const required = ['first_screen', 'empty_state', 'error_states', 'loading', 'platform_diff', 'navigation', 'a11y', 'cta_reachability', 'console_error'];
  for (const m of manifest.pages) {
    for (const key of required) {
      assert.ok((m.assertions[key] || '').trim().length > 0, `${m.id} 断言 ${key} 非空`);
    }
  }
});

test('TEST-P-011：WEB-001 声明 mobile/desktop、light/dark、SEO 与无 JS 降级', () => {
  const web = manifest.pages.find((p) => p.id === 'WEB-001');
  assert.ok(web.web_extra, 'WEB-001 有 web_extra');
  assert.deepEqual(web.web_extra.viewport.sort(), ['desktop', 'mobile']);
  assert.deepEqual(web.web_extra.theme.sort(), ['dark', 'light']);
  assert.ok(web.web_extra.no_js.includes('无 JS'), '无 JS 核心内容规则');
});

test('TEST-P 全体：manifest 状态/操作与 pages-target 同源（states/operations 数量一致）', () => {
  for (const p of target.pages) {
    const m = manifest.pages.find((x) => x.id === p.id);
    assert.equal(m.states.length, (p.states || []).length, `${p.id} states 同源`);
    assert.equal(m.operations.length, (p.operations || []).length, `${p.id} operations 同源`);
    assert.equal(m.deprecated_operations.length, (p.deprecated_operations || []).length, `${p.id} deprecated 同源`);
  }
});

test('TEST-P 全体：Playwright spec 骨架存在（E4 可运行时接线）', () => {
  const { existsSync } = awaitImport();
  for (const p of target.pages) {
    const spec = `${ROOT}/tests/target/pages/${p.id}.spec.js`;
    assert.ok(existsSync(spec), `${p.id}.spec.js 存在`);
  }
  function awaitImport() {
    return { existsSync: (f) => { try { readFileSync(f); return true; } catch { return false; } } };
  }
});
