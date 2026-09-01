// scripts/target/lib/check-utils.mjs
// TP-G1 契约检查器共享基础设施。
// 设计约束（docs/target-tests/03）：
//  - 每个 checker 是纯函数 run(ctx)，ctx 可注入（真实文件系统或内存 Fixture）；
//  - 故意错误 Fixture 通过内存 ctx 证明 checker 会 FAIL，不得改真实目标文档制造失败；
//  - 结果结构统一：{ checker, pass, total, results:[{testId, targetIds, pass, message}] }。

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');

const norm = (p) => String(p).replace(/\\/g, '/');

/** 真实仓库 ctx：rel 均为仓库相对 posix 路径 */
export function makeCtx(root = REPO_ROOT) {
  return {
    root,
    kind: 'fs',
    exists: (rel) => existsSync(join(root, rel)),
    read: (rel) => readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n'),
    readJson(rel) {
      try {
        return { ok: true, data: JSON.parse(this.read(rel)) };
      } catch (e) {
        return { ok: false, error: String(e.message) };
      }
    },
  };
}

/** 内存 ctx：files = { 'contracts/target/product-target.json': '<json text>', ... }，未列出的路径不存在 */
export function makeVirtualCtx(files) {
  const map = new Map(Object.entries(files).map(([k, v]) => [norm(k), v]));
  return {
    root: '<virtual>',
    kind: 'virtual',
    exists: (rel) => map.has(norm(rel)),
    read: (rel) => {
      const v = map.get(norm(rel));
      if (v === undefined) throw new Error(`ENOENT(virtual): ${rel}`);
      return String(v).replace(/\r\n/g, '\n');
    },
    readJson(rel) {
      try {
        return { ok: true, data: JSON.parse(this.read(rel)) };
      } catch (e) {
        return { ok: false, error: String(e.message) };
      }
    },
  };
}

/** 从真实仓库读取一份 JSON 文本，供 Fixture 派生（修改副本而不是真实文件） */
export function readRepoJsonText(rel) {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

export class Checker {
  constructor(name) {
    this.name = name;
    this.results = [];
  }

  /** 记录一条断言；targetIds 用于失败时输出目标 ID（第一断点定位） */
  assert(testId, targetIds, condition, message) {
    this.results.push({
      testId,
      targetIds: [].concat(targetIds),
      pass: Boolean(condition),
      message,
    });
    return Boolean(condition);
  }

  report() {
    const failures = this.results.filter((r) => !r.pass);
    return {
      checker: this.name,
      pass: failures.length === 0,
      total: this.results.length,
      failureCount: failures.length,
      failures,
      results: this.results,
    };
  }
}

/** 表格行内全局匹配 ID（与 scripts/target-docs/inspect-target-docs.mjs 同口径；自动去掉 ^$ 锚点以支持行内匹配） */
export function rowIds(text, re) {
  const src = re.source.replace(/^\^/, '').replace(/\$$/, '');
  const rx = new RegExp(src, re.flags.includes('g') ? re.flags : re.flags + 'g');
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.includes('|')) continue;
    for (const m of line.matchAll(rx)) out.push(m[0]);
  }
  return out;
}

/** 标题行匹配 ID（FEAT/FLOW/DEC 等以标题登记的实体；自动去掉 ^$ 锚点） */
export function headingIds(text, re) {
  const src = re.source.replace(/^\^/, '').replace(/\$$/, '');
  const rx = new RegExp(src, re.flags.includes('g') ? re.flags : re.flags + 'g');
  const out = [];
  for (const line of text.split('\n')) {
    if (!/^\s{0,3}#{1,6}\s/.test(line)) continue;
    for (const m of line.matchAll(rx)) out.push(m[0]);
  }
  return out;
}

export function unique(values) {
  return [...new Set(values)];
}

export function duplicates(values) {
  const seen = new Set();
  const dup = new Set();
  for (const v of values) {
    if (seen.has(v)) dup.add(v);
    seen.add(v);
  }
  return [...dup];
}

export const ID_PATTERNS = {
  REQ: /^REQ-\d{3}$/,
  FEAT: /^FEAT-\d{3}$/,
  PAGE: /^PAGE-\d{3}$/,
  WEB: /^WEB-\d{3}$/,
  FLOW: /^FLOW-\d{3}$/,
  OP: /^OP-[A-Z]\d{3}-\d{2}$/,
  STATE: /^STATE-[A-Z0-9-]+$/,
  ERR: /^ERR-[A-Z]+-\d{2}$/,
  DATA: /^DATA-\d{3}$/,
  PROTO: /^PROTO-\d{3}$/,
  SEC: /^SEC-\d{3}$/,
  NFR: /^NFR-\d{3}$/,
  CLAIM: /^CLAIM-\d{3}$/,
  DEC: /^DEC-\d{3}$/,
  RISK: /^RISK-\d{3}$/,
  EVID: /^EVID-\d{3}$/,
  TEST: /^TEST-[CUIPEAWHR]-\d{3}$/,
};

/** CLI 直跑支持：--virtual <jsonPath> 从 JSON 文件加载内存 ctx（故意错误验证入口） */
export async function cliCtx(metaUrl) {
  const args = process.argv.slice(2);
  const vIdx = args.indexOf('--virtual');
  if (vIdx === -1) return makeCtx();
  const fixtureFile = resolve(args[vIdx + 1]);
  const { readFileSync: rf } = await import('node:fs');
  const files = JSON.parse(rf(fixtureFile, 'utf8'));
  console.error(`[ctx] virtual fixture: ${args[vIdx + 1]} (${Object.keys(files).length} files)`);
  return makeVirtualCtx(files);
}
