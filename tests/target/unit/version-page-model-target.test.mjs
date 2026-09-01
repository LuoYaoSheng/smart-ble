// tests/target/unit/version-page-model-target.test.mjs
// PAGE-VERSION-001 / TEST-P-010：getVersionPageModel 纯函数投影 Release Metadata。
// 目标：PAGE-010；REQ-056；FEAT-004/066；18 号 DATA-009。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-P-010 PAGE-010 REQ-056 FEAT-004/066 PAGE-VERSION-001';

test('目标层：getVersionPageModel 消费 Metadata 投影 PAGE-010', async () => {
  const m = await importTarget('apps/uniapp/services/version-metadata.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const fn = m.module.getVersionPageModel;
  if (typeof fn !== 'function') {
    return assert.fail(notImplemented(IDS, '目标接口 getVersionPageModel 缺失'));
  }

  const preview = fn({
    app_version: '1.0.5',
    channel: 'preview',
    overall_status: 'PREVIEW',
    release_tag: null,
    commit: null,
    built_at: null,
    artifacts: [],
    known_limitations: ['Android 正式 APK 尚未发布', 'OTA 当前 BLOCKED'],
    public_surfaces: {
      android: { name: 'UniApp Android', role: 'mainline', capability_status: 'PREVIEW', release_status: 'NOT_RELEASED' },
      wechat: { name: 'WeChat', role: 'mainline', capability_status: 'PREVIEW', release_status: 'NOT_RELEASED' },
      h5: { name: 'H5', role: 'degradation', capability_status: 'UNSUPPORTED', release_status: 'NOT_RELEASED' },
      ios: { name: 'iOS', role: 'future', capability_status: 'NOT_RELEASED', release_status: 'NOT_RELEASED' },
    },
  });

  assert.equal(preview.current.version, '1.0.5');
  assert.equal(preview.current.status, 'PREVIEW');
  assert.equal(preview.current.channel, 'preview');
  assert.equal(preview.current.has_artifacts, false);
  assert.equal(preview.current.has_release_tag, false);
  assert.equal(preview.history.releases.length, 0);
  assert.equal(preview.history.previews.length, 1);
  assert.match(preview.history.previews[0].label, /1\.0\.5 Preview/);
  assert.ok(preview.current.limitations.some((x) => /APK/.test(x)));
  assert.ok(preview.current.platforms.some((p) => p.key === 'android' && p.release_status === 'NOT_RELEASED'));
  assert.ok(preview.current.platforms.some((p) => p.key === 'h5' && p.capability_status === 'UNSUPPORTED'));

  const released = fn({
    app_version: '1.0.5',
    channel: 'release',
    overall_status: 'VERIFIED',
    release_tag: 'v1.0.5',
    commit: 'abcdef012345',
    built_at: '2026-09-01T00:00:00Z',
    artifacts: [{ kind: 'apk', version: '1.0.5', url: 'https://example.test/a.apk', sha256: 'a'.repeat(64), size: 1 }],
    known_limitations: [],
    public_surfaces: {
      android: { name: 'Android', role: 'mainline', capability_status: 'VERIFIED', release_status: 'VERIFIED' },
    },
  });
  assert.equal(released.history.releases.length, 1);
  assert.equal(released.current.has_artifacts, true);
  assert.equal(released.current.has_release_tag, true);
});
