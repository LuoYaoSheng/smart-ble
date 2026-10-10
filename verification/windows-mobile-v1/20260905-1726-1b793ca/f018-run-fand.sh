#!/usr/bin/env bash
# F018-F024 F-AND（flutter Android 真机 E5）p002 场景运行包装器
# 结构沿用 e13-run-scenario.sh：预授权 → grant-watch → 三星护甲 → 串口旁证 →
# flutter test → 掩码落证据。本域无真实 Wi-Fi 凭据：leave/cancel_wait/wifi_fail
# 三场景均用伪 SSID 提交（E14 W2 已证伪 SSID → 设备侧 wifi_failed 真实终态）。
# 凭据仍走环境变量，绝不写入脚本与证据：
#   P002_WIFI_SSID / P002_WIFI_PASSWORD / P002_TOKEN(32hex) / P002_HOST / P002_PORT
# 用法: ./f018-run-fand.sh <scenario> <serial> <stem>
set -uo pipefail

SCENARIO="${1:?scenario required}"
SERIAL="${2:?adb serial required}"
STEM="${3:-${SCENARIO}}"
HERE="$(cd "$(dirname "$0")" && pwd)"
EV="$HERE/f018-f024/flutter-android"
mkdir -p "$EV"
LOG_RAW="$EV/${STEM}-app.raw.log"
LOG="$EV/${STEM}-app.log"
SERIAL_LOG="$EV/${STEM}-device-serial.txt"

: "${P002_WIFI_SSID:?env required}"
: "${P002_WIFI_PASSWORD:?env required}"
: "${P002_TOKEN:?env required}"
: "${P002_HOST:?env required}"
P002_PORT="${P002_PORT:-17892}"

echo "== 预授权（已授权静默失败，忽略） =="
for perm in BLUETOOTH_SCAN BLUETOOTH_CONNECT ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION CAMERA; do
  adb -s "$SERIAL" shell pm grant com.smartble.flutter android.permission."$perm" >/dev/null 2>&1 || true
done

echo "== 防三星自动管控强杀 + 保持亮屏 =="
adb -s "$SERIAL" shell am set-standby-bucket com.smartble.flutter active >/dev/null 2>&1 || true
adb -s "$SERIAL" shell dumpsys deviceidle whitelist +com.smartble.flutter >/dev/null 2>&1 || true
adb -s "$SERIAL" shell input keyevent KEYCODE_WAKEUP >/dev/null
adb -s "$SERIAL" shell wm dismiss-keyguard >/dev/null 2>&1 || true
adb -s "$SERIAL" shell svc power stayon usb >/dev/null

echo "== 串口旁证（设备侧 candidate/终态）=="
python "$HERE/serial-tap.py" "$SERIAL_LOG" 540 &
TAP_PID=$!

echo "== grant-watch（flutter test 重装会重置授权）=="
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

cd "$HERE/../../../apps/flutter" || exit 1
flutter test -d "$SERIAL" \
  --dart-define=P002_SCENARIO="$SCENARIO" \
  --dart-define=P002_WIFI_SSID="$P002_WIFI_SSID" \
  --dart-define=P002_WIFI_PASSWORD="$P002_WIFI_PASSWORD" \
  --dart-define=P002_TOKEN="$P002_TOKEN" \
  --dart-define=P002_HOST="$P002_HOST" \
  --dart-define=P002_PORT="${P002_PORT:-17892}" \
  integration_test/p002_provisioning_test.dart 2>&1 | tee "$LOG_RAW"
STATUS=${PIPESTATUS[0]}

kill "$WATCH_PID" "$TAP_PID" 2>/dev/null
sleep 1

echo "== 掩码 token / 密码后落证据 =="
sed -E \
  -e 's/token=[0-9a-f]{32}/token=MASKED32HEX/g' \
  -e 's/token: [0-9a-f]{32}/token: MASKED32HEX/g' \
  -e "s/${P002_WIFI_PASSWORD}/MASKED_PASSWORD/g" \
  "$LOG_RAW" > "$LOG"
rm -f "$LOG_RAW"

adb -s "$SERIAL" shell svc power stayon false >/dev/null
echo "exit=$STATUS log=$LOG serial=$SERIAL_LOG"
exit "$STATUS"
