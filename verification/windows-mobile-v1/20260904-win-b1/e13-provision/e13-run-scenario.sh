#!/usr/bin/env bash
# E13 P002 场景运行包装器（Git Bash / Windows）
#
# 职责：预授权 → 唤醒保持亮屏 → 跑 integration_test → 输出日志掩码后落证据目录。
# 凭据一律经环境变量传入，绝不写入本脚本与证据文件：
#   P002_WIFI_SSID / P002_WIFI_PASSWORD / P002_TOKEN(32hex) / P002_HOST / P002_PORT
#（QR 载荷含 '&'，经 Git Bash→flutter.bat 会被 cmd 拆断，故传分量。）
#
# 用法：
#   P002_WIFI_SSID=… P002_WIFI_PASSWORD=… P002_TOKEN=… P002_HOST=… \
#     ./e13-run-scenario.sh <scenario> <serial> [evidence-stem]
set -uo pipefail

SCENARIO="${1:?scenario required}"
SERIAL="${2:?adb serial required}"
STEM="${3:-${SCENARIO}}"
HERE="$(cd "$(dirname "$0")" && pwd)"
LOG_RAW="$HERE/evidence/${STEM}-app.raw.log"
LOG="$HERE/evidence/${STEM}-app.log"

: "${P002_WIFI_SSID:?env required}"
: "${P002_WIFI_PASSWORD:?env required}"
: "${P002_TOKEN:?env required}"
: "${P002_HOST:?env required}"
P002_PORT="${P002_PORT:-17892}"

echo "== 预授权（已授权的会静默失败，忽略） =="
for perm in BLUETOOTH_SCAN BLUETOOTH_CONNECT ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION CAMERA; do
  adb -s "$SERIAL" shell pm grant com.smartble.flutter android.permission."$perm" >/dev/null 2>&1 || true
done

echo "== 防三星自动管控强杀（实测曾被 mars_auto force-stop 杀进程） =="
adb -s "$SERIAL" shell am set-standby-bucket com.smartble.flutter active >/dev/null 2>&1 || true
adb -s "$SERIAL" shell dumpsys deviceidle whitelist +com.smartble.flutter >/dev/null 2>&1 || true

echo "== 唤醒 + USB 期间保持亮屏（收尾脚本会还原） =="
adb -s "$SERIAL" shell input keyevent KEYCODE_WAKEUP >/dev/null
adb -s "$SERIAL" shell wm dismiss-keyguard >/dev/null 2>&1 || true
adb -s "$SERIAL" shell svc power stayon usb >/dev/null

echo "== 运行 integration_test: $SCENARIO =="
# 后台监视器：flutter test 每轮会重装 APK（实测 install 会重置授权），
# 检测到 lastUpdateTime 变化即在 2s 内重新补授 5 项权限，
# 使相机等系统权限弹窗不再出现（此前依赖守护点弹窗存在竞态，两跑失败）。
(
  LAST=""
  END=$((SECONDS + 900))
  while [ "$SECONDS" -lt "$END" ]; do
    TS=$(adb -s "$SERIAL" shell dumpsys package com.smartble.flutter 2>/dev/null \
      | grep lastUpdateTime | head -1 | tr -d '\r')
    if [ -n "$TS" ] && [ "$TS" != "$LAST" ]; then
      LAST="$TS"
      for perm in BLUETOOTH_SCAN BLUETOOTH_CONNECT ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION CAMERA; do
        adb -s "$SERIAL" shell pm grant com.smartble.flutter android.permission."$perm" >/dev/null 2>&1 || true
      done
      echo "[grant-watch] 检测到安装，已补授权 @$(date +%H:%M:%S)"
    fi
    sleep 2
  done
) &
WATCH_PID=$!

cd "$HERE/../../../../apps/flutter" || exit 1
flutter test -d "$SERIAL" \
  --dart-define=P002_SCENARIO="$SCENARIO" \
  --dart-define=P002_WIFI_SSID="$P002_WIFI_SSID" \
  --dart-define=P002_WIFI_PASSWORD="$P002_WIFI_PASSWORD" \
  --dart-define=P002_TOKEN="$P002_TOKEN" \
  --dart-define=P002_HOST="$P002_HOST" \
  --dart-define=P002_PORT="$P002_PORT" \
  integration_test/p002_provisioning_test.dart 2>&1 | tee "$LOG_RAW"
STATUS=${PIPESTATUS[0]}
kill "$WATCH_PID" 2>/dev/null

echo "== 掩码 token / 密码后落证据 =="
sed -E \
  -e 's/token=[0-9a-f]{32}/token=MASKED32HEX/g' \
  -e "s/${P002_WIFI_PASSWORD}/MASKED_PASSWORD/g" \
  "$LOG_RAW" > "$LOG"
rm -f "$LOG_RAW"

echo "== 收尾：还原亮屏策略 =="
adb -s "$SERIAL" shell svc power stayon false >/dev/null

echo "exit=$STATUS log=$LOG"
exit "$STATUS"
