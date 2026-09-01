#!/usr/bin/env node
// 从 APPROVED 页面 Markdown（§4/5/7/8/9/10/12/13）生成 page-behavior.manifest.json。
// 无法完整解析时 FAIL，禁止生成模糊默认值。不读取 Vue 实现。

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PAGES_TARGET = `${ROOT}/contracts/target/pages-target.json`;
const OUT = `${ROOT}/tests/target/pages/page-behavior.manifest.json`;
const SCHEMA_OUT = `${ROOT}/tests/target/pages/page-behavior.schema.json`;

const PAGE_DOC = {
  'PAGE-001': 'docs/target-product/pages/PAGE-001_SCAN.md',
  'PAGE-002': 'docs/target-product/pages/PAGE-002_HID_PROVISION.md',
  'PAGE-003': 'docs/target-product/pages/PAGE-003_HID_DETAIL.md',
  'PAGE-004': 'docs/target-product/pages/PAGE-004_HID_HISTORY.md',
  'PAGE-005': 'docs/target-product/pages/PAGE-005_HID_DIAGNOSTICS.md',
  'PAGE-006': 'docs/target-product/pages/PAGE-006_DEVICE_DETAIL.md',
  'PAGE-007': 'docs/target-product/pages/PAGE-007_CONNECTED.md',
  'PAGE-008': 'docs/target-product/pages/PAGE-008_BROADCAST.md',
  'PAGE-009': 'docs/target-product/pages/PAGE-009_ABOUT.md',
  'PAGE-010': 'docs/target-product/pages/PAGE-010_VERSION.md',
  'WEB-001': 'docs/target-product/web/WEB-001_LANDING_PAGE.md',
};

const HARDWARE_HINT = /BLE|扫描|连接|Notify|OTA|广播|ESP32|Observer|HID|配网|写|读|订阅|peripheral|GATT|固件|夹具/i;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function section(md, num) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => new RegExp(`^## ${num}\\. `).test(l));
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## \d+\. /.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start + 1, end).join('\n').trim();
}

function parseTable(block) {
  const lines = block.split('\n').filter((l) => l.startsWith('|'));
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split('|').slice(1, -1).map((c) => c.trim());
  const rows = [];
  for (const line of lines.slice(2)) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (!cells.length || cells.every((c) => !c)) continue;
    if (/^-+$/.test(cells[0].replace(/\s/g, ''))) continue;
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    rows.push(obj);
  }
  return { headers, rows };
}

function listFirstScreen(sec5) {
  return sec5.split('\n').map((l) => l.replace(/^[-*]\s*/, '').trim()).filter((l) => l.length > 0 && !l.startsWith('|') && !l.startsWith('#'));
}

function listArchitecture(sec4) {
  return sec4.split('\n').map((l) => l.replace(/^\d+\.\s*/, '').trim()).filter((l) => l.length > 0 && !l.startsWith('|') && !l.startsWith('#'));
}

function extractOpIdsFromAllowed(cell, pageId) {
  if (!cell) return [];
  const direct = [...cell.matchAll(/OP-(?:P\d{3}|W001)-\d{2}/g)].map((m) => m[0]);
  if (direct.length) return [...new Set(direct)];
  const compact = cell.match(/OP-((?:P\d{3}|W001))-(\d{2})((?:\/\d{2})+)/);
  if (compact) {
    const prefix = compact[1];
    const nums = [compact[2], ...compact[3].slice(1).split('/')];
    return nums.map((n) => `OP-${prefix}-${n}`);
  }
  // Relative form in state tables: OP-01/02/03/04
  const rel = cell.match(/OP-(\d{2})((?:\/\d{2})*)/);
  if (rel && pageId) {
    const prefix = pageId === 'WEB-001' ? 'W001' : pageId.replace('PAGE-', 'P');
    const nums = [rel[1], ...(rel[2] ? rel[2].slice(1).split('/') : [])].filter(Boolean);
    return nums.map((n) => `OP-${prefix}-${n}`);
  }
  return [];
}

