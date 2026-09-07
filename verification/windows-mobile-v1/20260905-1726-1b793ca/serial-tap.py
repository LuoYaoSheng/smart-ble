import serial
import sys
import time

# COM12 = fixture_peripheral_s3 (CH343)。打开后立即释放 DTR/RTS 防止复位保持。
out_path = sys.argv[1]
duration = float(sys.argv[2]) if len(sys.argv) > 2 else 420

s = serial.Serial("COM12", 115200, timeout=1)
s.setDTR(False)
s.setRTS(False)

deadline = time.time() + duration
with open(out_path, "w", encoding="utf-8", errors="replace") as f:
    f.write(f"[serial-tap] start {time.strftime('%H:%M:%S')} port=COM12\n")
    f.flush()
    while time.time() < deadline:
        line = s.readline()
        if line:
            f.write(line.decode("utf-8", "replace").rstrip("\r\n") + "\n")
            f.flush()
s.close()
print("[serial-tap] done")
