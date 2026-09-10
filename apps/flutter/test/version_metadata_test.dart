import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/config/release_metadata_generated.dart';
import 'package:smart_ble/core/utils/version_metadata.dart';

/// F027 版本元数据——uniapp `services/version-metadata.js` 的 Dart 锁定镜像向量。
/// 与 apps/android `VersionMetadataTest.kt` 同向量组；
/// 注入向量与 tests/target/unit/version-page-model-target.test.mjs 对齐。
void main() {
  group('buildVersionString（版本串三态）', () {
    test('V1 版本缺失 → dev.unknown，不编造 0.0.0', () {
      expect(buildVersionString(version: null), 'dev.unknown');
      expect(buildVersionString(version: '  '), 'dev.unknown');
      expect(buildVersionString(version: ''), 'dev.unknown');
    });

    test('V2 release 渠道：v+sha，无 sha 裸版本', () {
      expect(
        buildVersionString(
            version: '1.0.5', commit: 'abcdef012345', channel: 'release'),
        '1.0.5+abcdef0',
      );
      expect(
          buildVersionString(version: '1.0.5', channel: 'release'), '1.0.5');
    });

    test('V3 preview 渠道（默认）：v-dev.sha，无 sha → v-dev.unknown', () {
      expect(
        buildVersionString(
            version: '1.0.5', commit: 'abcdef012345', channel: 'preview'),
        '1.0.5-dev.abcdef0',
      );
      expect(buildVersionString(version: '1.0.5'), '1.0.5-dev.unknown');
      expect(buildVersionString(version: '1.0.5', channel: null),
          '1.0.5-dev.unknown');
    });

    test('V4 shortSha：trim + 前 7 位', () {
      // 经 buildVersionString 间接断言（正典 shortSha 不导出）
      expect(
        buildVersionString(
            version: '1.0.0', commit: '  abc123456789  ', channel: 'release'),
        '1.0.0+abc1234',
      );
      expect(
        buildVersionString(version: '1.0.0', commit: '   ', channel: 'preview'),
        '1.0.0-dev.unknown',
      );
    });

    test('V5 渠道大小写不敏感', () {
      expect(
        buildVersionString(version: '1.0.5', commit: 'abc1234', channel: 'RELEASE'),
        '1.0.5+abc1234',
      );
    });
  });

  group('生成物镜像（release_metadata_generated.dart）', () {
    test('G1 与正典事实同源：版本/构建号/渠道/总体状态', () {
      expect(kReleaseMetadata['schema_version'], '1.0');
      expect(getProductVersion(), '1.0.5');
      expect(kReleaseMetadata['app_build_code'], 101);
      expect(getReleaseMetadata()['channel'], 'preview');
      expect(getReleaseMetadata()['overall_status'], 'PREVIEW');
    });

    test('G2 能力状态如实：ota BLOCKED 带 reason，smart_hid PREVIEW', () {
      final caps = getCapabilityPublicStatuses();
      expect(caps.map((c) => c.key), ['ota', 'smart_hid']);
      expect(caps[0].capabilityStatus, 'BLOCKED');
      expect(caps[0].reason, isNotNull);
      expect(caps[1].capabilityStatus, 'PREVIEW');
    });

    test('G3 平台七键顺序 + REFERENCE 角色', () {
      final platforms = getPlatformPublicStatuses();
      expect(platforms.map((p) => p.key).toList(), [
        'android',
        'wechat',
        'h5',
        'ios',
        'flutter_tauri_native',
        'peripheral',
        'observer',
      ]);
      final reference = platforms
          .firstWhere((p) => p.key == 'flutter_tauri_native');
      expect(reference.role, 'REFERENCE');
      expect(reference.capabilityStatus, isNull);
    });

    test('G4 P009 verFallback 基准：元数据 commit 为 null → -dev.unknown', () {
      expect(metadataVersionLabel(), '1.0.5-dev.unknown');
    });
  });

  group('getVersionPageModel（P010 投影）', () {
    test('M1 默认元数据：版本页当前值与限制列表来自生成物', () {
      final model = getVersionPageModel();
      expect(model.current.version, '1.0.5');
      expect(model.current.status, 'PREVIEW');
      expect(model.current.channel, 'preview');
      expect(model.current.channelLabel, 'Preview');
      expect(model.current.hasArtifacts, false);
      expect(model.current.hasReleaseTag, false);
      expect(model.current.limitations.length, greaterThanOrEqualTo(8));
      expect(model.current.limitations.first, 'Android 正式 APK 尚未发布');
      expect(model.current.platforms.map((p) => p.key).toList(),
          ['android', 'wechat', 'h5', 'ios']);
      expect(
        model.current.platforms
            .firstWhere((p) => p.key == 'h5')
            .capabilityStatus,
        'UNSUPPORTED',
      );
      expect(
        model.current.platforms
            .firstWhere((p) => p.key == 'android')
            .releaseStatus,
        'NOT_RELEASED',
      );
    });

    test('M2 preview 渠道 → 预览记录 1 条，正式历史空（与正典注入向量对齐）', () {
      final preview = getVersionPageModel({
        'app_version': '1.0.5',
        'channel': 'preview',
        'overall_status': 'PREVIEW',
        'release_tag': null,
        'commit': null,
        'built_at': null,
        'artifacts': [],
        'known_limitations': ['Android 正式 APK 尚未发布', 'OTA 当前 BLOCKED'],
        'public_surfaces': {
          'android': {
            'name': 'UniApp Android',
            'role': 'mainline',
            'capability_status': 'PREVIEW',
            'release_status': 'NOT_RELEASED'
          },
          'wechat': {
            'name': 'WeChat',
            'role': 'mainline',
            'capability_status': 'PREVIEW',
            'release_status': 'NOT_RELEASED'
          },
          'h5': {
            'name': 'H5',
            'role': 'degradation',
            'capability_status': 'UNSUPPORTED',
            'release_status': 'NOT_RELEASED'
          },
          'ios': {
            'name': 'iOS',
            'role': 'future',
            'capability_status': 'NOT_RELEASED',
            'release_status': 'NOT_RELEASED'
          },
        },
      });

      expect(preview.current.version, '1.0.5');
      expect(preview.current.status, 'PREVIEW');
      expect(preview.current.channel, 'preview');
      expect(preview.current.hasArtifacts, false);
      expect(preview.current.hasReleaseTag, false);
      expect(preview.history.releases, isEmpty);
      expect(preview.history.previews.length, 1);
      expect(preview.history.previews[0].label, '1.0.5 Preview');
      expect(
        preview.current.limitations.any((x) => x.contains('APK')),
        isTrue,
      );
      expect(
        preview.current.platforms.any(
            (p) => p.key == 'android' && p.releaseStatus == 'NOT_RELEASED'),
        isTrue,
      );
      expect(
        preview.current.platforms
            .any((p) => p.key == 'h5' && p.capabilityStatus == 'UNSUPPORTED'),
        isTrue,
      );
    });

    test('M3 release 渠道 + tag + artifacts → 正式历史 1 条 VERIFIED', () {
      final released = getVersionPageModel({
        'app_version': '1.0.5',
        'channel': 'release',
        'overall_status': 'VERIFIED',
        'release_tag': 'v1.0.5',
        'commit': 'abcdef012345',
        'built_at': '2026-09-01T00:00:00Z',
        'artifacts': [
          {
            'kind': 'apk',
            'version': '1.0.5',
            'url': 'https://example.test/a.apk',
            'sha256': 'a' * 64,
            'size': 1,
          }
        ],
        'known_limitations': [],
        'public_surfaces': {
          'android': {
            'name': 'Android',
            'role': 'mainline',
            'capability_status': 'VERIFIED',
            'release_status': 'VERIFIED'
          },
        },
      });

      expect(released.history.releases.length, 1);
      expect(released.history.releases[0].tag, 'v1.0.5');
      expect(released.history.releases[0].status, 'VERIFIED');
      expect(released.current.hasArtifacts, true);
      expect(released.current.hasReleaseTag, true);
      expect(released.current.channelLabel, 'Release');
      expect(released.current.displayVersion, '1.0.5+abcdef0');
      expect(released.history.previews, isEmpty);
    });

    test('M4 空元数据 → dev.unknown 路径与空列表兜底', () {
      final empty = getVersionPageModel({});
      expect(empty.current.version, '');
      expect(empty.current.displayVersion, 'dev.unknown');
      expect(empty.current.channel, 'preview');
      expect(empty.current.status, 'PREVIEW');
      expect(empty.current.limitations, isEmpty);
      expect(empty.current.platforms, isEmpty);
      expect(empty.history.releases, isEmpty);
      expect(empty.history.previews, isEmpty);
    });

    test('M5 注入不污染全局生成物', () {
      getVersionPageModel({'app_version': '9.9.9', 'channel': 'release'});
      expect(getProductVersion(), '1.0.5');
      expect(getVersionPageModel().current.version, '1.0.5');
    });
  });
}
