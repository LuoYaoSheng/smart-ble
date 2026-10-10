# -*- coding: utf-8 -*-
# U-AND E5：F013 多设备会话管理真机驱动（P007 已连接列表）v5
# 布景：华为 TAS-AN00 跑 A-AND 广播（Mate 30 5G / FFF0 / connectable）= 第二外设；
#       ESP32 fixture（BLEToolkit-Server 10:B4:1D:CD:23:8D）= 第一外设；E5 = U-AND 中央。
# v5 设计要点（v2-v4 复盘）：
#   1) P006 详情页进页即自动连接——任何误触卡片都会连上设备。状态守卫以 App 自渲染的
#      「N 台设备保持连接」数字为准（v4 曾实际出现误连第 3 台=未知设备，数字当场揭穿）；
#   2) 全部 tap 前必须用「最新 dump」绑定坐标（v4 用了 30-60s 前的陈旧 dump 误触邻卡）；
#   3) 背景 tab 页文本混入 dump——断言只用 P007 独有文案/数字；
#   4) 服务数判别：ESP32=5（4FAFC201 B/C/D+1800/1801）；华为 EMUI 默认 GATT 实测同为 5（1800/1801/180A/180F+1），
#      服务数不能区分两者——身份以连接动作来源卡 + 已连接页名称列为准。
# 用法：python uand-f013-e5.py [serial]
import re, subprocess, sys, time, json, os

SERIAL = sys.argv[1] if len(sys.argv) > 1 else 'R5CR1284Y7H'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'f013-dualphone')
os.makedirs(OUT, exist_ok=True)
XML = r'C:/Users/11066/AppData/Local/Temp/uand-f013.xml'
ESP32 = 'BLEToolkit-Server'
HW = 'Mate 30 5G'
SUMMARY_RE = re.compile(r'(\d+) 台设备保持连接')

