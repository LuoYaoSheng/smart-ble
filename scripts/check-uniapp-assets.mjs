#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uniapp = join(root, 'apps/uniapp');
// Compiled output may come from HBuilderX dev compile or the pure-CLI build
// (npm run build:mp-weixin); both land under unpackage/dist.
const compiledCandidates = [
  join(uniapp, 'unpackage/dist/dev/mp-weixin'),
  join(uniapp, 'unpackage/dist/build/mp-weixin'),
];
let compiledUniapp = null;
let compiledMtime = 0;
for (const candidate of compiledCandidates) {
  try {
    // Pick the freshest compile; stale HBuilderX dev remnants must not shadow
    // a newer pure-CLI build (or vice versa).
    const mtime = (await stat(candidate)).mtimeMs;
    if (mtime > compiledMtime) {
      compiledUniapp = candidate;
      compiledMtime = mtime;
    }
  } catch {}
}
const compiledAvailable = compiledUniapp !== null;
const requireCompiled = process.argv.includes('--require-compiled') || process.env.UNIAPP_REQUIRE_COMPILED_ASSETS === '1';
if (requireCompiled && !compiledAvailable) {
  throw new Error('Compiled WeChat output is missing; run `npm run build:mp-weixin` (or HBuilderX compile) before the required compiled-asset gate');
}
const vueFiles = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'unpackage') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith('.vue')) vueFiles.push(path);
  }
}
await walk(uniapp);

const references = new Set();
const sourceFiles = [...vueFiles, join(uniapp, 'config/product.js')];
for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/["'](\/static\/[^"']+)["']/g)) references.add(match[1]);
}
const pages = JSON.parse(await readFile(join(uniapp, 'pages.json'), 'utf8'));
for (const tab of pages.tabBar?.list || []) {
  if (tab.iconPath) references.add(`/${tab.iconPath}`);
  if (tab.selectedIconPath) references.add(`/${tab.selectedIconPath}`);
}

const missing = [];
const missingCompiled = [];
const oversized = [];
let pngBytes = 0;
for (const reference of references) {
  const path = join(uniapp, reference.slice(1));
  try {
    await access(path);
    if (reference.endsWith('.png')) {
      const size = (await stat(path)).size;
      pngBytes += size;
      if (size > 250 * 1024) oversized.push(reference);
    }
    if (compiledAvailable) {
      try {
        await access(join(compiledUniapp, reference.slice(1)));
      } catch {
        missingCompiled.push(reference);
      }
    }
  } catch { missing.push(reference); }
}
if (missing.length) throw new Error(`UniApp static assets missing:\n${missing.join('\n')}`);
if (missingCompiled.length) throw new Error(`Compiled WeChat assets missing; run HBuilderX compile first:\n${missingCompiled.join('\n')}`);
if (oversized.length) throw new Error(`UniApp PNG assets exceed 250 KiB; compress before commit:\n${oversized.join('\n')}`);
if (pngBytes > 650 * 1024) throw new Error(`UniApp referenced PNG budget exceeded: ${pngBytes} bytes > 650 KiB`);

const productSource = await readFile(join(uniapp, 'config/product.js'), 'utf8');
// 86952f4（PARITY-ILL/P009 正典化）：推广卡片改缩写徽章块（abbr/bg/color），
// icon PNG 资产与哈希锁定随之移除；身份锚点 = 名称 + appId + 缩写徽章。
const requiredIdentity = [
  ['萌喵圈', 'wxe0ed0e6727a0a5cd', '萌喵'],
  ['宝宝点滴', 'wx1bb2d5c6821a7883', '宝宝']
];
for (const [name, appId, abbr] of requiredIdentity) {
  if (!productSource.includes(name) || !productSource.includes(appId) || !productSource.includes(`abbr: '${abbr}'`)) {
    throw new Error(`Sibling mini-program identity mismatch: ${name}`);
  }
}
if (/other-apps\/[^"']+\.png/.test(productSource)) {
  throw new Error('Sibling mini-program icons must stay abbr badges (86952f4); icon PNG references regressed');
}

const compiledLabel = compiledAvailable ? 'source + compiled' : 'source only';
console.log(`UniApp asset gate PASS (${references.size} ${compiledLabel} references, ${pngBytes} PNG bytes, 2 locked sibling identities)`);
