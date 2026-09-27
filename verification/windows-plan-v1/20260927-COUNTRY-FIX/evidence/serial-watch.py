import serial, sys, time
# COM12=CH343 UART 桥（S3 console）。60s 窗口原样落盘，够覆盖一轮配网下发。
out = sys.argv[1] if len(sys.argv) > 1 else 'serial-cap.txt'
dur = int(sys.argv[2]) if len(sys.argv) > 2 else 60
with serial.Serial('COM12', 115200, timeout=1) as s, open(out, 'w', encoding='utf-8', errors='replace') as f:
    t0 = time.time()
    while time.time() - t0 < dur:
        data = s.read(4096)
        if data:
            f.write(data.decode('utf-8', errors='replace'))
            f.flush()
print('captured', out)
