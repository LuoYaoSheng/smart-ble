#!/usr/bin/env bash
# verify-uniapp-pages.sh — 页面回归统一入口（MAC-011 改写）
#
# 历史通道：HBuilderX CLI `uniapp.test h5`——HBuilderX 5.x 已移除该命令
# （DEF-002，实测 2026-09-14 报「命令不存在」），不再是可用通道。
# 现行通道：Playwright Page Driver 层（tests/target/pages/specs + 行为清单
# page-behavior.manifest.json；Fake Runtime 默认，TARGET_PAGE_BASE_URL 指向
# 真实 H5 dev server 时为真实页面驱动）。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[pages] Playwright Page Driver 层（经 verify-target pages 桥）"
node scripts/verify-target.mjs --mode=current --format=json > /tmp/verify-pages-run.json
node - <<'EOF'
const fs = require('fs')
const r = JSON.parse(fs.readFileSync('/tmp/verify-pages-run.json', 'utf8'))
const p = r.pages
if (!p || p.notExecuted) {
  console.error('pages layer not executed', p && p.reason)
  process.exit(1)
}
console.log(
  `specs=${p.specs} states=${p.state_cases} operations=${p.operation_cases} ` +
  `assertions=${p.assertion_cases} pass=${p.pass} fail=${p.fail} blocked=${p.blocked_cases}`
)
if (p.fail > 0 || p.blocked_specs > 0) process.exit(1)
console.log('UniApp pages verification PASS (Playwright page driver)')
EOF
