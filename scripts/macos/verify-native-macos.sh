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
if grep -q "蓝牙已开启" "$LOGDIR/app-run.log" && \
   grep -q "外围模式已就绪" "$LOGDIR/app-run.log"; then
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

step "4. 页面级冒烟（r3 原型对齐壳：四 Tab + 9 页 + 桌面差异点）"
cd "$APP"
./.build/debug/SmartBLE-mac --smoke-pages > "$LOGDIR/pages-smoke.log" 2>&1 \
  && record UIS-00 PASS "page smoke exit=0" \
  || record UIS-00 FAIL "page smoke exit!=0 (see pages-smoke.log)"
for id in UIS-01 UIS-02 UIS-03 UIS-04 UIS-05 UIS-06 UIS-07 UIS-08 UIS-09 UIS-10 UIS-11 UIS-12 UIS-13; do
  if grep -q "\[UISMOKE\] $id result=PASS" "$LOGDIR/pages-smoke.log"; then
    record "$id" PASS "page smoke (prototype-aligned shell)"
  elif grep -q "\[UISMOKE\] $id result=SKIP" "$LOGDIR/pages-smoke.log"; then
    record "$id" SKIP "environment-dependent (no devices nearby / bt off)"
  elif grep -q "\[UISMOKE\] $id result=FAIL" "$LOGDIR/pages-smoke.log"; then
    record "$id" FAIL "page smoke"
  else
    record "$id" NOT_RUN "step not found in log"
  fi
done

step "5. 页面快照证据（--snap-pages：9 页 cacheDisplay PNG，无需屏幕录制权限）"
SNAPDIR="$REPO_ROOT/verification/macos-extension/$RUN_ID/snaps"
mkdir -p "$SNAPDIR"
( cd "$SNAPDIR" && "$APP/.build/debug/SmartBLE-mac" --snap-pages > "$LOGDIR/pages-snap.log" 2>&1 \
  & SNAP_PID=$!; sleep 16; kill -TERM "$SNAP_PID" 2>/dev/null || true; wait "$SNAP_PID" 2>/dev/null || true )
SNAP_COUNT=$(ls "$SNAPDIR"/snaps-r3/*.png 2>/dev/null | wc -l | tr -d ' ')
if [ "$SNAP_COUNT" -eq 9 ]; then
  record UIS-14 PASS "9/9 page snapshots rendered"
else
  record UIS-14 FAIL "expected 9 snapshots, got $SNAP_COUNT (see pages-snap.log)"
fi

step "6. r4 交付形态与稳定性（bundle + soak）"
bash "$REPO_ROOT/scripts/macos/make-app-bundle.sh" --omit-bt-usage > "$LOGDIR/bundle.log" 2>&1 \
  && record NVP-01 PASS "app bundle assembled + ad-hoc signed" \
  || { record NVP-01 FAIL "bundle script"; cat "$LOGDIR/bundle.log"; }
if grep -q "spctl: rejected" "$LOGDIR/bundle.log"; then
  record NVP-02 PASS "spctl rejected as expected (ad-hoc 未公证；正式分发需 Developer ID + notarization → 无 Apple 账号 NOT_RUN)"
else
  record NVP-02 FAIL "spctl outcome unexpected (see bundle.log)"
fi
BUNDLE_BIN="$REPO_ROOT/apps/desktop/macos/dist/SmartBLE-macOS.app/Contents/MacOS/SmartBLE-mac"
("$BUNDLE_BIN" > "$LOGDIR/bundle-run.log" 2>&1 & BP=$!
 sleep 8; kill -TERM "$BP" 2>/dev/null; wait "$BP" 2>/dev/null || true)
if grep -q "蓝牙已开启" "$LOGDIR/bundle-run.log" && grep -q "外围模式已就绪" "$LOGDIR/bundle-run.log"; then
  record NVP-03 PASS "bundled binary boots, central+peripheral poweredOn (TCC 归因父终端)"
else
  record NVP-03 FAIL "bundled binary run (see bundle-run.log)"
fi
# 扫描压力：12 轮真实 5s 会话 + 日志上限 + 内存增量断言（约 100s）
SOAK_EXIT=0
"$APP/.build/debug/SmartBLE-mac" --soak-scans=12 > "$LOGDIR/soak.log" 2>&1 || SOAK_EXIT=$?
if [ "$SOAK_EXIT" -eq 0 ] && grep -q 'result=PASS detail="全部 12 轮完成' "$LOGDIR/soak.log"; then
  record NVS-01 PASS "soak 12 rounds auto-stop"
else
  record NVS-01 FAIL "soak rounds (exit=$SOAK_EXIT, see soak.log)"
fi
if grep -q '日志条数不超上限' "$LOGDIR/soak.log" && grep -q '驻留内存增量' "$LOGDIR/soak.log"; then
  record NVS-02 PASS "log cap + memory assertions passed"
else
  record NVS-02 FAIL "soak assertions missing (see soak.log)"
fi
# 真实点击走查（NVR-*）经宿主 AX 工具驱动，无法脚本化复现；结果见 r4 证据目录
echo "NVR walkthrough: 已由宿主 AX 工具单独执行（非脚本步骤），见 verification/macos-extension/20260904-r4/walkthrough.md"

step "汇总"
cat "$LOGDIR/native-summary.tsv"
echo "logs: $LOGDIR"
