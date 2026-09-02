// tests/target/integration/logging-target.test.mjs
// RUNTIME-LOG-REDACTION-001 — BLE / OTA / Smart HID 日志接入不会泄露敏感字段

import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importTarget } from '../lib/import-target.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SECRET = 'integration-secret-token-xyz';
const SHA = 'b'.repeat(64);

function readService(relPath) {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

function captureConsole(method = 'error') {
  const lines = [];
  const prev = console[method];
  console[method] = (...args) => {
    lines.push(args.map((arg) => {
      if (typeof arg === 'string') return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(' '));
  };
  return {
    lines,
    restore() {
      console[method] = prev;
    },
  };
}

test('BLE runtime wired to createLogger (no raw console.error)', () => {
  const src = readService('apps/uniapp/services/ble-runtime/index.js');
  assert.match(src, /createLogger\('ble-runtime'\)/);
  assert.doesNotMatch(src, /console\.error\('\[ble-runtime\]/);
});

test('OTA manager wired to createLogger', () => {
  const src = readService('apps/uniapp/services/ota/ota-manager.js');
  assert.match(src, /createLogger\('ota-manager'\)/);
  assert.doesNotMatch(src, /console\.error\('\[ota-manager\]/);
});

test('Smart HID wired to createLogger', () => {
  const src = readService('apps/uniapp/services/smart-hid/index.js');
  assert.match(src, /createLogger\('smart-hid'\)/);
  assert.doesNotMatch(src, /console\.error\('\[SmartHID\]/);
  assert.doesNotMatch(src, /core\/ble-core\/utils\/logger/);
});

test('BLE runtime logger redacts callback errors', async () => {
  const { createLogger } = (await importTarget('apps/uniapp/services/logger/log-redaction.js')).module;
  const log = createLogger('ble-runtime');
  const cap = captureConsole('error');
  try {
    log.error('characteristic callback failed', { token: SECRET, deviceId: 'BLE-001' });
    const joined = cap.lines.join('\n');
    assert.ok(!joined.includes(SECRET));
    assert.ok(joined.includes('BLE-001'));
  } finally {
    cap.restore();
  }
});

test('OTA logger redacts event listener errors', async () => {
  const { createLogger } = (await importTarget('apps/uniapp/services/logger/log-redaction.js')).module;
  const log = createLogger('ota-manager');
  const cap = captureConsole('error');
  try {
    log.error('event listener failed', {
      credential: SECRET,
      sha256: SHA,
      firmware_version: '2.0.0',
    });
    const joined = cap.lines.join('\n');
    assert.ok(!joined.includes(SECRET));
    assert.ok(joined.includes(SHA));
    assert.ok(joined.includes('2.0.0'));
  } finally {
    cap.restore();
  }
});

test('Smart HID logger redacts provision secrets', async () => {
  const { createLogger } = (await importTarget('apps/uniapp/services/logger/log-redaction.js')).module;
  const log = createLogger('smart-hid');
  const cap = captureConsole('warn');
  try {
    log.warn('provision failed', { qr_token: SECRET, serviceUuid: 'ffe0' });
    const joined = cap.lines.join('\n');
    assert.ok(!joined.includes(SECRET));
    assert.ok(joined.includes('ffe0'));
  } finally {
    cap.restore();
  }
});

test('legacy ble-runtime redact entry keeps deviceId', async () => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/log-redaction.js');
  assert.ok(m.ok, m.message);
  const clean = m.module.redact({
    message: `token=${SECRET}`,
    deviceId: 'D-legacy',
  });
  const text = JSON.stringify(clean);
  assert.ok(!text.includes(SECRET));
  assert.ok(text.includes('D-legacy'));
});
