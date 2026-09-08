# -*- coding: utf-8 -*-
# 探针2：主卡展开后的滚动行为（大窗）+ 订阅后小窗行可达性地图
import re, subprocess, sys, time, os

SERIAL = sys.argv[1] if len(sys.argv) > 1 else 'R5CR1284Y7H'
PKG = 'com.smartble'
FIX_NAME = 'BLEToolkit-Server'
XML = r'C:/Users/11066/AppData/Local/Temp/aand-probe2.xml'
HERE = os.path.dirname(os.path.abspath(__file__))

def adb(*args, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    return r.stdout.decode('utf-8', 'replace')

def dump():
    adb('shell', 'uiautomator', 'dump', '/sdcard/aand-probe2.xml')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/aand-probe2.xml', XML],
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

def scroll_vp(x):
    m = re.search(r'<node[^>]*scrollable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x)
    return tuple(map(int, m.groups()[1:3])) if m else None

def panel_scroll(px, down=True, settle=0.5):
    x = dump()
    vp = scroll_vp(x) or (1446, 2016)
    top, bot = vp
    while px > 0:
        step = min(px, 60)
        if down:
            swipe(540, bot - 30, 540, bot - 30 - step)
        else:
            swipe(540, top + 30, 540, top + 30 + step)
        px -= step
        time.sleep(settle)

def report(tag, x):
    vp = scroll_vp(x)
    cards = []
    for m in re.finditer(r'<node[^>]*text="([0-9a-fA-F]{4})"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups()[1:])
        cards.append((m.group(1), (b + d) // 2))
    icons = []
    for lbl in ('读取', '写入', '启用通知', '停止通知', '收起', '展开'):
        for q in desc_bounds(x, lbl):
            icons.append((q[1], lbl))
    icons.sort()
    hdr = txt_bounds(x, 'Unknown Service') + txt_bounds(x, 'OTA Service')
    log = txt_bounds(x, '操作日志')
    print(f'[{tag}] vp={vp} log={"Y@" + str(log[0]) if log else "N"} '
          f'cards={cards} hdr_ys={[h[1] for h in hdr]}')
    print(f'    icons={icons}')
    return vp

# ---- 前置：连接 + 清空 ----
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
print('connected:', '断开连接' in dump())
m = txt_bounds(dump(), '清空日志')
if m:
    tap(*m[0])
for _ in range(8):
    time.sleep(1)
    if '操作日志' not in dump():
        break

# ---- A：回顶 → 找主卡（c201·2）→ 展开 → 观察 +240 滚动 ----
def pair_cards(x):
    shorts = [(mm.group(1), (int(mm.group(2)) + int(mm.group(4))) // 2)
              for mm in re.finditer(r'<node[^>]*text="([0-9a-fA-F]{4})"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x)]
    badges = [(int(mm.group(1)), (int(mm.group(2)) + int(mm.group(4))) // 2)
              for mm in re.finditer(r'<node[^>]*text="(\d+) 特征值"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x)]
    out = []
    for su, sy in shorts:
        near = [n for n, by in badges if abs(by - sy) < 70]
        if near:
            out.append((sy, su, near[0]))
    return sorted(out)

for _ in range(8):          # 回顶
    before = pair_cards(dump())
    panel_scroll(280, down=False)
    if pair_cards(dump()) == before:
        break
main_c = None
for _ in range(10):
    x = dump()
    mc = [c for c in pair_cards(x) if c[1] == 'c201' and c[2] == 2]
    if mc:
        main_c = mc[0]
        break
    panel_scroll(280, down=True)
print('main card:', main_c)
if main_c:
    # 卡钉到 top+120 再展开
    vp = scroll_vp(dump())
    if main_c[0] > vp[0] + 160:
        panel_scroll(main_c[0] - (vp[0] + 120), down=True)
        x = dump()
        mc2 = [c for c in pair_cards(x) if c[1] == 'c201' and c[2] == 2]
        main_c = mc2[0] if mc2 else main_c
    e = min(desc_bounds(x, '展开'), key=lambda q: abs(q[1] - main_c[0]))
    tap(*e)
    time.sleep(1.8)
    report('A1 展开后', dump())
    panel_scroll(240, down=True)
    report('A2 +240 后', dump())
    panel_scroll(240, down=True)
    report('A3 +480 后', dump())
    # 回到控制行并订阅
    panel_scroll(480, down=False)
    x = dump()
    rr = desc_bounds(x, '读取')
    print('控制行读取:', rr)
    if rr:
        nn = desc_bounds(x, '启用通知')
        cy = min(rr, key=lambda q: q[1])[1]
        tn = min(nn, key=lambda q: abs(q[1] - cy)) if nn else None
        if tn:
            tap(*tn)
            for _ in range(8):
                time.sleep(1)
                if '通知已启用' in dump():
                    break
            # ---- B：订阅后小窗全量地图 ----
            report('B1 订阅后即时', dump())
            for i in range(8):
                panel_scroll(60, down=True)
                report(f'B2 下滚{i + 1}/8 (+60)', dump())
            for i in range(12):
                panel_scroll(60, down=False)
                report(f'B3 上滚{i + 1}/12 (-60)', dump())

adb('shell', 'am', 'force-stop', PKG)
adb('shell', 'svc', 'power', 'stayon', 'false')
print('probe2 done')
