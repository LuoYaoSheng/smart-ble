#!/usr/bin/env node
// scripts/target/compare-target-current.mjs
// TP-G2 入口：生成机器可读差距报告，再渲染 Markdown。
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const gen = resolve(ROOT, 'scripts/target/generate-gap-report.mjs');
const render = resolve(ROOT, 'scripts/target/render-gap-markdown.mjs');

function run(script) {
  const r = spawnSync(process.execPath, [script], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}

run(gen);
run(render);
console.log('compare-target-current: done');
