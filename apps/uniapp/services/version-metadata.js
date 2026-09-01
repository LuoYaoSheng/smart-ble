/** Smart BLE 版本与 Release Metadata 投影（纯 JS；只读生成物，无 fs / 网络）。 */

import RELEASE_METADATA from '../config/release-metadata.generated.js';

function shortSha(commit) {
  if (!commit || typeof commit !== 'string') return '';
  const trimmed = commit.trim();
  return trimmed ? trimmed.slice(0, 7) : '';
}

/**
 * @returns {typeof RELEASE_METADATA}
 */
export function getReleaseMetadata() {
  return RELEASE_METADATA;
}

/** @returns {string} */
export function getProductVersion() {
  return String(RELEASE_METADATA?.app_version || '');
}

/**
 * @param {{ version?: string, commit?: string | null, channel?: string }} input
 * @returns {string}
 */
export function buildVersionString(input = {}) {
  const version = input.version != null && String(input.version).trim() !== ''
    ? String(input.version).trim()
    : '';
  if (!version) return 'dev.unknown';

  const channel = String(input.channel || 'preview').toLowerCase();
  const sha = shortSha(input.commit);

  if (channel === 'release') {
    return sha ? `${version}+${sha}` : version;
  }

  // preview / dev / 其他非 release
  return sha ? `${version}-dev.${sha}` : `${version}-dev.unknown`;
}

/**
 * @returns {Array<{ key: string, name: string, role: string, capability_status: string | null, release_status: string }>}
 */
export function getPlatformPublicStatuses() {
  const surfaces = RELEASE_METADATA?.public_surfaces || {};
  const order = ['android', 'wechat', 'h5', 'ios', 'flutter_tauri_native', 'peripheral', 'observer'];
  return order
    .filter((key) => surfaces[key])
    .map((key) => {
      const s = surfaces[key];
      return {
        key,
        name: s.name,
        role: s.role,
        capability_status: s.capability_status,
        release_status: s.release_status,
      };
    });
}

/**
 * @returns {Array<{ key: string, name: string, role: string, capability_status: string | null, release_status: string, reason?: string }>}
 */
export function getCapabilityPublicStatuses() {
  const surfaces = RELEASE_METADATA?.public_surfaces || {};
  return ['ota', 'smart_hid']
    .filter((key) => surfaces[key])
    .map((key) => {
      const s = surfaces[key];
      return {
        key,
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
 * @param {typeof RELEASE_METADATA | null | undefined} metadata
 * @returns {{
 *   current: {
 *     version: string,
 *     status: string,
 *     channel: string,
 *     channel_label: string,
 *     platforms: Array<object>,
 *     limitations: string[],
 *     has_release_tag: boolean,
 *     has_artifacts: boolean,
 *     display_version: string,
 *   },
 *   history: { releases: Array<object>, previews: Array<object> },
 * }}
 */
export function getVersionPageModel(metadata) {
  const meta = metadata || RELEASE_METADATA || {};
  const version = String(meta.app_version || '').trim();
  const channel = String(meta.channel || 'preview').toLowerCase();
  const status = String(meta.overall_status || 'PREVIEW');
  const surfaces = meta.public_surfaces || {};
  const platformOrder = ['android', 'wechat', 'h5', 'ios'];

  const platforms = platformOrder
    .filter((key) => surfaces[key])
    .map((key) => {
      const s = surfaces[key];
      return {
        key,
        name: s.name,
        role: s.role,
        capability_status: s.capability_status,
        release_status: s.release_status,
        display_status: platformDisplayStatus(s),
      };
    });

  const limitations = Array.isArray(meta.known_limitations)
    ? meta.known_limitations.map((x) => String(x))
    : [];

  const artifacts = Array.isArray(meta.artifacts) ? meta.artifacts : [];
  const hasArtifacts = artifacts.length > 0;
  const hasReleaseTag = meta.release_tag != null && String(meta.release_tag).trim() !== '';

  /** @type {Array<object>} */
  const releases = [];
  if (hasReleaseTag && hasArtifacts) {
    releases.push({
      version,
      tag: meta.release_tag,
      channel: 'release',
      status: 'VERIFIED',
      built_at: meta.built_at ?? null,
      commit: meta.commit ?? null,
      artifacts,
    });
  }

  /** @type {Array<object>} */
  const previews = [];
  if (version && (channel === 'preview' || channel === 'dev')) {
    previews.push({
      version,
      label: `${version} Preview`,
      channel,
      status,
    });
  }

  return {
    current: {
      version,
      status,
      channel,
      channel_label: channel === 'release' ? 'Release' : 'Preview',
      platforms,
      limitations,
      has_release_tag: hasReleaseTag,
      has_artifacts: hasArtifacts,
      display_version: buildVersionString({
        version,
        commit: meta.commit,
        channel,
      }),
    },
    history: {
      releases,
      previews,
    },
  };
}

export default {
  getReleaseMetadata,
  getProductVersion,
  buildVersionString,
  getPlatformPublicStatuses,
  getCapabilityPublicStatuses,
  getVersionPageModel,
};
