// tests/target/harness/page-test-completeness.test.mjs
// HARNESS-P-001 —— 页面 spec 定义完整性（无 TODO、有 expect、覆盖 manifest 维度）。

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PAGES_DIR = `${ROOT}/tests/target/pages`;
const manifest = JSON.parse(readFileSync(`${PAGES_DIR}/pages.manifest.json`, 'utf8'));
const ASSERTION_KEYS = ['first_screen', 'empty_state', 'error_states', 'loading', 'platform_diff', 'navigation', 'a11y', 'cta_reachability', 'console_error'];

const specs = readdirSync(PAGES_DIR).filter((f) => f.endsWith('.spec.js'));

test('HARNESS-P-001 全部 PAGE/WEB spec 存在且无 TODO', () => {
  assert.equal(specs.length, manifest.pages.length, 'spec 数量与 manifest 一致');
  for (const p of manifest.pages) {
    const file = `${PAGES_DIR}/${p.id}.spec.js`;
    const src = readFileSync(file, 'utf8');
    assert.ok(src.includes(p.id), `${p.id} spec 引用页面 ID`);
    assert.ok(!/TODO\s*\(/.test(src), `${p.id}.spec.js 不得含 TODO`);
    assert.ok(src.includes('expect('), `${p.id}.spec.js 必须有 expect 断言`);
    assert.ok(src.includes('pages.manifest.json') || src.includes('getManifestEntry'), `${p.id} 消费 manifest`);
    assert.ok(src.includes('page-driver'), `${p.id} 使用 page-driver 契约`);
  }
});

test('HARNESS-P-001 每份 spec 覆盖 manifest 状态/操作/断言类别', () => {
  for (const p of manifest.pages) {
    const src = readFileSync(`${PAGES_DIR}/${p.id}.spec.js`, 'utf8');
    for (const s of p.states) assert.ok(src.includes(s) || src.includes('states'), `${p.id} 覆盖状态 ${s}`);
    assert.ok(src.includes('operations') || p.operations.some((op) => src.includes(op)), `${p.id} 覆盖操作`);
    for (const key of ASSERTION_KEYS) {
      assert.ok(src.includes(key), `${p.id} 覆盖断言维度 ${key}`);
    }
  }
});

test('HARNESS-P-001 generate-pages-artifacts 不得生成 TODO', () => {
  const gen = readFileSync(`${PAGES_DIR}/generate-pages-artifacts.mjs`, 'utf8');
  assert.ok(!gen.includes('TODO(TP-G2'), '生成器不得输出 TODO 骨架');
});
