# -*- coding: utf-8 -*-
# 探针4：滑动变体微测——同一状态下 slow-60 / fast-150 / fling-300 各滚多少
import re, subprocess, sys, time, os

SERIAL = sys.argv[1] if len(sys.argv) > 1 else 'R5CR1284Y7H'
PKG = 'com.smartble'
FIX_NAME = 'BLEToolkit-Server'
XML = r'C:/Users/11066/AppData/Local/Temp/aand-probe4.xml'

def adb(*args, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    return r.stdout.decode('utf-8', 'replace')

def dump():
    adb('shell', 'uiautomator', 'dump', '/sdcard/aand-probe4.xml')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/aand-probe4.xml', XML],
                   capture_output=True, env={**os.environ, 'MSYS_NO_PATHCONV': '1'})
    try:
        return open(XML, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''

def txt_bounds(x, label):
    return [((int(m.group(1)) + int(m.group(3))) // 2, (int(m.group(2)) + int(m.group(4))) // 2)
            for m in re.finditer(r'<node[^>]*text="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x)]

def tap(x, y):
    adb('shell', 'input', 'tap', str(x), str(y))

def hdrpos(x):
    hs = txt_bounds(x, 'Unknown Service') + txt_bounds(x, 'OTA Service')
    return sorted(h[1] for h in hs)

def test(tag, x1, y1, x2, y2, ms):
    b = hdrpos(dump())
    adb('shell', 'input', 'swipe', str(x1), str(y1), str(x2), str(y2), str(ms))
    time.sleep(1.0)
    a = hdrpos(dump())
    moved = 'MOVED' if a != b else 'STUCK'
    print(f'{tag}: {b} -> {a} {moved}', flush=True)
    return a != b

# 前置：连接 + 清空
adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
adb('shell', 'wm', 'dismiss-keyguard')
adb('shell', 'svc', 'power', 'stayon', 'usb')
for perm in ('android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT',
             'android.permission.ACCESS_FINE_LOCATION'):
    adb('shell', 'pm', 'grant', PKG, perm)
adb('shell', 'am', 'force-stop', PKG)
time.sleep(1)
adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1')
time.sleep(3)
for _ in range(8):
    x = dump()
    if FIX_NAME in x:
        break
    pb = txt_bounds(x, '开始扫描')
    if pb and '停止扫描' not in x:
        tap(*pb[0])
    time.sleep(2)
for _ in range(10):
    x = dump()
    if FIX_NAME in x:
        break
    time.sleep(2)
np_ = txt_bounds(x, FIX_NAME)
ci = [(m.start(), m) for m in []]
for m in re.finditer(r'<node[^>]*content-desc="连接"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
    a, b, c, d = map(int, m.groups())
    ci.append((0, ((a + c) // 2, (b + d) // 2)))
if np_ and ci:
    pts = [q[1] for q in ci]
    tap(*min(pts, key=lambda p: abs(p[1] - np_[0][1])))
for _ in range(24):
    time.sleep(1.5)
    x = dump()
    if '断开连接' in x and 'Unknown Service' in x:
        break
print('connected:', '断开连接' in dump(), flush=True)
m = txt_bounds(dump(), '清空日志')
if m:
    tap(*m[0])
for _ in range(8):
    time.sleep(1)
    if '操作日志' not in dump():
        break
print('start hdr:', hdrpos(dump()), flush=True)

# 变体测试（全部回顶后执行）
def to_top():
    for _ in range(6):
        b = hdrpos(dump())
        adb('shell', 'input', 'swipe', '540', '1500', '540', '2100', '400')
        time.sleep(0.7)
        if hdrpos(dump()) == b:
            return

to_top()
test('V1 slow60 (1986->1926,350ms)', 540, 1986, 540, 1926, 350)
to_top()
test('V2 fast150 (1986->1836,120ms)', 540, 1986, 540, 1836, 120)
to_top()
test('V3 fling300 (1986->1686,100ms)', 540, 1986, 540, 1686, 100)
to_top()
test('V4 slow60 mid (1700->1640,300ms)', 540, 1700, 540, 1640, 300)
to_top()
test('V5 fast150 mid (1700->1550,150ms)', 540, 1700, 540, 1550, 150)
to_top()
test('V6 drag600 slow (1900->1300,600ms)', 540, 1900, 540, 1300, 600)
to_top()
for i in range(5):
    adb('shell', 'input', 'swipe', '540', '1900', '540', '1750', '120')
    time.sleep(0.8)
    print(f'V7 fast150 x{i + 1}: {hdrpos(dump())}', flush=True)

adb('shell', 'am', 'force-stop', PKG)
adb('shell', 'svc', 'power', 'stayon', 'false')
print('probe4 done')
