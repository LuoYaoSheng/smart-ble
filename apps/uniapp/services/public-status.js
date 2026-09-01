/** Smart BLE 公开状态五词表与派生规则（纯 JS，无 Vue / uni 依赖）。 */

export const PUBLIC_STATUS = Object.freeze({
  VERIFIED: 'VERIFIED',
  PREVIEW: 'PREVIEW',
  BLOCKED: 'BLOCKED',
  UNSUPPORTED: 'UNSUPPORTED',
  NOT_RELEASED: 'NOT_RELEASED',
});

const SHA256_RE = /^[a-fA-F0-9]{64}$/;

/**
 * @param {{ url?: string, sha256?: string } | null | undefined} evidence
 * @returns {boolean}
 */
export function isEvidencePairValid(evidence) {
  if (!evidence || typeof evidence !== 'object') return false;
  const url = typeof evidence.url === 'string' ? evidence.url.trim() : '';
  const sha = typeof evidence.sha256 === 'string' ? evidence.sha256.trim() : '';
  return url.length > 0 && SHA256_RE.test(sha);
}

/**
 * @param {{
 *   unsupported?: boolean,
 *   blocked?: boolean,
 *   artifact_required?: boolean,
 *   has_artifact?: boolean,
 *   e5_passed?: boolean,
 *   evidence?: { url?: string, sha256?: string },
 * }} input
 * @returns {string}
 */
export function derivePublicStatus(input = {}) {
  if (input.unsupported === true) return PUBLIC_STATUS.UNSUPPORTED;
  if (input.blocked === true) return PUBLIC_STATUS.BLOCKED;

  const artifactRequired = input.artifact_required !== false;
  if (artifactRequired && input.has_artifact === false) {
    return PUBLIC_STATUS.NOT_RELEASED;
  }

  if (input.e5_passed === true && isEvidencePairValid(input.evidence)) {
    return PUBLIC_STATUS.VERIFIED;
  }

  return PUBLIC_STATUS.PREVIEW;
}

export default {
  PUBLIC_STATUS,
  derivePublicStatus,
  isEvidencePairValid,
};
