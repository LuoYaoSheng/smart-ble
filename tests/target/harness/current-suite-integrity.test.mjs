// tests/target/harness/current-suite-integrity.test.mjs
// HARNESS-S-001.. —— Current 套件度量完整性门禁（假绿/参照层/语法）。

import test from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../lib/import-target.mjs';

const CURRENT_DIRS = [
  'tests/target/unit',
  'tests/target/integration',
  'tests/target/firmware',
  'tests/target/release',
];

function listCurrentTests() {
  const out = [];
  for (const dir of CURRENT_DIRS) {
    const full = join(ROOT, dir);
    if (!existsSync(full)) continue;
    for (const f of readdirSync(full)) {
      if (!f.endsWith('.test.mjs') && !f.endsWith('.test.js')) continue;
      out.push({ rel: `${dir}/${f}`, abs: join(full, f) });
    }
  }
  return out;
}

test('HARNESS-S-001 Current 目录不得含参照层/broken deliberate/HARNESS-', () => {
  const hits = [];
  for (const f of listCurrentTests()) {
    const src = readFileSync(f.abs, 'utf8');
    if (/参照层/.test(src)) hits.push(`${f.rel}:参照层`);
    if (/test\(\s*['`]HARNESS-|\bHARNESS-[A-Z]+-\d+/.test(src) && !/不得|禁止|不得含/.test(src)) {
      // 允许在注释中提到不得含 HARNESS；禁止正式用例 ID
      if (/test\(\s*['`]HARNESS-/.test(src) || /export const CASE_META[\s\S]*HARNESS-/.test(src)) {
        hits.push(`${f.rel}:HARNESS-`);
      } else if (/\bHARNESS-[A-Z]+-\d+/.test(src) && !/^[\s]*\/\//m.test(src)) {
        // only if appears outside pure comment-only files — stricter: any non-comment line
        const codeLines = src.split('\n').filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l));
        if (codeLines.some((l) => /\bHARNESS-[A-Z]+-\d+/.test(l))) hits.push(`${f.rel}:HARNESS-`);
      }
    }
    if (/deliberate mutation/i.test(src)) hits.push(`${f.rel}:deliberate mutation`);
    if (/\b(?:async\s+)?function\s+broken[A-Z]|const\s+broken(?:Ready|Flow|Run|Broadcast)/.test(src)) {
      hits.push(`${f.rel}:broken* helper`);
    }
  }
  assert.deepEqual(hits, [], `Current 目录污染：${hits.join('; ')}`);
});

test('HARNESS-S-002 Current 目录不得含 || true / vacuous assert.ok(true)', () => {
  const hits = [];
  for (const f of listCurrentTests()) {
    const src = readFileSync(f.abs, 'utf8');
    if (/\|\|\s*true/.test(src)) hits.push(`${f.rel}:|| true`);
    if (/assert\.ok\(\s*true\s*[,)]/.test(src)) hits.push(`${f.rel}:assert.ok(true)`);
  }
  assert.deepEqual(hits, [], `vacuous assertion：${hits.join('; ')}`);
});

test('HARNESS-S-003 Current 目录不得含空正则 Alternative', () => {
  const hits = [];
  for (const f of listCurrentTests()) {
    const src = readFileSync(f.abs, 'utf8');
    if (/\/[^/\n]*\|\/[gimsuy]*/.test(src) || /\/[^/\n]*\|\//.test(src)) {
      hits.push(`${f.rel}:empty-alt-regex`);
    }
  }
  assert.deepEqual(hits, [], `空正则：${hits.join('; ')}`);
});

test('HARNESS-S-004 Current 测试文件可解析（node --check）', () => {
  const failures = [];
  for (const f of listCurrentTests()) {
    const r = spawnSync(process.execPath, ['--check', f.abs], { encoding: 'utf8' });
    if (r.status !== 0) {
      failures.push(`${f.rel}: ${(r.stderr || r.stdout || '').slice(0, 160)}`);
    }
  }
  assert.deepEqual(failures, [], `不可解析：${failures.join('; ')}`);
});

test('HARNESS-S-005 非 async callback 中不得出现 await', () => {
  const hits = [];
  for (const f of listCurrentTests()) {
    const src = readFileSync(f.abs, 'utf8');
    const re = /test\s*\(\s*[^,]+,\s*(?!async)(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{([\s\S]*?)\}\s*\)/g;
    let m;
    while ((m = re.exec(src))) {
      if (/\bawait\b/.test(m[2])) hits.push(`${f.rel}:non-async await`);
    }
  }
  assert.deepEqual(hits, [], hits.join('; '));
});

test('HARNESS-S-006 OTA Current 测试禁止 UUID 前缀匹配捷径', () => {
  const f = join(ROOT, 'tests/target/integration/ota-transaction-target.test.mjs');
  const src = readFileSync(f, 'utf8');
  assert.ok(!/\.slice\(\s*0\s*,\s*17\s*\)/.test(src), '禁止 slice(0,17)');
  assert.ok(!/startsWith\(\s*CHR_CTRL|startsWith\(\s*CHR_DATA/.test(src), '禁止 startsWith 共同前缀');
  assert.ok(/sameUuid|normUuid|normalizeUuid/.test(src), '必须使用完整 UUID 精确匹配助手');
  assert.ok(/第一个 DATA 写之前未发送 CTRL start|CTRL start/.test(src), '必须断言 CTRL-before-DATA 第一断点');
});

test('HARNESS-S-007 公开声明测试必须能抓住 releases/latest 与错误主线', () => {
  const f = join(ROOT, 'tests/target/release/public-claims.test.mjs');
  const src = readFileSync(f, 'utf8');
  assert.ok(/releases\/latest/.test(src), '必须检测 releases/latest');
  assert.ok(/NOT_RELEASED|尚未发布/.test(src), '必须要求诚实 NOT_RELEASED');
  assert.ok(/Flutter|6\+|多端大一统/.test(src), '必须抓错误主线/6+/大一统');
  assert.ok(!/\|\|\s*true/.test(src), '不得 || true');
});
