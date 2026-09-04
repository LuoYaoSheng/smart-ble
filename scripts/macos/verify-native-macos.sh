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
# 无硬件时显式 BLOCKED，不得写 PASS（NVC-04 在步骤 4 后按冒烟证据动态改判）：
record NVC-05 BLOCKED_OBSERVER "advertise visibility needs a second endpoint (phone/esp32)"

step "3.5 核心纯逻辑单测（r6：framed-v1 边界 / QR 严格解析 / candidate 校验 / 身份验证 / 四行映射 / 错误四分流 / 常量）"
cd "$APP"
./.build/debug/SmartBLE-mac --unit-core > "$LOGDIR/unit-core.log" 2>&1 \
  && record CU-00 PASS "unit-core exit=0 ($(grep -c 'result=PASS' "$LOGDIR/unit-core.log") checks PASS)" \
  || record CU-00 FAIL "unit-core exit!=0 (see unit-core.log)"

step "4. 页面级冒烟（r3 原型对齐壳 + r6 能力扩展：四 Tab + 9 页 + 桌面差异点 + 协议流/OTA/多设备一致性）"
./.build/debug/SmartBLE-mac --smoke-pages > "$LOGDIR/pages-smoke.log" 2>&1 \
  && record UIS-00 PASS "page smoke exit=0" \
  || record UIS-00 FAIL "page smoke exit!=0 (see pages-smoke.log)"
for id in UIS-01 UIS-02 UIS-03 UIS-04 UIS-05 UIS-06 UIS-07 UIS-08 UIS-09 UIS-10 UIS-11 UIS-12 UIS-13 UIS-15 UIS-16 UIS-17; do
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

# NVC-04 动态改判（r6）：本轮冒烟日志含真实 连接成功+服务发现 证据 → PASS（环境外设）；
# 否则维持 BLOCKED_FIXTURE（不得无证据写 PASS）
if grep -q "连接成功" "$LOGDIR/pages-smoke.log" && grep -q "服务发现完成" "$LOGDIR/pages-smoke.log"; then
  record NVC-04 PASS "gatt chain exercised on environment peripheral (connect + ATT negotiate + service/char discovery, see pages-smoke.log)"
else
  record NVC-04 BLOCKED_FIXTURE "gatt client chain needs a connectable fixture"
fi

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

step "7. r5 上架就绪（MAS 形态：沙盒 entitlements + 图标 + Release 通用二进制）"
# NVD-01：Release 通用二进制（make-app-bundle.sh 默认构建并记录 lipo；第 6 步已产双形态）
if grep -q "x86_64 arm64" "$LOGDIR/bundle.log"; then
  record NVD-01 PASS "release universal binary (arm64+x86_64)"
else
  record NVD-01 FAIL "universal binary missing (see bundle.log)"
fi
# NVD-02：MAS 必填字段完整性（脚本内已断言，此处复核关键键）
MAS_PLIST="$REPO_ROOT/apps/desktop/macos/dist/SmartBLE-macOS-MAS.app/Contents/Info.plist"
if [ -f "$MAS_PLIST" ] && \
   /usr/libexec/PlistBuddy -c 'Print :LSApplicationCategoryType' "$MAS_PLIST" > /dev/null 2>&1 && \
   /usr/libexec/PlistBuddy -c 'Print :ITSAppUsesNonExemptEncryption' "$MAS_PLIST" > /dev/null 2>&1 && \
   /usr/libexec/PlistBuddy -c 'Print :CFBundleIconFile' "$MAS_PLIST" > /dev/null 2>&1; then
  record NVD-02 PASS "plist: category/export-compliance/icon/version present"
else
  record NVD-02 FAIL "MAS plist fields missing"
fi
# NVD-03：图标存在且为有效 icns
if file "$REPO_ROOT/apps/desktop/macos/dist/SmartBLE-macOS-MAS.app/Contents/Resources/AppIcon.icns" 2>/dev/null | grep -q "icns"; then
  record NVD-03 PASS "AppIcon.icns present in bundle Resources"
else
  record NVD-03 FAIL "AppIcon.icns missing/invalid"
fi
# NVD-04：沙盒 entitlements + hardened runtime 嵌入
MAS_BIN="$REPO_ROOT/apps/desktop/macos/dist/SmartBLE-macOS-MAS.app/Contents/MacOS/SmartBLE-mac"
if codesign --verify --strict "$REPO_ROOT/apps/desktop/macos/dist/SmartBLE-macOS-MAS.app" 2>/dev/null && \
   codesign -d --entitlements :- "$REPO_ROOT/apps/desktop/macos/dist/SmartBLE-macOS-MAS.app" 2>/dev/null | grep 'app-sandbox' > /dev/null && \
   codesign -dv "$REPO_ROOT/apps/desktop/macos/dist/SmartBLE-macOS-MAS.app" 2>&1 | grep -i 'runtime' > /dev/null; then
  record NVD-04 PASS "ad-hoc + app-sandbox entitlement + hardened runtime"
