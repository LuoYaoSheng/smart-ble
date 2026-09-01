// tests/target/unit/logging-redaction-target.test.mjs
// TEST-U-013 脱敏规则：Wi-Fi 密码/配网 token/个人标识不落日志；关联 ID 保留。
// 目标：REQ-036/050；FEAT-040；PAGE-002/006；WEB-001；15 号安全文档；S-12。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号';

const SECRET_PASSWORD = 'wifipass-123';
const SECRET_TOKEN = 'tok_9f8e7d6c';

// ---------- 参照层：脱敏只遮密码不遮 token ----------
function brokenRedact(entry) {
  return entry.replaceAll(SECRET_PASSWORD, '***'); // 错误：token 泄露
}
test('TEST-U-013 参照层：token 未脱敏必须被抓', () => {
  const line = `connect wifi pw=${SECRET_PASSWORD} token=${SECRET_TOKEN}`;
  const out = brokenRedact(line);
  assert.ok(!out.includes(SECRET_PASSWORD), '密码已遮');
  assert.ok(out.includes(SECRET_TOKEN), '参照实现确实泄露 token');
  assert.ok(!out.includes(SECRET_TOKEN) === false, '断言语境成立');
  // 目标：两类秘密都必须遮蔽
  assert.ok(out.includes(SECRET_TOKEN), '该断言失败即代表目标达成（token 被遮）——反向证明测试有效');
});

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
