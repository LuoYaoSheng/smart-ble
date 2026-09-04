#!/usr/bin/env bash
# make-app-bundle.sh — r5 上架就绪：产出两种交付形态
#
# 用法： scripts/macos/make-app-bundle.sh [--omit-bt-usage] [--config debug|release]
#   dist/SmartBLE-macOS.app      → 运行形态（Release、AppIcon.icns、hardened runtime、ad-hoc、非沙盒）
#                                   r4 链路保持可复现（ad-hoc 非沙盒下 BLE 可用，见 r4 证据）
#   dist/SmartBLE-macOS-MAS.app  → MAS 形态（同上 + App Sandbox entitlements；Mac App Store 就绪形态）
#                                   注意 r5 平台事实：ad-hoc 签名 + 沙盒下 CoreBluetooth 报 .unsupported，
#                                   BLE 能力需真实签名链（Apple Distribution + profile）方可验证 → 账号门控 NOT_RUN
#   --omit-bt-usage → 追加 dist/SmartBLE-macOS-NoBT.app（删除两个蓝牙用途键，负向对照，非沙盒）
#   --config X     → 构建配置（默认 release）
#
# 约束：仅 ad-hoc 签名（codesign -s -），全程不涉及证书私钥 / Apple 账号 / 公证 / 上传。
# 设计约束：同 verify-native-macos.sh（无绝对路径、失败码上抛）。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="$REPO_ROOT/apps/desktop/macos/SmartBLE-mac"
DIST="$REPO_ROOT/apps/desktop/macos/dist"
CONFIG=release
OMIT_BT=0
while [ $# -gt 0 ]; do
  case "$1" in
    --omit-bt-usage) OMIT_BT=1; shift ;;
    --config) CONFIG="${2:?--config needs a value}"; shift 2 ;;
    *) shift ;;
  esac
done
CONFIG_CAP="$(printf '%s' "$CONFIG" | cut -c1 | tr '[:lower:]' '[:upper:]')$(printf '%s' "$CONFIG" | cut -c2-)"
BUNDLE="$DIST/SmartBLE-macOS.app"
MAS="$DIST/SmartBLE-macOS-MAS.app"
NOBT="$DIST/SmartBLE-macOS-NoBT.app"
PLIST_SRC="$APP_DIR/Info.plist"
ICON_SRC="$APP_DIR/Resources/AppIcon.icns"
ENT_SRC="$APP_DIR/Entitlements.plist"

step() { printf '\n===== %s =====\n' "$1"; }

step "1. swift build (${CONFIG}，优先通用二进制)"
cd "$APP_DIR"
BIN=""
if swift build --configuration "$CONFIG" --arch arm64 --arch x86_64 > /dev/null 2>&1; then
  BIN="$APP_DIR/.build/apple/Products/$CONFIG_CAP/SmartBLE-mac"
  echo "NVD build: 通用二进制（arm64 + x86_64）"
else
  echo "NVD build: 通用二进制不可用，回退本机架构"
  swift build --configuration "$CONFIG" > /dev/null
  BIN="$APP_DIR/.build/$CONFIG/SmartBLE-mac"
fi
[ -x "$BIN" ] || { echo "binary missing: $BIN"; exit 1; }
lipo -info "$BIN"

step "2. 组装 bundle（清单：${PLIST_SRC}；图标：${ICON_SRC}）"
[ -f "$ICON_SRC" ] || { echo "icon missing (先跑 scripts/macos/make-app-icon.sh): $ICON_SRC"; exit 1; }
rm -rf "$DIST"
for app in "$BUNDLE" "$MAS"; do
  mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
  cp "$BIN" "$app/Contents/MacOS/SmartBLE-mac"
  cp "$PLIST_SRC" "$app/Contents/Info.plist"
  cp "$ICON_SRC" "$app/Contents/Resources/AppIcon.icns"
done

# NVD plist：MAS 必填/关键字段完整性
for key in CFBundleShortVersionString CFBundleVersion CFBundleIconFile \
           LSApplicationCategoryType ITSAppUsesNonExemptEncryption \
           NSBluetoothAlwaysUsageDescription; do
  /usr/libexec/PlistBuddy -c "Print :$key" "$MAS/Contents/Info.plist" > /dev/null \
    || { echo "NVD plist FAIL: 缺 $key"; exit 1; }
done
echo "NVD plist: 版本/分类/图标/出口合规/蓝牙用途 全部在位"

if [ "$OMIT_BT" = "1" ]; then
  mkdir -p "$NOBT/Contents/MacOS" "$NOBT/Contents/Resources"
  cp "$BIN" "$NOBT/Contents/MacOS/SmartBLE-mac"
  cp "$PLIST_SRC" "$NOBT/Contents/Info.plist"
  cp "$ICON_SRC" "$NOBT/Contents/Resources/AppIcon.icns"
  /usr/libexec/PlistBuddy -c 'Delete :NSBluetoothAlwaysUsageDescription' \
                          -c 'Delete :NSBluetoothPeripheralUsageDescription' \
                          "$NOBT/Contents/Info.plist"
  echo "NVP plist: NoBT 变体已生成（故意缺失蓝牙用途声明，供负向观察）"
fi

step "3. ad-hoc 签名（无证书私钥参与；MAS 形态带 App Sandbox + hardened runtime）"
codesign --force --sign - --options runtime "$BUNDLE"
codesign --verify --strict "$BUNDLE" && echo "NVP sign: SmartBLE-macOS.app（运行形态）ad-hoc 签名校验通过"
codesign --force --sign - --entitlements "$ENT_SRC" --options runtime "$MAS"
codesign --verify --strict "$MAS" && echo "NVD sign: SmartBLE-macOS-MAS.app（MAS 形态）ad-hoc 签名校验通过"
codesign -d --entitlements :- "$MAS" 2>/dev/null | grep 'app-sandbox' > /dev/null \
  && echo "NVD entitlements: app-sandbox 已嵌入"
codesign -dv "$MAS" 2>&1 | grep -i 'runtime' > /dev/null \
  && echo "NVD runtime: hardened runtime 标志在位"
if [ "$OMIT_BT" = "1" ]; then
  codesign --force --sign - --options runtime "$NOBT"
  codesign --verify --strict "$NOBT" && echo "NVP sign: NoBT 变体 ad-hoc 签名校验通过"
fi

step "4. Gatekeeper 评估（ad-hoc 未公证，预期拒绝）"
if spctl --assess --type execute "$MAS" 2>/dev/null; then
  echo "NVD spctl: accepted（意外：ad-hoc 通常被拒）"
else
  echo "NVD spctl: rejected（预期：未公证；正式分发链见 store-readiness.md，账号环节 NOT_RUN）"
fi

step "5. 可移植性事实（Swift 运行库来源）"
if otool -L "$BUNDLE/Contents/MacOS/SmartBLE-mac" | grep -q '/usr/lib/swift/libswiftCore.dylib'; then
  echo "NVD portability: Swift 链接系统 ABI 稳定运行库（/usr/lib/swift/*），无工具链 rpath 依赖"
else
  echo "NVD portability: 注意——二进制引用了非系统 Swift 运行库路径"
fi

echo "BUNDLE_OK $BUNDLE"
echo "MAS_OK $MAS"
