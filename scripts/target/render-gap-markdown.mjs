#!/usr/bin/env node
/**
 * TP-G2-R1: render Markdown gap / remediation / current-state docs from
 * reports/target-vs-current/*.json (schema v2).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const R = `${ROOT}/reports/target-vs-current`;
const G = `${ROOT}/docs/gap-analysis`;
const M = `${ROOT}/docs/remediation`;
const C = `${ROOT}/docs/current-state`;

function load(name) {
  return JSON.parse(readFileSync(`${R}/${name}`, 'utf8'));
}
function write(path, body) {
  const text = `${String(body).replace(/\s+$/u, '')}\n`;
  writeFileSync(path, text);
}

const coverage = load('coverage.json');
const report = load('target-vs-current.json');
const bp = load('first-breakpoints.json');
const tasks = load('task-dependency-graph.json');
const pages = load('pages.json');
const esp32 = load('esp32.json');
const smartHid = load('smart-hid.json');
const landing = load('landing-release.json');
const runtime = load('runtime.json');
const tests = load('tests.json');

mkdirSync(G, { recursive: true });
mkdirSync(M, { recursive: true });
mkdirSync(C, { recursive: true });

const top20 = bp.top20 || [];
const hash = report.content_hash;
const commit = report.commit;
const ur = report.unique_root_causes_by_severity || coverage.unique_root_causes_by_severity;
const ar = report.affected_target_records_by_severity || coverage.affected_target_records_by_severity;

function tgtRow(key) {
  const t = coverage.targets[key];
  if (!t) return `| ${key} | — | — | — |`;
  return `| ${key} | ${t.total} | ${t.assessed} | ${t.unassessed} |`;
}

write(`${G}/TARGET_VS_CURRENT_SUMMARY.md`, `# Target vs Current 摘要（TP-G2-R1）

\`\`\`yaml
status: REVIEW
document_version: 2.0
gate: TP-G2-R1
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: ${hash}
commit: ${commit}
supersedes: TP-G2 v1 (reports/target-vs-current-v1/)
\`\`\`

> 旧 TP-G2 v1 摘要已 **SUPERSEDED_BY_TP_G2_R1**。正式路径：\`reports/target-vs-current/\`。

## 1. 测试基础设施与 Current 真实结果

| 项 | 值 |
|---|---|
| SYSTEM_PASS / FAIL | ${coverage.system?.SYSTEM_PASS} / ${coverage.system?.SYSTEM_FAIL} |
| HARNESS_PASS / FAIL | ${coverage.system?.HARNESS_PASS} / ${coverage.system?.HARNESS_FAIL} |
| TARGET_CONTRACT_FAIL | ${coverage.system?.TARGET_CONTRACT_FAIL} |
| TEST_INFRA_FAIL | ${coverage.system?.TEST_INFRA_FAIL ?? coverage.current?.TEST_INFRA_FAIL} |
| CURRENT_PASS / FAIL | ${coverage.current?.CURRENT_PASS} / ${coverage.current?.CURRENT_FAIL} |
| structured cases | ${coverage.current?.cases} |
| 页面 blocked_specs / blocked_cases | ${coverage.current?.pages?.blocked_specs} / ${coverage.current?.pages?.blocked_cases} |
| 页面阻断原因 | ${coverage.current?.pages?.reason} |
| 独立 blockers | BLK-TOOL-PLAYWRIGHT + BLK-TEST-PAGE-DRIVER |

**说明：** \`blocked_cases=${coverage.current?.pages?.blocked_cases}\` 是受阻 Case 数，**不是**产品缺陷数。Playwright 与 Page Driver 分别登记。

## 2. Target Coverage（canonical totals）

| 维度 | total | assessed | unassessed |
|---|---:|---:|---:|
${['REQ', 'FEAT', 'PAGE', 'WEB', 'STATE', 'OP', 'FLOW', 'ERR', 'DATA', 'PROTO', 'SEC', 'NFR', 'CLAIM', 'DEC', 'EVID', 'TEST'].map(tgtRow).join('\n')}
| 报告记录总数 | ${coverage.records_total} | | |

PROTO 仅使用 \`PROTO-001\`..\`PROTO-011\`（不是 Service UUID）。

## 3. 根因 vs 受影响记录

### unique_root_causes_by_severity

- P0: **${ur?.P0 ?? 0}**
- P1: **${ur?.P1 ?? 0}**
- P2: **${ur?.P2 ?? 0}**
- P3: **${ur?.P3 ?? 0}**

### affected_target_records_by_severity

${Object.entries(ar || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

> 不得把 affected records 说成「N 个 P0 缺陷」。Observer 缺失默认 **P1**（无公开危害证据时非 P0）。

## 4. 状态分布

### gap_kind

${Object.entries(coverage.by_gap_kind || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

### implementation_status

${Object.entries(coverage.by_implementation_status || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

### verification_status

${Object.entries(coverage.by_verification_status || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## 5. Top 20 First Breakpoints

${top20.map((b, i) => `${i + 1}. **[${b.severity || '—'}]** \`${b.target_id}\` → ${b.first_breakpoint} （${b.task_id || b.suggested_fix_id || '—'} / ${b.root_cause_id || '—'}）`).join('\n')}

## 6. Task waves（拓扑序前 12）

${(tasks.recommended_order || []).slice(0, 12).map((id, i) => {
  const n = (tasks.nodes || []).find((x) => x.task_id === id);
  return `${i + 1}. **${id}** — ${n?.title || ''}（type=${n?.task_type}, sev=${n?.severity ?? '—'}, gaps≈${n?.gap_count ?? 0}）`;
}).join('\n')}

完整图：\`reports/target-vs-current/task-dependency-graph.json\`。

## 7. 必须立即降级的公开 Claim

**PUBLIC-HONESTY-001 = DONE**；**VERSION-METADATA-001 = DONE**（RC-VERSION-SSOT CLOSED）。
**PAGE-VERSION-001** 状态见任务图（RC-PAGE-VERSION）。
**RELEASE-PIPELINE-001** 仍为 PLANNED（RC-RELEASE-PIPELINE OPEN）。在 E6 完成前：

- 下载区保持 **NOT_RELEASED / PREVIEW**，禁止 \`releases/latest\` 假主下载；
- 不得宣称 Android/Windows/macOS 多端正式包可用；
- 不得宣称 Flutter/Tauri 为 UniApp 主产物；
- Observer / OTA VERIFIED 不得上公开面。

## 8. 外部 Blocker

${(report.blockers || []).map((b) => `- **${b.blocker_id}** [${b.status}] ${b.description} → ${b.task_id}`).join('\n')}

## 9. 下一步

下一 Task 由用户选择（例如 RELEASE-PIPELINE-001），**不得自动执行** OTA / Release Pipeline / E5。
`);

function sectionReport(title, filterFn) {
  const rows = report.records.filter(filterFn).filter((r) =>
    r.severity || ['AUTOMATED_FAIL', 'BLOCKED_BY_TOOLCHAIN', 'BLOCKED_BY_TARGET_DRIVER', 'BLOCKED_BY_FIXTURE'].includes(r.verification_status));
  return `# ${title}

\`\`\`yaml
status: REVIEW
gate: TP-G2-R1
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: ${hash}
\`\`\`

记录数（筛选后）：${rows.length}

| Target | Kind | Impl | Verify | Sev | First Breakpoint | Task |
|---|---|---|---|---|---|---|
${rows.slice(0, 100).map((r) => `| ${r.target_id} | ${r.gap_kind} | ${r.implementation_status} | ${r.verification_status} | ${r.severity || '—'} | ${(r.first_breakpoint || '').replace(/\|/g, '/').slice(0, 80)} | ${r.task_id || '—'} |`).join('\n')}

${rows.length > 100 ? `\n> 仅展示前 100 条；完整数据见 JSON。\n` : ''}
`;
}

write(`${G}/PAGE_GAP_REPORT.md`, sectionReport('页面差距报告（TP-G2-R1）', (r) => r.gap_kind === 'PAGE' || r.target_type === 'page' || r.target_type === 'web' || r.target_type === 'state' || r.target_type === 'operation' || r.dimension === 'blocker'));
write(`${G}/RUNTIME_GAP_REPORT.md`, sectionReport('Runtime 差距报告（TP-G2-R1）', (r) => r.gap_kind === 'RUNTIME'));
write(`${G}/ESP32_GAP_REPORT.md`, sectionReport('ESP32 差距报告（TP-G2-R1）', (r) => r.gap_kind === 'FIRMWARE' || (r.target_type === 'protocol' && String(r.target_id).startsWith('PROTO-'))));
write(`${G}/SMART_HID_GAP_REPORT.md`, sectionReport('Smart HID 差距报告（TP-G2-R1）', (r) => r.gap_kind === 'SMART_HID' || r.task_id === 'TEST-BRIDGE-TS-001' || /^FEAT-05[3-9]$/.test(r.target_id)));
write(`${G}/LANDING_RELEASE_GAP_REPORT.md`, sectionReport('落地页与 Release 差距报告（TP-G2-R1）', (r) => r.gap_kind === 'LANDING' || r.gap_kind === 'RELEASE'));
write(`${G}/TEST_COVERAGE_GAP_REPORT.md`, sectionReport('测试可执行性差距报告（TP-G2-R1）', (r) => r.gap_kind === 'TESTABILITY' || r.gap_kind === 'TOOLCHAIN'));

write(`${G}/README.md`, `# Gap Analysis（TP-G2-R1）

机器可读源：\`reports/target-vs-current/\`（v2）

- [TARGET_VS_CURRENT_SUMMARY.md](./TARGET_VS_CURRENT_SUMMARY.md)
- [PAGE_GAP_REPORT.md](./PAGE_GAP_REPORT.md)
- [RUNTIME_GAP_REPORT.md](./RUNTIME_GAP_REPORT.md)
- [ESP32_GAP_REPORT.md](./ESP32_GAP_REPORT.md)
- [SMART_HID_GAP_REPORT.md](./SMART_HID_GAP_REPORT.md)
- [LANDING_RELEASE_GAP_REPORT.md](./LANDING_RELEASE_GAP_REPORT.md)
- [TEST_COVERAGE_GAP_REPORT.md](./TEST_COVERAGE_GAP_REPORT.md)

数字必须与 JSON \`content_hash=${hash}\` 一致。

v1 存档：\`reports/target-vs-current-v1/\`（SUPERSEDED）。
`);

// Mark old summary note if v1 copy exists elsewhere — already in frontmatter

write(`${M}/REMEDIATION_ORDER.md`, `# 修复顺序（TP-G2-R1）

\`\`\`yaml
status: APPROVED
document_version: 2.0
gate: TP-G2-R1
content_hash: ${hash}
approved_by: user
\`\`\`

> 执行规则：依赖图不变；Wave/拓扑序；一次只批准一个 Task；完成后停下。
> **PUBLIC-HONESTY / VERSION-METADATA / PAGE-VERSION / ENV-PLAYWRIGHT = DONE**。
> 下一 Task 由用户选择；**不得**自动执行 TEST-PAGE-DRIVER-001 / RELEASE-PIPELINE / OTA。

## 推荐拓扑序

${(tasks.recommended_order || []).map((id, i) => {
  const n = (tasks.nodes || []).find((x) => x.task_id === id);
  return `${i + 1}. **${id}** — ${n?.title}（type=${n?.task_type}, sev=${n?.severity ?? '—'}, gaps≈${n?.gap_count}, status=${n?.status || 'PLANNED'}）`;
}).join('\n')}

## 依赖边

${(tasks.dependencies || []).map((d) => `- ${d.from} → ${d.to}`).join('\n') || '（无）'}

## 首批候选

1. **ENV-PLAYWRIGHT-001** — 环境任务，解锁页面 E4 统计
2. **TEST-PAGE-DRIVER-001** — 可测试性（依赖 Playwright）
3. **PUBLIC-HONESTY-001** — P0 公开误导立即降级
4. **VERSION-METADATA-001** — VERSION/Metadata（不循环依赖 Release）
5. **OTA-CLIENT-001** — P0 协议断裂（依赖 OTA-PACKAGE-001）
`);

function backlogFor(title, pred) {
  const nodes = (tasks.nodes || []).filter(pred);
  const body = nodes.map((n) => {
    return `### ${n.task_id}

- 状态：**${n.status || 'PLANNED'}**
- 标题：${n.title}
- task_type：${n.task_type}
- severity：${n.severity ?? '—'}
- root_cause_id：${n.root_cause_id || '—'}
- Target IDs（样本）：${(n.target_ids || []).slice(0, 12).join(', ') || '见 JSON'}
- Test IDs：${(n.test_ids || []).slice(0, 12).join(', ') || '—'}
- First Breakpoint：${n.first_breakpoint || '—'}
- 依赖：${(n.dependencies || []).join(', ') || '无'}
- 解锁：${(n.unlocks || []).join(', ') || n.unlocks || '—'}
- 禁止修改（本轮）：${(n.forbidden_files || []).join('; ')}
- 自动化验收：${n.automated_acceptance}
- 建议提交信息：\`${n.commit_message}\`
`;
  }).join('\n');
  return `# ${title}

\`\`\`yaml
status: REVIEW
gate: TP-G2-R1
content_hash: ${hash}
\`\`\`

> PUBLIC-HONESTY-001 / VERSION-METADATA-001 状态以 task-dependency-graph.json 为准。未批准 Task 不得执行。

${body || '_（无匹配任务）_'}
`;
}

write(`${M}/FEATURE_REMEDIATION_BACKLOG.md`, backlogFor('Feature / Runtime 修复 Backlog', (n) => String(n.task_id).startsWith('RUNTIME-') || String(n.task_id).startsWith('OTA-')));
write(`${M}/PAGE_REMEDIATION_BACKLOG.md`, backlogFor('页面修复 Backlog', (n) => String(n.task_id).startsWith('PAGE-') || ['ENV-PLAYWRIGHT-001', 'TEST-PAGE-DRIVER-001'].includes(n.task_id)));
write(`${M}/RUNTIME_REMEDIATION_BACKLOG.md`, backlogFor('Runtime 修复 Backlog', (n) => String(n.task_id).startsWith('RUNTIME-') || String(n.task_id).startsWith('OTA-CLIENT') || String(n.task_id).startsWith('OTA-PACKAGE')));
write(`${M}/ESP32_REMEDIATION_BACKLOG.md`, backlogFor('ESP32 修复 Backlog', (n) => String(n.task_id).startsWith('ESP32-') || n.task_id === 'OTA-FIRMWARE-001'));
write(`${M}/SMART_HID_REMEDIATION_BACKLOG.md`, backlogFor('Smart HID 修复 Backlog', (n) => n.task_id === 'TEST-BRIDGE-TS-001' || n.task_id === 'VERIFY-SMART-HID-001' || String(n.task_id).startsWith('SMART-HID')));
write(`${M}/LANDING_RELEASE_REMEDIATION_BACKLOG.md`, backlogFor('Landing / Release 修复 Backlog', (n) => ['PUBLIC-HONESTY-001', 'VERSION-METADATA-001', 'RELEASE-PIPELINE-001', 'VERIFY-E6-001'].includes(n.task_id)));
write(`${M}/TESTABILITY_REMEDIATION_BACKLOG.md`, backlogFor('测试可执行性 Backlog', (n) => ['TESTABILITY', 'ENVIRONMENT'].includes(n.task_type) || String(n.task_id).startsWith('TEST-')));
write(`${M}/BLOCKER_REGISTER.md`, `# Blocker 登记（TP-G2-R1）

\`\`\`yaml
status: REVIEW
gate: TP-G2-R1
content_hash: ${hash}
\`\`\`

| ID | 类型 | 状态 | 说明 | Task |
|---|---|---|---|---|
${(report.blockers || []).map((b) => `| ${b.blocker_id} | ${b.type} | ${b.status} | ${b.description} | ${b.task_id} |`).join('\n')}

本轮禁止：upload / adb install / 真机 BLE / 宣称 E5 PASS。
`);

write(`${M}/README.md`, `# Remediation（TP-G2-R1）

- [REMEDIATION_ORDER.md](./REMEDIATION_ORDER.md) — **先读**
- 分类 Backlog 与 [BLOCKER_REGISTER.md](./BLOCKER_REGISTER.md)
- 机器图：\`reports/target-vs-current/task-dependency-graph.json\`

\`content_hash=${hash}\`

未经用户批准不得执行 SOURCE_FIX / 进入 TP-G3。
`);

// ---- current-state substantial docs ----
const inv = esp32.inventory || {};
const pageList = (pages.pages || []).map((p) => `- **${p.target_id}** impl=${p.implementation_status} verify=${p.verification_status} static=${p.static_implementation || '—'} e4=${p.e4_verification || '—'} task=${p.task_id || '—'} bp=${(p.first_breakpoint || '').slice(0, 60)}`).join('\n');

write(`${C}/README.md`, `# Current State 入口（TP-G2-R1）

\`\`\`yaml
status: REVIEW
document_version: 2.0
gate: TP-G2-R1
owner: Smart BLE Engineering
last_reviewed: 2026-09-01
approved_by: null
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: ${hash}
commit: ${commit}
\`\`\`

本目录只记录**当前实现事实**（path / symbol / line_hint）。建议与修复见 \`docs/gap-analysis/\` 与 \`docs/remediation/\`。不得在此写「建议改为」。

| 文档 | 内容 |
|---|---|
| [CURRENT_PAGE_IMPLEMENTATION.md](./CURRENT_PAGE_IMPLEMENTATION.md) | PAGE-001..010 + WEB-001 |
| [CURRENT_RUNTIME_IMPLEMENTATION.md](./CURRENT_RUNTIME_IMPLEMENTATION.md) | ble-runtime / OTA / 广播 |
| [CURRENT_ESP32_IMPLEMENTATION.md](./CURRENT_ESP32_IMPLEMENTATION.md) | LightBLE vs ble-fixture-target |
| [CURRENT_SMART_HID_IMPLEMENTATION.md](./CURRENT_SMART_HID_IMPLEMENTATION.md) | Smart HID + TS bridge |
| [CURRENT_LANDING_AND_RELEASE_IMPLEMENTATION.md](./CURRENT_LANDING_AND_RELEASE_IMPLEMENTATION.md) | 落地页与 Release |
| [CURRENT_TEST_COVERAGE.md](./CURRENT_TEST_COVERAGE.md) | CURRENT_PASS/FAIL 结构化结果 |
| [CURRENT_BUILD_AND_TOOLCHAIN.md](./CURRENT_BUILD_AND_TOOLCHAIN.md) | 构建与工具链 |

无法静态确认的项标 **UNASSESSED**。
`);

write(`${C}/CURRENT_PAGE_IMPLEMENTATION.md`, `# 当前页面实现盘点（TP-G2-R1）

\`\`\`yaml
status: REVIEW
gate: TP-G2-R1
content_hash: ${hash}
\`\`\`

## 路由事实

\`apps/uniapp/pages.json\` 注册路径（symbol: pages[].path）：

- pages/index/index → PAGE-001
- pages/hid/add → PAGE-003 相关（Smart HID 添加入口）
- pages/hid/detail → PAGE-004
- pages/hid/history → PAGE-005
- pages/hid/diagnostics → PAGE-005/诊断（UNASSESSED 细分）
- pages/device/detail → PAGE-002 相关设备详情
- pages/connected/index → PAGE-006/007 会话面
- pages/broadcast/index → PAGE-008
- pages/about/index → PAGE-009
- pages/about/version → PAGE-010
- WEB-001 → docs/index.md（非 UniApp 路由）

## 每页状态（来自报告）

${pageList}

## PAGE-008 静态事实

- path: \`apps/uniapp/pages/broadcast/index.vue\`
- symbol: 页面内联 advertising / 平台 API 调用
- line_hint: 无 \`useBroadcastSession\` / \`use-broadcast-session\` import
- Target: PAGE-008, FEAT-041..045, FLOW-008
- static_implementation: CONFIRMED_PARTIAL

## PAGE-010 静态事实

- path: \`apps/uniapp/pages/about/version.vue\`
- symbol: ${landing.page_version_ready ? 'getVersionPageModel（Metadata 投影）' : 'versionHistory / 硬编码版本文案'}
- Target: PAGE-010, FEAT-004/066
- static_implementation: ${landing.page_version_ready ? 'CONFIRMED_IMPLEMENTED（构建期 Metadata 投影；E4 仍受 Playwright 阻断）' : 'CONFIRMED_PARTIAL（若硬编码命中）'}
- RC-PAGE-VERSION: ${landing.page_version_ready ? 'CLOSED' : 'OPEN'}

## STATE / OP

- 契约总量：STATE **67** / OP **92**（\`tests/target/pages/page-behavior.manifest.json\`）
- E4：全部受 \`BLK-TOOL-PLAYWRIGHT\` + \`BLK-TEST-PAGE-DRIVER\` 阻断
- 多数 State/OP 的 static_implementation = **UNASSESSED**（未做控件级静态确认，禁止默认 PARTIAL）
- \`blocked_cases=${coverage.current?.pages?.blocked_cases}\` ≠ 产品缺陷数

## WEB-001

- path: \`docs/index.md\`
- 观察：${landing.landing_fake_download
    ? '含 `releases/latest` 下载枢纽链接（landing_fake_download=true）'
    : '无 releases/latest 假主下载；公开状态为 PREVIEW / NOT_RELEASED（landing_fake_download=false）'}
- Target: WEB-001, CLAIM-*, FEAT-070/075
`);

write(`${C}/CURRENT_RUNTIME_IMPLEMENTATION.md`, `# 当前 Runtime 实现盘点（TP-G2-R1）

\`\`\`yaml
status: REVIEW
gate: TP-G2-R1
content_hash: ${hash}
\`\`\`

## 模块树（path 事实）

目录：\`apps/uniapp/services/ble-runtime/\`

| 文件 | 存在 | 关联 Target | 备注 |
|---|---|---|---|
| index.js | 是 | FEAT-011/012, DEC-017 | Registry 快照；subscription_count 见 CURRENT FAIL TEST-U-005 |
| advertisement.js | 是 | FEAT-017, TEST-U-008 | CURRENT 有 PASS |
| device-filter.js | 是 | FEAT-014, TEST-U-007 | CURRENT FAIL：命中项匹配关键词 |
| device-collection.js | 是 | UNASSESSED 细项 | |
| scan-session.js | 是 | FLOW-002 | |
| platform.js | 是 | | |
| errors.js | 是 | ERR-* | |
| display-name.js | **否** | FEAT-013, TEST-U-006 | NOT_IMPLEMENTED |
| log-redaction.js | **否** | FEAT-040, TEST-U-013 | NOT_IMPLEMENTED |
| write-queue.js | **否** | FEAT-030, TEST-U-011 | NOT_IMPLEMENTED |
| reconnect-policy.js | **否** | FEAT-023/024, TEST-I-003 | NOT_IMPLEMENTED |

## OTA

- path: \`apps/uniapp/utils/ota_manager.js\`
- symbol: \`OtaManager\`
- line_hint: CHAR_CTRL / CHAR_DATA / CHAR_STATUS UUID 已定义
- 事实：结构化 CURRENT FAIL — **OtaManager 在第一个 DATA 写之前未发送 CTRL start**
- validateOtaPackage：缺失（FEAT-081 / PROTO-011 / DEC-016）
- Target: FEAT-046..052, FLOW-009, TEST-I-008

## 其他服务

- \`apps/uniapp/services/public-status.js\`：${landing.version_ssot_ready ? '**存在**（五词公开状态派生）' : '**缺失**（TEST-U-002）'}
- \`apps/uniapp/services/version-metadata.js\`：${landing.version_ssot_ready ? '**存在**（Release Metadata 投影）' : '**缺失**（TEST-U-002 / TEST-R-001）'}
- 根 \`VERSION\`：${landing.version_ssot_ready ? '**存在**（产品版本 SSOT）' : '**缺失**'}
- RC-VERSION-SSOT：${landing.version_ssot_ready ? '**CLOSED**' : '**OPEN**'}
- PAGE-010 Metadata 投影：${landing.page_version_ready ? '**DONE**（RC-PAGE-VERSION CLOSED）' : '仍属 **RC-PAGE-VERSION OPEN**（PAGE-VERSION-001）'}

## Runtime 差距记录数

报告 runtime.json records = ${(runtime.records || []).length}
`);

write(`${C}/CURRENT_ESP32_IMPLEMENTATION.md`, `# 当前 ESP32 实现盘点（TP-G2-R1）

\`\`\`yaml
status: REVIEW
gate: TP-G2-R1
content_hash: ${hash}
\`\`\`

对照：\`contracts/target/ble-fixture-target.json\` ↔ \`hardware/esp32/LightBLE/src/main.cpp\`

## Build

- platformio.ini envs: \`${(inv.build?.envs || []).join(', ')}\`
- 目标 modes: fixture_peripheral / fixture_observer
- upload_port: \`${inv.build?.upload_port}\`
- status: ${inv.build?.status}
- first_breakpoint: ${inv.build?.first_breakpoint}
- task: ${inv.build?.task_id}

## 名称

- DEVICE_NAME macro: \`${inv.names?.DEVICE_NAME_macro}\`
- NimBLEDevice::init: \`${inv.names?.nimble_init}\`
- Observer 名存在: ${inv.names?.observer_name_present}
- 宏与 init 不一致: ${inv.names?.mismatch}

## Services / Characteristics

${(inv.services || []).map((s) => `### ${s.contract_id} (\`${s.uuid}\`)

${(s.characteristics || []).map((c) => `- ${c.name} \`${c.uuid}\` props=${(c.expected_properties || []).join(',')} present_in_firmware=${c.present_in_firmware}`).join('\n')}
`).join('\n')}

## LED

${(inv.led_commands || []).map((c) => `- ${c.hex} present=${c.present} effect=${c.effect || c.text || ''}`).join('\n')}

## OTA 固件字段

- 当前字段风格: ${inv.ota?.firmware_field}
- 目标字段: ${inv.ota?.target_field}
- 客户端写 CTRL: ${inv.ota?.client_writes_ctrl}
- 客户端包校验: ${inv.ota?.client_validate_package}

## Fault Injection

${(inv.fault_injection || []).map((f) => `- ${f.id}: ${f.status}`).join('\n')}

## Observer

- present: ${inv.observer?.present}
- severity 分类: **P1**（无公开危害证据时不标 P0）
- task: ${inv.observer?.task_id}

## Artifact

- manifest_present: ${inv.artifact?.manifest_present}
- status: ${inv.artifact?.status}

## PROTO 映射

仅使用 PROTO-001..011；UUID 仅作为 protocol_member / implementation_ref，不是 target_id。
`);

write(`${C}/CURRENT_SMART_HID_IMPLEMENTATION.md`, `# 当前 Smart HID 实现盘点（TP-G2-R1）

\`\`\`yaml
status: REVIEW
gate: TP-G2-R1
content_hash: ${hash}
\`\`\`

## 源码事实

- path: \`apps/uniapp/services/smart-hid/profile.js\`
- symbol: import from \`core/protocols/hid-provisioning-protocol.ts\`
- line_hint: 文件头部 ESM import（\`.ts\` 后缀）
- 同目录还存在: index.js, known-devices.js, provision-form.js, scan-code-feedback.js, workflow.js

## 测试失败性质

- TEST-U-015 CURRENT FAIL：\`SyntaxError: Unexpected identifier 'as'\`
- 根因分类：**TESTABILITY**（Node 测试桥无法转译 TS），不是已确认的产品功能缺失
- task: **TEST-BRIDGE-TS-001**
- FEAT-053..059：**不得**因此全部标 NOT_IMPLEMENTED

## UniApp 构建链

- HBuilderX/uni-app 是否能解析该 \`.ts\` import：**UNASSESSED**（本轮未跑正式打包）
- Runtime 真机配网 E5：**HARDWARE_PENDING** / NOT_EXECUTED

## 报告记录

smart-hid.json note: ${smartHid.note || ''}
`);

write(`${C}/CURRENT_LANDING_AND_RELEASE_IMPLEMENTATION.md`, `# 当前落地页与 Release 实现盘点（TP-G2-R1）

\`\`\`yaml
status: REVIEW
gate: TP-G2-R1
content_hash: ${hash}
\`\`\`

## 落地页

- path: \`docs/index.md\`
- landing_fake_download: **${landing.landing_fake_download}**
- 观察：${landing.landing_fake_download
    ? '下载枢纽仍出现 `releases/latest` 假主下载'
    : '公开下载区已诚实降级为 PREVIEW / NOT_RELEASED（无 releases/latest 假下载）'}
- version_ssot_ready: **${landing.version_ssot_ready === true}**
- 公开 Claim 总量：31（CLAIM-001..031）
- 任务拆分（不可混成循环依赖）：
  1. **PUBLIC-HONESTY-001** — 立即诚实降级${landing.landing_fake_download ? '' : '（DONE）'}
  2. **VERSION-METADATA-001** — VERSION / Metadata / Public Status${landing.version_ssot_ready ? '（DONE）' : ''}
  3. **RELEASE-PIPELINE-001** — UniApp + 双固件流水线（仍 PLANNED）

## Release Workflow

- path: \`.github/workflows/release-build.yml\`
- builds Flutter: ${landing.release_builds_flutter}
- builds Tauri: ${landing.release_builds_tauri}
- builds UniApp: ${landing.release_builds_uniapp}
- 目标主产物：UniApp Android + 微信记录 + Peripheral/Observer 固件（当前未满足）

## VERSION / Metadata

- 根 \`VERSION\`：${landing.version_ssot_ready ? '存在（产品版本投影）' : '缺失'}
- \`apps/uniapp/services/version-metadata.js\`：${landing.version_ssot_ready ? '存在' : '缺失'}
- \`apps/uniapp/services/public-status.js\`：${landing.version_ssot_ready ? '存在' : '缺失'}
- \`release/release-manifest.json\` / \`docs/public/release/latest.json\`：${landing.version_ssot_ready ? 'PREVIEW Metadata 已生成' : '尚未建立'}
- PAGE-010：${landing.page_version_ready
    ? '已通过 getVersionPageModel 消费 Metadata（RC-PAGE-VERSION CLOSED）'
    : '硬编码 versionHistory（**RC-PAGE-VERSION OPEN** → PAGE-VERSION-001）'}

## SEO / OG / Nav

- VitePress 配置与 docs 站点：**UNASSESSED** 细项（本轮以 Claim/Release 测试与静态下载区证据为主）
`);

write(`${C}/CURRENT_TEST_COVERAGE.md`, `# 当前测试覆盖（TP-G2-R1）

\`\`\`yaml
status: REVIEW
gate: TP-G2-R1
content_hash: ${hash}
\`\`\`

## System / Harness

| 指标 | 值 |
|---|---|
| SYSTEM_PASS | ${coverage.system?.SYSTEM_PASS} |
| SYSTEM_FAIL | ${coverage.system?.SYSTEM_FAIL} |
| HARNESS_PASS | ${coverage.system?.HARNESS_PASS} |
| HARNESS_FAIL | ${coverage.system?.HARNESS_FAIL} |
| TARGET_CONTRACT_FAIL | ${coverage.system?.TARGET_CONTRACT_FAIL} |
| TEST_INFRA_FAIL | ${coverage.system?.TEST_INFRA_FAIL ?? coverage.current?.TEST_INFRA_FAIL} |

## Current（结构化 cases）

| 指标 | 值 |
|---|---|
| CURRENT_PASS | ${coverage.current?.CURRENT_PASS} |
| CURRENT_FAIL | ${coverage.current?.CURRENT_FAIL} |
| cases | ${coverage.current?.cases} |
| source | ${coverage.structured_current_path || tests.structured_path} |

### Layers

${(coverage.current?.layers || []).map((l) => `- ${l.name}: pass=${l.pass} fail=${l.fail} cases=${l.case_count ?? '—'} blocked=${l.blocked ? JSON.stringify(l.blocked) : '—'}`).join('\n')}

## 页面自动化

- blocked_specs: ${coverage.current?.pages?.blocked_specs}
- blocked_cases: ${coverage.current?.pages?.blocked_cases}
- reason: ${coverage.current?.pages?.reason}
- blockers: BLK-TOOL-PLAYWRIGHT, BLK-TEST-PAGE-DRIVER（独立登记，gap_count 均 > 0）

## 映射规则

- PASS → 相关 target_ids 的 verification_status=AUTOMATED_PASS
- FAIL → AUTOMATED_FAIL + case.first_breakpoint
- 无证据 → UNASSESSED / NOT_EXECUTED（不是 PARTIAL）
`);

write(`${C}/CURRENT_BUILD_AND_TOOLCHAIN.md`, `# 当前构建与工具链（TP-G2-R1）

\`\`\`yaml
status: REVIEW
gate: TP-G2-R1
content_hash: ${hash}
\`\`\`

## App

- UniApp 工程：\`apps/uniapp/\`
- 校验脚本：\`scripts/verify-uniapp.sh\`（本轮已作为回归输入）
- HBuilderX 默认路径：**UNASSESSED** / 可能 BLOCKED_BY_TOOLCHAIN

## Docs

- VitePress：\`docs/\` + \`npm run docs:build\`
- 生产落地页源：\`docs/index.md\`（本轮禁止修改业务语义之外的生产页内容；盘点只读）

## ESP32

- PlatformIO：\`hardware/esp32/LightBLE/platformio.ini\`
- envs: ${(inv.build?.envs || []).join(', ')}
- upload_port: ${inv.build?.upload_port}
- 本轮禁止：\`pio run -t upload\`

## E2E / Page

- Playwright environment：**${(report.blockers || []).find((b) => b.blocker_id === 'BLK-TOOL-PLAYWRIGHT')?.status === 'CLEARED' ? 'READY' : 'NOT_READY'}**
- \`@playwright/test\` blocker：${(report.blockers || []).find((b) => b.blocker_id === 'BLK-TOOL-PLAYWRIGHT')?.status || 'OPEN'}
- TARGET_PAGE_DRIVER：${(report.blockers || []).find((b) => b.blocker_id === 'BLK-TEST-PAGE-DRIVER')?.status || 'OPEN'}
- 说明：环境 READY ≠ 页面 E4 PASS；缺 Driver 时 Current pages = BLOCKED_BY_TARGET_DRIVER

## Release CI

- \`.github/workflows/release-build.yml\`：Flutter=${landing.release_builds_flutter} Tauri=${landing.release_builds_tauri} UniApp=${landing.release_builds_uniapp}
`);

console.log(JSON.stringify({
  ok: true,
  gate: 'TP-G2-R1',
  content_hash: hash,
  rendered: { gap: G, remediation: M, current_state: C },
}, null, 2));
