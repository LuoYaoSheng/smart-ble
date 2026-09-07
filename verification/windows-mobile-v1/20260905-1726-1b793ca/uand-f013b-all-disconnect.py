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
XML = r'C:/Users/11066/AppData/Local/Temp/uand-f013b.xml'
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
check('启动（扫描 Tab 就绪）', '开始扫描' in texts(dump()))

# ================= 连双 → 守卫 N=2（最多 2 轮补连） =================
x = rescan()
for rnd in range(2):
    for cand in (ESP32, HW):
        a = card_action(dump(), cand)
        if a and a[0] == '连接':
            connect_device(cand, 'b-' + cand.split('-')[0].lower(),
                           expect_services=(5 if cand == ESP32 else None), want_esp32=(cand == ESP32))
            x = rescan()
    ok, st = guard_n(f'b#{rnd}', 2)
    if ok:
        break
check('全断前置：N=2 双设备在线', ok, f"N={st.get('n')}")
shot('f013b-01-connected-list-2.png')

# ================= 全部断开 → 空态 =================
if ok:
    toast_all = False
    for _t7 in range(4):
        goto_connected()
        for _ in range(2):
            adb('shell', 'input', 'swipe', '540', '700', '540', '1900', '500')
            time.sleep(0.9)
        x = dump()
        p = bounds_of(x, '全部断开')
        n_seen = summary_n(x) or header_connected(x)
        if p is None and (n_seen or 0) >= 2:
            p = (892, 339)
            print(f'OBS 全断几何兜底 (892,339)（n_seen={n_seen}）', flush=True)
        if p is None:
            time.sleep(1.5)
            continue
        tap(p)
        for _ in range(4):
            time.sleep(0.7)
            if '已全部断开' in texts(dump()):
                toast_all = True
                break
        st = connected_state(scroll=False)
        if st['empty'] or (st['n'] or 1) < 2:
            break
        print(f'OBS 全断第{_t7}次点击未生效（n={st["n"]}）→ 重试', flush=True)
    st = connected_state()
    for _ in range(6):
        if st['empty']:
            break
        time.sleep(1.5)
        st = connected_state(scroll=False)
    note('b-全断后', st)
    check('全部断开后空态（还没有连接中的设备）', st['empty'])
    check('全断成功 toast（尽力）', toast_all, 'seen' if toast_all else 'not-captured')
    shot('f013b-02-disconnect-all-empty.png')

# ================= 还原 =================
adb('shell', 'am', 'force-stop', 'io.dcloud.HBuilder')
adb('shell', 'svc', 'power', 'stayon', 'false')
total = len(results)
passed = sum(1 for r in results if r['ok'])
print()
print(f"==== F013-B 全断聚焦 U-AND E5: {passed}/{total} ====", flush=True)
with open(os.path.join(OUT, 'uand-f013b-all-disconnect-results.json'), 'w', encoding='utf-8') as f:
    json.dump({'line': 'U-AND', 'driver': 'f013b-focused-all-disconnect',
               'device': 'SM-G9910(E5) + Huawei TAS-AN00 advertiser + ESP32 fixture',
               'total': total, 'passed': passed, 'results': results, 'link_log': link_log},
              f, ensure_ascii=False, indent=2)
