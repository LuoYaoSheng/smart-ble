#!/bin/bash
EV="E:/project/xf/smart-ble/verification/windows-plan-v1/20260924-AAND-ADVPOPUP/evidence"
for i in $(seq 1 120); do
  NEW=$(adb devices | awk '$2=="device" && $1!="50143338" {print $1}' | head -1)
  if [ -n "$NEW" ]; then
    echo "NEW-PHONE=$NEW try=$i $(date +%H:%M:%S)"
    adb -s $NEW shell input keyevent KEYCODE_WAKEUP
    sleep 1
    adb -s $NEW shell input keyevent 82
    sleep 1
    adb -s $NEW install -r "E:/project/xf/smart-ble/apps/android/app/build/outputs/apk/debug/app-debug.apk" && echo INSTALL-OK
    for p in BLUETOOTH_SCAN BLUETOOTH_CONNECT BLUETOOTH_ADVERTISE ACCESS_FINE_LOCATION; do
      adb -s $NEW shell pm grant com.smartble.android android.permission.$p 2>/dev/null && echo "granted $p"
    done
    adb -s $NEW shell am start -n com.smartble.android/com.smartble.ui.MainActivity
    sleep 4
    adb -s $NEW exec-out screencap -p > "$EV/10-newphone-launch.png"
    echo LAUNCH-SHOT-DONE
    exit 0
  fi
  sleep 10
done
echo TIMEOUT-20MIN