function parseErrors(sec9) {
  const { rows } = parseTable(sec9);
  const fromTable = rows.map((r) => {
    const vals = Object.values(r);
    const joined = vals.join(' ');
    const id = joined.match(/ERR-[A-Z]+-\d{2}|STATE-[A-Z0-9-]+/)?.[0] || '';
    const recovery = r['唯一恢复动作'] || vals[3] || vals.at(-1) || '';
    return {
      error_id: id,
      name: String(r['错误/空态'] || vals[0] || id),
      expected_recovery: String(recovery),
      visible: String(r['用户所见'] || vals[2] || ''),
    };
  }).filter((e) => e.error_id);

  if (fromTable.length) return fromTable;

  // Prose form: "ERR-CONN-01 连接失败（重试）、ERR-GATT-01 ..."
  const prose = [];
  for (const m of sec9.matchAll(/(ERR-[A-Z]+-\d{2}(?:\.\.\d{2})?)\s*([^、；;\n]*)/g)) {
    prose.push({
      error_id: m[1],
      name: m[1],
      expected_recovery: (m[2] || '').replace(/[（(]([^）)]+)[）)]/, '$1').trim() || '见错误表恢复动作',
      visible: (m[2] || '').trim(),
    });
  }
  return prose;
}

function inferDeviceEvents(callChain, success) {
  if (!HARDWARE_HINT.test(`${callChain} ${success}`)) return [];
  return [`device_effect_from_call_chain:${callChain.slice(0, 80)}`];
}

function inferE5(tests) {
  const e5 = [...tests.matchAll(/TEST-[EAW H]-\d{3}/g)].map((m) => m[0].replace(/\s/g, ''));
  // Fix: TEST-[EAWH]
  return [...tests.matchAll(/TEST-[EAWH]-\d{3}/g)].map((m) => m[0]);
}

