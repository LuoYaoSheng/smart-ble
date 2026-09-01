// tests/target/lib/case-meta.mjs
// Current Case 元数据：从文件头注释与可选 CASE_META 导出解析 Target IDs。

const ID_RE = /\b(TEST-[A-Z]+-\d{3}|REQ-\d{3}|FEAT-\d{3}|PAGE-\d{3}|WEB-001|FLOW-\d{3}|ERR-[A-Z]+-\d{2}|DATA-\d{3}|PROTO-\d{3}|SEC-\d{3}|NFR-\d{3}|CLAIM-\d{3}|DEC-\d{3}|EVID-\d{3}|STATE-[A-Z0-9-]+|OP-[A-Z0-9-]+)\b/g;

export function extractIdsFromText(text = '') {
  return [...new Set([...String(text).matchAll(ID_RE)].map((m) => m[1]))];
}

export function parseFileHeaderMeta(source = '') {
  const head = String(source).split('\n').slice(0, 40).join('\n');
  const ids = extractIdsFromText(head);
  const testIds = ids.filter((id) => id.startsWith('TEST-'));
  const targetIds = ids.filter((id) => !id.startsWith('TEST-'));
  return { test_ids: testIds, target_ids: targetIds, all_ids: ids };
}

export function classifyFailure(message = '') {
  const msg = String(message);
  // 仅当 Runner 显式标记 TEST_INFRA，或测试文件自身无法解析时
  if (/^TEST_INFRA:|TEST_INFRA_PARSE|Cannot use await outside of async/.test(msg)) {
    return { kind: 'TEST_INFRA_FAIL', first_breakpoint: msg.slice(0, 160) };
  }
  if (/BLOCKED_BY_TOOLCHAIN/.test(msg)) return { kind: 'BLOCKED', blocker: 'BLOCKED_BY_TOOLCHAIN', first_breakpoint: msg.slice(0, 160) };
  if (/BLOCKED_BY_TARGET_DRIVER/.test(msg)) return { kind: 'BLOCKED', blocker: 'BLOCKED_BY_TARGET_DRIVER', first_breakpoint: msg.slice(0, 160) };
  if (/NOT_IMPLEMENTED/.test(msg)) {
    return {
      kind: 'FAIL',
      first_breakpoint: msg.replace(/^NOT_IMPLEMENTED:\s*/, '').slice(0, 160),
    };
  }
  return { kind: 'FAIL', first_breakpoint: msg.slice(0, 160) };
}

export function buildCaseRecord({
  name,
  file,
  layer,
  status,
  duration_ms = 0,
  error = '',
  headerMeta = {},
}) {
  const ids = [
    ...(headerMeta.all_ids || []),
    ...extractIdsFromText(name),
  ];
  const testIds = [...new Set(ids.filter((id) => id.startsWith('TEST-')))];
  const targetIds = [...new Set(ids.filter((id) => !id.startsWith('TEST-')))];
  const classified = status === 'FAIL' ? classifyFailure(error) : { kind: status, first_breakpoint: '' };
  return {
    case_id: `${layer}:${file.split('/').pop()}:${name}`.slice(0, 200),
    test_id: testIds[0] || null,
    title: name,
    scope: 'current',
    target_ids: targetIds.length ? targetIds : (headerMeta.target_ids || []),
    layer,
    status: classified.kind === 'TEST_INFRA_FAIL' ? 'TEST_INFRA_FAIL' : status,
    expected: 'approved target behavior',
    actual: error || (status === 'PASS' ? 'matched' : ''),
    first_breakpoint: classified.first_breakpoint || null,
    source_file: file,
    duration_ms,
    blocker: classified.blocker || null,
  };
}
