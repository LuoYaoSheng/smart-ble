#!/usr/bin/env bash
# make-app-icon.sh — r5 上架就绪：从品牌原图生成 macOS AppIcon.icns
#
# 源图（只读复用，不修改禁改区）: apps/flutter/assets/brand/icon.png（512×512，蓝底蓝牙符文，全平台品牌一致）
# 产物:
#   apps/desktop/macos/SmartBLE-mac/Resources/AppIcon.icns     （bundle 内图标）
#   apps/desktop/macos/SmartBLE-mac/Resources/AppIcon-1024.png （App Store Connect 市场图标备档）
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="$REPO_ROOT/apps/flutter/assets/brand/icon.png"
APP_DIR="$REPO_ROOT/apps/desktop/macos/SmartBLE-mac"
RES="$APP_DIR/Resources"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

step() { printf '\n===== %s =====\n' "$1"; }

step "1. macOS 化渲染（squircle 圆角 + 透明边距，1024 画布）"
[ -f "$SRC" ] || { echo "source icon missing: $SRC"; exit 1; }
mkdir -p "$RES"
swift "$REPO_ROOT/scripts/macos/AppIconRender.swift" "$SRC" "$WORK/icon-1024.png"
cp "$WORK/icon-1024.png" "$RES/AppIcon-1024.png"

step "2. iconset 尺寸族 + iconutil → icns"
ICONSET="$WORK/AppIcon.iconset"
mkdir -p "$ICONSET"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$WORK/icon-1024.png" --out "$ICONSET/icon_${size}x${size}.png" > /dev/null
  sips -z $((size * 2)) $((size * 2)) "$WORK/icon-1024.png" --out "$ICONSET/icon_${size}x${size}@2x.png" > /dev/null
done
iconutil -c icns "$ICONSET" -o "$RES/AppIcon.icns"
file "$RES/AppIcon.icns"
echo "APPICON_OK $RES/AppIcon.icns"
