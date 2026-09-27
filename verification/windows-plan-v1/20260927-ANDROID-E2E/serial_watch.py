# -*- coding: utf-8 -*-
# COM12 (CH343 UART bridge) console watcher for ESP32-S3 @115200.
# Appends timestamped lines to evidence/serial-live.log. Run until killed.
import datetime
import time

import serial

LOG = r"E:/project/xf/smart-ble/verification/windows-plan-v1/20260927-ANDROID-E2E/evidence/serial-live.log"

t0 = time.time()
with open(LOG, "a", encoding="utf-8", errors="replace", buffering=1) as out:
    ser = serial.Serial()
    ser.port = "COM12"
    ser.baudrate = 115200
    ser.timeout = 1
    ser.open()
    out.write("\n===== watcher start {} =====\n".format(datetime.datetime.now().isoformat()))
    buf = b""
    while True:
        data = ser.read(4096)
        if not data:
            continue
        buf += data
        while b"\n" in buf:
            line, buf = buf.split(b"\n", 1)
            elapsed = time.time() - t0
            out.write("[+{:8.1f}] {}\n".format(elapsed, line.decode("utf-8", "replace").rstrip()))
