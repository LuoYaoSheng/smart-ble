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
const requiredIdentity = [
  ['萌喵圈', 'wxe0ed0e6727a0a5cd', '/static/other-apps/cute-meow-circle.png'],
  ['宝宝点滴', 'wx1bb2d5c6821a7883', '/static/other-apps/baby-diary.png']
];
for (const [name, appId, icon] of requiredIdentity) {
  if (!productSource.includes(name) || !productSource.includes(appId) || !productSource.includes(icon)) {
    throw new Error(`Sibling mini-program identity mismatch: ${name}`);
  }
}

const expectedSiblingHashes = {
  '/static/other-apps/baby-diary.png': '945d081c34ed41c996b5ca5206ed861d8ee6349c5d08e966e69df0652051c2aa',
  '/static/other-apps/cute-meow-circle.png': 'e087721cd7a1eafa7d7c82fdb8b5841ec2e8aee5184efa26c7d0ff9338e068c9'
};
const siblingHashes = [];
for (const [reference, expectedHash] of Object.entries(expectedSiblingHashes)) {
  const bytes = await readFile(join(uniapp, reference.slice(1)));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== expectedHash) throw new Error(`Established sibling icon was replaced: ${reference}`);
  siblingHashes.push(hash);
}
const smartBleLogoHash = createHash('sha256')
  .update(await readFile(join(uniapp, 'static/logo.png')))
  .digest('hex');
if (siblingHashes.includes(smartBleLogoHash) || new Set(siblingHashes).size !== siblingHashes.length) {
  throw new Error('Smart BLE and sibling mini-program icons must remain distinct identities');
}

const compiledLabel = compiledAvailable ? 'source + compiled' : 'source only';
console.log(`UniApp asset gate PASS (${references.size} ${compiledLabel} references, ${pngBytes} PNG bytes, 2 locked sibling identities)`);
