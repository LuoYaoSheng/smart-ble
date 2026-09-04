#!/usr/bin/env bash
# verify-native-macos.sh — Smart BLE macOS 平台扩展一键验证（原生 AppKit 路线）
#
# 用法： scripts/macos/verify-native-macos.sh [RUN_ID]
# 依赖： swift toolchain (Xcode)
#
# 设计约束：同 verify-flutter-macos.sh（无绝对路径/无写死 UUID/无硬件显式 BLOCKED/失败码上抛）

set -euo pipefail

RUN_ID="${1:-run-$(date +%Y%m%d-%H%M%S)}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$REPO_ROOT/apps/desktop/macos/SmartBLE-mac"
PROBE="$REPO_ROOT/tests/macos/native-probe"
LOGDIR="$REPO_ROOT/verification/macos-extension/$RUN_ID/logs"
mkdir -p "$LOGDIR"

step() { printf '\n===== %s =====\n' "$1"; }
record() { printf '%s\t%s\t%s\n' "$1" "$2" "$3" | tee -a "$LOGDIR/native-summary.tsv"; }

step "1. SmartBLE-mac App 构建"
cd "$APP"
swift package resolve > "$LOGDIR/resolve.txt" 2>&1 || { record NVB-00 FAIL "resolve"; exit 1; }
swift build > "$LOGDIR/build.txt" 2>&1 \
  && record NVB-01 PASS "swift build" \
  || { record NVB-01 FAIL "swift build"; cat "$LOGDIR/build.txt"; exit 1; }

step "2. App 冒烟运行（8 秒，验证生命周期与双管理器上电）"
(./.build/debug/SmartBLE-mac > "$LOGDIR/app-run.log" 2>&1 & APP_PID=$!
 sleep 8; kill -TERM "$APP_PID" 2>/dev/null; wait "$APP_PID" 2>/dev/null || true)
if grep -q "Bluetooth is powered on" "$LOGDIR/app-run.log" && \
   grep -q "Peripheral is powered on" "$LOGDIR/app-run.log"; then
  record NVB-02 PASS "app run, central+peripheral poweredOn"
else
  record NVB-02 FAIL "app run missing poweredOn logs (check TCC bluetooth permission)"
fi

step "3. native-probe 能力矩阵"
cd "$PROBE"
swift build > "$LOGDIR/probe-build.txt" 2>&1 || { record NVC-00 FAIL "probe build"; exit 1; }
PBIN="./.build/debug/native-probe"

"$PBIN" --mode env                > "$LOGDIR/probe-env.log"    2>&1 && record NVC-01 PASS "env poweredOn x2" || record NVC-01 FAIL "env"
"$PBIN" --mode scan --duration 12 > "$LOGDIR/probe-scan.log"   2>&1 && record NVC-02 PASS "scan real devices" || record NVC-02 FAIL "scan"
"$PBIN" --mode advertise --duration 10 > "$LOGDIR/probe-adv.log" 2>&1 && record NVC-03 PASS "advertise API" || record NVC-03 FAIL "advertise"

# GATT 正向链与广播外部可见性均需真实夹具/第二观察端；同机广播被 macOS 控制器过滤（P1），
# 无硬件时显式 BLOCKED，不得写 PASS：
record NVC-04 BLOCKED_FIXTURE  "gatt client chain needs a connectable fixture"
record NVC-05 BLOCKED_OBSERVER "advertise visibility needs a second endpoint (phone/esp32)"

step "汇总"
cat "$LOGDIR/native-summary.tsv"
echo "logs: $LOGDIR"
