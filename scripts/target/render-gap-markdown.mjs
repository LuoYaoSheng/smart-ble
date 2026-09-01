#!/usr/bin/env node
// Render Markdown gap/remediation docs from reports/target-vs-current/*.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const R = `${ROOT}/reports/target-vs-current`;
const G = `${ROOT}/docs/gap-analysis`;
const M = `${ROOT}/docs/remediation`;
const C = `${ROOT}/docs/current-state`;

const coverage = JSON.parse(readFileSync(`${R}/coverage.json`, 'utf8'));
const report = JSON.parse(readFileSync(`${R}/target-vs-current.json`, 'utf8'));
const bp = JSON.parse(readFileSync(`${R}/first-breakpoints.json`, 'utf8'));
const fixes = JSON.parse(readFileSync(`${R}/fix-dependency-graph.json`, 'utf8'));
const pages = JSON.parse(readFileSync(`${R}/pages.json`, 'utf8'));

mkdirSync(G, { recursive: true });
mkdirSync(M, { recursive: true });
mkdirSync(C, { recursive: true });

const top20 = bp.top20 || [];
const p0 = report.records.filter((r) => r.severity === 'P0');
const p1 = report.records.filter((r) => r.severity === 'P1');

writeFileSync(`${G}/TARGET_VS_CURRENT_SUMMARY.md`, `# Target vs Current 摘要（TP-G2）

\`\`\`yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
generated_from: reports/target-vs-current/target-vs-current.json
content_hash: ${report.content_hash}
\`\`\`

## 1. 本轮运行

| 项 | 值 |
|---|---|
| SYSTEM_PASS / FAIL | ${coverage.system?.SYSTEM_PASS} / ${coverage.system?.SYSTEM_FAIL} |
| HARNESS_PASS / FAIL | ${coverage.system?.HARNESS_PASS} / ${coverage.system?.HARNESS_FAIL} |
| TARGET_CONTRACT_FAIL | ${coverage.system?.TARGET_CONTRACT_FAIL} |
| CURRENT_PASS / FAIL | ${coverage.current?.CURRENT_PASS} / ${coverage.current?.CURRENT_FAIL} |
| 页面 blocked_specs / blocked_cases | ${coverage.current?.pages?.blocked_specs} / ${coverage.current?.pages?.blocked_cases} |
| 页面阻断原因 | ${coverage.current?.pages?.reason} |

**说明：** \`blocked_cases=${coverage.current?.pages?.blocked_cases}\` 属于工具链阻断（Playwright 未安装），**不得**计为 ${coverage.current?.pages?.blocked_cases} 个产品缺陷。

## 2. Target 覆盖

| 维度 | 数量 |
|---|---|
| REQ | ${coverage.targets.REQ} |
| FEAT | ${coverage.targets.FEAT} |
| PAGE | ${coverage.targets.PAGE} |
| STATE | ${coverage.targets.STATE} |
| OP | ${coverage.targets.OP} |
| FLOW | ${coverage.targets.FLOW} |
| PROTO | ${coverage.targets.PROTO} |
| CLAIM | ${coverage.targets.CLAIM} |
| 报告记录总数 | ${coverage.records_total} |

## 3. 差距分布

### gap_kind

${Object.entries(coverage.by_gap_kind).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

### implementation_status

${Object.entries(coverage.by_implementation_status).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

### verification_status

${Object.entries(coverage.by_verification_status).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

### severity

${Object.entries(coverage.by_severity).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

### Product vs Testability

- 带 severity 的产品向差距：${coverage.product_vs_testability.product_gaps}
- Testability/Toolchain 记录：${coverage.product_vs_testability.testability_gaps}
- 页面 blocked_cases：${coverage.product_vs_testability.blocked_page_cases}（${coverage.product_vs_testability.note}）

## 4. Top 20 First Breakpoints

${top20.map((b, i) => `${i + 1}. **[${b.severity || '—'}]** \`${b.target_id}\` → ${b.first_breakpoint} （${b.suggested_fix_id || '—'}）`).join('\n')}

## 5. 公开声明约束

在 FIX-LANDING-001 / FIX-RELEASE-001 / E6 完成前：

- 下载区必须保持 **NOT_RELEASED / PREVIEW**，禁止假主下载；
- 不得宣称 Android/Windows/macOS 多端正式包可用；
- Observer / OTA VERIFIED 不得上公开面。

## 6. 外部 Blocker（需用户确认）

- Playwright 未安装 → BLOCKED_BY_TOOLCHAIN
- PlatformIO 未安装 → ESP32 build/upload 不可用（本轮禁止 upload）
- \`adb devices\` 当前无设备 → HARDWARE_PENDING
- 未见 ESP32 USB 串口 → HARDWARE_PENDING
- HBuilderX.app 未在默认路径 → UniApp 正式打包可能 BLOCKED_BY_TOOLCHAIN

## 7. 下一步

用户审阅本摘要与 \`docs/remediation/REMEDIATION_ORDER.md\`。未经批准不得进入 TP-G3。
`);

