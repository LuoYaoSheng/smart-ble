#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uniapp = join(root, 'apps/uniapp');
// Compiled output may come from HBuilderX dev compile or the pure-CLI build
// (npm run build:h5); both land under unpackage/dist.
// 2026-09-14 MAC-001/MAC-002：微信小程序目标退役，编译资产门禁改为 h5 产物。
const compiledCandidates = [
  join(uniapp, 'unpackage/dist/dev/h5'),
  join(uniapp, 'unpackage/dist/build/h5'),
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
  throw new Error('Compiled H5 output is missing; run `npm run build:h5` (or HBuilderX compile) before the required compiled-asset gate');
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
if (missingCompiled.length) throw new Error(`Compiled H5 assets missing; run npm run build:h5 first:\n${missingCompiled.join('\n')}`);
if (oversized.length) throw new Error(`UniApp PNG assets exceed 250 KiB; compress before commit:\n${oversized.join('\n')}`);
if (pngBytes > 650 * 1024) throw new Error(`UniApp referenced PNG budget exceeded: ${pngBytes} bytes > 650 KiB`);

const productSource = await readFile(join(uniapp, 'config/product.js'), 'utf8');
// 2026-09-10（F028 推广跳转移除）：更多小程序推广区整链下线，兄弟小程序身份改为「锁出」——
// 不得回流（含缩写徽章数据与 icon PNG 两条历史回归路径）。
const forbiddenIdentity = [
  ['萌喵圈', 'wxe0ed0e6727a0a5cd', "abbr: '萌喵'"],
  ['宝宝点滴', 'wx1bb2d5c6821a7883', "abbr: '宝宝'"]
];
for (const [name, appId, abbr] of forbiddenIdentity) {
  if (productSource.includes(name) || productSource.includes(appId) || productSource.includes(abbr)) {
    throw new Error(`Sibling mini-program identity regressed (F028 removed 2026-09-10): ${name}`);
  }
}
if (/other-apps\/[^"']+\.png/.test(productSource)) {
  throw new Error('Sibling mini-program icons must stay removed with the F028 promo section');
}

const compiledLabel = compiledAvailable ? 'source + compiled' : 'source only';
console.log(`UniApp asset gate PASS (${references.size} ${compiledLabel} references, ${pngBytes} PNG bytes, sibling identities locked out per F028 removal)`);
