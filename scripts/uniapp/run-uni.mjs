#!/usr/bin/env node
/**
 * Pure-CLI uni-app build wrapper (no HBuilderX involved).
 *
 * Runs the @dcloudio/vite-plugin-uni `uni` bin from apps/uniapp/node_modules and
 * maps the HBuilderX-style project layout onto CLI env vars:
 *   - UNI_INPUT_DIR  = apps/uniapp          (sources live at project root, not src/)
 *   - UNI_OUTPUT_DIR = unpackage/dist/{dev|build}/<platform>
 * so existing tooling (check-uniapp-assets, build-android-test) keeps one output layout.
 *
 * Usage: node scripts/uniapp/run-uni.mjs <build|dev> [platform] [extra uni args...]
 *   npm run build:mp-weixin   -> uni build -p mp-weixin
 *   npm run dev:mp-weixin     -> uni -p mp-weixin (watch)
 *   npm run build:app         -> uni build -p app
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECT = resolve(ROOT, 'apps/uniapp');

const [mode = 'build', platform = '', ...extra] = process.argv.slice(2);
if (!['build', 'dev'].includes(mode)) {
  console.error(`Unknown mode "${mode}"; expected build or dev`);
  process.exit(2);
}

const requireFromProject = createRequire(join(PROJECT, 'package.json'));
let pluginPkgPath;
try {
  pluginPkgPath = requireFromProject.resolve('@dcloudio/vite-plugin-uni/package.json');
} catch {
  console.error(
    '@dcloudio/vite-plugin-uni not installed; run `npm install` in apps/uniapp first'
  );
  process.exit(2);
}
const binField = JSON.parse(readFileSync(pluginPkgPath, 'utf8')).bin || {};
const uniBin = resolve(dirname(pluginPkgPath), binField.uni || 'bin/uni.js');
if (!existsSync(uniBin)) {
  console.error(`uni CLI entry missing: ${uniBin}`);
  process.exit(2);
}

process.env.UNI_INPUT_DIR = process.env.UNI_INPUT_DIR || PROJECT;
const outputMode = mode === 'dev' ? 'dev' : 'build';
const outPlatform = platform || 'h5';
if (!process.env.UNI_OUTPUT_DIR) {
  process.env.UNI_OUTPUT_DIR = join(PROJECT, 'unpackage', 'dist', outputMode, outPlatform);
}

const args = mode === 'build' ? ['build'] : [];
if (platform) args.push('-p', platform);
args.push(...extra);

const child = spawn(process.execPath, [uniBin, ...args], {
  cwd: PROJECT,
  stdio: 'inherit',
  env: { ...process.env },
});
child.on('close', (code) => process.exit(code ?? 1));
