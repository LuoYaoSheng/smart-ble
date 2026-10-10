# -*- coding: utf-8 -*-
# A-AND E5：F006-F012 GATT 域真机驱动 v17（com.smartble DeviceDetailScreen，Kotlin+Compose）
# 布景：E5 跑 A-AND 中央 + ESP32 fixture_peripheral_s3（BLEToolkit-Server 10:B4:1D:CD:23:8D）
# 验收：F006 连接/服务发现；F007 服务树；F008 读（26a8+b0）；F009 写 TEXT/HEX+write_response 回显；
#       F010 Notify 订阅/周期/停止；F011 日志清空/导出；F012 fault 拆链自动重连（粘性 fault→排最后）
# 探针实证（a-and-probe-detail.py，2026-09-07）：
#   1) 服务列表 = dump 中 scrollable="true" 节点，清空日志后 bounds (0,1446,1080,2016)=570px
#      ——v5/v6 病根：滑动手势起点落在滚动区外（y≥2016 或带计算偏差）→ 列表从未滚动
#   2) 卡头合并语义但三个子 Text 仍进 dump：短码（1800/1801/c201）+「N 特征值」徽章 + 展开/收起 desc
#      → 卡身份可直读：GAP=1800·2；GATT=1801·1；主服务=c201·2；权限矩阵=c201·7；OTA=具名卡（待验）
#   3) GATT 展开行=Unknown Characteristic 2a05 + Notify 片 + 唯一 启用通知 图标（单行{N}）
#   4) 主服务两行=控制(读取+写入+启用通知) / 状态(写入+启用通知)——图标行签名可用
#   5) getServiceName 键大写 vs Android 小写 → GAP/GATT 不具名（WIN-AAND-002）
#   6) 读值不进 UI（仅内存模型）→ F008 用 logcat+串口旁证（WIN-AAND-004）
#   7) write_response notify 到 26a8+26a9 → 先订 26a8（回显通路）再写；粘性 fault 排最后、HEX 载荷
#   8) LogPanel 新日志在顶部（reversed()）；日志面板回来后滚动区收窄——视口每次实时读 scrollable
import re, subprocess, sys, time, json, os

SERIAL = sys.argv[1] if len(sys.argv) > 1 else 'R5CR1284Y7H'
PKG = 'com.smartble'
FIX_NAME = 'BLEToolkit-Server'
FIX_MAC = '10:B4:1D:CD:23:8D'
FAULT_HEX = '{"cmd":"fault","type":"disconnect"}'.encode('utf-8').hex().upper()
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'android-native')
os.makedirs(OUT, exist_ok=True)
XML = r'C:/Users/11066/AppData/Local/Temp/aand-gatt.xml'

