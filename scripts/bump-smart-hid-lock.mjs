#!/usr/bin/env node
/**
 * 从本地 Smart-HID-Workspace 刷新 smart-hid-contract.lock.json。
 *
 * 用法：
 *   SMART_HID_WORKSPACE=/path/to/Smart-HID-Workspace node scripts/bump-smart-hid-lock.mjs
 *   node scripts/bump-smart-hid-lock.mjs --check   # 只校验，不写文件
 *
 * 不会自动改 hid-provisioning-protocol.ts；若 mirror 缺字段，请人工同步后再 bump。
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const checkOnly = process.argv.includes('--check');
const lockPath = resolve(root, 'core/protocols/smart-hid-contract.lock.json');
const canonicalRoot = process.env.SMART_HID_WORKSPACE
  ? resolve(process.env.SMART_HID_WORKSPACE)
  : resolve(root, '../Smart-HID-Workspace');
const contractPath = resolve(canonicalRoot, 'protocols/contracts/smart-hid-v1.json');

// Hash the committed content identity (LF), not the working-tree checkout:
// Windows autocrlf checkouts carry CRLF bytes that differ from the locked digest.
const contractText = (await readFile(contractPath, 'utf8')).replace(/\r\n/g, '\n');
const contractBytes = Buffer.from(contractText, 'utf8');
const digest = createHash('sha256').update(contractBytes).digest('hex');
const contract = JSON.parse(contractText);

let canonicalCommit = '';
try {
  canonicalCommit = execFileSync(
    'git',
    ['log', '-1', '--format=%H', '--', 'protocols/contracts/smart-hid-v1.json'],
    { cwd: canonicalRoot, encoding: 'utf8' }
  ).trim();
  if (!canonicalCommit) {
    canonicalCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: canonicalRoot,
      encoding: 'utf8'
    }).trim();
  }
} catch (error) {
  throw new Error(`无法读取 Smart-HID-Workspace contract commit: ${error.message}`);
}

const existing = JSON.parse(await readFile(lockPath, 'utf8'));
const next = {
  ...existing,
  canonical_repository: existing.canonical_repository || 'LuoYaoSheng/smart-hid-workspace',
  canonical_commit: canonicalCommit,
  contract_version: String(contract.contract_version ?? existing.contract_version),
  contract_sha256: digest
};

if (checkOnly) {
  const same =
    existing.canonical_commit === next.canonical_commit &&
    existing.contract_sha256 === next.contract_sha256 &&
    String(existing.contract_version) === String(next.contract_version);
  if (!same) {
    console.error('lock is stale:');
    console.error(`  commit  ${existing.canonical_commit} → ${next.canonical_commit}`);
    console.error(`  sha256  ${existing.contract_sha256} → ${next.contract_sha256}`);
    process.exit(1);
  }
  console.log(`Smart HID lock up to date (${digest}, ${canonicalCommit})`);
  process.exit(0);
}

await writeFile(lockPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(`Updated ${lockPath}`);
console.log(`  commit  ${next.canonical_commit}`);
console.log(`  sha256  ${next.contract_sha256}`);
console.log('Next: sync hid-provisioning-protocol.ts if needed, then run scripts/check-smart-hid-contract.mjs');
