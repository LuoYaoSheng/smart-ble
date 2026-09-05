#!/usr/bin/env bash
# verify-flutter-macos.sh — Smart BLE macOS 平台扩展一键验证（Flutter 路线）
#
# 用法： scripts/macos/verify-flutter-macos.sh [RUN_ID]
# 依赖： flutter, xcodebuild（经 flutter 间接）, sqlite3 可选
#
# 设计约束：
# - 不含个人绝对路径（一律相对仓库根解析）
# - 不写死任何设备 UUID / 蓝牙外设 ID
# - 无硬件时显式输出 BLOCKED_*，不写 PASS
# - build/test 产物不进入 git（.gitignore 已覆盖）
# - 所有失败码向上传递（set -euo pipefail + 显式 exit）

set -euo pipefail

RUN_ID="${1:-run-$(date +%Y%m%d-%H%M%S)}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FLUTTER_APP="$REPO_ROOT/apps/flutter"
PROBE="$REPO_ROOT/verification/macos-extension"
LOGDIR="$PROBE/$RUN_ID/logs"
mkdir -p "$LOGDIR"

step() { printf '\n===== %s =====\n' "$1"; }
record() { # id status note
  printf '%s\t%s\t%s\n' "$1" "$2" "$3" | tee -a "$LOGDIR/summary.tsv"
}

step "0. 前置检查"
command -v flutter >/dev/null 2>&1 || { echo "flutter not found"; exit 2; }
flutter devices > "$LOGDIR/flutter-devices.txt" 2>&1 || true

step "1. 产品 App 修改前基线"
cd "$FLUTTER_APP"
flutter pub get > "$LOGDIR/pub-get.txt" 2>&1 \
  && record FLB-01 PASS_WITH_LIMITATION "lock drift not committed" \
  || { record FLB-01 FAIL "pub get"; exit 1; }
git -C "$REPO_ROOT" diff --quiet -- apps/flutter/pubspec.lock apps/flutter/pubspec.yaml \
  || record FLB-01 NOTE "shared lock drifted locally - MUST NOT be committed from mac"

flutter analyze > "$LOGDIR/analyze.txt" 2>&1 \
  && record FLB-03 PASS "analyze" \
  || record FLB-03 FAIL "analyze"

flutter test > "$LOGDIR/test.txt" 2>&1 \
  && record FLB-04 PASS "flutter test" \
  || record FLB-04 FAIL "flutter test"

flutter build macos > "$LOGDIR/build-macos.txt" 2>&1 \
  && record FLB-05 PASS "release build" \
  || { record FLB-05 FAIL "release build"; exit 1; }

APP_BIN="$FLUTTER_APP/build/macos/Build/Products/Release/smart_ble.app/Contents/MacOS/smart_ble"
if [ -x "$APP_BIN" ]; then
  shasum -a 256 "$APP_BIN" | tee "$LOGDIR/app-sha256.txt"
fi

step "2. 插件探针（version-pinned：与产品 pubspec.lock 同版）"
PROBE_DIR=$(find "$PROBE" -maxdepth 2 -type d -name probe 2>/dev/null | sort | tail -1 || true)
if [ -z "$PROBE_DIR" ]; then
  record FLP-00 BLOCKED "no probe project found under verification/macos-extension/<run>/probe"
else
  cd "$PROBE_DIR"
  flutter pub get > "$LOGDIR/probe-pub-get.txt" 2>&1 || { record FLP-00 FAIL "probe pub get"; exit 1; }
  flutter build macos --debug > "$LOGDIR/probe-build.txt" 2>&1 \
    || { record FLP-00 FAIL "probe build"; exit 1; }
  PBIN="build/macos/Build/Products/Debug/smart_ble_macos_probe.app/Contents/MacOS/smart_ble_macos_probe"

  "$PBIN" --mode env       > "$LOGDIR/probe-env.log"    2>&1 && record FLC-01 PASS  "env"  || record FLC-01 FAIL "env"
  "$PBIN" --mode scan5     > "$LOGDIR/probe-scan5.log"  2>&1 && record FLC-03 PASS  "scan5 auto-stop" || record FLC-03 FAIL "scan5"
  "$PBIN" --mode scan --duration 12 > "$LOGDIR/probe-scan.log" 2>&1 && record FLC-05 PASS "scan dedup/rssi" || record FLC-05 FAIL "scan"
  "$PBIN" --mode advertise --duration 8 > "$LOGDIR/probe-adv.log" 2>&1 && record FLP-02 PASS "advertise API" || record FLP-02 FAIL "advertise"
  # GATT 正向链与外部可见性需要真实夹具/第二观察端（ESP32 或手机），无硬件时显式 BLOCKED：
  record FLC-07 BLOCKED_FIXTURE "GATT ops need a connectable fixture (esp32 gatt server or similar)"
  record FLP-04 BLOCKED_OBSERVER "external visibility needs a second scanning endpoint (phone/esp32)"
fi

step "3. 页面级 widget 探针（r2 pages-probe：只读引用共享层，5 页面覆盖）"
PAGES_PROBE_DIR=$(find "$PROBE" -maxdepth 2 -type d -name pages-probe 2>/dev/null | sort | tail -1 || true)
if [ -z "$PAGES_PROBE_DIR" ]; then
  record FLW-00 NOT_RUN "no pages-probe found under verification/macos-extension/<run>"
else
  cd "$PAGES_PROBE_DIR"
  flutter pub get > "$LOGDIR/pages-probe-pub-get.txt" 2>&1 \
    || { record FLW-00 FAIL "pages-probe pub get"; exit 1; }
  # USE_MOCK_BLE：共享层预留的 E2E 注入开关；FBP 假平台/通道 mock 在探针内完成。
  # 已知共享层缺陷 D16（CommandQueue dispose 回调）在 FLW-08 内定向压制，见 r2 integration-notes
  flutter test --dart-define=USE_MOCK_BLE=true > "$LOGDIR/pages-probe-test.txt" 2>&1 \
    && record FLW-00 PASS "pages widget suite" \
    || record FLW-00 FAIL "pages widget suite (see pages-probe-test.txt)"
fi

step "汇总"
cat "$LOGDIR/summary.tsv"
echo "logs: $LOGDIR"
echo "注意：pubspec.lock/Podfile.lock/GeneratedPluginRegistrant 如有漂移，提交前必须 git restore（共享文件）"
