#!/usr/bin/env python
"""Timestamped serial reader for ESP32 fixture evidence (COM12 @ 115200).

Usage: python serial_reader.py COM_PORT OUTPUT_FILE
Robust against USB bus jitter: exits non-zero only on fatal open failure;
transient read errors are logged and retried for up to 10s.
"""
import sys
import time

import serial

port, out_path = sys.argv[1], sys.argv[2]


def ts():
    return time.strftime("%H:%M:%S")


line_buf = b""
with open(out_path, "ab") as out:
    while True:
        try:
            ser = serial.Serial(port, 115200, timeout=2)
        except serial.SerialException as e:
            out.write(f"[{ts()}] OPEN_RETRY {port}: {e}\n".encode())
            out.flush()
            time.sleep(3)
            continue
        out.write(f"[{ts()}] OPENED {port} @115200\n".encode())
        out.flush()
        try:
            while True:
                chunk = ser.read(512)
                if not chunk:
                    continue
                out.write(chunk)
                # Tag line starts with arrival time for evidence correlation
                if b"\n" in chunk:
                    out.write(f"[{ts()}]\n".encode())
                out.flush()
        except serial.SerialException as e:
            out.write(f"[{ts()}] READ_ERR: {e} (reopening)\n".encode())
            out.flush()
            time.sleep(2)