else
  record NVD-04 FAIL "entitlements/runtime/signature (see bundle.log)"
fi
# NVD-05：沙盒真实生效（容器外写被拒）；未签名对照应 OFF
MAS_PROBE_EXIT=0
"$MAS_BIN" --sandbox-probe > "$LOGDIR/mas-sandbox-probe.log" 2>&1 || MAS_PROBE_EXIT=$?
DEV_PROBE_EXIT=0
"$APP/.build/debug/SmartBLE-mac" --sandbox-probe > "$LOGDIR/dev-sandbox-probe.log" 2>&1 || DEV_PROBE_EXIT=$?
if [ "$MAS_PROBE_EXIT" -eq 0 ] && grep -q 'sandbox=ON' "$LOGDIR/mas-sandbox-probe.log" && \
   [ "$DEV_PROBE_EXIT" -eq 3 ] && grep -q 'sandbox=OFF' "$LOGDIR/dev-sandbox-probe.log"; then
  record NVD-05 PASS "sandbox enforced (container home, write blocked; unsigned control OFF)"
else
  record NVD-05 FAIL "sandbox probe (mas=$MAS_PROBE_EXIT dev=$DEV_PROBE_EXIT)"
fi
# NVD-06：MAS 形态 LaunchServices 启动（TCC 归因父终端，r4 平台事实）
# open -n 强制新实例（运行形态与 MAS 同 bundle id，已驻留实例会抢激活）。
# 判活先落盘再 grep 文件：pipefail 下 `ps aux | grep -q` 受 SIGPIPE 竞态影响（ps 输出长时误判失败）。
MAS_LAUNCH_OK=0
for attempt in 1 2; do
  open -n "$REPO_ROOT/apps/desktop/macos/dist/SmartBLE-macOS-MAS.app" > "$LOGDIR/nvd06-open.log" 2>&1
  sleep 6
  ps aux > "$LOGDIR/nvd06-ps.txt" 2>/dev/null || true
  if grep -q "[S]martBLE-macOS-MAS.app/Contents/MacOS" "$LOGDIR/nvd06-ps.txt"; then
    MAS_LAUNCH_OK=1
  fi
  pkill -f "SmartBLE-macOS-MAS.app/Contents/MacOS" 2>/dev/null || true
  sleep 1
  [ "$MAS_LAUNCH_OK" -eq 1 ] && break
done
if [ "$MAS_LAUNCH_OK" -eq 1 ]; then
  record NVD-06 PASS "MAS-form bundle boots via LaunchServices"
else
  record NVD-06 FAIL "MAS-form bundle failed to launch"
fi
# NVD-07：平台事实——ad-hoc + 沙盒下 CoreBluetooth 报 unsupported（rawValue 2），
# 与启动方式无关；空 entitlements 对照正常；此为账号门控发现，非失败：
"$MAS_BIN" > "$LOGDIR/mas-run.log" 2>&1 & MP=$!
sleep 8; kill -TERM "$MP" 2>/dev/null; wait "$MP" 2>/dev/null || true
if grep -q 'CBManagerState(rawValue: 2)' "$LOGDIR/mas-run.log"; then
  record NVD-07 PASS "platform-fact: BLE=unsupported under ad-hoc sandbox (MAS BLE 需真实签名链验证 → NOT_RUN)"
else
  record NVD-07 FAIL "expected unsupported-state fact in mas-run.log (see log)"
fi
# NVD-08：MAS 形态下 UI 层冒烟（BLE 依赖用例预期 SKIP/同根因 FAIL，UI 结构应 PASS）
"$MAS_BIN" --smoke-pages > "$LOGDIR/mas-smoke.log" 2>&1 || true
MAS_UI_PASS=$(grep -c 'result=PASS' "$LOGDIR/mas-smoke.log" || true)
if [ "${MAS_UI_PASS:-0}" -ge 9 ]; then
  record NVD-08 PASS "UI layer green under sandbox (${MAS_UI_PASS} PASS; BLE-dependent cases skip/fail per NVD-07)"
else
  record NVD-08 FAIL "UI layer under sandbox (${MAS_UI_PASS} PASS, see mas-smoke.log)"
fi
# NVD-09：spctl 预期拒绝 + Swift 系统运行库可移植性
if grep -q 'spctl: rejected' "$LOGDIR/bundle.log" && grep -q '/usr/lib/swift/libswiftCore.dylib' \
     <(otool -L "$REPO_ROOT/apps/desktop/macos/dist/SmartBLE-macOS.app/Contents/MacOS/SmartBLE-mac"); then
  record NVD-09 PASS "gatekeeper expected-reject + system swift runtime (portable)"
else
  record NVD-09 FAIL "spctl/otool check (see bundle.log)"
fi
echo "NVD 账号门控（真实证书签名/公证/MAS 上传/App Store Connect）：NOT_RUN（红线，见 store-readiness.md）"

step "汇总"
cat "$LOGDIR/native-summary.tsv"
echo "logs: $LOGDIR"
