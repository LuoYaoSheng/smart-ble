/// F027 版本元数据投影（PRD §5 F027 · R26 · DATA_MODEL「版本投影」）。
///
/// uniapp `services/version-metadata.js` 的 Dart 锁定镜像：只读
/// `core/config/release_metadata_generated.dart`（同一确定性管线产物），
/// 无 IO / 网络。P009 关于页版本三态 = 运行时渠道成功 → 覆盖；失败 →
/// 回退 Release Metadata 投影（verFallback）；元数据版本亦空 → `dev.unknown`。
/// P010 版本记录页 = 本投影的纯函数模型（getVersionPageModel），不手写版本事实。
library;

import '../config/release_metadata_generated.dart';

String _shortSha(String? commit) {
  if (commit == null || commit.trim().isEmpty) return '';
  return commit.trim().substring(0, 7);
}

String _str(dynamic v) => v == null ? '' : v.toString().trim();

/// 仓库当前 Release Metadata（生成物，键序与 uniapp 产物一致）。
Map<String, dynamic> getReleaseMetadata() => kReleaseMetadata;

/// 元数据版本真值（根 VERSION 单源经生成管线投出）。
String getProductVersion() => _str(kReleaseMetadata['app_version']);

/// 版本串三态（正典 buildVersionString）：
/// 版本空 → `dev.unknown`；release 渠道 → `v+sha`（无 sha 裸版本）；
/// 其余渠道 → `v-dev.sha`（无 sha → `v-dev.unknown`）。
String buildVersionString({String? version, String? commit, String? channel}) {
  final v = _str(version);
  if (v.isEmpty) return 'dev.unknown';

  final rawCh = channel ?? '';
  final ch = (rawCh.isEmpty ? 'preview' : rawCh).toLowerCase();
  final sha = _shortSha(commit);

  if (ch == 'release') {
    return sha.isEmpty ? v : '$v+$sha';
  }
  return sha.isEmpty ? '$v-dev.unknown' : '$v-dev.$sha';
}

/// P009 运行时渠道失败时的回退基准（verFallback）。
String metadataVersionLabel() => buildVersionString(
      version: getProductVersion(),
      commit: _strOrNull(kReleaseMetadata['commit']),
      channel: _strOrNull(kReleaseMetadata['channel']),
    );

String? _strOrNull(dynamic v) => v?.toString();

class PlatformPublicStatus {
  const PlatformPublicStatus({
    required this.key,
    required this.name,
    required this.role,
    required this.capabilityStatus,
    required this.releaseStatus,
  });

  final String key;
  final String name;
  final String role;
  final String? capabilityStatus;
  final String releaseStatus;
}

class CapabilityPublicStatus {
  const CapabilityPublicStatus({
    required this.key,
    required this.name,
    required this.role,
    required this.capabilityStatus,
    required this.releaseStatus,
    this.reason,
  });

  final String key;
  final String name;
  final String role;
  final String? capabilityStatus;
  final String releaseStatus;
  final String? reason;
}

/// 平台公开状态（P009 推广区外链卡等消费；顺序=正典 order 七键）。
List<PlatformPublicStatus> getPlatformPublicStatuses() {
  const order = [
    'android',
    'h5',
    'ios',
    'flutter_tauri_native',
    'peripheral',
    'observer',
  ];
  final surfaces = _surfaces();
  return [
    for (final key in order)
      if (surfaces[key] != null)
        PlatformPublicStatus(
          key: key,
          name: _str(surfaces[key]!['name']),
          role: _str(surfaces[key]!['role']),
          capabilityStatus: _strOrNull(surfaces[key]!['capability_status']),
          releaseStatus: _str(surfaces[key]!['release_status']),
        ),
  ];
}

/// 能力公开状态（ota BLOCKED / smart_hid PREVIEW 等如实展示）。
List<CapabilityPublicStatus> getCapabilityPublicStatuses() {
  final surfaces = _surfaces();
  return [
    for (final key in ['ota', 'smart_hid'])
      if (surfaces[key] != null)
        CapabilityPublicStatus(
          key: key,
          name: _str(surfaces[key]!['name']),
          role: _str(surfaces[key]!['role']),
          capabilityStatus: _strOrNull(surfaces[key]!['capability_status']),
          releaseStatus: _str(surfaces[key]!['release_status']),
          reason: _strOrNull(surfaces[key]!['reason']),
        ),
  ];
}

Map<String, dynamic> _surfaces() {
  final s = kReleaseMetadata['public_surfaces'];
  if (s is Map<String, dynamic>) return s;
  return const <String, dynamic>{};
}

