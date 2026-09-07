# -*- coding: utf-8 -*-
# U-AND E5：UniApp Android（HBuilder 标准基座）P001 扫描域真机驱动
# 用法：python uand-p001-e5.py <adb-serial>
# 驱动方式：uiautomator dump → 文本断言 → 坐标 tap（WebView 文本可被 dump 暴露）
import re, subprocess, sys, time, json, os

SERIAL = sys.argv[1] if len(sys.argv) > 1 else 'R5CR1284Y7H'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'uniapp-android')
os.makedirs(OUT, exist_ok=True)
XML = r'C:/Users/11066/AppData/Local/Temp/uand-drive.xml'

def adb(*args, binary=False, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')

def dump():
    adb('shell', 'uiautomator dump /sdcard/uand-drive.xml')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/uand-drive.xml', XML],
                   capture_output=True, env={**os.environ, 'MSYS_NO_PATHCONV': '1'})
    try:
        return open(XML, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''

def texts(x):
    return set(t for t in re.findall(r'text="([^"]{1,40})"', x) if t.strip() and not t.startswith('&#'))

def bounds_of(x, label):
    # 找 text=label 的节点中心
    for m in re.finditer(r'<node[^>]*text="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups())
        return (a + c) // 2, (b + d) // 2
    return None

def tap(p):
    adb('shell', 'input', 'tap', str(p[0]), str(p[1]))

def ensure_awake(max_try=4):
    """三星息屏/意外触摸保护（UnintentionalLcdOn）/通知栏三坑：
    每次交互前确认 Awake 且应用在前台，不满足则唤醒+解锁+收通知栏。"""
    for _ in range(max_try):
        wake = adb('shell', 'dumpsys', 'power').splitlines()
        awake = any('mWakefulness=Awake' in l for l in wake)
        if awake:
            focus = adb('shell', 'dumpsys', 'window')
            if 'UnintentionalLcdOn' in focus:
                # 三星意外触摸保护：完整息屏→亮屏→解锁循环才能清除（swipe 无效）
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
def check(name, ok, detail=''):
    results.append({'name': name, 'ok': ok, 'detail': detail})
    print(f"{'PASS' if ok else 'FAIL'} {name} | {detail}", flush=True)

# ---- 前置：亮屏 + 保持亮屏 + 确保应用前台 ----
adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
adb('shell', 'wm', 'dismiss-keyguard')
adb('shell', 'svc', 'power', 'stayon', 'usb')  # 长跑防锁屏（跑完还原）
adb('shell', 'am', 'force-stop', 'io.dcloud.HBuilder')
time.sleep(1)
adb('shell', 'monkey', '-p', 'io.dcloud.HBuilder', '-c', 'android.intent.category.LAUNCHER', '1')
# 冷启 WebView 就绪轮询（v3 实测 9s 不够，固定等待会在加载完成前 dump）
x = None
for _ in range(20):
    time.sleep(1.5)
    x = dump()
    if '开始扫描' in texts(x):
        break
ensure_awake()

x = dump()
t = texts(x)
check('P001 启动（扫描 Tab）', '扫描' in t and 'BLE Toolkit+' in t)
check('首启空态（还没有扫描结果）', '还没有扫描结果' in t)
check('首启状态=待开始', '待开始' in t)
check('蓝牙就绪', '蓝牙就绪' in t)
shot('uand-p001-idle.png')

# ---- 第一轮：tap 开始扫描 → 5s 会话 ----
p = bounds_of(x, '开始扫描')
check('开始扫描按钮可定位', p is not None, str(p))
if p:
    ensure_awake()
    tap(p)
    # 立即轮询扫描中瞬态（5s 会话短，不能中途 ensure_awake——其 SLEEP/WAKE
    # 循环耗 3s+ 会把 dump 推到会话结束后，v1 首跑即此因漏检）
    scanning_seen = False
    x2 = None
    for _ in range(6):
        time.sleep(0.5)
        x2 = dump(); t2 = texts(x2)
        if '停止扫描' in t2:
            scanning_seen = True
            break
    check('扫描中（停止扫描出现）', scanning_seen,
          ' '.join(sorted(texts(x2) & {'停止扫描', '扫描中', '待开始'})[:3]) if x2 else '')
    shot('uand-p001-scanning.png')
    # 等 5s 会话结束
    time.sleep(6)
    ensure_awake()
    x3 = dump(); t3 = texts(x3)
    check('5s 自动停止（回到开始扫描）', '开始扫描' in t3 and '停止扫描' not in t3)
    check('完成态文案（已完成）', '已完成' in t3, ' '.join(sorted(t3 & {'已完成', '待开始'})[:2]))
    shot('uand-p001-done.png')
    # 夹具发现（真实 BLE 扫描 5s，夹具 100ms 间隔广播）
    check('夹具卡片 BLEToolkit-Server', 'BLEToolkit-Server' in t3)
    if 'BLEToolkit-Server' in t3:
        pb = bounds_of(x3, 'BLEToolkit-Server')
        check('夹具卡片 RSSI 展示', any(re.match(r'-\d+ dBm', s) for s in t3))
        shot('uand-p001-fixture-card.png')

        # ---- F003 筛选面板（先于 F004——广播弹层无可靠关闭路径，放最后）----
        ensure_awake()
        x = dump()
        pf = bounds_of(x, '筛选')
        if pf:
            tap(pf)
            panel_seen = False
            x5 = None
            t5 = set()
            for _ in range(5):
                time.sleep(0.6)
                x5 = dump(); t5 = texts(x5)
                if '扫描过滤器' in t5:
                    panel_seen = True
                    break
            check('F003 筛选面板展开', panel_seen, ' '.join(sorted(t5)[:8]))
            # 面板默认折叠（仅摘要 chips：RSSI ≥ x dBm 等）——再 tap「展开」露完整表单
            if panel_seen:
                eb = bounds_of(x5, '展开')
                full_seen = False
                t6 = set()
                for _ in range(5):
                    if eb:
                        tap(eb)
                        eb = None
                    time.sleep(0.8)
                    x6 = dump(); t6 = texts(x6)
                    if {'信号强度', '名称前缀', '重置过滤'} <= t6:
                        full_seen = True
                        break
                check('F003 完整筛选表单（展开）', full_seen, ' '.join(sorted(t6)[:10]))
                shot('uand-p001-filter.png')
                # 收起面板，保证后续夹具卡片 tap 不被挤位
                x7 = dump()
                cf = bounds_of(x7, '收起筛选')
                if cf:
                    tap(cf)
                    time.sleep(1)
        else:
            check('F003 筛选入口可定位', False)

        # ---- F004 广播详情：tap 夹具卡片（最后一步，弹层不再关闭）----
        if pb:
            ensure_awake()
            x = dump()
            pb = bounds_of(x, 'BLEToolkit-Server') or pb
            tap(pb)
            time.sleep(2.5)
            x4 = dump(); t4 = texts(x4)
            check('F004 广播详情展开', any('广播' in s or 'RSSI' in s or 'Manufacturer' in s or '厂商' in s for s in t4),
                  ' '.join(sorted(t4)[:12]))
            shot('uand-p001-advdetail.png')

ok = sum(1 for r in results if r['ok'])
print(f'====== 汇总 PASS {ok}/{len(results)} ======')
json.dump(results, open(os.path.join(OUT, 'uand-p001-e5-results.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
sys.exit(0 if ok == len(results) else 1)
