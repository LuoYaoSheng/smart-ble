/**
 * F026 日志脱敏桌面镜像测试（E-WIN / T-WIN）
 *
 * 镜像源：apps/uniapp/services/logger/log-redaction.js（正典；F-AND/K-AND 同源镜像）。
 * 锁定：
 * 1. 两线 log-redaction.js 逐字节一致；
 * 2. 字符串模式脱敏（token/password/Bearer/JSON 值）；
 * 3. 对象键脱敏 + 保护键白名单（uuid/sha256 不误伤）+ 循环引用守卫；
 * 4. 主进程 require 挂载冒烟（globalThis.SmartBLELogRedaction）。
 *
 * Run: node --test tests/desktop/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require_ = createRequire(import.meta.url);

function loadLine(relDir) {
  global.window = {};
  require_(resolve(ROOT, relDir, 'log-redaction.js'));
  const api = global.window.SmartBLELogRedaction;
  delete global.window;
  return api;
}

const electron = loadLine('apps/desktop/electron/public');
const tauri = loadLine('apps/desktop/tauri/src');

test('mirror: log-redaction.js 在两线间逐字节一致', () => {
  const a = readFileSync(resolve(ROOT, 'apps/desktop/electron/public/log-redaction.js'), 'utf8');
  const b = readFileSync(resolve(ROOT, 'apps/desktop/tauri/src/log-redaction.js'), 'utf8');
  assert.equal(a, b);
});

test('字符串: token/password 键值脱敏为 ***（Smart HID candidate 帧形状）', () => {
  const out = electron.sanitizeLogString('candidate: ssid=Home token=abc123 password=pw1');
  assert.ok(!out.includes('abc123'));
  assert.ok(!out.includes('pw1'));
  assert.ok(out.includes('token=***'));
  assert.ok(out.includes('password=***'));
  assert.ok(out.includes('ssid=Home'), '非敏感键不误伤');
});

test('字符串: Bearer 头脱敏（密文不出现）', () => {
  const out = electron.sanitizeLogString('authorization: Bearer eyJhbGciOi.secretvalue');
  assert.ok(!out.includes('secretvalue'));
  assert.ok(out.includes('Bearer'));
});

test('字符串: JSON 整体解析后按键脱敏', () => {
  const out = electron.sanitizeLogString('{"type":"ota","token":"xyz789","size":2048}');
  assert.ok(!out.includes('xyz789'));
  assert.ok(out.includes('***'));
  assert.ok(out.includes('2048'), '数值不误伤');
});

test('对象: 敏感键 → ***；保护键（uuid/sha256）不脱敏', () => {
  const out = electron.sanitizeLogObject({
    token: 'secret-t',
    password: 'secret-p',
    serviceUuid: '4fafc201-1fb5-459e-8fcc-c5c9c331914d',
    sha256: 'e'.repeat(64),
    name: 'ok',
  });
  assert.equal(out.token, '***');
  assert.equal(out.password, '***');
  assert.equal(out.serviceUuid, '4fafc201-1fb5-459e-8fcc-c5c9c331914d');
  assert.equal(out.sha256, 'e'.repeat(64));
  assert.equal(out.name, 'ok');
});

test('对象: 循环引用守卫 → [Circular]', () => {
  const obj = { a: 1 };
  obj.self = obj;
  const out = electron.sanitizeLogObject(obj);
  assert.equal(out.self, '[Circular]');
});

test('主进程 require 挂载冒烟: globalThis.SmartBLELogRedaction 可用', () => {
  // 模拟 Electron 主进程 require（无 window 环境）；清缓存确保重新执行挂载逻辑
  delete global.window;
  const resolved = require_.resolve(resolve(ROOT, 'apps/desktop/electron/public/log-redaction.js'));
  delete require_.cache[resolved];
  require_(resolved);
  assert.ok(globalThis.SmartBLELogRedaction);
  assert.equal(
    globalThis.SmartBLELogRedaction.sanitizeLogString('token=zzz').includes('zzz'),
    false,
  );
});

test('T-WIN 线行为与 E-WIN 一致', () => {
  const sample = 'token=a1 password=b2';
  assert.equal(tauri.sanitizeLogString(sample), electron.sanitizeLogString(sample));
});
