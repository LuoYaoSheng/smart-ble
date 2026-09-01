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

export default {
  getReleaseMetadata,
  getProductVersion,
  buildVersionString,
  getPlatformPublicStatuses,
  getCapabilityPublicStatuses,
};
