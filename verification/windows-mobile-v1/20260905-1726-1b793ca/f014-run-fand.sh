#!/usr/bin/env bash
# F014–F017 广播域 F-AND 真机运行包装器（Git Bash / Windows）
# 用法：bash f014-run-fand.sh <adb-serial> [stem]
# 布景：E5 跑 F-AND 广播者 + ESP32 fixture_observer_s3（COM12 串口 = 观察侧证据源）
# 编排：预授权(含 BLUETOOTH_ADVERTISE)+grant-watch + COM12 全程采集 + flutter test p008
#       + 赛后 python 分析观察侧 JSON（F017：fff0 服务 + 厂商数据 0001/BLE 十六进制交叉核对）
set -uo pipefail

SERIAL="${1:?adb serial required}"
STEM="${2:-f014-f017-broadcast}"
HERE="$(cd "$(dirname "$0")" && pwd)"
LOG="$HERE/flutter-android/${STEM}-app.log"
CAP="$HERE/flutter-android/${STEM}-observer-serial.txt"

mkdir -p "$HERE/flutter-android"

echo "== 预授权 + 防三星管控 =="
for perm in BLUETOOTH_SCAN BLUETOOTH_CONNECT BLUETOOTH_ADVERTISE ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION; do
  adb -s "$SERIAL" shell pm grant com.smartble.flutter android.permission."$perm" >/dev/null 2>&1 || true
done
adb -s "$SERIAL" shell am set-standby-bucket com.smartble.flutter active >/dev/null 2>&1 || true
adb -s "$SERIAL" shell dumpsys deviceidle whitelist +com.smartble.flutter >/dev/null 2>&1 || true
adb -s "$SERIAL" shell input keyevent KEYCODE_WAKEUP >/dev/null
adb -s "$SERIAL" shell wm dismiss-keyguard >/dev/null 2>&1 || true
adb -s "$SERIAL" shell svc power stayon usb >/dev/null

echo "== 观察侧串口采集（COM12，全程）=="
python "$HERE/serial-tap.py" "$CAP" 900 &
CAP_PID=$!
sleep 2

echo "== grant-watch（flutter test 重装 APK 会重置授权）=="
(
  LAST=""
  END=$((SECONDS + 720))
  while [ "$SECONDS" -lt "$END" ]; do
    TS=$(adb -s "$SERIAL" shell dumpsys package com.smartble.flutter 2>/dev/null \
      | grep lastUpdateTime | head -1 | tr -d '\r')
    if [ -n "$TS" ] && [ "$TS" != "$LAST" ]; then
      LAST="$TS"
      for perm in BLUETOOTH_SCAN BLUETOOTH_CONNECT BLUETOOTH_ADVERTISE ACCESS_FINE_LOCATION ACCESS_COARSE_LOCATION; do
        adb -s "$SERIAL" shell pm grant com.smartble.flutter android.permission."$perm" >/dev/null 2>&1 || true
      done
      echo "[grant-watch] 安装已补授权 @$(date +%H:%M:%S)"
    fi
    sleep 2
  done
) &
WATCH_PID=$!

cd "$HERE/../../../apps/flutter" || exit 1
flutter test -d "$SERIAL" integration_test/p008_broadcast_test.dart 2>&1 | tee "$LOG"
STATUS=${PIPESTATUS[0]}
kill "$WATCH_PID" 2>/dev/null

echo "== 停采集并分析观察侧证据 =="
sleep 2
kill "$CAP_PID" 2>/dev/null
sleep 1

python - "$CAP" > "$HERE/flutter-android/${STEM}-observer-analysis.txt" <<'PYEOF'
import json, sys, re
path = sys.argv[1]
adv_total = 0
fff0 = []
mfg_ble = []
for line in open(path, encoding='utf-8', errors='replace'):
    line = line.strip()
    if not line.startswith('{'):
        continue
    try:
        d = json.loads(line)
    except ValueError:
        continue
    if d.get('type') != 'advertisement':
        continue
    adv_total += 1
    arr = [str(u).lower() for u in (d.get('services', []) + d.get('uuids', []))]
    hit = any(u in ('fff0', '0xfff0') or u.endswith('0000fff0-0000-1000-8000-00805f9b34fb') for u in arr)
    if hit:
        fff0.append(d)
        m = str(d.get('manufacturer', '') or '').lower()
        if '424c45' in m:
            mfg_ble.append(d)
print(f'观察侧 advertisement 总数: {adv_total}')
print(f'F017 services 含 fff0 的 advertisement: {len(fff0)} 条')
print(f'F017 厂商数据含 ASCII "BLE" (hex 424c45): {len(mfg_ble)} 条')
if fff0:
    names = {}
    for d in fff0:
        n = d.get('name', '')
        names[n] = names.get(n, 0) + 1
    print('F017 fff0 设备名分布:', json.dumps(names, ensure_ascii=False))
if mfg_ble:
    s = json.dumps(mfg_ble[0], ensure_ascii=False)
    print('F017 首条完整匹配样本:', s[:400])
PYEOF
cat "$HERE/flutter-android/${STEM}-observer-analysis.txt"

adb -s "$SERIAL" shell svc power stayon false >/dev/null
echo "exit=$STATUS log=$LOG cap=$CAP"
exit "$STATUS"
