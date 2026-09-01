// tests/target/pages/driver/evidence-collector.js
const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');
const ROOT = join(__dirname, '../../../..');
const OUT = join(ROOT, '.tmp/page-e4-results');

function ensureEvidenceDir() {
  mkdirSync(OUT, { recursive: true });
  return OUT;
}

function collectEvidence(payload) {
  const dir = ensureEvidenceDir();
  const {
    case_id,
    page_id,
    state_id = null,
    operation_id = null,
    status,
    actual,
    expected_reference = null,
    screenshots = [],
    console_errors = [],
    runtime_events = [],
    cleanup = null,
  } = payload;

  const record = {
    case_id,
    page_id,
    state_id,
    operation_id,
    status,
    actual,
    expected_reference,
    screenshots,
    console_errors,
    runtime_events,
    cleanup,
    collected_at: new Date().toISOString(),
  };

  const safe = String(case_id || `${page_id}-${operation_id || state_id || 'case'}`)
    .replace(/[^\w.-]+/g, '_');
  const file = join(dir, `${safe}.json`);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return { path: file, record };
}

function evidenceRoot() {
  return OUT;
}

module.exports = { ...module.exports, ensureEvidenceDir, collectEvidence, evidenceRoot };
