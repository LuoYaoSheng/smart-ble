#!/bin/bash
EV="E:/project/xf/smart-ble/verification/windows-plan-v1/20260924-AAND-ADVPOPUP/evidence"
for i in $(seq 1 90); do
  if adb devices | grep -q "50143338.*device"; then
    echo "PHONE-ONLINE try=$i $(date +%H:%M:%S)"
    adb -s 50143338 shell input keyevent KEYCODE_WAKEUP
    sleep 1
    adb -s 50143338 shell input keyevent 82
    sleep 2
    adb -s 50143338 install -r "E:/project/xf/smart-ble/apps/android/app/build/outputs/apk/debug/app-debug.apk" && echo INSTALL-OK
    sleep 1
    adb -s 50143338 shell am start -n com.smartble.android/com.smartble.ui.MainActivity
    sleep 4
    adb -s 50143338 exec-out screencap -p > "$EV/01-app-launch.png"
    echo LAUNCH-SHOT-DONE
    exit 0
  fi
  sleep 10
done
echo TIMEOUT-15MIN
