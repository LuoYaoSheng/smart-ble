#!/usr/bin/env node
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uniapp = join(root, 'apps/uniapp');
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
for (const file of vueFiles) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/["'](\/static\/[^"']+)["']/g)) references.add(match[1]);
}
const pages = JSON.parse(await readFile(join(uniapp, 'pages.json'), 'utf8'));
for (const tab of pages.tabBar?.list || []) {
  if (tab.iconPath) references.add(`/${tab.iconPath}`);
  if (tab.selectedIconPath) references.add(`/${tab.selectedIconPath}`);
}

const missing = [];
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
  } catch { missing.push(reference); }
}
if (missing.length) throw new Error(`UniApp static assets missing:\n${missing.join('\n')}`);
if (oversized.length) throw new Error(`UniApp PNG assets exceed 250 KiB; compress before commit:\n${oversized.join('\n')}`);
if (pngBytes > 650 * 1024) throw new Error(`UniApp referenced PNG budget exceeded: ${pngBytes} bytes > 650 KiB`);
console.log(`UniApp asset gate PASS (${references.size} references, ${pngBytes} PNG bytes)`);
