// tests/target/unit/log-redaction-target.test.mjs
// RUNTIME-LOG-REDACTION-001 — 统一日志脱敏规则与 Logger API

import test from 'node:test';
import assert from 'node:assert';
import { importTarget } from '../lib/import-target.mjs';

const SECRET = 'super-secret-value-12345';
const SHA = 'a'.repeat(64);

async function load() {
  const m = await importTarget('apps/uniapp/services/logger/log-redaction.js');
  assert.ok(m.ok, m.message || 'log-redaction module missing');
  return m.module;
}

function textOf(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

test('1 token key redacted', async () => {
  const { sanitizeLogObject } = await load();
  const out = sanitizeLogObject({ token: SECRET });
  assert.equal(out.token, '***');
  assert.ok(!textOf(out).includes(SECRET));
});

test('2 password key redacted', async () => {
  const { sanitizeLogObject } = await load();
  const out = sanitizeLogObject({ password: SECRET });
  assert.equal(out.password, '***');
});

test('3 api key redacted', async () => {
  const { sanitizeLogObject } = await load();
  const out = sanitizeLogObject({ api_key: SECRET, apiKey: SECRET });
  assert.equal(out.api_key, '***');
  assert.equal(out.apiKey, '***');
});

test('4 nested object redaction', async () => {
  const { sanitizeLogObject } = await load();
  const out = sanitizeLogObject({ ota: { sha256: SHA, token: SECRET } });
  assert.equal(out.ota.token, '***');
  assert.equal(out.ota.sha256, SHA);
});

test('5 array redaction', async () => {
  const { sanitizeLogValue } = await load();
  const out = sanitizeLogValue([{ token: SECRET }, { deviceId: 'D-1' }]);
  assert.equal(out[0].token, '***');
  assert.equal(out[1].deviceId, 'D-1');
});

test('6 uppercase key redacted', async () => {
  const { sanitizeLogObject } = await load();
  const out = sanitizeLogObject({ TOKEN: SECRET });
  assert.equal(out.TOKEN, '***');
});

test('7 mixed key redacted', async () => {
  const { sanitizeLogObject } = await load();
  const out = sanitizeLogObject({ access_token: SECRET, refreshToken: 'rt-abc' });
  assert.equal(out.access_token, '***');
  assert.equal(out.refreshToken, '***');
});

test('8 qr token redacted', async () => {
  const { sanitizeLogObject } = await load();
  const out = sanitizeLogObject({ qr_token: SECRET });
  assert.equal(out.qr_token, '***');
});

test('9 authorization header redacted', async () => {
  const { sanitizeLogObject, sanitizeLogString } = await load();
  const out = sanitizeLogObject({ authorization: `Bearer ${SECRET}` });
  assert.equal(out.authorization, '***');
  const text = sanitizeLogString(`authorization: Bearer ${SECRET}`);
  assert.ok(!text.includes(SECRET));
  assert.match(text, /authorization(?::|\=)\s*(Bearer\s*)?\*\*\*/i);
});

test('10 cookie redacted', async () => {
  const { sanitizeLogObject } = await load();
  const out = sanitizeLogObject({ cookie: SECRET });
  assert.equal(out.cookie, '***');
});

test('11 deviceId preserved', async () => {
  const { sanitizeLogObject } = await load();
  const out = sanitizeLogObject({ deviceId: 'AA:BB:CC:11:22:33', token: SECRET });
  assert.equal(out.deviceId, 'AA:BB:CC:11:22:33');
});

test('12 UUID preserved', async () => {
  const { sanitizeLogObject } = await load();
  const uuid = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  const out = sanitizeLogObject({
    serviceUuid: uuid,
    characteristicUuid: 'beb5483e-36e1-4688-b7f5-ea07361b26c0',
  });
  assert.equal(out.serviceUuid, uuid);
});

test('13 sha256 preserved', async () => {
  const { sanitizeLogObject } = await load();
  const out = sanitizeLogObject({ sha256: SHA, secret: SECRET });
  assert.equal(out.sha256, SHA);
  assert.equal(out.secret, '***');
});

test('14 firmware_version preserved', async () => {
  const { sanitizeLogObject } = await load();
  const out = sanitizeLogObject({ firmware_version: '1.2.3', credential: SECRET });
  assert.equal(out.firmware_version, '1.2.3');
  assert.equal(out.credential, '***');
});

test('15 JSON string sanitized', async () => {
  const { sanitizeLogString } = await load();
  const out = sanitizeLogString(JSON.stringify({ token: SECRET, deviceId: 'D-9' }));
  assert.ok(!out.includes(SECRET));
  assert.ok(out.includes('D-9'));
});

test('16 plain string sanitized', async () => {
  const { sanitizeLogString } = await load();
  const out = sanitizeLogString(`provision token=${SECRET} device=D-9`);
  assert.ok(!out.includes(SECRET));
  assert.match(out, /token=\*\*\*/);
});

test('17 createLogger debug sanitize', async () => {
  const { createLogger } = await load();
  const lines = [];
  const prev = console.debug;
  console.debug = (...args) => {
    lines.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
  };
  try {
    createLogger('test-ns').debug('debug-msg', { token: SECRET, deviceId: 'D-1' });
    const joined = lines.join('\n');
    assert.ok(!joined.includes(SECRET));
    assert.ok(joined.includes('D-1'));
  } finally {
    console.debug = prev;
  }
});

test('18 createLogger error sanitize', async () => {
  const { createLogger } = await load();
  const lines = [];
  const prev = console.error;
  console.error = (...args) => lines.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
  try {
    createLogger('test-ns').error('failed', { password: SECRET, sha256: SHA });
    const joined = lines.join('\n');
    assert.ok(!joined.includes(SECRET));
    assert.ok(joined.includes(SHA));
  } finally {
    console.error = prev;
  }
});
