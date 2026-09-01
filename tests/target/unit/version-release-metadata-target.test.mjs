// tests/target/unit/version-release-metadata-target.test.mjs
// TEST-U-002 版本投影：VERSION/commit/channel 五处同源；缺失版本 → dev.unknown（S-47）。
// 目标：REQ-004/056；FEAT-004/066；PAGE-009/010；WEB-001；18 号 Release Metadata。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-002 REQ-004/056 FEAT-004/066 PAGE-009/010 WEB-001 S-47';

// ---------- 目标层 ----------
test('TEST-U-002 目标层：services/version-metadata.js', async (t) => {
  const m = await importTarget('apps/uniapp/services/version-metadata.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const fn = m.module.buildVersionString || m.module.projectVersion || m.module.formatVersion;
  if (typeof fn !== 'function') return assert.fail(notImplemented(IDS, '目标接口 buildVersionString 缺失'));

  const full = fn({ version: '1.0.0', commit: 'abc1234', channel: 'release' });
  assert.ok(String(full).includes('1.0.0'), '含版本号');
  assert.ok(String(full).includes('abc1234'), '含 commit 短哈希');
  // 缺失 → dev.unknown 语义（S-47 文案驱动）
  const missing = fn({});
  assert.match(String(missing), /dev\.unknown|unknown/i, '缺失版本 → dev.unknown');
  assert.ok(!/^0\.0\.0/.test(String(missing)), '不得编造 0.0.0');
});
