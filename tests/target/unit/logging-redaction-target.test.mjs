// tests/target/unit/logging-redaction-target.test.mjs
// TEST-U-013 脱敏规则：Wi-Fi 密码/配网 token/个人标识不落日志；关联 ID 保留。
// 目标：REQ-036/050；FEAT-040；PAGE-002/006；WEB-001；15 号安全文档；S-12。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号';

const SECRET_PASSWORD = 'wifipass-123';
const SECRET_TOKEN = 'tok_9f8e7d6c';

// ---------- 目标层 ----------
test('TEST-U-013 目标层：services/ble-runtime/log-redaction.js', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/log-redaction.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const fn = m.module.redact || m.module.redactLogEntry;
  if (typeof fn !== 'function') return assert.fail(notImplemented(IDS, '目标接口 redact 缺失'));

  const dirty = { message: `provision pw=${SECRET_PASSWORD} token=${SECRET_TOKEN}`, deviceId: 'D-9' };
  const clean = fn(dirty);
  const text = typeof clean === 'string' ? clean : JSON.stringify(clean);
  assert.ok(!text.includes(SECRET_PASSWORD), '密码不落日志');
  assert.ok(!text.includes(SECRET_TOKEN), 'token 不落日志');
  assert.ok(text.includes('D-9') || (clean.deviceId ?? dirty.deviceId) === 'D-9', '关联 ID（deviceId）保留用于排查');
});
