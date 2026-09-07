#!/usr/bin/env bash
# F006–F012 GATT 域 F-AND 真机运行包装器（Git Bash / Windows）
# 用法：bash f006-run.sh <adb-serial> [stem]
# 注意：若上一轮已写 {"cmd":"fault","type":"disconnect"}，夹具处于粘性拆链态，
# 需先复位夹具（拔插 USB 或 pio 烧录复位）再跑。
set -uo pipefail

SERIAL="${1:?adb serial required}"
STEM="${2:-f006-f012-gatt}"
HERE="$(cd "$(dirname "$0")" && pwd)"
LOG="$HERE/flutter-android/${STEM}-app.log"

echo "== 预授权 + 防三星管控 =="
for perm in BLUETOOTH_SCAN BLUETOOTH_CONNECT ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION; do
  adb -s "$SERIAL" shell pm grant com.smartble.flutter android.permission."$perm" >/dev/null 2>&1 || true
done
adb -s "$SERIAL" shell am set-standby-bucket com.smartble.flutter active >/dev/null 2>&1 || true
adb -s "$SERIAL" shell dumpsys deviceidle whitelist +com.smartble.flutter >/dev/null 2>&1 || true
adb -s "$SERIAL" shell input keyevent KEYCODE_WAKEUP >/dev/null
adb -s "$SERIAL" shell wm dismiss-keyguard >/dev/null 2>&1 || true
adb -s "$SERIAL" shell svc power stayon usb >/dev/null

echo "== grant-watch（flutter test 重装 APK 会重置授权）=="
(
  LAST=""
  END=$((SECONDS + 720))
  while [ "$SECONDS" -lt "$END" ]; do
    TS=$(adb -s "$SERIAL" shell dumpsys package com.smartble.flutter 2>/dev/null \
      | grep lastUpdateTime | head -1 | tr -d '\r')
    if [ -n "$TS" ] && [ "$TS" != "$LAST" ]; then
      LAST="$TS"
      for perm in BLUETOOTH_SCAN BLUETOOTH_CONNECT ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION; do
        adb -s "$SERIAL" shell pm grant com.smartble.flutter android.permission."$perm" >/dev/null 2>&1 || true
      done
      echo "[grant-watch] 安装已补授权 @$(date +%H:%M:%S)"
    fi
    sleep 2
  done
) &
WATCH_PID=$!

cd "$HERE/../../../apps/flutter" || exit 1
flutter test -d "$SERIAL" integration_test/p006_gatt_test.dart 2>&1 | tee "$LOG"
STATUS=${PIPESTATUS[0]}
kill "$WATCH_PID" 2>/dev/null

adb -s "$SERIAL" shell svc power stayon false >/dev/null
echo "exit=$STATUS log=$LOG"
exit "$STATUS"
