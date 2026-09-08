# -*- coding: utf-8 -*-
# A-AND 详情页几何探针：连接夹具→清空日志→全节点 dump→多手势滚动测量（何者能滚列表）
# 输出：每个 text/content-desc 节点的 bounds + scrollable 容器 + 三次滚动前后卡头位置对比
import re, subprocess, sys, time, os

SERIAL = sys.argv[1] if len(sys.argv) > 1 else 'R5CR1284Y7H'
PKG = 'com.smartble'
FIX_NAME = 'BLEToolkit-Server'
XML = r'C:/Users/11066/AppData/Local/Temp/aand-probe.xml'
HERE = os.path.dirname(os.path.abspath(__file__))

def adb(*args, binary=False, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')

def dump():
    adb('shell', 'uiautomator', 'dump', '/sdcard/aand-probe.xml')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/aand-probe.xml', XML],
                   capture_output=True, env={**os.environ, 'MSYS_NO_PATHCONV': '1'})
    try:
        return open(XML, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''

def tap(x, y):
    adb('shell', 'input', 'tap', str(x), str(y))

def swipe(x1, y1, x2, y2, ms=350):
    adb('shell', 'input', 'swipe', str(x1), str(y1), str(x2), str(y2), str(ms))

def nodes(x):
    out = []
    for m in re.finditer(r'<node[^>]*?(?:text|content-desc)="[^"]+"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*?(?:class="([^"]+)")?[^>]*>', x):
        a, b, c, d = map(int, m.group(1, 2, 3, 4))
        frag = m.group(0)
        t = re.search(r'text="([^"]*)"', frag)
        cd = re.search(r'content-desc="([^"]*)"', frag)
        out.append({'b': (a, b, c, d), 't': t.group(1) if t else '', 'd': cd.group(1) if cd else ''})
    return out

def report(tag, x):
    print(f'---- {tag} ----')
    for n in nodes(x):
        if n['t'] or n['d']:
            cy = (n['b'][1] + n['b'][3]) // 2
            print(f"  y={cy:4d} x={(n['b'][0]+n['b'][2])//2:4d} [{n['b']}] text={n['t'][:44]!r} desc={n['d'][:20]!r}")
    for m in re.finditer(r'<node[^>]*scrollable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        print('  SCROLLABLE bounds', m.groups())
    hdr = re.findall(r'text="Unknown Service"[^>]*bounds="\[(\d+),(\d+)\]', x)
    ota = re.findall(r'text="OTA Service"[^>]*bounds="\[(\d+),(\d+)\]', x)
    print(f'  unknown_hdrs={hdr} ota_hdrs={ota}')
    return hdr, ota

# 前置
adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
adb('shell', 'wm', 'dismiss-keyguard')
adb('shell', 'svc', 'power', 'stayon', 'usb')
for perm in ('android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT',
             'android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION'):
    adb('shell', 'pm', 'grant', PKG, perm)
adb('logcat', '-c')
adb('shell', 'am', 'force-stop', PKG)
time.sleep(1)
adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1')
time.sleep(3)
# 扫描 + 等夹具（与主驱动同法：夹具名 text 锚定，取最近 连接 图标）
def txt_bounds(x, label):
    out = []
    for m in re.finditer(r'<node[^>]*text="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups())
        out.append(((a + c) // 2, (b + d) // 2))
    return out

def desc_bounds(x, label):
    out = []
    for m in re.finditer(r'<node[^>]*content-desc="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups())
        out.append(((a + c) // 2, (b + d) // 2))
    return out

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
name_p = txt_bounds(x, FIX_NAME)
conn_icons = desc_bounds(x, '连接')
print('fixture found:', bool(name_p), 'conn icons:', conn_icons[:3])
if name_p and conn_icons:
    tgt = min(conn_icons, key=lambda p: abs(p[1] - name_p[0][1]))
    tap(*tgt)
okconn = False
for _ in range(24):
    time.sleep(1.5)
    x = dump()
    if '断开连接' in x and 'Unknown Service' in x:
        okconn = True
        break
print('connected:', okconn)
if not okconn:
    adb('shell', 'am', 'force-stop', PKG)
    sys.exit('connect failed')
# 清空日志 → 大视口
m = re.search(r'text="清空日志"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', dump())
if m:
    a, b, c, d = map(int, m.groups())
    tap((a + c) // 2, (b + d) // 2)
for _ in range(8):
    time.sleep(1)
    if '操作日志' not in dump():
        break

xa = dump()
with open(os.path.join(HERE, 'probe-detail-cleared.xml'), 'w', encoding='utf-8') as f:
    f.write(xa)
report('A: 清空日志后（列表初始位置）', xa)

# 手势 1：带内慢滚 240（两段 120）
swipe(540, 2050, 540, 1930, 400); time.sleep(0.6)
swipe(540, 2050, 540, 1930, 400); time.sleep(0.9)
xb = dump()
report('B: 带内(y2050→1930)×2 后', xb)

# 手势 2：更大幅 480
for _ in range(4):
    swipe(540, 2080, 540, 1840, 400); time.sleep(0.5)
time.sleep(0.9)
xc = dump()
report('C: 带内 480px×4 后', xc)

# 手势 3：回到顶部再试 OtaCard 区（v5 病灶区 y1545）
for _ in range(6):
    swipe(540, 1900, 540, 2200, 400); time.sleep(0.5)
time.sleep(0.9)
xd = dump()
hdr_d = report('D: 滚回顶后', xd)
swipe(540, 1545, 540, 1425, 400); time.sleep(0.6)
swipe(540, 1545, 540, 1425, 400); time.sleep(1.0)
xe = dump()
report('E: OtaCard 区(y1545→1425)×2 后', xe)

# 手势 4：展开最顶未知卡，看行结构 + 特征值徽标是否进 dump
mm = re.search(r'text="Unknown Service"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', xe)
if mm:
    a, b, c, d = map(int, mm.groups())
    tap((a + c) // 2, (b + d) // 2)
    time.sleep(1.6)
    xf = dump()
    with open(os.path.join(HERE, 'probe-detail-expanded.xml'), 'w', encoding='utf-8') as f:
        f.write(xf)
    report('F: 展开最顶未知卡后', xf)
    # 收起
    tap((a + c) // 2, (b + d) // 2)
    time.sleep(1.0)

adb('shell', 'am', 'force-stop', PKG)
adb('shell', 'svc', 'power', 'stayon', 'false')
print('probe done')
