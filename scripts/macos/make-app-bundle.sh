#!/usr/bin/env bash
# make-app-bundle.sh — r4 交付形态验证：把 SPM 产物组装为 .app bundle（ad-hoc 签名）
#
# 用法： scripts/macos/make-app-bundle.sh [--omit-bt-usage]
#   默认     → dist/SmartBLE-macOS.app      （复用仓库内 Info.plist，含蓝牙用途声明）
#   --omit-bt-usage → 追加 dist/SmartBLE-macOS-NoBT.app（删除两个蓝牙用途键，负向对照）
#
# 约束：仅 ad-hoc 签名（codesign -s -），全程不涉及证书私钥 / Apple 账号 / 公证。
# 设计约束：同 verify-native-macos.sh（无绝对路径、失败码上抛）。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="$REPO_ROOT/apps/desktop/macos/SmartBLE-mac"
DIST="$REPO_ROOT/apps/desktop/macos/dist"
CONFIG=debug
BUNDLE="$DIST/SmartBLE-macOS.app"
NOBT="$DIST/SmartBLE-macOS-NoBT.app"
PLIST_SRC="$APP_DIR/Info.plist"   # r1 已提交的 bundle 清单（含 NSBluetoothAlwaysUsageDescription）

step() { printf '\n===== %s =====\n' "$1"; }

step "1. swift build ($CONFIG)"
cd "$APP_DIR"
swift build --configuration "$CONFIG" > /dev/null
BIN="$APP_DIR/.build/$CONFIG/SmartBLE-mac"
[ -x "$BIN" ] || { echo "binary missing: $BIN"; exit 1; }

step "2. 组装 bundle（清单源：${PLIST_SRC}）"
rm -rf "$DIST"
mkdir -p "$BUNDLE/Contents/MacOS" "$BUNDLE/Contents/Resources"
cp "$BIN" "$BUNDLE/Contents/MacOS/SmartBLE-mac"
cp "$PLIST_SRC" "$BUNDLE/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Print :NSBluetoothAlwaysUsageDescription' "$BUNDLE/Contents/Info.plist" > /dev/null \
  && echo "NVP plist: NSBluetoothAlwaysUsageDescription 存在"

if [ "${1:-}" = "--omit-bt-usage" ]; then
  mkdir -p "$NOBT/Contents/MacOS" "$NOBT/Contents/Resources"
  cp "$BIN" "$NOBT/Contents/MacOS/SmartBLE-mac"
  cp "$PLIST_SRC" "$NOBT/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c 'Delete :NSBluetoothAlwaysUsageDescription' \
                          -c 'Delete :NSBluetoothPeripheralUsageDescription' \
                          "$NOBT/Contents/Info.plist"
  echo "NVP plist: NoBT 变体已生成（故意缺失蓝牙用途声明，供负向观察）"
fi

step "3. ad-hoc 签名（无证书私钥参与）"
for app in "$DIST"/*.app; do
  codesign --force --sign - "$app"
  codesign --verify --strict "$app" && echo "NVP sign: $(basename "$app") ad-hoc 签名校验通过"
done

step "4. Gatekeeper 评估（ad-hoc 未公证）"
if spctl --assess --type execute "$BUNDLE" 2>/dev/null; then
  echo "NVP spctl: accepted（意外：ad-hoc 通常被拒）"
else
  echo "NVP spctl: rejected（预期：未公证；正式分发需 Developer ID + notarization，无 Apple 账号 → NOT_RUN）"
fi

echo "BUNDLE_OK $BUNDLE"