function sectionReport(title, filterFn) {
  const rows = report.records.filter(filterFn).filter((r) => r.severity || r.verification_status === 'AUTOMATED_FAIL' || r.verification_status === 'BLOCKED_BY_TOOLCHAIN');
  return `# ${title}

\`\`\`yaml
status: REVIEW
generated_from: reports/target-vs-current/target-vs-current.json
\`\`\`

记录数（筛选后）：${rows.length}

| Target | Kind | Impl | Verify | Sev | First Breakpoint | FIX |
|---|---|---|---|---|---|---|
${rows.slice(0, 80).map((r) => `| ${r.target_id} | ${r.gap_kind} | ${r.implementation_status} | ${r.verification_status} | ${r.severity || '—'} | ${(r.first_breakpoint || '').replace(/\|/g, '/').slice(0, 80)} | ${r.suggested_fix_id || '—'} |`).join('\n')}

${rows.length > 80 ? `\n> 仅展示前 80 条；完整数据见 JSON。\n` : ''}
`;
}

writeFileSync(`${G}/PAGE_GAP_REPORT.md`, sectionReport('页面差距报告', (r) => r.gap_kind === 'PAGE' || r.target_type === 'page' || r.target_type === 'state' || r.target_type === 'operation' || String(r.target_id).includes('#AUTOMATION')));
writeFileSync(`${G}/RUNTIME_GAP_REPORT.md`, sectionReport('Runtime 差距报告', (r) => r.gap_kind === 'RUNTIME'));
writeFileSync(`${G}/ESP32_GAP_REPORT.md`, sectionReport('ESP32 差距报告', (r) => r.gap_kind === 'FIRMWARE'));
writeFileSync(`${G}/SMART_HID_GAP_REPORT.md`, sectionReport('Smart HID 差距报告', (r) => r.gap_kind === 'SMART_HID'));
writeFileSync(`${G}/LANDING_RELEASE_GAP_REPORT.md`, sectionReport('落地页与 Release 差距报告', (r) => r.gap_kind === 'LANDING' || r.gap_kind === 'RELEASE'));
writeFileSync(`${G}/TEST_COVERAGE_GAP_REPORT.md`, sectionReport('测试可执行性差距报告', (r) => r.gap_kind === 'TESTABILITY' || r.gap_kind === 'TOOLCHAIN'));

writeFileSync(`${G}/README.md`, `# Gap Analysis（TP-G2）

机器可读源：\`reports/target-vs-current/\`

- [TARGET_VS_CURRENT_SUMMARY.md](./TARGET_VS_CURRENT_SUMMARY.md)
- [PAGE_GAP_REPORT.md](./PAGE_GAP_REPORT.md)
- [RUNTIME_GAP_REPORT.md](./RUNTIME_GAP_REPORT.md)
- [ESP32_GAP_REPORT.md](./ESP32_GAP_REPORT.md)
- [SMART_HID_GAP_REPORT.md](./SMART_HID_GAP_REPORT.md)
- [LANDING_RELEASE_GAP_REPORT.md](./LANDING_RELEASE_GAP_REPORT.md)
- [TEST_COVERAGE_GAP_REPORT.md](./TEST_COVERAGE_GAP_REPORT.md)

数字必须与 JSON \`content_hash=${report.content_hash}\` 一致。
`);

// Remediation
writeFileSync(`${M}/REMEDIATION_ORDER.md`, `# 修复顺序（TP-G2 · 未执行）

\`\`\`yaml
status: REVIEW
document_version: 1.0
approved_by: null
\`\`\`

> 本文件只规划。**不得**在未经用户批准前执行任何 FIX / 进入 TP-G3。

## 推荐顺序

${fixes.recommended_order.map((id, i) => {
  const n = fixes.nodes.find((x) => x.id === id);
  return `${i + 1}. **${id}** — ${n?.title}（sev=${n?.severity}, gaps≈${n?.gap_count}, unlocks=${n?.unlocks}）`;
}).join('\n')}

## 依赖边

${fixes.dependencies.map((d) => `- ${d.from} → ${d.to}`).join('\n') || '（无）'}

## 首个建议批准 FIX 候选

1. **FIX-TEST-002**（Playwright 工具链）— 解锁页面自动化执行统计，不改产品语义
2. **FIX-LANDING-001** + **FIX-RELEASE-001** — P0 公开误导
3. **FIX-OTA-001** — P0 协议断裂
4. **FIX-FW-001** — P0 Observer 证据永久 BLOCKED 根因
`);