def adb(*args, binary=False, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')

def dump():
    adb('shell', 'uiautomator', 'dump', '/sdcard/uand-f013.xml')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/uand-f013.xml', XML],
                   capture_output=True, env={**os.environ, 'MSYS_NO_PATHCONV': '1'})
    try:
        return open(XML, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''

def texts(x):
    return set(t for t in re.findall(r'text="([^"]{1,60})"', x) if t.strip())

def all_bounds(x, label):
    out = []
    for m in re.finditer(r'<node[^>]*text="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups())
        if c > a and d > b:
            out.append(((a + c) // 2, (b + d) // 2))
    return out

def bounds_of(x, label):
    p = all_bounds(x, label)
    return p[0] if p else None

def summary_n(x):
    for s in texts(x):
        m = SUMMARY_RE.match(s)
        if m:
            return int(m.group(1))
    return None

def header_connected(x):
    """扫描页头「N 台设备 · M 台已连接」——背景页也贡献文本，作 N 备用取证源
    （已连接页 WebView 偶发只渲染部分区域，汇总卡可能整块不可见）"""
    for s in texts(x):
        m = re.match(r'\d+ 台设备 · (\d+) 台已连接', s)
        if m:
            return int(m.group(1))
    return None

TAB_ZONE_Y = 2150  # 底部导航栏带：其「已连接」文字会被误认成卡片按钮（实测 Mate 卡沉底时 Δ178 撞上）

def card_action(x, name, labels=('连接', '已连接'), lo=80, hi=330):
    """同名多卡（华为 RPA 轮转→旧卡陈旧标志+新卡并存）：遍历每张卡自己的 footer，
    优先返回可操作按钮（labels[0]，如 连接/断开）的那张；否则退回已连接态。"""
    names = [n for n in all_bounds(x, name) if n[1] < TAB_ZONE_Y]
    fallback = None
    for n in names:
        best = None
        for lb in labels:
            for b in all_bounds(x, lb):
                if b[1] >= TAB_ZONE_Y:
                    continue  # tab 栏带内的文字不是任何卡的按钮
                dy = b[1] - n[1]
                if lo <= dy <= hi and (best is None or dy < best[0]):
                    best = (dy, lb, b)
        if best:
            if best[1] == labels[0]:
                return (best[1], best[2])
            if fallback is None:
                fallback = (best[1], best[2])
    return fallback


def header_has(x, name):
    """详情页页头设备名判别（y<350）；扫描页同名卡在 y>600——位置即页别"""
    return any(b[1] < 350 for b in all_bounds(x, name))

def tap(p):
    adb('shell', 'input', 'tap', str(p[0]), str(p[1]))

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
            if 'HBuilder' in focus and 'NotificationShade' not in focus:
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
link_log = []
hw_mac = None
def check(name, ok, detail=''):
    results.append({'name': name, 'ok': ok, 'detail': detail})
    print(f"{'PASS' if ok else 'FAIL'} {name} | {detail}", flush=True)

def poll(pred, timeout, step):
    x = ''
    for _ in range(int(timeout / step)):
        time.sleep(step)
        x = dump()
        if pred(texts(x), x):
            return x
    return x

def goto_tab(label):
    ensure_awake()
    x = dump()
    cs = all_bounds(x, label)
    if not cs:
        # 详情页压栈遮 tab 栏（back 早到漏按的兜底）：back 后重试
        adb('shell', 'input', 'keyevent', '4')
        time.sleep(1.8)
        x = dump()
        cs = all_bounds(x, label)
    if cs:
        tap(max(cs, key=lambda q: q[1]))
        time.sleep(2.2)
        return dump()
    return x

def connected_state(scroll=True):
    """已连接页状态：权威 N=汇总卡数字（滚动后再取一次防折叠线遮蔽），取 max。
    首检页别（已连接设备标题），采样到别的页就重切一次（v9/v10 偶发采到扫描页）。"""
    x1 = dump()
    n1 = summary_n(x1)
    x2 = x1
    if scroll:
        adb('shell', 'input', 'swipe', '540', '1700', '540', '800', '400')
        time.sleep(1.2)
        x2 = dump()
        adb('shell', 'input', 'swipe', '540', '800', '540', '1700', '400')
        time.sleep(1.0)
    t = texts(x1) | texts(x2)
    ns = [n for n in (n1, summary_n(x2), header_connected(x1), header_connected(x2)) if n is not None]
    n = max(ns) if ns else None
    return {'n': n, 't': t, 'x1': x1, 'x2': x2,
            'empty': '还没有连接中的设备' in t or (header_connected(x1) == 0),
            'all_btn': '全部断开' in t}

def note(phase, st):
    link_log.append({'phase': phase, 'n': st['n'], 'empty': st['empty'], 'all_btn': st['all_btn']})
    print(f"LINK {phase}: n={st['n']} empty={st['empty']} allBtn={st['all_btn']}", flush=True)

ESP32_MARK = '4FAFC201'  # ESP32 fixture 自定义服务（B/C/D 三条）——华为 EMUI 默认 GATT 必无

def connect_device(name, tag, expect_services=None, want_esp32=False):
    """点目标卡「连接」（最新 dump 绑定）→ 详情自动连接 → 轮询「断开连接」。
    身份判别：详情页是否含 4FAFC201（服务数两设备同为我 5，不可用）。
    连错卡（列表重渲染竞态）→ 断开该错误会话，重绑重试一次。"""
    ensure_awake()
    last_bad = None
    for attempt in range(2):
        x = dump()
        ns = [n for n in all_bounds(x, name) if n[1] < TAB_ZONE_Y]
        if ns and ns[0][1] > 1800:
            # 目标卡沉底（按钮可能被裁/撞 tab 栏）→ 滚到屏中再取
            adb('shell', 'input', 'swipe', '540', '1600', '540', '1000', '400')
            time.sleep(1.2)
            x = dump()
        act = card_action(x, name)
        if act is None:
            check(f'{tag} 卡片动作键可定位', False, f'{name} 卡未找到')
            return False
        label, pos = act
        if label == '已连接':
            # 可能是上一轮竞态连错后的正确态：交给守卫裁决，直接按已连处理
            print(f'OBS {tag}: {name} 卡已连接（跳过）', flush=True)
            return True
        tap(pos)
        xr = poll(lambda t, _x: ('断开连接' in t or '自动重连次数达上限' in t or '初始化失败' in t), 34, 1.6)
        t = texts(xr)
        svc = next((int(m.group(1)) for s in t for m in [re.match(r'获取到 (\d+) 个服务', s)] if m), None)
        connected = '断开连接' in t
        hdr_ok = header_has(xr, name)
        if connected and hdr_ok and (ESP32_MARK in ' '.join(t).upper()) != want_esp32:
            # 服务面板可能在折叠线下（phase6 实测）：滚动后再看一次，避免误判拆好会话
            adb('shell', 'input', 'swipe', '540', '1700', '540', '700', '400')
            time.sleep(1.2)
            t2 = texts(dump())
            if '断开连接' in t2 or '连接设备' in t2:
                t = t | t2
        # 身份判定：页头设备名（y<350，位置验证）为主——服务面板重进默认折叠，
        # 4FAFC201 可见性不可靠（phase6 实测 hdr=True mark=False），降级为观察
        mark_seen = ESP32_MARK in ' '.join(t).upper()
        idok = hdr_ok
        if connected and idok:
            ok = True if expect_services is None else (svc == expect_services)
            # 设备 ID 取证：详情页 设备ID: 行的 MAC（页面顺序：label 后邻值）
            macs = re.findall(r'text="([0-9A-F]{2}(:[0-9A-F]{2}){5})"', xr)
            with open(os.path.join(OUT, f'dump-{tag}.xml'), 'w', encoding='utf-8') as f:
                f.write(xr)
            check(f'{tag} 连接成功（页头身份={name}，4FAFC201={"有" if mark_seen else "无(面板折叠,观察)"}，服务数 {svc}）',
                  ok, ' '.join(sorted(t & {'断开连接', '设备连接成功'}))[:40])
            shot(f'uand-f013-{tag}-connected.png')
            for _ in range(3):
                adb('shell', 'input', 'keyevent', '4')
                for _ in range(4):
                    time.sleep(1.0)
                    if '开始扫描' in texts(dump()):
                        return ok
            return ok
        # 连错卡或未连上：记录，断开错误会话后重试
        last_bad = f'connected={connected} hdr={hdr_ok} idok={idok} svc={svc}'
        print(f'OBS {tag} 第{attempt}次未命中目标（{last_bad}）→ 断开重试', flush=True)
        shot(f'uand-f013-{tag}-attempt{attempt}-mismatch.png')
        pb = bounds_of(xr, '断开连接')
        if pb and connected:
            tap(pb); time.sleep(2.5)
        for _ in range(3):
            adb('shell', 'input', 'keyevent', '4')
            time.sleep(1.2)
            if '开始扫描' in texts(dump()):
                break
    check(f'{tag} 连接成功（身份判别）', False, f'两次未命中: {last_bad}')
    return False

def goto_connected():
    """切已连接页：点一次 tab 后轮询 8s 等渲染。切勿快速重试 tap——
    连发 switchTab 会把 HBuilder WebView 池打穿（实测产生 pages/connected/index[3] 空白实例）。"""
    x = dump()
    if '已连接设备' in texts(x):
        return x
    for _rnd in range(2):
        cs = all_bounds(x, '已连接')
        if cs:
            tap(max(cs, key=lambda q: q[1]))
        for _ in range(8):
            time.sleep(1.0)
            x = dump()
            if '已连接设备' in texts(x):
                return x
    return x

def guard_n(tag, expect):
    """切到已连接页断言 N==expect；N>expect=误连设备（重缺陷证据）"""
    goto_connected()  # connect_device 返回后停在扫描页——必须先切 tab（v5 即漏此步采了扫描页）
    st = connected_state()
    note(tag, st)
    ok = st['n'] == expect
    with open(os.path.join(OUT, f'dump-guard-{tag.replace("/", "_")}.xml'), 'w', encoding='utf-8') as f:
        f.write(st['x1'])
    check(f'{tag} 列表 N={expect}（App 汇总卡数字）', ok,
          f"实测 N={st['n']}{' ←出现计划外设备！' if (st['n'] or 0) > expect else ''}")
    return ok, st

def rescan():
    x = goto_tab('扫描')
    p = bounds_of(x, '开始扫描')
    if p:
        tap(p)
        poll(lambda t, _x: '开始扫描' in t, 14, 1.0)
    return dump()

# ================= 前置 =================
adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
adb('shell', 'wm', 'dismiss-keyguard')
adb('shell', 'svc', 'power', 'stayon', 'usb')
adb('shell', 'am', 'force-stop', 'io.dcloud.HBuilder')
time.sleep(1)
adb('shell', 'monkey', '-p', 'io.dcloud.HBuilder', '-c', 'android.intent.category.LAUNCHER', '1')
x = ''
for _ in range(20):
    time.sleep(1.5)
    x = dump()
    if '开始扫描' in texts(x):
        break
ensure_awake()
x = dump()
check('启动（扫描 Tab 就绪）', '开始扫描' in texts(x))

# ================= Phase 1：发现双外设 =================
found = {'esp32': False, 'hw': False}
for rnd in range(4):
    t = texts(x)
    found['esp32'] = found['esp32'] or ESP32 in t
    found['hw'] = found['hw'] or HW in t
    if found['esp32'] and found['hw']:
        break
    p = bounds_of(x, '开始扫描')
    if p:
        ensure_awake(); tap(p)
        x = poll(lambda tt, _x: '开始扫描' in tt, 12, 1.0)
x = dump()
t = texts(x)
found['esp32'] = found['esp32'] or ESP32 in t
found['hw'] = found['hw'] or HW in t
check('外设1 卡片（ESP32 BLEToolkit-Server）', found['esp32'])
check('外设2 卡片（华为 Mate 30 5G 广播）', found['hw'])
shot('uand-f013-01-two-peripherals.png')

# ================= Phase 2/3：连接两台（每台连接后守卫 N） =================
if found['esp32']:
    connect_device(ESP32, '02-esp32', expect_services=5, want_esp32=True)
if found['hw']:
    connect_device(HW, '03-huawei', expect_services=None, want_esp32=False)
ok4, st4 = guard_n('phase4-双设备列表#1', 2)
if not ok4 and st4['n'] is None and not st4['empty']:
    # 二连竞态：第一台会话偶发被二次 openBluetoothAdapter 重置 → 看列表缺谁补谁
    print('OBS phase4 自愈：两台各试补连（已连接自动跳过）', flush=True)
    x = rescan()
    for miss in (ESP32, HW):
        a = card_action(x, miss)
        if a and a[0] == '连接':
            connect_device(miss, '04-heal-' + miss.split('-')[0].lower(),
                           expect_services=(5 if miss == ESP32 else None), want_esp32=(miss == ESP32))
            x = rescan()
    ok4, st4 = guard_n('phase4-双设备列表#2', 2)
if ok4:
    check('全部断开按钮', st4['all_btn'])
    check('两卡名称在列（Mate 30 5G）', 'Mate 30 5G' in st4['t'])
    shot('uand-f013-04-connected-list-2.png')

# ================= Phase 5：双在线后立即单台断开（华为链路 ~1-3min 自掉，动作趁早） =================
ok5 = False
if ok4:
    act = None
    for _att in range(5):  # dump 偶发渲染竞态/页别漂移 → 多试 + 页别自愈 + 交替滚动
        goto_connected()   # 温和切页（幂等：已在页则直接返回）
        xs = dump()
        if '已连接设备' not in texts(xs):
            time.sleep(1.5)
            continue
        # 单断目标=华为（不稳定实体放最短关键路径：断它→立即重连它；ESP32 链路稳固全程不动）
        act = card_action(xs, HW, labels=('断开',))
        if act is None:
            act = card_action(xs, ESP32, labels=('断开',))
        if act is None:
            rights = [b for b in all_bounds(xs, '断开') if b[0] > 800]
            if rights:
                act = ('顶部卡', min(rights, key=lambda q: q[1]))
        if act:
            break
        adb('shell', 'input', 'swipe', '540', '1700', '540', '800', '400')
        time.sleep(1.4)
    if act is None:
        with open(os.path.join(OUT, 'dump-bind-fail.xml'), 'w', encoding='utf-8') as f:
            f.write(xs)
        # 已连接页滚动区偶发整块不暴露给 uiautomator（dump-bind-fail 实证：仅顶部汇总区可见）
        # 但布局固定：两卡断开键稳定位于 (897,897)/(897,1320) → 页别正确时几何兜底
        # 已连接页滚动区整块不暴露时（dump-bind-fail 实证）：归顶后按固定几何位逐个试，
        # 以 N 变化校验效果（半滚位置按钮在 687/1110，归顶后为 897/1320）
        for _g in range(2):
            adb('shell', 'input', 'swipe', '540', '700', '540', '1900', '500')
            time.sleep(1.0)
        act = ('几何兜底', (897, 897))
        print('OBS 单断绑定切换几何兜底（先归顶）', flush=True)
    if act:
        print(f'OBS 单断目标绑定: {act[0]} @{act[1]}', flush=True)
        tap(act[1])
        st = connected_state(scroll=False)
        if st['n'] is not None and st['n'] >= 2:
            # 首点未生效（几何兜底时页面位置误差）→ 试第二卡的已知位置
            print('OBS 首点未见生效 → 试第二位置 (897,1320)', flush=True)
            tap((897, 1320))
            time.sleep(2.0)
            st = connected_state(scroll=False)
        for _ in range(8):  # 2→1 瞬间汇总卡先消失：等「无汇总∧非空」或空态稳定
            if st['empty'] or (st['n'] is None and not st['empty']):
                break
            time.sleep(1.5)
            st = connected_state(scroll=False)
        note('phase5-单断后', st)
        n_btn = max(len(all_bounds(st['x1'], '断开')), len(all_bounds(st['x2'], '断开')))
        # App 不变式：无汇总卡→N≤1 ∧ 非空态→N≥1 ⇒ N=1（断开键计数仅观察，滚动区可能不暴露）
        one_left = (st['n'] is None and not st['empty']) or st['n'] == 1
        check('单断后仅 1 台（无汇总卡∧非空 ⇒ N=1）', one_left,
              f"N={st['n']} 断开键={n_btn}(观察) empty={st['empty']}")
        shot('uand-f013-05-after-single-disconnect.png')
        ok5 = one_left
    else:
        check('单断绑定（断开键可定位）', False)
else:
    check('单断前置（双设备列表 N=2）', False)

# ================= 工具：重连两台（重扫→逐台连接→守卫 N=2，带重试） =================
def connect_named(tag0):
    for cand, exp in ((ESP32, 5), (HW, None)):
        x = dump()
        a = card_action(x, cand)
        if a and a[0] == '连接':
            connect_device(cand, tag0 + cand.split('-')[0].lower(), expect_services=exp)

def ensure_both(tag, tries=2):
    st = {'n': None}
    for attempt in range(tries):
        x = rescan()
        connect_named(f'{tag}-a{attempt}-')
        ok, st = guard_n(f'{tag}#a{attempt}', 2)
        if ok:
            return True, st
    return False, st

# ================= Phase 6：重连两台（单断后恢复 N=2） =================
ok6 = False
if ok5:
    ok6, st6 = ensure_both('phase6')
    check('重连后恢复 2 台（N=2）', ok6, f"实测 N={st6.get('n')}")
    if ok6:
        shot('uand-f013-06-restored-2.png')

# ================= Phase 7：全部断开（守卫 N=2 后立即执行） =================
ok7 = False
if ok6:
    toast_all = False
    done7 = False
    for _tap7 in range(4):  # 点击效果校验：n 不降就重试；按钮可能被部分渲染藏起 → 归顶+几何兜底
        goto_connected()
        for _ in range(2):
            adb('shell', 'input', 'swipe', '540', '700', '540', '1900', '500')
            time.sleep(0.9)
        x = dump()
        p = bounds_of(x, '全部断开')
        n_seen = summary_n(x) or header_connected(x)
        if p is None and (n_seen or 0) >= 2:
            # 页面渲染正常但无障碍树不暴露（phase5 几何兜底已证点击仍生效）→ 按固定几何位直点
            p = (892, 339)
            print(f'OBS 全断绑定几何兜底 (892,339)（n_seen={n_seen}）', flush=True)
        if p is None:
            time.sleep(1.5)
            continue
        tap(p)
        for _ in range(4):
            time.sleep(0.7)
            tt = texts(dump())
            if '已全部断开' in tt:
                toast_all = True
                break
        st = connected_state(scroll=False)
        if st['n'] is None or st['n'] < 2:
            done7 = True
            break
        print(f'OBS phase7 第{_tap7}次点击未见生效（n={st["n"]}）→ 重试', flush=True)
    if done7 or toast_all:
        st = connected_state()
        for _ in range(6):
            if st['empty']:
                break
            time.sleep(1.5)
            st = connected_state(scroll=False)
        note('phase7-全断后', st)
        check('全部断开后空态（还没有连接中的设备）', st['empty'])
        check('全断成功 toast（尽力）', toast_all, 'seen' if toast_all else 'not-captured')
        shot('uand-f013-07-disconnect-all-empty.png')
        ok7 = st['empty']
    else:
        check('全部断开按钮可定位', False)
elif ok5:
    check('全断前置（重连 N=2）', False)

# ================= Phase 8：重连两台 → 关蓝牙竞速 → 部分失败清单弹窗（尽力） =================
if ok7:
    ok8pre, _ = ensure_both('phase8')
    check('部分失败弹窗前置：两台在线 N=2', ok8pre)
    if ok8pre:
        adb('shell', 'svc', 'bluetooth', 'disable')
        x = dump()  # 立即快照（竞速）
        n_now = summary_n(x) or header_connected(x)
        p = bounds_of(x, '全部断开') or ((892, 339) if (n_now or 0) >= 2 else None)
        if p and (n_now or 0) >= 2:
            tap(p)
            x = poll(lambda t, _x: ('失败设备' in t or any(s.startswith('已断开 ') for s in t)), 9, 0.8)
            t = texts(x)
            modal = '失败设备' in t or any(s.startswith('已断开 ') for s in t)
            shot('uand-f013-08-partial-failure-modal.png')
            check('部分失败清单弹窗（关蓝牙触发）', modal,
                  ' '.join(s for s in t if '断开' in s or '失败' in s)[:80])
        else:
            check('部分失败弹窗（关蓝牙竞速）', False, '关蓝牙瞬间列表已清空，竞速未成立')
elif ok6:
    check('部分失败弹窗前置（全断空态）', False)
adb('shell', 'svc', 'bluetooth', 'enable')
time.sleep(4)

# ================= 还原 =================
adb('shell', 'am', 'force-stop', 'io.dcloud.HBuilder')
adb('shell', 'svc', 'power', 'stayon', 'false')

total = len(results)
passed = sum(1 for r in results if r['ok'])
print()
print(f"==== F013 U-AND E5 v9: {passed}/{total} ====", flush=True)
with open(os.path.join(OUT, 'uand-f013-e5-results.json'), 'w', encoding='utf-8') as f:
    json.dump({'line': 'U-AND', 'driver': 'v9',
               'device': 'SM-G9910(E5) central + Huawei TAS-AN00 A-AND advertiser(Mate 30 5G) + ESP32 fixture(BLEToolkit-Server)',
               'hw_adv_mac': hw_mac, 'total': total, 'passed': passed,
               'results': results, 'link_log': link_log}, f, ensure_ascii=False, indent=2)