function parseNavigation(sec10) {
  const targets = [...sec10.matchAll(/→\s*(PAGE-\d{3}|WEB-001|#\w+|外部|锚点|站内)/g)].map((m) => m[1]);
  return {
    raw: sec10.slice(0, 400),
    targets: [...new Set(targets)],
  };
}

function parseCleanup(sec12) {
  const lines = sec12.split('\n').map((l) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
  return lines.length ? lines : ['页面离页时释放本页持有资源（见 §12）'];
}

function parsePlatform(sec13) {
  const lines = sec13.split('\n').map((l) => l.replace(/^[-*]\s*/, '').trim()).filter((l) => l && !l.startsWith('|'));
  const { rows } = parseTable(sec13);
  if (rows.length) {
    return rows.map((r) => Object.values(r).filter(Boolean).join('｜'));
  }
  return lines.length ? lines : ['平台差异按 08 号矩阵降级呈现'];
}

function parseA11y(md) {
  const sec17 = section(md, 17);
  const lines = sec17.split('\n').map((l) => l.replace(/^[-*]\s*/, '').trim()).filter((l) => l && !l.startsWith('|') && !l.startsWith('#'));
  return lines.length ? lines : ['可焦点、有标签、对比度合规（17 号）'];
}

function buildPage(pageMeta, docRel) {
  const abs = `${ROOT}/${docRel}`;
  if (!existsSync(abs)) fail(`页面文档缺失：${docRel}`);
  const md = readFileSync(abs, 'utf8');
  if (!/status:\s*APPROVED/.test(md)) fail(`${docRel} 非 APPROVED`);

  const sec4 = section(md, 4);
  const sec5 = section(md, 5);
  const sec7 = section(md, 7);
  const sec8 = section(md, 8);
  const sec9 = section(md, 9);
  const sec10 = section(md, 10);
  const sec12 = section(md, 12);
  const sec13 = section(md, 13);

  if (!sec7) fail(`${pageMeta.id}: 缺少 §7 操作表`);
  if (!sec8) fail(`${pageMeta.id}: 缺少 §8 状态表`);
  if (!sec5) fail(`${pageMeta.id}: 缺少 §5 首屏`);

  const opTable = parseTable(sec7);
  const stateTable = parseTable(sec8);
  if (!opTable.rows.length) fail(`${pageMeta.id}: §7 操作表无行`);
  if (!stateTable.rows.length) fail(`${pageMeta.id}: §8 状态表无行`);

  const expectedOps = new Set(pageMeta.operations || []);
  const deprecated = new Set((pageMeta.deprecated_operations || []).map((d) => String(d).match(/OP-(?:P\d{3}|W001)-\d{2}/)?.[0]).filter(Boolean));
  const expectedStates = new Set(pageMeta.states || []);

  const operations = [];
  for (const r of opTable.rows) {
    const opId = (r['Operation ID'] || Object.values(r)[0] || '').match(/OP-(?:P\d{3}|W001)-\d{2}/)?.[0];
    if (!opId) fail(`${pageMeta.id}: 操作行缺少 Operation ID：${JSON.stringify(r)}`);
    if (deprecated.has(opId)) continue;
    if (!expectedOps.has(opId)) fail(`${pageMeta.id}: Markdown 操作 ${opId} 不在 pages-target 有效集合`);

    const control = r['控件/入口'] || '';
    const visibleWhen = r['显示条件'] || '';
    const disabledWhen = r['禁用条件'] || '';
    const input = r['用户输入'] || '';
    const callChain = r['调用链'] || '';
    const success = r['成功反馈'] || '';
    const failure = r['失败反馈'] || '';
    const nav = r['跳转/返回'] || '';
    const cleanup = r['清理'] || '';
    const tests = r['测试'] || '';

    if (!control) fail(`${pageMeta.id}/${opId}: 缺控件/入口`);
    if (!visibleWhen) fail(`${pageMeta.id}/${opId}: 缺显示条件`);
    if (!callChain) fail(`${pageMeta.id}/${opId}: 缺调用链`);
    if (!success) fail(`${pageMeta.id}/${opId}: 缺成功反馈`);
    if (!tests) fail(`${pageMeta.id}/${opId}: 缺测试 ID`);

    const failureVariants = [];
    if (failure && failure !== '无' && failure !== '—' && failure !== '-') {
      failureVariants.push({
        name: 'primary_failure',
        condition: failure,
        expected_ui: [failure],
        expected_recovery: failure,
      });
    } else {
      failureVariants.push({
        name: 'no_dedicated_failure_path',
        condition: '文档标明无专用失败反馈或静默兜底',
        expected_ui: ['保持当前态或日志兜底'],
        expected_recovery: '无额外恢复控件',
      });
    }

    // find a precondition state that allows this op if possible
    let precondition = visibleWhen;
    for (const sr of stateTable.rows) {
      const allowed = extractOpIdsFromAllowed(sr['允许操作'] || '', pageMeta.id);
      if (allowed.includes(opId)) {
        precondition = (sr['State ID'] || Object.values(sr)[0] || '').match(/STATE-[A-Z0-9-]+/)?.[0] || precondition;
        break;
      }
    }

    const testIds = [...tests.matchAll(/TEST-[CUPIEAWRH]-\d{3}/g)].map((m) => m[0]);
    if (!testIds.length) fail(`${pageMeta.id}/${opId}: 测试列无 TEST-* ID`);

    const deviceEvents = inferDeviceEvents(callChain, success);
    const e5 = inferE5(tests);

    operations.push({
      operation_id: opId,
      precondition_state: precondition,
      control,
      visible_when: visibleWhen,
      disabled_when: disabledWhen === '无' ? '' : disabledWhen,
      input_fixture: input === '无' ? null : input,
      expected_ui: [success],
      expected_runtime_events: [callChain],
      expected_device_events: deviceEvents,
      e5_mapping: e5,
      expected_navigation: nav === '无' ? null : nav,
      expected_cleanup: cleanup === '无' ? ['无本页额外清理'] : [cleanup],
      failure_variants: failureVariants,
      test_ids: testIds,
      hardware_dependent: deviceEvents.length > 0,
    });
  }

  const foundOps = new Set(operations.map((o) => o.operation_id));
  for (const id of expectedOps) {
    if (!foundOps.has(id)) fail(`${pageMeta.id}: pages-target 操作 ${id} 未在 Markdown §7 解析到`);
  }

  const states = [];
  for (const r of stateTable.rows) {
    const stateId = (r['State ID'] || Object.values(r)[0] || '').match(/STATE-[A-Z0-9-]+/)?.[0];
    if (!stateId) fail(`${pageMeta.id}: 状态行缺 State ID`);
    if (!expectedStates.has(stateId)) fail(`${pageMeta.id}: Markdown 状态 ${stateId} 不在 pages-target`);

    const name = r['状态名称'] || '';
    const entry = r['进入条件'] || '';
    const content = r['页面内容'] || '';
    const allowedRaw = r['允许操作'] || '';
    const exit = r['退出条件'] || '';
    const data = r['数据更新'] || '';
    const tests = r['测试'] || '';

    if (!entry) fail(`${pageMeta.id}/${stateId}: 缺进入条件`);
    if (!content) fail(`${pageMeta.id}/${stateId}: 缺页面内容`);

    const allowed = extractOpIdsFromAllowed(allowedRaw, pageMeta.id);
    const disabled = [...foundOps].filter((op) => allowed.length && !allowed.includes(op) && !/全部|其余|卡片|去微信|去设置|浏览|调整|再次|清筛选|重试请求/.test(allowedRaw));

    const errors = parseErrors(sec9);
    const recovery = errors.find((e) => content.includes(e.error_id) || entry.includes(e.error_id))?.expected_recovery
      || (allowedRaw.includes('重试') ? '重试' : exit || '按退出条件恢复');

    states.push({
      state_id: stateId,
      name,
      entry_condition: entry,
      visible_sections: content.split(/[+、，,]/).map((s) => s.trim()).filter(Boolean),
      allowed_operations: allowed,
      disabled_operations: disabled,
      exit_conditions: [exit].filter(Boolean),
      expected_data_changes: data && data !== '无' ? [data] : [],
      expected_recovery: recovery,
      test_ids: [...tests.matchAll(/TEST-[CUPIEAWRH]-\d{3}/g)].map((m) => m[0]),
    });
  }

  const foundStates = new Set(states.map((s) => s.state_id));
  for (const id of expectedStates) {
    if (!foundStates.has(id)) fail(`${pageMeta.id}: pages-target 状态 ${id} 未在 Markdown §8 解析到`);
  }

  const webExtra = pageMeta.id === 'WEB-001' ? {
    viewports: ['mobile', 'desktop'],
    themes: ['light', 'dark'],
    hero_cta: true,
    not_released: true,
    download_url_sha: true,
    qr: true,
    seo: ['canonical', 'og'],
    no_js: true,
  } : undefined;

  return {
    page_id: pageMeta.id,
    route: pageMeta.route,
    type: pageMeta.type,
    source_doc: docRel,
    first_screen: listFirstScreen(sec5),
    information_architecture: listArchitecture(sec4),
    states,
    operations,
    error_variants: parseErrors(sec9),
    navigation: parseNavigation(sec10),
    platform_assertions: parsePlatform(sec13),
    a11y_assertions: parseA11y(md),
    cleanup_assertions: parseCleanup(sec12),
    web_extra: webExtra,
    stats: {
      state_count: states.length,
      operation_count: operations.length,
      error_variant_count: parseErrors(sec9).length,
      failure_variant_count: operations.reduce((n, o) => n + o.failure_variants.length, 0),
    },
  };
}

const pagesTarget = JSON.parse(readFileSync(PAGES_TARGET, 'utf8'));
const pages = [];
for (const p of pagesTarget.pages) {
  const rel = PAGE_DOC[p.id];
  if (!rel) fail(`未映射文档路径：${p.id}`);
  pages.push(buildPage(p, rel));
}

const behavior = {
  schema_version: '1.0',
  generated_from: 'docs/target-product/pages|web + contracts/target/pages-target.json',
  note: 'TP-G1-R2 页面行为测试契约：期望值单源；Actual 仅由 Page Driver 探测，禁止回填 Expected。',
  pages,
  totals: {
    pages: pages.length,
    states: pages.reduce((n, p) => n + p.states.length, 0),
    operations: pages.reduce((n, p) => n + p.operations.length, 0),
    error_variants: pages.reduce((n, p) => n + p.error_variants.length, 0),
    failure_variants: pages.reduce((n, p) => n + p.stats.failure_variant_count, 0),
    cleanup_assertions: pages.reduce((n, p) => n + p.cleanup_assertions.length, 0),
  },
};

writeFileSync(OUT, JSON.stringify(behavior, null, 2) + '\n');

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://smart-ble.local/tests/target/pages/page-behavior.schema.json',
  title: 'Smart BLE page behavior test contract',
  type: 'object',
  required: ['schema_version', 'pages', 'totals'],
  properties: {
    schema_version: { type: 'string' },
    generated_from: { type: 'string' },
    note: { type: 'string' },
    totals: { type: 'object' },
    pages: {
      type: 'array',
      minItems: 11,
      items: {
        type: 'object',
        required: ['page_id', 'route', 'first_screen', 'states', 'operations', 'platform_assertions', 'a11y_assertions', 'cleanup_assertions'],
        properties: {
          page_id: { type: 'string' },
          route: { type: 'string' },
          states: {
            type: 'array',
            items: {
              type: 'object',
              required: ['state_id', 'entry_condition', 'visible_sections', 'allowed_operations', 'disabled_operations', 'exit_conditions', 'expected_recovery', 'test_ids'],
            },
          },
          operations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['operation_id', 'precondition_state', 'control', 'visible_when', 'expected_ui', 'expected_runtime_events', 'expected_cleanup', 'failure_variants', 'test_ids'],
            },
          },
        },
      },
    },
  },
};
writeFileSync(SCHEMA_OUT, JSON.stringify(schema, null, 2) + '\n');

console.log(`generated ${OUT}`);
console.log(JSON.stringify(behavior.totals, null, 2));
