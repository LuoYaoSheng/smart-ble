//
// SmartBLE Desktop - 版本元数据投影（F027）
//
// apps/uniapp/services/version-metadata.js 的锁定镜像（E-WIN/T-WIN 共用同一字节）。
// 差异仅模块形式：uniapp 为 ESM，桌面为无构建环境的传统脚本，挂全局
// window.SmartBLEVersionMetadata；数据源为同管线产物
// config/release-metadata.generated.js（window.RELEASE_METADATA）。
//

(function (root) {
  'use strict';

  const METADATA = root.RELEASE_METADATA || {};

  function shortSha(commit) {
    if (!commit || typeof commit !== 'string') return '';
    const trimmed = commit.trim();
    return trimmed ? trimmed.slice(0, 7) : '';
  }

  function getReleaseMetadata() {
    return METADATA;
  }

  function getProductVersion() {
    return String(METADATA && METADATA.app_version || '');
  }

  /**
   * @param {{ version?: string, commit?: string | null, channel?: string }} input
   * @returns {string}
   */
  function buildVersionString(input) {
    input = input || {};
    const version = input.version != null && String(input.version).trim() !== ''
      ? String(input.version).trim()
      : '';
    if (!version) return 'dev.unknown';

    const channel = String(input.channel || 'preview').toLowerCase();
    const sha = shortSha(input.commit);

    if (channel === 'release') {
      return sha ? version + '+' + sha : version;
    }

    // preview / dev / 其他非 release
    return sha ? version + '-dev.' + sha : version + '-dev.unknown';
  }

  /**
   * @returns {Array<{ key: string, name: string, role: string, capability_status: string, release_status: string }>}
   */
  function getPlatformPublicStatuses() {
    const surfaces = (METADATA && METADATA.public_surfaces) || {};
    const order = ['android', 'wechat', 'h5', 'ios', 'flutter_tauri_native', 'peripheral', 'observer'];
    return order
      .filter(function (key) { return surfaces[key]; })
      .map(function (key) {
        const s = surfaces[key];
        return {
          key: key,
          name: s.name,
          role: s.role,
          capability_status: s.capability_status,
          release_status: s.release_status,
        };
      });
  }

  /**
   * @returns {Array<{ key: string, name: string, role: string, capability_status: string, release_status: string, reason?: string }>}
   */
  function getCapabilityPublicStatuses() {
    const surfaces = (METADATA && METADATA.public_surfaces) || {};
    return ['ota', 'smart_hid']
      .filter(function (key) { return surfaces[key]; })
      .map(function (key) {
        const s = surfaces[key];
        return {
          key: key,
          name: s.name,
          role: s.role,
          capability_status: s.capability_status,
          release_status: s.release_status,
          reason: s.reason,
        };
      });
  }

  function platformDisplayStatus(surface) {
    if (!surface) return 'NOT_RELEASED';
    if (surface.role === 'REFERENCE') return 'REFERENCE';
    return surface.capability_status || surface.release_status || 'NOT_RELEASED';
  }

  /**
   * PAGE-010 页面模型：纯函数，只消费 Release Metadata（可注入，便于测试）。
   * @param {object|null|undefined} metadata
   */
  function getVersionPageModel(metadata) {
    const meta = metadata || METADATA || {};
    const version = String(meta.app_version || '').trim();
    const channel = String(meta.channel || 'preview').toLowerCase();
    const status = String(meta.overall_status || 'PREVIEW');
    const surfaces = meta.public_surfaces || {};
    const platformOrder = ['android', 'wechat', 'h5', 'ios'];

    const platforms = platformOrder
      .filter(function (key) { return surfaces[key]; })
      .map(function (key) {
        const s = surfaces[key];
        return {
          key: key,
          name: s.name,
          role: s.role,
          capability_status: s.capability_status,
          release_status: s.release_status,
          display_status: platformDisplayStatus(s),
        };
      });

    const limitations = Array.isArray(meta.known_limitations)
      ? meta.known_limitations.map(function (x) { return String(x); })
      : [];

    const artifacts = Array.isArray(meta.artifacts) ? meta.artifacts : [];
    const hasArtifacts = artifacts.length > 0;
    const hasReleaseTag = meta.release_tag != null && String(meta.release_tag).trim() !== '';

    const releases = [];
    if (hasReleaseTag && hasArtifacts) {
      releases.push({
        version: version,
        tag: meta.release_tag,
        channel: 'release',
        status: 'VERIFIED',
        built_at: meta.built_at != null ? meta.built_at : null,
        commit: meta.commit != null ? meta.commit : null,
        artifacts: artifacts,
      });
    }

    const previews = [];
    if (version && (channel === 'preview' || channel === 'dev')) {
      previews.push({
        version: version,
        label: version + ' Preview',
        channel: channel,
        status: status,
      });
    }

    return {
      current: {
        version: version,
        status: status,
        channel: channel,
        channel_label: channel === 'release' ? 'Release' : 'Preview',
        platforms: platforms,
        limitations: limitations,
        has_release_tag: hasReleaseTag,
        has_artifacts: hasArtifacts,
        display_version: buildVersionString({
          version: version,
          commit: meta.commit,
          channel: channel,
        }),
      },
      history: {
        releases: releases,
        previews: previews,
      },
    };
  }

  root.SmartBLEVersionMetadata = {
    getReleaseMetadata: getReleaseMetadata,
    getProductVersion: getProductVersion,
    buildVersionString: buildVersionString,
    getPlatformPublicStatuses: getPlatformPublicStatuses,
    getCapabilityPublicStatuses: getCapabilityPublicStatuses,
    getVersionPageModel: getVersionPageModel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
