// tests/target/firmware/build-metadata-target.test.mjs
// ESP32-BUILD-001 — PlatformIO env, build metadata, no fixed COM, no flash scripts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PIO = `${ROOT}/hardware/esp32/LightBLE/platformio.ini`;
const BUILD_SCRIPT = `${ROOT}/hardware/esp32/scripts/build-info.py`;
const HEADER = `${ROOT}/hardware/esp32/LightBLE/include/firmware_build_info.h`;
const METADATA = `${ROOT}/hardware/esp32/LightBLE/build-metadata.json`;
const HW_SCRIPTS = `${ROOT}/hardware/esp32/scripts`;

function read(rel) {
  const path = resolve(ROOT, rel);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function activePioLines(text) {
  return text.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('#');
  });
}

function envNames(text) {
  return [...text.matchAll(/^\[env:([^\]]+)\]/gm)].map((match) => match[1]);
}

test('1. PlatformIO env 存在（fixture_peripheral + fixture_observer + esp32dev）', () => {
  const pio = read(PIO);
  const envs = envNames(pio);
  assert.ok(envs.includes('fixture_peripheral'), 'fixture_peripheral env 存在');
  assert.ok(envs.includes('fixture_observer'), 'fixture_observer env 存在');
  assert.ok(envs.includes('esp32dev'), 'esp32dev 兼容 env 存在');
});

test('2. build metadata header 存在', () => {
  assert.ok(existsSync(HEADER), 'include/firmware_build_info.h 存在');
});

test('3. version 定义', () => {
  const header = readFileSync(HEADER, 'utf8');
  assert.match(header, /#define\s+FW_VERSION\s+"[^"]+"/);
  assert.match(header, /#define\s+FIRMWARE_VERSION\s+"[^"]+"/);
});

test('4. git sha 定义', () => {
  const header = readFileSync(HEADER, 'utf8');
  assert.match(header, /#define\s+FW_GIT_SHA\s+"[^"]+"/);
  const script = read(BUILD_SCRIPT);
  assert.match(script, /rev-parse.*--short.*HEAD/s);
});

test('5. 无固定 COM / dev 串口', () => {
  const pio = read(PIO);
  const active = activePioLines(pio).join('\n');
  assert.doesNotMatch(active, /upload_port\s*=\s*COM\d+/i);
  assert.doesNotMatch(active, /monitor_port\s*=\s*COM\d+/i);
  assert.doesNotMatch(active, /upload_port\s*=\s*\/dev\/cu\./);
  assert.doesNotMatch(active, /monitor_port\s*=\s*\/dev\/cu\./);
  assert.match(active, /upload_port\s*=\s*\$\{sysenv\.UPLOAD_PORT\}/);
});

test('6. 无 production flash script', () => {
  const scripts = existsSync(HW_SCRIPTS) ? readdirSync(HW_SCRIPTS) : [];
  const flashScripts = scripts.filter((name) => /flash|upload|burn/i.test(name) && /\.(sh|py|mjs|js)$/.test(name));
  assert.equal(flashScripts.length, 0, `不得包含 production flash 脚本（发现 ${flashScripts.join(', ')}）`);
});

test('build-info.py 生成 metadata JSON（若已构建）', () => {
  if (!existsSync(METADATA)) return;
  const metadata = JSON.parse(readFileSync(METADATA, 'utf8'));
  assert.equal(metadata.firmware_name, 'LightBLE');
  assert.match(metadata.version, /\d+\.\d+\.\d+/);
  assert.match(metadata.git_sha, /[0-9a-f]+|unknown/);
  assert.ok(metadata.build_time, 'build_time 字段存在');
});

test('platformio 接入 build-info.py extra_scripts', () => {
  const pio = read(PIO);
  assert.match(pio, /extra_scripts\s*=\s*pre:\.\.\/scripts\/build-info\.py/);
});
