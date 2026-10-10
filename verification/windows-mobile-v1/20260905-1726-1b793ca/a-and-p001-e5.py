# -*- coding: utf-8 -*-
# A-AND E5：Android 原生（com.smartble，Kotlin+Compose）P001 扫描域真机驱动
# 用法：python a-and-p001-e5.py <adb-serial>
# 驱动方式：uiautomator dump → 文本断言 → 坐标 tap（Compose Text 经 semantics 暴露为 text=）
# 断言依据 strings：开始扫描/停止扫描/发现 N 台设备/过滤条件/展开/收起/信号强度/名称前缀/暂无设备/广播数据
import re, subprocess, sys, time, json, os

SERIAL = sys.argv[1] if len(sys.argv) > 1 else 'R5CR1284Y7H'
PKG = 'com.smartble'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'android-native')
os.makedirs(OUT, exist_ok=True)
XML = r'C:/Users/11066/AppData/Local/Temp/aand-drive.xml'

def adb(*args, binary=False, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')

def dump():
    adb('shell', 'uiautomator dump /sdcard/aand-drive.xml')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/aand-drive.xml', XML],
                   capture_output=True, env={**os.environ, 'MSYS_NO_PATHCONV': '1'})
    try:
        return open(XML, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''

def texts(x):
    return set(t for t in re.findall(r'text="([^"]{1,40})"', x) if t.strip() and not t.startswith('&#'))

def bounds_of(x, label):
    for m in re.finditer(r'<node[^>]*text="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups())
        return (a + c) // 2, (b + d) // 2
    return None

def bounds_of_desc(x, label):
    """Compose IconButton 语义挂 content-desc（如 FilterPanel 展开箭头），text= 为空。"""
    for m in re.finditer(r'<node[^>]*content-desc="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups())
        return (a + c) // 2, (b + d) // 2
    return None

def tap(p):
    adb('shell', 'input', 'tap', str(p[0]), str(p[1]))

def ensure_awake(max_try=4):
    """三星息屏/意外触摸保护/通知栏三坑：交互前确认 Awake 且应用前台。"""
    for _ in range(max_try):
        wake = adb('shell', 'dumpsys', 'power').splitlines()
        awake = any('mWakefulness=Awake' in l for l in wake)
        if awake:
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
    results.append({'name': name, 'ok': ok, 'detail': detail})
    print(f"{'PASS' if ok else 'FAIL'} {name} | {detail}", flush=True)

def poll_text(label, tries, gap, want=True):
    """轮询 dump 直到文本出现(want=True)/消失(want=False)，返回最终 dump。"""
    x = ''
    for _ in range(tries):
        ensure_awake()
        x = dump()
        t = texts(x)
        if (label in t) == want:
            return x
        time.sleep(gap)
    return x

# ---- 前置：亮屏 + 保持亮屏 + 运行时权限预授（Android 15 蓝牙扫描链）----
adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
adb('shell', 'wm', 'dismiss-keyguard')
adb('shell', 'svc', 'power', 'stayon', 'usb')  # 长跑防锁屏（跑完还原）
for perm in ('android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT',
             'android.permission.BLUETOOTH_ADVERTISE', 'android.permission.ACCESS_FINE_LOCATION',
             'android.permission.ACCESS_COARSE_LOCATION'):
    adb('shell', 'pm', 'grant', PKG, perm)
print('perm-grants:', adb('shell', 'dumpsys', 'package', PKG).count('granted=true'), flush=True)

adb('shell', 'am', 'force-stop', PKG)
time.sleep(1)
adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1')

# ---- 冷启动就绪轮询（Compose 首帧可能慢，最多 30s）----
x = poll_text('开始扫描', 20, 1.5)
t = texts(x)
check('P001 启动（扫描 Tab）', '扫描' in t and ('开始扫描' in t or '停止扫描' in t), ' '.join(sorted(t)[:10]))
check('首启空态（暂无设备）', '暂无设备' in t or '点击上方按钮开始扫描' in t, ' '.join(sorted(t & {'暂无设备', '点击上方按钮开始扫描'})))
check('蓝牙就绪（蓝牙已开启）', '蓝牙已开启' in t, ' '.join(sorted(t & {'蓝牙已开启', '正在初始化蓝牙...', '蓝牙不可用', '蓝牙权限未授权'})))
check('权限预授生效（无未授权态）', '蓝牙权限未授权' not in t and '未授权' not in t)
shot('aand-p001-idle.png')

# ---- 第一轮：tap 开始扫描 → 5s 会话（扫描瞬态轮询）----
p = bounds_of(x, '开始扫描')
check('开始扫描按钮可定位', p is not None, str(p))
if p:
    ensure_awake()
    tap(p)
    # 扫描瞬态（5s 会话）：轻量快速连拍，不夹 ensure_awake（其 dumpsys 开销会拖过会话尾）
    x2 = ''
    for _ in range(6):
        time.sleep(0.7)
        x2 = dump()
        if '停止扫描' in texts(x2):
            break
    t2 = texts(x2)
    check('扫描中（停止扫描出现）', '停止扫描' in t2, ' '.join(sorted(t2 & {'停止扫描', '开始扫描', '正在初始化蓝牙...'})))
    shot('aand-p001-scanning.png')
    # 等 5s 会话自动结束（BleManager 5s auto-stop timer）
    x3 = poll_text('开始扫描', 14, 1.0)
    t3 = texts(x3)
    check('5s 自动停止（回到开始扫描）', '开始扫描' in t3 and '停止扫描' not in t3)
    check('发现计数文案', bool(re.search(r'发现 \d+ 台设备', ' '.join(t3))), ' '.join(s for s in t3 if '发现' in s))
    shot('aand-p001-done.png')
    # 夹具发现（真实 BLE 扫描；单轮 5s 偶发漏扫 → 最多补扫 2 轮，名称或 MAC 双匹配）
    FIX_MAC = '10:B4:1D:CD:23:8D'
    def fixture_in(tt):
        return 'BLEToolkit-Server' in tt or any(FIX_MAC in s for s in tt)
    for rnd in range(3):
        if fixture_in(t3):
            break
        pb2 = bounds_of(x3, '开始扫描')
        if not pb2:
            break
        ensure_awake()
        tap(pb2)
        x3 = poll_text('开始扫描', 14, 1.0)
        t3 = texts(x3)
    check('夹具卡片 BLEToolkit-Server', fixture_in(t3))
    if fixture_in(t3):
        check('夹具卡片 RSSI 展示', any(re.match(r'-\d+ ?dBm', s) for s in t3), ' '.join(s for s in t3 if 'dBm' in s)[:60])
        shot('aand-p001-fixture-card.png')

        # ---- F004 广播详情：tap 夹具卡片名称（卡片上另有「连接」按钮，勿触）----
        pb = bounds_of(x3, 'BLEToolkit-Server')
        if pb is None:
            pb = bounds_of(x3, FIX_MAC)
        if pb:
            ensure_awake()
            tap(pb)
            time.sleep(2.5)
            x4 = dump(); t4 = texts(x4)
            check('F004 广播详情展开', any(s in t4 for s in ['广播数据', '服务UUID', '发射功率', '设备状态']),
                  ' '.join(sorted(t4)[:12]))
            check('F004 详情数据（MAC/名称/RSSI）', any(re.search(r'[0-9A-F]{2}(:[0-9A-F]{2}){5}', s) for s in t4) and 'BLEToolkit-Server' in t4,
                  ' '.join(s for s in t4 if ':' in s and len(s) == 17)[:20])
            shot('aand-p001-advdetail.png')
            # 关闭详情 sheet（有「关闭」按钮；不关会盖住筛选入口——U-AND 同款坑）
            pc = bounds_of(x4, '关闭')
            if pc:
                tap(pc)
                for _ in range(6):
                    time.sleep(0.8)
                    if '广播数据' not in texts(dump()):
                        break

# ---- F003 筛选面板（前置：详情 sheet 必须已关；两段式：过滤条件 → 展开）----
ensure_awake()
x = dump()
if '广播数据' in texts(x):  # 兜底再关一次
    pc = bounds_of(x, '关闭')
    if pc:
        tap(pc)
        time.sleep(1.5)
        x = dump()
pf = bounds_of_desc(x, '展开') or bounds_of_desc(x, '收起')  # FilterPanel 折叠箭头（content-desc）
if pf is None:
    pf = bounds_of(x, '名称前缀')  # 面板可能已展开（勿用「信号强度」——详情 sheet 内也有同名行）
if pf is None:
    pf = bounds_of(x, '过滤条件')  # 兜底：文本 header（不可点，但坐标可定位面板区域）
if pf:
    ensure_awake()
    tap(pf)
    x5 = ''
    for _ in range(6):  # 轮询一级面板
        time.sleep(0.8)
        x5 = dump(); t5 = texts(x5)
        if '信号强度' in t5:
            break
        pe = bounds_of_desc(x5, '展开')  # 展开箭头是 content-desc
        if pe:
            tap(pe)
    check('F003 筛选面板展开', '信号强度' in t5 and '名称前缀' in t5, ' '.join(sorted(t5)[:10]))
    shot('aand-p001-filter.png')
else:
    check('F003 筛选入口可定位', False)

adb('shell', 'svc', 'power', 'stayon', 'false')  # 还原
ok = sum(1 for r in results if r['ok'])
print(f'====== 汇总 PASS {ok}/{len(results)} ======')
json.dump(results, open(os.path.join(OUT, 'aand-p001-e5-results.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