/// 正典 platformDisplayStatus：REFERENCE 是角色直接展示；否则
/// capability → release → NOT_RELEASED 兜底。
String platformDisplayStatus(Map<String, dynamic> surface) {
  if (surface['role'] == 'REFERENCE') return 'REFERENCE';
  return _str(surface['capability_status']).isNotEmpty
      ? _str(surface['capability_status'])
      : _str(surface['release_status']).isNotEmpty
          ? _str(surface['release_status'])
          : 'NOT_RELEASED';
}

class ReleaseRecord {
  const ReleaseRecord({
    required this.version,
    required this.tag,
    required this.channel,
    required this.status,
    this.builtAt,
    this.commit,
    required this.artifacts,
  });

  final String version;
  final String tag;
  final String channel;
  final String status;
  final String? builtAt;
  final String? commit;
  final List<dynamic> artifacts;
}

class PreviewRecord {
  const PreviewRecord({
    required this.version,
    required this.label,
    required this.channel,
    required this.status,
  });

  final String version;
  final String label;
  final String channel;
  final String status;
}

class VersionPageCurrent {
  const VersionPageCurrent({
    required this.version,
    required this.status,
    required this.channel,
    required this.channelLabel,
    required this.platforms,
    required this.limitations,
    required this.hasReleaseTag,
    required this.hasArtifacts,
    required this.displayVersion,
  });

  final String version;
  final String status;
  final String channel;
  final String channelLabel;
  final List<PlatformPublicStatus> platforms;
  final List<String> limitations;
  final bool hasReleaseTag;
  final bool hasArtifacts;
  final String displayVersion;
}

class VersionPageHistory {
  const VersionPageHistory({required this.releases, required this.previews});

  final List<ReleaseRecord> releases;
  final List<PreviewRecord> previews;
}

class VersionPageModel {
  const VersionPageModel({required this.current, required this.history});

  final VersionPageCurrent current;
  final VersionPageHistory history;
}

/// P010 页面模型：纯函数，只消费 Release Metadata（可注入，便于测试）。
VersionPageModel getVersionPageModel([Map<String, dynamic>? metadata]) {
  final meta = metadata ?? kReleaseMetadata;
  final version = _str(meta['app_version']);
  final rawChannel = meta['channel']?.toString() ?? '';
  final channel = (rawChannel.isEmpty ? 'preview' : rawChannel).toLowerCase();
  final rawStatus = meta['overall_status']?.toString() ?? '';
  final status = rawStatus.isEmpty ? 'PREVIEW' : rawStatus;
  final surfaces = _surfacesOf(meta);

  final platforms = [
    for (final key in ['android', 'h5', 'ios'])
      if (surfaces[key] != null)
        PlatformPublicStatus(
          key: key,
          name: _str(surfaces[key]!['name']),
          role: _str(surfaces[key]!['role']),
          capabilityStatus: _strOrNull(surfaces[key]!['capability_status']),
          releaseStatus: _str(surfaces[key]!['release_status']),
        ),
  ];

  final rawLimitations = meta['known_limitations'];
  final limitations = rawLimitations is List
      ? [for (final x in rawLimitations) x.toString()]
      : <String>[];

  final rawArtifacts = meta['artifacts'];
  final artifacts = rawArtifacts is List ? rawArtifacts : const <dynamic>[];
  final hasArtifacts = artifacts.isNotEmpty;
  final releaseTag = _str(meta['release_tag']);
  final hasReleaseTag = releaseTag.isNotEmpty;

  final releases = <ReleaseRecord>[];
  if (hasReleaseTag && hasArtifacts) {
    releases.add(ReleaseRecord(
      version: version,
      tag: releaseTag,
      channel: 'release',
      status: 'VERIFIED',
      builtAt: _strOrNull(meta['built_at']),
      commit: _strOrNull(meta['commit']),
      artifacts: artifacts,
    ));
  }

  final previews = <PreviewRecord>[];
  if (version.isNotEmpty && (channel == 'preview' || channel == 'dev')) {
    previews.add(PreviewRecord(
      version: version,
      label: '$version Preview',
      channel: channel,
      status: status,
    ));
  }

  return VersionPageModel(
    current: VersionPageCurrent(
      version: version,
      status: status,
      channel: channel,
      channelLabel: channel == 'release' ? 'Release' : 'Preview',
      platforms: platforms,
      limitations: limitations,
      hasReleaseTag: hasReleaseTag,
      hasArtifacts: hasArtifacts,
      displayVersion: buildVersionString(
        version: version,
        commit: _strOrNull(meta['commit']),
        channel: channel,
      ),
    ),
    history: VersionPageHistory(releases: releases, previews: previews),
  );
}

Map<String, dynamic> _surfacesOf(Map<String, dynamic> meta) {
  final s = meta['public_surfaces'];
  if (s is Map<String, dynamic>) return s;
  return const <String, dynamic>{};
}