function backlogFor(title, pred) {
  const nodes = fixes.nodes.filter(pred);
  const body = nodes.map((n) => {
    const deps = fixes.dependencies.filter((d) => d.to === n.id).map((d) => d.from);
    const unlocks = fixes.dependencies.filter((d) => d.from === n.id).map((d) => d.to);
    const related = report.records.filter((r) => r.suggested_fix_id === n.id);
    return `### ${n.id}

- 标题：${n.title}
- gap_kind：${n.gap_kind}
- severity：${n.severity}
- Target IDs（样本）：${related.slice(0, 12).map((r) => r.target_id).join(', ') || '见 JSON'}
- Test IDs：${[...new Set(related.flatMap((r) => r.test_ids || []))].slice(0, 12).join(', ') || '—'}
- First Breakpoint（样本）：${related[0]?.first_breakpoint || '—'}
- 修改范围：仅 TP-G3 批准后按 FIX 描述修改对应模块
- 禁止修改：APPROVED Target / 测试期望 / 本轮业务代码
- 依赖：${deps.join(', ') || '无'}
- 解锁：${n.unlocks}${unlocks.length ? `；下游 FIX：${unlocks.join(', ')}` : ''}
- 风险：改动面可能影响多页面/协议；需对应 Current 回归
- 自动化验收：相关 CURRENT_FAIL → PASS；System/Harness 保持 0 FAIL
- E5/E6：硬件与发布证据另列 HARDWARE_PENDING / NOT_EXECUTED
- 建议提交信息：\`fix(${n.gap_kind.toLowerCase()}): ${n.title}\`
- 排序理由：见 REMEDIATION_ORDER（依赖与 severity）
`;
  }).join('\n');
  return `# ${title}

\`\`\`yaml
status: REVIEW
gate: TP-G2
\`\`\`

> 本轮只规划，不执行。

${body || '_（无匹配 FIX）_'}
`;
}

writeFileSync(`${M}/FEATURE_REMEDIATION_BACKLOG.md`, backlogFor('Feature 修复 Backlog', (n) => !['FIX-TEST-001', 'FIX-TEST-002', 'FIX-E5-001', 'FIX-E6-001'].includes(n.id) && !n.id.startsWith('FIX-PAGE') && !n.id.startsWith('FIX-FW') && !n.id.startsWith('FIX-HID') && !n.id.startsWith('FIX-LANDING') && !n.id.startsWith('FIX-RELEASE')));
writeFileSync(`${M}/PAGE_REMEDIATION_BACKLOG.md`, backlogFor('页面修复 Backlog', (n) => n.id.startsWith('FIX-PAGE') || n.id.startsWith('FIX-TEST')));
writeFileSync(`${M}/RUNTIME_REMEDIATION_BACKLOG.md`, backlogFor('Runtime 修复 Backlog', (n) => n.id.startsWith('FIX-RUNTIME') || n.id.startsWith('FIX-OTA')));
writeFileSync(`${M}/ESP32_REMEDIATION_BACKLOG.md`, backlogFor('ESP32 修复 Backlog', (n) => n.id.startsWith('FIX-FW') || n.id === 'FIX-OTA-001'));
writeFileSync(`${M}/SMART_HID_REMEDIATION_BACKLOG.md`, backlogFor('Smart HID 修复 Backlog', (n) => n.id.startsWith('FIX-HID') || n.id === 'FIX-E5-001'));
writeFileSync(`${M}/LANDING_RELEASE_REMEDIATION_BACKLOG.md`, backlogFor('Landing / Release 修复 Backlog', (n) => n.id.startsWith('FIX-LANDING') || n.id.startsWith('FIX-RELEASE') || n.id === 'FIX-E6-001'));
writeFileSync(`${M}/TESTABILITY_REMEDIATION_BACKLOG.md`, `${backlogFor('测试可执行性 Backlog', (n) => n.id.startsWith('FIX-TEST'))}

注意：\`blocked_cases=${coverage.current?.pages?.blocked_cases}\` ≠ 同等数量的产品缺陷。
`);
writeFileSync(`${M}/BLOCKER_REGISTER.md`, `# Blocker 登记

\`\`\`yaml
status: REVIEW
gate: TP-G2
\`\`\`

| ID | 类型 | 状态 | 说明 |
|---|---|---|---|
| BLK-TOOL-001 | TOOLCHAIN | OPEN | Playwright 未安装 → 页面 E4 BLOCKED_BY_TOOLCHAIN |
| BLK-TOOL-002 | TOOLCHAIN | OPEN | PlatformIO 未安装 → ESP32 build NOT_EXECUTED |
| BLK-TOOL-003 | TOOLCHAIN | OPEN | HBuilderX.app 默认路径未见 → UniApp 正式包可能阻断 |
| BLK-HW-001 | FIXTURE | OPEN | \`adb devices -l\` 空列表 |
| BLK-HW-002 | FIXTURE | OPEN | 无 ESP32 USB 串口（\`/dev/tty.usb*\` 未见） |
| BLK-TEST-001 | TESTABILITY | OPEN | TARGET_PAGE_DRIVER 未实现（Actual API 抛 NOT_IMPLEMENTED） |

本轮禁止：upload / adb install / 真机 BLE / 宣称 E5 PASS。
`);

writeFileSync(`${M}/README.md`, `# Remediation（TP-G2）

- [REMEDIATION_ORDER.md](./REMEDIATION_ORDER.md) — **先读**
- 分类 Backlog 与 [BLOCKER_REGISTER.md](./BLOCKER_REGISTER.md)

未经用户批准不得执行 FIX / 进入 TP-G3。
`);

console.log('markdown rendered');