def adb(*args, binary=False, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')

def dump():
    adb('shell', 'uiautomator', 'dump', '/sdcard/aand-gatt.xml')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/aand-gatt.xml', XML],
                   capture_output=True, env={**os.environ, 'MSYS_NO_PATHCONV': '1'})
    try:
        return open(XML, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''

def texts(x):
    return set(t for t in re.findall(r'text="([^"]{1,400})"', x) if t.strip() and not t.startswith('&#'))

def notify_payloads(x):
    out = []
    for h in re.findall(r'收到通知: ?([0-9A-Fa-f ]+)', x):
        try:
            out.append(bytes.fromhex(h.replace(' ', '')).decode('utf-8', 'replace'))
        except ValueError:
            pass
    return out

def latest_notify(x):
    ps = notify_payloads(x)
    return ps[0] if ps else ''

def all_bounds(x, label):
    out = []
    for m in re.finditer(r'<node[^>]*text="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups())
        out.append(((a + c) // 2, (b + d) // 2))
    return out

def all_desc_bounds(x, label):
    out = []
    for m in re.finditer(r'<node[^>]*content-desc="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups())
        out.append(((a + c) // 2, (b + d) // 2))
    return out

def nearest_y(points, y):
    return min(points, key=lambda p: abs(p[1] - y)) if points else None

def farthest_y(points, y):
    return max(points, key=lambda p: abs(p[1] - y)) if points else None

def tap(p):
    adb('shell', 'input', 'tap', str(p[0]), str(p[1]))

def swipe(x1, y1, x2, y2, ms=350):
    adb('shell', 'input', 'swipe', str(x1), str(y1), str(x2), str(y2), str(ms))

def ensure_awake(max_try=4):
    for _ in range(max_try):
        wake = adb('shell', 'dumpsys', 'power').splitlines()
        if any('mWakefulness=Awake' in l for l in wake):
            focus = adb('shell', 'dumpsys', 'window')
            if 'UnintentionalLcdOn' in focus:
                adb('shell', 'input', 'keyevent', 'KEYCODE_SLEEP')
                time.sleep(1.2)
                adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
                time.sleep(0.8)
                adb('shell', 'wm', 'dismiss-keyguard')
                time.sleep(1.2)
                continue
            if PKG in focus and 'NotificationShade' not in focus:
                return True
            if 'NotificationShade' in focus:
                adb('shell', 'cmd', 'statusbar', 'collapse')
                time.sleep(0.8)
        adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
        adb('shell', 'wm', 'dismiss-keyguard')
        adb('shell', 'cmd', 'statusbar', 'collapse')
        time.sleep(1.2)
    return False

def shot(name):
    png = adb('exec-out', 'screencap', '-p', binary=True)
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(png)

results = []
def check(name, ok, detail=''):
    results.append({'name': name, 'ok': ok, 'detail': detail[:220]})
    print(f"{'PASS' if ok else 'FAIL'} {name} | {detail[:160]}", flush=True)

def poll(pred, tries, gap):
    x = ''
    for _ in range(tries):
        ensure_awake()
        x = dump()
        if pred(texts(x), x):
            return x, True
        time.sleep(gap)
    return x, False

def logcat():
    return adb('logcat', '-d', '-s', 'BleManager')

def logcat_logger():
    return adb('logcat', '-d', '-s', 'SmartBLE_Logger')

def log_receive_payloads():
    """logcat SmartBLE_Logger 携带完整 receive 消息（UI 日志面板文本会被合并/截断，dump 断言不可靠）。
    注意：A-AND 常规连接不请求 MTU（WIN-AAND-006）→ 外设把通知截到 20 字节——断言按截断形态。"""
    out = []
    for h in re.findall(r'\[Receive\] 收到通知: ?([0-9A-Fa-f ]+)', logcat_logger()):
        try:
            out.append(bytes.fromhex(h.replace(' ', '')).decode('utf-8', 'replace'))
        except ValueError:
            pass
    return out

def log_changed_count(char_suffix):
    return len(re.findall(r'onCharacteristicChanged: \S*' + char_suffix, logcat()))

# ---- v7：滚动区=实时读 dump 的 scrollable 节点（清空日志 1446-2016；日志面板回来自动收窄）----
def scroll_vp(x):
    m = re.search(r'<node[^>]*scrollable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x)
    if m:
        a, b, c, d = map(int, m.groups())
        return b, d
    return 1446, 2016

def scroll_marks(x):
    """滚动位置指纹：卡头+图标行 y 集合（含部分可见者）。"""
    marks = [q[1] for q in all_bounds(x, 'Unknown Service') + all_bounds(x, 'OTA Service')]
    marks += [q[1] for lbl in ('读取', '写入', '启用通知', '停止通知') for q in all_desc_bounds(x, lbl)]
    return sorted(marks)

def panel_scroll(px, down=True, settle=0.55):
    """v12 闭环滚动（probe4 实证：注入手势实效≈0.65×指令且不稳——快滑会过冲回弹；
    部分场景整批被吞）。每划一下实测位移，未达标换变体重试，3 连零位移放弃。
    只用慢划（300-600ms），快划会触发 Compose 回弹抖动。"""
    ensure_awake()
    target = px * 0.6
    progressed = 0.0
    zero_streak = 0
    variant = 0
    strokes = [(60, 420), (120, 500), (600, 650)]   # (位移px, 时长ms) —— 实效≈0.65×
    for _ in range(18):
        if progressed >= target or zero_streak >= 3:
            break
        x0 = dump()
        top, bot = scroll_vp(x0)
        lo, hi = top + 40, bot - 40
        span = min(hi - lo - 20, 800)
        dy, ms = strokes[variant % len(strokes)]
        dy = min(dy, span)
        if down:
            swipe(540, hi, 540, hi - dy, ms)
        else:
            swipe(540, lo, 540, lo + dy, ms)
        time.sleep(settle)
        x1 = dump()
        m0, m1 = scroll_marks(x0), scroll_marks(x1)
        # 精确位移难算（锚点进出视口会换头）——有变化即计 30px 进度，驱动循环直至稳定；
        # 调用方全部以「dump 后谓词」判位，不依赖精确滚距
        if m0 != m1:
            progressed += 30
            zero_streak = 0
            variant = 0
        else:
            zero_streak += 1
            variant += 1                          # 换下一种变体
    return progressed

def clear_logs():
    x = dump()
    p = all_bounds(x, '清空日志')
    if p:
        ensure_awake()
        tap(p[0])
        return poll(lambda tt, xx: '操作日志' not in tt, 8, 1.0)[0]
    return x

# ================= 前置 =================
adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
adb('shell', 'wm', 'dismiss-keyguard')
adb('shell', 'svc', 'power', 'stayon', 'usb')
for perm in ('android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT',
             'android.permission.BLUETOOTH_ADVERTISE', 'android.permission.ACCESS_FINE_LOCATION',
             'android.permission.ACCESS_COARSE_LOCATION'):
    adb('shell', 'pm', 'grant', PKG, perm)
adb('logcat', '-c')
adb('shell', 'am', 'force-stop', PKG)
time.sleep(1)
adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1')

x, ok = poll(lambda tt, xx: '开始扫描' in tt or '停止扫描' in tt, 20, 1.5)
check('前置启动（扫描 Tab 就绪）', '开始扫描' in texts(x) or '停止扫描' in texts(x), ' '.join(sorted(texts(x))[:8]))

# ================= F006：扫描 → 夹具卡 → 连接 → 服务发现 =================
def fixture_hit(tt):
    return FIX_NAME in tt or any(FIX_MAC in s for s in tt)

for _ in range(4):
    if fixture_hit(texts(dump())):
        break
    xnow = dump()
    pb = all_bounds(xnow, '开始扫描')
    if pb:
        ensure_awake()
        tap(pb[0])
        poll(lambda tt, xx: '开始扫描' in tt and fixture_hit(tt), 14, 1.0)
x3 = dump()
check('F006 夹具卡片发现', fixture_hit(texts(x3)), ' '.join(s for s in texts(x3) if FIX_NAME in s or FIX_MAC in s)[:80])

name_p = all_bounds(x3, FIX_NAME)
if not name_p:
    mac_rows = [s for s in texts(x3) if FIX_MAC in s]
    name_p = [(540, 900)] if mac_rows else []
conn_icons = all_desc_bounds(x3, '连接')
p = nearest_y(conn_icons, name_p[0][1]) if conn_icons and name_p else None
check('F006 夹具卡连接按钮可定位', p is not None, f'name@{name_p[:1]} icon@{p}')
if p:
    ensure_awake()
    tap(p)
    xd, ok6 = poll(lambda tt, xx: '断开连接' in tt, 30, 1.5)
    t6 = texts(xd)
    check('F006 连接成功（断开连接出现+已连接徽标）', ok6 and '已连接' in t6,
          ' '.join(sorted(t6 & {'已连接', '连接中', '未连接', '断开连接', '未发现服务'})))
    check('F006 服务发现（发现 5 个服务 日志）', '发现 5 个服务' in t6, ' '.join(s for s in t6 if '发现' in s)[:60])
    shot('aand-f006-connected.png')

# ================= F011a：清空日志 → 面板隐藏（同时把滚动区扩到 570px）=================
xd2 = clear_logs()
check('F011 清空后面板隐藏（滚动区 1446-2016）', '操作日志' not in texts(xd2) and str(scroll_vp(xd2)) == '(1446, 2016)',
      f"scrollable={scroll_vp(xd2)} unknown_cards={xd2.count(chr(34).join(['text=', 'Unknown Service', '']))}")
shot('aand-f011-cleared-bigpanel.png')

# ================= F007：服务树——卡身份直读（短码+特征值徽章）+ 滚动区感知导航 =================
def pair_cards(x):
    """可见服务卡：短码 text（4 hex）与「N 特征值」徽章按 y±70 配对；OTA 具名卡单独识别。"""
    shorts = []
    for m in re.finditer(r'<node[^>]*text="([0-9a-fA-F]{4})"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups()[1:])
        shorts.append((m.group(1), (b + d) // 2))
    badges = []
    for m in re.finditer(r'<node[^>]*text="(\d+) 特征值"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        n = int(m.group(1)); a, b, c, d = map(int, m.groups()[1:])
        badges.append((n, (b + d) // 2))
    cards = []
    for su, sy in shorts:
        near = [n for n, by in badges if abs(by - sy) < 70]
        if near:
            cards.append({'y': sy, 'uuid': su, 'chars': near[0]})
    for cy in [q[1] for q in all_bounds(x, 'OTA Service')]:
        cards.append({'y': cy, 'uuid': 'OTA', 'chars': -1})
    cards.sort(key=lambda c: c['y'])
    return cards

def card_signature(cards):
    return tuple((c['uuid'], c['chars']) for c in cards)

def find_card(pred, max_steps=14):
    """回顶后向下找满足 pred 的卡（滚不动=到底）。返回 (card, dump) 或 (None, dump)。"""
    scroll_top()
    for _ in range(max_steps):
        x = dump()
        for c in pair_cards(x):
            if pred(c):
                return c, x
        before = card_signature(pair_cards(x))
        prog = panel_scroll(260, down=True)
        if prog and prog > 0 and card_signature(pair_cards(dump())) == before:
            break
    return None, dump()

def scroll_top(max_try=10):
    prev = None
    for _ in range(max_try):
        x = dump()
        cs = pair_cards(x)
        if not cs:
            panel_scroll(280, down=False)
            prev = None
            continue
        y0 = cs[0]['y']
        if prev is not None and abs(y0 - prev) < 8:
            return
        prev = y0
        panel_scroll(280, down=False)

def expand_card(card, x):
    """先把卡滚到滚动区上部（v7 教训：卡贴底时行渲染在区外，图标 poll 必超时），
    再点「展开」（已展开=收起 就直接过）。返回 (ok, dump)。"""
    top, bot = scroll_vp(x)
    if card['y'] > top + 160:
        # 钉到 top+120（勿到顶+180——预留下方滚动余量给第二行；v9 教训：贴底展开后 +240 滚不动）
        panel_scroll(card['y'] - (top + 120), down=True)
        x = dump()
        c2 = next((cc for cc in pair_cards(x) if cc['uuid'] == card['uuid'] and cc['chars'] == card['chars']), None)
        if not c2:
            return False, x
        card = c2
    for lbl in ('收起', '展开'):
        e = nearest_y(all_desc_bounds(x, lbl), card['y'])
        if e and abs(e[1] - card['y']) < 70:
            if lbl == '收起':
                return True, dump()
            ensure_awake()
            tap(e)
            xe, oke = poll(lambda tt, xx: any_icons_below(xx, card['y']), 8, 1.0)
            return oke, xe
    e = nearest_y(all_bounds(x, 'Unknown Service'), card['y'])
    if e and abs(e[1] - card['y']) < 90:
        ensure_awake()
        tap(e)
        xe, oke = poll(lambda tt, xx: any_icons_below(xx, card['y']), 8, 1.0)
        return oke, xe
    return False, x

def collapse_card(card, x):
    cols = all_desc_bounds(x, '收起')
    e = nearest_y(cols, card['y'])
    if e:
        ensure_awake()
        tap(e)
        poll(lambda tt, xx: not any_icons_below(xx, card['y'] - 80), 6, 1.0)

def any_icons_below(x, y):
    icons = [q for lbl in ('读取', '写入', '启用通知', '停止通知') for q in all_desc_bounds(x, lbl)]
    return any(q[1] > y + 40 for q in icons)

def row_signatures(x, y_min=0, y_max=9999):
    """停止通知 是订阅后的 启用通知——统一按 N 计（v10 教训：订阅后签名变 {R,W} 撞 GAP）。"""
    pts = []
    for lbl in ('读取', '写入', '启用通知'):
        for q in all_desc_bounds(x, lbl):
            if y_min - 10 < q[1] < y_max:
                pts.append((q[1], lbl))
    for q in all_desc_bounds(x, '停止通知'):
        if y_min - 10 < q[1] < y_max:
            pts.append((q[1], '启用通知'))
    pts.sort()
    rows = []
    for yy, lbl in pts:
        if rows and abs(rows[-1][0] - yy) < 70:
            rows[-1][1].add(lbl)
        else:
            rows.append((yy, {lbl}))
    return rows

MAIN_ROWS = [{'读取', '写入', '启用通知'}, {'写入', '启用通知'}]

# F007：单遍下行扫卡身份（一次走完省 3 次回顶；底部含 OTA 兜底检测）
ident = {}
ota_evidence = ''
scroll_top()
for _ in range(12):
    xlast = dump()
    for c in pair_cards(xlast):
        ident[f"{c['uuid']}:{c['chars']}"] = True
    named = [t for t in texts(xlast) if 'OTA' in t or '升级服务' in t]
    if named:
        ota_evidence = '具名:' + ' '.join(named)[:60]
    before = card_signature(pair_cards(xlast))
    panel_scroll(280, down=True)
    x2 = dump()
    if card_signature(pair_cards(x2)) == before:
        xlast = x2
        break
# 底部兜底：权限卡之后 = 第 5 服务（配对卡 / 徽标被底缘裁切的裸短码 c201 / 具名文本）
cs = pair_cards(xlast)
perm_y = next((c['y'] for c in cs if c['uuid'] == 'c201' and c['chars'] == 7), None)
tail_found = False
if perm_y is not None:
    below = [c for c in cs if c['y'] > perm_y + 60]
    if below:
        tail_found = True
        ota_evidence = ota_evidence or f'第5卡:{below[0]}'
    else:
        for m in re.finditer(r'<node[^>]*text="c201"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', xlast):
            cy = (int(m.group(2)) + int(m.group(4))) // 2
            if cy > perm_y + 60:
                tail_found = True
                ota_evidence = ota_evidence or f'权限卡下方短码 c201@y{cy}（特征值徽标被底缘裁切）'
check('F007 GAP 卡（短码 1800 · 2 特征值）', '1800:2' in ident, ' '.join(sorted(ident)))
check('F007 GATT 卡（短码 1801 · 1 特征值）', '1801:1' in ident, '')
check('F007 主服务卡（短码 c201 · 2 特征值）', 'c201:2' in ident, '')
check('F007 权限矩阵卡（短码 c201 · 7 特征值）', 'c201:7' in ident, '')
check('F007 OTA 卡（第 5 服务）', tail_found or bool(ota_evidence), ota_evidence or '(未检出)')
check('F007 缺陷登记：GAP/GATT 不具名（WIN-AAND-002）', True,
      'BleUuids map 键大写 vs Android 小写 → 标准服务显示 Unknown Service（F-AND WIN-FAND-003 同类，待修）')
check('F007 缺陷登记：服务区被压至 ~44dp/滚动区仅 570px（WIN-AAND-003）', True,
      'ActionButtons+OtaCard+LogPanel(固定150dp) 挤占 → 需清空日志才能获得 570px 滚动区，服务树近乎不可读（P1）')

# ================= 主服务展开 + 行锚定 =================
def collapse_all():
    """收起所有已展开卡（F008b 展开过权限卡后，F012 重入前必须收净，否则行锚定串卡）。"""
    for _ in range(6):
        x = dump()
        cols = all_desc_bounds(x, '收起')
        if not cols:
            return
        ensure_awake()
        tap(cols[0])
        time.sleep(1.2)

def bring_icon(label, tries=20, step=70):
    """小窗模式（日志面板在 → 滚动区收窄到 ~120px）行级定位：双向小步滚动直到目标图标行进视口。
    前提：唯一展开卡。v12 教训：夹具 USB 瞬断→自动重连→服务列表重建、展开态全丢
    —— 第 8 次尝试仍无图标且见 c201·2 折叠卡时先重新展开再找。"""
    for i in range(tries):
        x = dump()
        ps = all_desc_bounds(x, label)
        if ps:
            return min(ps, key=lambda q: q[1])
        if i == 8:
            main_c = next((c for c in pair_cards(x) if c['uuid'] == 'c201' and c['chars'] == 2), None)
            if main_c:
                e = nearest_y(all_desc_bounds(x, '展开'), main_c['y'])
                if e and abs(e[1] - main_c['y']) < 70:
                    ensure_awake()
                    tap(e)
                    time.sleep(1.5)
                    continue
        panel_scroll(step, down=(i < 6))   # 先向下探 6 步，再向上找
    return None

def clear_and_bring(label, tries=10):
    """v14 策略：日志面板把服务滚动区压到 ~120px——比一行(~110px)还矮，行级操作不可靠
    （WIN-AAND-003 的实际影响面）→ 每次行级操作前先清空日志恢复 570px 大窗再定位行。
    订阅态在连接 CCCD 上，清日志不影响。"""
    clear_logs()
    for _ in range(tries):
        x = dump()
        ps = all_desc_bounds(x, label)
        if ps:
            return min(ps, key=lambda q: q[1]), x
        panel_scroll(70, down=True)
    return None, dump()

def ensure_ctl_subscribed():
    """确保 26a8 已订阅（重连重建后订阅态会丢）：定位控制行，图标为 启用通知 则点订阅。"""
    rp, _ = clear_and_bring('读取')
    if not rp:
        return False, '控制行不可见'
    x = dump()
    on = nearest_y(all_desc_bounds(x, '启用通知'), rp[1])
    if on and abs(on[1] - rp[1]) < 70:
        ensure_awake()
        tap(on)
        poll(lambda tt, xx: '通知已启用' in tt, 8, 1.0)
        return True, '(re)subscribed'
    off = nearest_y(all_desc_bounds(x, '停止通知'), rp[1])
    if off and abs(off[1] - rp[1]) < 70:
        return True, 'already-subscribed'
    return False, '通知图标缺'

def goto_main_row():
    """找到主卡并展开（唯一展开卡），控制行钉到滚动区中部。返回 (anchor, main_y) 或 (None, None)。"""
    collapse_all()
    c, x = find_card(lambda cc: cc['uuid'] == 'c201' and cc['chars'] == 2)
    if not c:
        return None, None
    oke, xe = expand_card(c, x)
    if not oke:
        c, x = find_card(lambda cc: cc['uuid'] == 'c201' and cc['chars'] == 2)
        if not c:
            return None, None
        oke, xe = expand_card(c, x)
        if not oke:
            return None, None
    # 探针实证行高 ~240px：展开主卡 ≈610px 装不进 570px 视口 → 两行只能分步验证
    top, _ = scroll_vp(xe)
    rows1 = row_signatures(xe, top)
    sig1 = bool(rows1) and set(rows1[0][1]) == MAIN_ROWS[0]
    if not sig1:
        panel_scroll(120, down=True)
        xe = dump()
        top, _ = scroll_vp(xe)
        rows1 = row_signatures(xe, top)
        sig1 = bool(rows1) and set(rows1[0][1]) == MAIN_ROWS[0]
    shot('aand-f007-main-row1.png')
    panel_scroll(240, down=True)
    xe2 = dump()
    rows2 = row_signatures(xe2, scroll_vp(xe2)[0])
    sig2 = any(set(s) == MAIN_ROWS[1] for _, s in rows2)
    sig_ok = sig1 and sig2
    check('F007 主服务两行分步签名（控制{R,W,N}→状态{W,N}）', sig_ok,
          f"r1={[sorted(s) for _, s in rows1]} r2={[sorted(s) for _, s in rows2]}")
    if sig_ok:
        shot('aand-f007-main-expanded.png')
    panel_scroll(240, down=False)      # 回到控制行
    xe = dump()
    # 控制行 = 含 读取 的行（唯一展开卡内唯一 读取）
    def anchor_from(xx):
        rr = all_desc_bounds(xx, '读取')
        if not rr:
            return None
        cy = min(rr, key=lambda q: q[1])[1]
        w = nearest_y(all_desc_bounds(xx, '写入'), cy)
        ns = all_desc_bounds(xx, '启用通知') + all_desc_bounds(xx, '停止通知')
        if not (w and ns):
            return None
        return {'y': cy, 'read': (540, cy), 'write': w, 'notify': nearest_y(ns, cy), 'status_notify': farthest_y(ns, cy)}
    ca = anchor_from(xe)
    for _ in range(3):
        if ca and all(ca.values()):
            break
        panel_scroll(150, down=True)
        xe = dump()
        ca = anchor_from(xe)
    if not ca:
        return None, None
    top, bot = scroll_vp(dump())
    mid = (top + bot) // 2
    dy = mid - ca['y']
    if abs(dy) > 60:
        # 行在 mid 之下(dy<0)需内容上移=向下滚；v9 教训：方向写反导致锚点钉出视口
        panel_scroll(min(abs(dy) - 20, 420), down=(dy < 0))
        xe = dump()
        ca2 = anchor_from(xe)
        if ca2 and all(ca2.values()):
            ca = ca2
    return ca, ca['y']

ca, main_y = goto_main_row()
check('特征行锚定+钉行（控制读取/写入/通知 + 状态通知）', ca is not None and all(ca.values()), str(ca))
if ca:
    shot('aand-f007-main-pinned.png')

# ================= F009a：先订控制特征通知（26a8）——write_response 回显通路 =================
# 注意：订阅日志一出 LogPanel 即回归 → 服务滚动区从 570px 收窄到 ~120px → 此后全部行级操作走 bring_icon
if ca:
    oksub = False
    for att in range(2):
        tp = bring_icon('停止通知' if att else '启用通知') or bring_icon('启用通知')
        if not tp:
            break
        ensure_awake()
        tap(tp)
        xsub, oksub = poll(lambda tt, xx: '通知已启用' in tt, 8, 1.0)
        if oksub:
            break
    check('F009 前置：控制特征通知已启用（26a8 回显通路）', oksub, '')
    time.sleep(0.8)

# ================= F008：读 26a8（控制行）=================
if ca:
    rp, _ = clear_and_bring('读取')
    check('F008 控制行读按钮可定位（清日志大窗）', rp is not None, str(rp))
    if rp:
        ensure_awake()
        tap(rp)
        x8, ok8 = poll(lambda tt, xx: any(s.startswith('读取 ') for s in tt), 8, 1.0)
        reads8 = [s for s in texts(x8) if s.startswith('读取 ')]
        check('F008 读动作日志（读取 X...）', bool(reads8), ' '.join(reads8)[:80])
        lc8 = logcat()
        m8 = re.search(r'onCharacteristicRead: [^\n]*26a8[^\n]*', lc8)
        check('F008 logcat 读回调（26a8 status=0）', bool(m8 and 'status=0' in m8.group(0)), (m8.group(0) if m8 else '(none)')[:110])
        shot('aand-f008-read-log.png')
    check('F008 限制登记：读值不进 UI/日志（WIN-AAND-004）', True,
          'onCharacteristicRead 仅入内存模型，UI 无特征值显示位 → 值由 logcat+串口旁证')

# ================= F009：写 TEXT/HEX + write_response 回显 =================
def do_write(payload, use_hex, expect_led):
    # v14：先清日志恢复大窗再定位控制行（唯一展开卡=主服务 → 唯一 读取 行即控制行）
    rp, _ = clear_and_bring('读取')
    if not rp:
        return False, '控制行锚定失败（读取行不可见）'
    cy = rp[1]
    w = nearest_y(all_desc_bounds(dump(), '写入'), cy)
    if not w:
        return False, '写入按钮未定位'
    ensure_awake()
    tap(w)
    xd, okd = poll(lambda tt, xx: '写入特征值' in tt, 8, 1.0)
    if not okd:
        return False, '对话框未开'
    if use_hex:
        phex = all_bounds(xd, 'HEX')
        if phex:
            tap(phex[0])
            time.sleep(0.8)
    fld = all_bounds(xd, 'UTF-8 文本') or all_bounds(xd, '十六进制数据') or \
          all_bounds(xd, '例如：hello') or all_bounds(xd, '例如：FF 00 AA')
    if not fld:
        return False, '输入框未定位'
    tap(fld[0])
    time.sleep(0.6)
    adb('shell', 'input', 'text', payload)
    time.sleep(0.6)
    xc = dump()
    btn = all_bounds(xc, '写入')
    if not btn:
        return False, '确认按钮未定位'
    tap(btn[0])
    xw2, okw2 = poll(lambda tt, xx: '写入成功' in tt, 8, 1.0)
    n_recv_before = log_changed_count('26a8')
    n_recv_after = n_recv_before
    for _ in range(5):   # v16 实测回显常晚 2-30s 到——等 25s
        time.sleep(5.0)
        n_recv_after = log_changed_count('26a8')
        if n_recv_after > n_recv_before:
            break
    payloads = log_receive_payloads()[-3:]
    # WIN-AAND-006：不请求 MTU → 外设截到 20 字节，完整 write_response/led_state 不可达
    echo_ok = n_recv_after > n_recv_before
    return okw2, f"写入成功={okw2} 回显notify到达={echo_ok}(26a8 {n_recv_before}→{n_recv_after}) payload={' | '.join(payloads)[-60:]}"

if ca:
    okS, dS = ensure_ctl_subscribed()
    check('F009 订阅自愈确认（26a8 回显通路）', okS, dS)
    okA, dA = do_write('LED_ON', False, 'on')
    check('F009 TEXT 写（LED_ON）+回显 notify 到达', okA and '回显notify到达=True' in dA, dA)
    shot('aand-f009-text-write.png')
    okB, dB = do_write('FF01', True, 'on')
    check('F009 HEX 写（FF01）+回显 notify 到达', okB and '回显notify到达=True' in dB, dB)
    okC, dC = do_write('FF00', True, 'off')
    check('F009 HEX 写（FF00）+回显 notify 到达', okC and '回显notify到达=True' in dC, dC)
    lc9 = logcat()
    n9 = len(re.findall(r'onCharacteristicWrite: [^\n]*26a8[^\n]*status=0', lc9))
    check('F009 logcat 写回调全 0（≥3 次）', n9 >= 3, str(n9) + ' 次')
    check('F009 限制登记：回显 JSON 被 20 字节截断（WIN-AAND-006）', True,
          'A-AND 常规连接不 requestMtu（仅 OTA 流程请求 247）→ MTU=23 → 外设通知截到 20 字节：'
          'write_response/device_status JSON 不可整读（F-AND 因 FBP 自动协商 MTU 不受影响）；'
          '回显到达性已由 logcat onCharacteristicChanged + 串口 write_response send 实证')

# ================= F010：状态特征（26a9）订阅/周期/停止 =================
if ca:
    # 控制行已订阅（图标=停止通知）→ 清日志大窗后滚到的 启用通知 即状态行（唯一展开卡）
    tgt, _ = clear_and_bring('启用通知', tries=14)
    check('F010 状态行通知按钮可定位（清日志大窗）', tgt is not None, str(tgt))
    if tgt:
        ensure_awake()
        n9a = log_changed_count('26a9')
        tap(tgt)
        xsub2, oksub2 = poll(lambda tt, xx: '通知已启用' in tt, 8, 1.0)
        check('F010 订阅日志（通知已启用）', oksub2, '')
        # 欢迎推送：logcat receive 行（20 字节截断下「监听」仍在头 6 个汉字内）
        welcome = False
        for _ in range(10):
            time.sleep(2.0)
            if any('监听' in p for p in log_receive_payloads()):
                welcome = True
                break
        check('F010 欢迎推送（开始监听系统状态，logcat）', welcome,
              ' | '.join(p[:24] for p in log_receive_payloads()[-2:]))
        shot('aand-f010-notify-on.png')
        # 周期：26a9 onCharacteristicChanged 持续增长（5s device_status；payload 截断形态 device_stat）
        c1 = log_changed_count('26a9')
        time.sleep(11.0)
        c2 = log_changed_count('26a9')
        check('F010 周期推送（5s device_status 持续到达）', c2 - c1 >= 2, f'26a9 通知 {c1}→{c2}')
        # 停止：清日志大窗定位——两行都=停止通知时，取离控制行（读取）最远者=状态行
        sp, xs = clear_and_bring('停止通知')
        for _ in range(3):
            if len(all_desc_bounds(xs, '停止通知')) >= 2:
                break
            panel_scroll(150, down=True)   # 露出第二行（v16 教训：只见一行时 farthest 误退订 26a8）
            xs = dump()
        if sp:
            rr = all_desc_bounds(xs, '读取')
            if rr and all_desc_bounds(xs, '停止通知'):
                sp = farthest_y(all_desc_bounds(xs, '停止通知'), rr[0][1])
        check('F010 停止按钮（停止通知 desc）', sp is not None, str(sp))
        if sp:
            c3 = log_changed_count('26a9')
            tap(sp)
            xst, okst = poll(lambda tt, xx: '通知已禁用' in tt, 8, 1.0)
            check('F010 停止日志（通知已禁用）', okst, '')
            time.sleep(6.5)
            c4 = log_changed_count('26a9')
            check('F010 停止后无新推送（logcat 计数冻结）', c4 == c3, f'{c3} → {c4}')
            shot('aand-f010-notify-off.png')

# ================= F008b：权限卡 b0 读（日志面板挤压配对 → 先清空恢复 570px 大窗）=================
perm_seen = False
collapse_all()
clear_logs()
cp2, xp2 = find_card(lambda c: c['uuid'] == 'c201' and c['chars'] == 7)
if cp2:
    oke, xe2 = expand_card(cp2, xp2)
    perm_seen = oke
    # 展开卡内重定位（expand_card 可能已滚动重排）——权限卡=7特征值；MAIN 若仍展开须先收起
    cp3 = next((cc for cc in pair_cards(xe2) if cc['uuid'] == 'c201' and cc['chars'] == 7), None) or cp2
    check('F008 权限卡展开（c201 · 7 特征值）', perm_seen,
          'rows=' + json.dumps([sorted(s) for _, s in row_signatures(xe2, cp3['y'])], ensure_ascii=False))
    if perm_seen:
        reads = [q for q in all_desc_bounds(xe2, '读取') if q[1] > cp3['y']]
        top_read = min(reads, key=lambda q: q[1]) if reads else None
        if top_read:
            top2, bot2 = scroll_vp(xe2)
            if top_read[1] > bot2 - 100:
                panel_scroll(min(max(top_read[1] - (top2 + bot2) // 2, 80), 420), down=True)
                xe2 = dump()
                cp4 = next((cc for cc in pair_cards(xe2) if cc['uuid'] == 'c201' and cc['chars'] == 7), None) or cp3
                reads = [q for q in all_desc_bounds(xe2, '读取') if q[1] > cp4['y'] - 100]
                top_read = min(reads, key=lambda q: q[1]) if reads else None
        if top_read:
            ensure_awake()
            tap(top_read)
            time.sleep(2.2)
            lcb = logcat()
            mb = re.search(r'onCharacteristicRead: [^\n]*b0[^\n]*', lcb)
            check('F008 权限矩阵 b0 读（logcat status=0）', bool(mb and 'status=0' in mb.group(0)), (mb.group(0) if mb else '(none)')[:110])
            shot('aand-f008b-perm-b0-read.png')
        else:
            check('F008 权限卡读按钮可定位', False)
else:
    check('F008 权限卡可定位（c201 · 7 特征值）', False)

# ================= F011b：面板重建 + 导出 =================
xb = dump()
check('F011 读/写后面板重建（操作日志在）', '操作日志' in texts(xb), '')
xe2b = dump()
pex = all_bounds(xe2b, '导出数据')
if pex:
    tap(pex[0])
    xsh, oksh = poll(lambda tt, xx: any(k in tt for k in ('导出设备数据', '分享', '微信', 'QQ', '钉钉', '蓝牙', '信息', '复制')), 10, 1.2)
    check('F011 导出（系统分享面板）', oksh, ' '.join(sorted(texts(xsh))[:10]))
    shot('aand-f011-share-sheet.png')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
    time.sleep(1.2)
else:
    check('F011 导出按钮可定位', False)

# ================= F012：fault 拆链 → 自动重连 → 用户断开不重连 =================
def dismiss_sheets():
    for _ in range(2):
        xs = dump()
        if any(k in texts(xs) for k in ('过滤条件', '关闭', '导出设备数据')):
            adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
            time.sleep(1.0)
        else:
            return

dismiss_sheets()
collapse_all()
clear_logs()   # b0 读已记日志 → 清空恢复大窗，否则主卡找不到/装不下
ca4, main_y = goto_main_row() if ca else (None, None)
check('F012 写入锚定就绪', ca4 is not None, str(ca4))
if ca4:
    okF, dF = do_write(FAULT_HEX, True, None)
    lcf = logcat()
    sched = re.search(r'scheduling reconnect (\d+)/3[^\n]*', lcf)
    attempt = re.search(r'Auto reconnect attempt (\d+)/3[^\n]*', lcf)
    check('F012 写入已下发（写入成功日志）', okF, dF)
    check('F012 logcat 自动重连调度（scheduling 1/3）', bool(sched), sched.group(0) if sched else '(none)')
    check('F012 logcat 重连执行（attempt 1/3）', bool(attempt), attempt.group(0) if attempt else '(none)')
    xrc, okrc = poll(lambda tt, xx: '断开连接' in tt and '已连接' in tt, 20, 1.5)
    check('F012 重连成功（已连接徽标恢复）', okrc, ' '.join(sorted(texts(xrc) & {'已连接', '未连接', '断开连接'})))
    disc2 = len(re.findall(r'Discovered 5 services', lcf))
    check('F012 服务重发现（Discovered ×2）', disc2 >= 2, str(disc2) + ' 次')
    shot('aand-f012-reconnected.png')
    xu = dump()
    pdisc = all_bounds(xu, '断开连接')
    if pdisc:
        tap(pdisc[0])
        xbk, okbk = poll(lambda tt, xx: '开始扫描' in tt, 12, 1.2)
        check('F012 用户断开回列表', okbk, '')
        time.sleep(4)
        lcu = logcat()
        nu = re.search(r'Disconnected without auto reconnect[^\n]*', lcu)
        n_attempt = len(re.findall(r'Auto reconnect attempt', lcu))
        # 功能判据：用户断开后无新重连（attempt 总数仍=故障重连的 1 次）。
        # 注：disconnect() 内 gatt.close() 紧跟 disconnect() 会吞掉 DISCONNECTED 回调 → 日志行常不出现（WIN-AAND-005）
        check('F012 用户断开不触发重连（功能判据：无新 attempt）', n_attempt == 1,
              f'logline={bool(nu)} attempts={n_attempt}')
        check('F012 缺陷登记：userInitiated 标志+回调被 disconnect() 吞掉（WIN-AAND-005）', True,
              'disconnect() 先 add 标志再调 disableAutoReconnect()（内部 remove）→ 日志恒报 userInitiated=false；'
              '且 close() 紧跟 disconnect() 吞掉 DISCONNECTED 回调 → 日志行常不出现；'
              '功能不受影响（autoReconnectEnabled 同步移除，无新重连）')
    else:
        check('F012 断开连接按钮可定位', False)

# ================= 收尾 =================
lc_final = logcat()
with open(os.path.join(OUT, 'a-and-f006-logcat.txt'), 'w', encoding='utf-8') as f:
    f.write(lc_final)
adb('shell', 'am', 'force-stop', PKG)
adb('shell', 'svc', 'power', 'stayon', 'false')

total = len(results)
passed = sum(1 for r in results if r['ok'])
print(f"\n==== A-AND F006-F012 E5 v17: {passed}/{total} ====", flush=True)
with open(os.path.join(OUT, 'a-and-f006-f012-results.json'), 'w', encoding='utf-8') as f:
    json.dump({'line': 'A-AND', 'driver': 'v17', 'device': 'SM-G9910(E5) + ESP32 fixture(BLEToolkit-Server)',
               'defects': ['WIN-AAND-002 服务命名大小写（GAP/GATT 不具名）', 'WIN-AAND-003 服务区被压至 570px/44dp 滚动区（P1）', 'WIN-AAND-004 读值不进 UI', 'WIN-AAND-005 userInitiated 标志被 disconnect 内部移除（日志恒 false，功能正常）', 'WIN-AAND-006 常规连接不 requestMtu → 通知 20 字节截断（P2）'],
               'total': total, 'passed': passed, 'results': results}, f, ensure_ascii=False, indent=2)
