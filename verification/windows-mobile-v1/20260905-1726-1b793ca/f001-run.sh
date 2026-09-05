#!/usr/bin/env bash
# F001–F005 扫描域 F-AND 真机运行包装器（Git Bash / Windows）
# 用法：bash f001-run.sh <adb-serial> [stem]
set -uo pipefail

SERIAL="${1:?adb serial required}"
STEM="${2:-f001-f005-scan}"
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
  END=$((SECONDS + 600))
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
flutter test -d "$SERIAL" integration_test/p001_scan_test.dart 2>&1 | tee "$LOG"
STATUS=${PIPESTATUS[0]}
kill "$WATCH_PID" 2>/dev/null

adb -s "$SERIAL" shell svc power stayon false >/dev/null
echo "exit=$STATUS log=$LOG"
exit "$STATUS"
