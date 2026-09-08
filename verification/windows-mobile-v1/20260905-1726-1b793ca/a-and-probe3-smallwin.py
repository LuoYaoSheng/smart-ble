# -*- coding: utf-8 -*-
# 探针3：订阅后（日志面板在）小窗状态全量地图——所有 scrollable 节点 + 行级图标可达性
import re, subprocess, sys, time, os

SERIAL = sys.argv[1] if len(sys.argv) > 1 else 'R5CR1284Y7H'
PKG = 'com.smartble'
FIX_NAME = 'BLEToolkit-Server'
XML = r'C:/Users/11066/AppData/Local/Temp/aand-probe3.xml'

def adb(*args, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    return r.stdout.decode('utf-8', 'replace')

def dump():
    adb('shell', 'uiautomator', 'dump', '/sdcard/aand-probe3.xml')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/aand-probe3.xml', XML],
                   capture_output=True, env={**os.environ, 'MSYS_NO_PATHCONV': '1'})
    try:
        return open(XML, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''

def txt_bounds(x, label):
    return [((int(m.group(1)) + int(m.group(3))) // 2, (int(m.group(2)) + int(m.group(4))) // 2)
            for m in re.finditer(r'<node[^>]*text="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x)]

def desc_bounds(x, label):
    return [((int(m.group(1)) + int(m.group(3))) // 2, (int(m.group(2)) + int(m.group(4))) // 2)
            for m in re.finditer(r'<node[^>]*content-desc="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x)]

def tap(x, y):
    adb('shell', 'input', 'tap', str(x), str(y))

def swipe(x1, y1, x2, y2, ms=350):
    adb('shell', 'input', 'swipe', str(x1), str(y1), str(x2), str(y2), str(ms))

def ensure_awake(max_try=3):
    for _ in range(max_try):
        wake = adb('shell', 'dumpsys', 'power').splitlines()
        if any('mWakefulness=Awake' in l for l in wake):
            focus = adb('shell', 'dumpsys', 'window')
            if 'UnintentionalLcdOn' in focus:
                adb('shell', 'input', 'keyevent', 'KEYCODE_SLEEP')
                time.sleep(1.0)
                adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
                time.sleep(0.8)
                adb('shell', 'wm', 'dismiss-keyguard')
                time.sleep(1.0)
                continue
            if PKG in focus and 'NotificationShade' not in focus:
                return
        adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
        adb('shell', 'wm', 'dismiss-keyguard')
        time.sleep(1.0)

def all_scrollables(x):
    return [tuple(map(int, m.groups())) for m in
            re.finditer(r'scrollable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x)]

def snap(tag, x):
    vps = all_scrollables(x)
    hdr = [h[1] for h in txt_bounds(x, 'Unknown Service') + txt_bounds(x, 'OTA Service')]
    icons = sorted([(q[1], lbl) for lbl in ('读取', '写入', '启用通知', '停止通知', '收起', '展开')
                    for q in desc_bounds(x, lbl)])
    log = txt_bounds(x, '操作日志')
    print(f'[{tag}] scrollables={vps} hdr={hdr} icons={icons} log={bool(log)}', flush=True)

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
ci = desc_bounds(x, '连接')
if np_ and ci:
    tap(*min(ci, key=lambda p: abs(p[1] - np_[0][1])))
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
snap('S-1 清空后大窗', dump())

# 回顶 → 展开 MAIN → 订阅控制行
def pair_cards(x):
    shorts = [(mm.group(1), (int(mm.group(2)) + int(mm.group(4))) // 2)
              for mm in re.finditer(r'<node[^>]*text="([0-9a-fA-F]{4})"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x)]
    badges = [(int(mm.group(1)), (int(mm.group(2)) + int(mm.group(4))) // 2)
              for mm in re.finditer(r'<node[^>]*text="(\d+) 特征值"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x)]
    return sorted([(sy, su, n) for su, sy in shorts
                   for n in [next((bn for bn, by in badges if abs(by - sy) < 70), None)] if n])

def svp(x):
    vps = all_scrollables(x)
    return (vps[0][1], vps[0][3]) if vps else (1446, 2016)

def scroll(px, down=True):
    ensure_awake()
    top, bot = svp(dump())
    while px > 0:
        st = min(px, 60)
        if down:
            swipe(540, bot - 30, 540, bot - 30 - st)
        else:
            swipe(540, top + 30, 540, top + 30 + st)
        px -= st
        time.sleep(0.5)

for _ in range(8):
    before = pair_cards(dump())
    scroll(280, down=False)
    if pair_cards(dump()) == before:
        break
main_c = None
for _ in range(10):
    x = dump()
    mc = [c for c in pair_cards(x) if c[1] == 'c201' and c[2] == 2]
    if mc:
        main_c = mc[0]
        break
    scroll(280, down=True)
print('main card:', main_c, flush=True)
if main_c:
    top, bot = svp(dump())
    if main_c[0] > top + 160:
        scroll(main_c[0] - (top + 120), down=True)
        x = dump()
        mc2 = [c for c in pair_cards(x) if c[1] == 'c201' and c[2] == 2]
        main_c = mc2[0] if mc2 else main_c
    e = min(desc_bounds(x, '展开'), key=lambda q: abs(q[1] - main_c[0]))
    tap(*e)
    time.sleep(1.8)
    snap('S-2 展开后', dump())
    # 找控制行 读取 → 同行 启用通知 → 订阅
    rr = desc_bounds(dump(), '读取')
    if rr:
        cy = min(rr, key=lambda q: q[1])[1]
        nn = desc_bounds(dump(), '启用通知')
        tn = min(nn, key=lambda q: abs(q[1] - cy)) if nn else None
        if tn:
            tap(*tn)
            for _ in range(8):
                time.sleep(1)
                if '通知已启用' in dump():
                    break
            print('subscribed:', '通知已启用' in dump(), flush=True)
            # ===== 小窗全量地图 =====
            snap('S-3 订阅后即时', dump())
            for i in range(10):
                scroll(60, down=True)
                snap(f'S-4 下滚+{(i + 1) * 60}', dump())
            for i in range(16):
                scroll(60, down=False)
                snap(f'S-5 上滚-{(i + 1) * 60}', dump())

adb('shell', 'am', 'force-stop', PKG)
adb('shell', 'svc', 'power', 'stayon', 'false')
print('probe3 done')
