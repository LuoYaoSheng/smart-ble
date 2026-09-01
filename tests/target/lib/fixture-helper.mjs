// tests/target/lib/fixture-helper.mjs
// 故意错误 Fixture 辅助：从真实仓库快照一组文件 → 内存副本上植入错误 → makeVirtualCtx。
// 铁律（docs/target-tests/03 §故意错误验证）：不得通过修改真实目标文档制造失败。

import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeVirtualCtx, makeCtx } from '../../../scripts/target/lib/check-utils.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const PAGE_MDS = [
  'PAGE-001_SCAN', 'PAGE-002_HID_PROVISION', 'PAGE-003_HID_DETAIL', 'PAGE-004_HID_HISTORY',
  'PAGE-005_HID_DIAGNOSTICS', 'PAGE-006_DEVICE_DETAIL', 'PAGE-007_CONNECTED', 'PAGE-008_BROADCAST',
  'PAGE-009_ABOUT', 'PAGE-010_VERSION',
].map((n) => `docs/target-product/pages/${n}.md`);

const CORE_MDS = Array.from({ length: 24 }, (_, i) =>
  `docs/target-product/${String(i).padStart(2, '0')}_${[
    'DOCUMENT_CONTROL_AND_GLOSSARY', 'PRODUCT_VISION_SCOPE_AND_PRINCIPLES', 'PERSONAS_JOBS_AND_SCENARIOS',
    'TARGET_FEATURE_CATALOG', 'INFORMATION_ARCHITECTURE_AND_NAVIGATION', 'TARGET_PAGE_CATALOG',
    'TARGET_USER_FLOWS', 'INTERACTION_STATE_AND_ERROR_MODEL', 'PLATFORM_CAPABILITY_AND_DEGRADATION_MATRIX',
    'DATA_MODEL_STORAGE_RETENTION_AND_PRIVACY', 'RUNTIME_ARCHITECTURE_AND_RESOURCE_OWNERSHIP',
    'BLE_GATT_PROTOCOL_CONTRACT', 'ESP32_FIXTURE_CONTRACT', 'SMART_HID_PROFILE_CONTRACT',
    'OBSERVABILITY_LOGGING_AND_EVIDENCE', 'SECURITY_AND_THREAT_MODEL', 'NON_FUNCTIONAL_REQUIREMENTS',
    'ACCESSIBILITY_I18N_AND_CONTENT_GUIDE', 'VERSION_RELEASE_METADATA_AND_PUBLIC_STATUS',
    'OPEN_SOURCE_DEVELOPER_EXPERIENCE', 'OPERATIONS_SUPPORT_AND_MAINTENANCE', 'RISK_REGISTER_AND_DECISION_LOG',
    'TARGET_TRACEABILITY_MATRIX', 'DEFINITION_OF_DONE',
  ][i]}.md`);

const PROFILES = {
  contract: {
    files: [
      ...CORE_MDS, ...PAGE_MDS, 'docs/target-product/web/WEB-001_LANDING_PAGE.md',
      'contracts/target/product-target.json', 'contracts/target/pages-target.json', 'contracts/target/platform-target.json',
    ],
  },
  pages: {
    files: [
      'contracts/target/pages-target.json', 'docs/target-product/04_INFORMATION_ARCHITECTURE_AND_NAVIGATION.md',
      ...PAGE_MDS,
    ],
  },
  flows: {
    files: ['contracts/target/flows-target.json', 'contracts/target/pages-target.json', 'docs/target-product/06_TARGET_USER_FLOWS.md'],
  },
  platforms: { files: ['contracts/target/platform-target.json', 'docs/target-product/08_PLATFORM_CAPABILITY_AND_DEGRADATION_MATRIX.md'] },
  protocols: {
    files: [
      'contracts/target/ble-fixture-target.json', 'contracts/target/smart-hid-target.json',
      'docs/target-product/12_ESP32_FIXTURE_CONTRACT.md', 'docs/target-product/13_SMART_HID_PROFILE_CONTRACT.md',
      'core/protocols/hid-provisioning-protocol.ts',
    ],
  },
  traceability: {
    files: [
      'contracts/target/test-traceability.json', 'contracts/target/product-target.json',
      'contracts/target/pages-target.json', 'contracts/target/flows-target.json', 'contracts/target/landing-target.json',
    ],
  },
  landing: {
    files: [
      'contracts/target/landing-target.json', 'contracts/target/test-traceability.json',
      'docs/target-product/18_VERSION_RELEASE_METADATA_AND_PUBLIC_STATUS.md',
      'docs/target-product/web/WEB-001_LANDING_PAGE.md', 'docs/index.md',
    ],
  },
};

/** 快照真实文件为 {path: text} */
export function snapshot(profile) {
  const out = {};
  for (const f of PROFILES[profile].files) {
    try {
      out[f] = readFileSync(join(ROOT, f), 'utf8');
    } catch {
      /* 快照缺失文件时保持缺失，checker 会按存在性收敛 */
    }
  }
  return out;
}

/** 快照 + JSON 变异：mutator(parsed, path) 就地修改 */
export function mutateJson(files, path, mutator) {
  const data = JSON.parse(files[path]);
  mutator(data);
  files[path] = JSON.stringify(data, null, 2) + '\n';
  return files;
}

export { makeVirtualCtx, makeCtx };
