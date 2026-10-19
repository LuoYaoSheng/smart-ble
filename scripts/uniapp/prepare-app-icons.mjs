#!/usr/bin/env node
// Recreate ignored native app icons from the tracked UniApp brand image.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/uniapp');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--output-dir')) {
  throw new Error('Usage: node prepare-app-icons.mjs [--output-dir <directory>]');
}
const output = args.length ? resolve(args[1]) : join(project, 'unpackage/res/icons');
const source = join(project, 'static/logo.png');
const manifest = JSON.parse(readFileSync(join(project, 'manifest.json'), 'utf8'));
const icons = new Map();

function collect(value) {
  if (typeof value === 'string') {
    const match = /^unpackage\/res\/icons\/([1-9]\d*)x([1-9]\d*)\.png$/.exec(value);
    if (!match || match[1] !== match[2]) {
      throw new Error(`Unsupported native icon path: ${value}`);
    }
    icons.set(`${match[1]}x${match[2]}.png`, Number(match[1]));
  } else if (value && typeof value === 'object') {
    for (const child of Object.values(value)) collect(child);
  }
}
collect(manifest['app-plus']?.distribute?.icons);
if (!icons.size) throw new Error('No native app icon sizes were found in manifest.json');

mkdirSync(output, { recursive: true });
let backend;
if (process.platform === 'darwin') {
  // Match the sips resize used by the verified 2026-10-19 native APK build.
  backend = 'sips';
  for (const [name, size] of icons) {
    const result = spawnSync('/usr/bin/sips', [
      '-z', String(size), String(size), source, '--out', join(output, name),
    ], { encoding: 'utf8' });
    if (result.error || result.status !== 0) {
      throw new Error(result.error?.message || result.stderr || 'sips icon generation failed');
    }
  }
} else {
  // Use an existing Pillow installation on Linux/Windows; never install packages.
  const candidates = [['python3'], ['python'], ['py', '-3']];
  const python = candidates.find(([command, ...prefix]) => {
    const probe = spawnSync(command, [...prefix, '-c', 'from PIL import Image']);
    return !probe.error && probe.status === 0;
  });
  if (!python) throw new Error('Native icon preparation requires an existing Python + Pillow installation on this platform.');
  backend = 'Pillow';
  const script = [
    'from PIL import Image',
    'from pathlib import Path',
    'import json, sys',
    'source, output, sizes = sys.argv[1:]',
    'with Image.open(source) as image:',
    '    for name, size in json.loads(sizes):',
    '        image.resize((size, size), Image.Resampling.LANCZOS).save(Path(output) / name, format="PNG")',
  ].join('\n');
  const result = spawnSync(python[0], [
    ...python.slice(1), '-c', script, source, output, JSON.stringify([...icons]),
  ], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr || 'Pillow icon generation failed');
  }
}

for (const [name, size] of icons) {
  const png = readFileSync(join(output, name));
  if (png.length < 24 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
      || png.readUInt32BE(16) !== size || png.readUInt32BE(20) !== size) {
    throw new Error(`Generated native icon has incorrect dimensions: ${name}`);
  }
}
console.log(`Prepared ${icons.size} manifest app icons from static/logo.png using ${backend}`);
