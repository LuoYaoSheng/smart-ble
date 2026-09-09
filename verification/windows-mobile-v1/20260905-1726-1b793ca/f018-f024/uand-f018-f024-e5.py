# -*- coding: utf-8 -*-
# U-AND E5：UniApp Android（HBuilder 标准基座）F018-F024 Smart HID 域驱动
# 布景：E5 跑 U-AND（io.dcloud.HBuilder，最新代码经 HBuilderX CLI launch 推送）
#   + ESP32 真 Smart HID 固件（SHID-00000001，COM12 串口旁证另路捕获）
# 覆盖：
#   F018 首页扫描 SHID 徽章 + 双入口（配置 Smart HID / 连接）
#   F019 配置 Smart HID → add.vue 连接即配网（connect→configure 相位）
#   F020 uni.scanCode 相册路径（伪 token QR 预推 /sdcard/DCIM；相机物理对准限制）
#   F021 下发配置（framed-v1 分帧）+ 状态跟踪 → 设备侧 wifi_failed（伪 SSID）
#   F022 wifi_failed 终态 + 「修改配置」恢复（表单保留）
#   U-01 等待态离开确认（配网进行中弹窗 → 取消留在页）+ 取消等待
#   F024 连接 → 已连接入口 → P003 运行诊断 → 五项（BLE/Wi-Fi/ControlHub/控制连接/设备 Ready）
# 驱动方式：uiautomator dump → 文本断言 → 坐标 tap（WebView 文本可被 dump 暴露）
# 坑位沿用 F014：EditText 属性 text 在 class 前；BACK 只在输完立即发并校验页面保留；
#   toast 0.45s 轮询；键盘开时勿 tap（先收 IME）；可见区外的内容需滚动露出。
import re, subprocess, sys, time, json, os

SERIAL = sys.argv[1] if len(sys.argv) > 1 else 'R5CR1284Y7H'
PKG = 'io.dcloud.HBuilder'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'uniapp-android')
os.makedirs(OUT, exist_ok=True)
XML = r'C:/Users/11066/AppData/Local/Temp/uand-shid.xml'
SSID = 'f018-uand-net'
PWD = 'f018-dummy-pwd'
HUB_ADDR = '192.168.21.77:17892'

R = {}

def adb(*args, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    return r.stdout.decode('utf-8', 'replace')

def dump():
    adb('shell', 'uiautomator dump', '/sdcard/uand-shid.xml')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/uand-shid.xml', XML],
                   capture_output=True, env={**os.environ, 'MSYS_NO_PATHCONV': '1'})
    try:
        return open(XML, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''

def texts(x):
    return set(t for t in re.findall(r'text="([^"]{1,90})"', x) if t.strip() and not t.startswith('&#'))

def _nodes(x):
    # uiautomator 节点属性顺序不定（text/bounds 先后皆有），逐节点独立取属性
    for m in re.finditer(r'<node[^>]*>', x):
        yield m.group(0)

def _node_attr(n, attr):
    m = re.search(attr + r'="([^"]*)"', n)
    return m.group(1) if m else None

def _node_center(n):
    b = _node_attr(n, 'bounds')
    if not b:
        return None
    nums = list(map(int, re.findall(r'\d+', b)))
    if len(nums) != 4:
        return None
    return ((nums[0] + nums[2]) // 2, (nums[1] + nums[3]) // 2)

def node_center(pattern, x):
    for n in _nodes(x):
        if re.search(pattern, n):
            c = _node_center(n)
            if c:
                return c
    return None

def center_of_text(label, x):
    # 精确匹配（勿子串误中底部 Tab「扫描」），且需元素可定位
    for n in _nodes(x):
        if _node_attr(n, 'text') == label:
            c = _node_center(n)
            if c:
                return c
    return None

def center_of_text_containing(fragment, x):
    for n in _nodes(x):
        t = _node_attr(n, 'text') or ''
        if fragment in t:
            c = _node_center(n)
            if c:
                return c
    return None

def edit_fields(x):
    out = []
    for m in re.finditer(r'<node[^>]*class="android.widget.EditText"[^>]*/?>', x):
        n = m.group(0)
        t = re.search(r'text="([^"]{0,90})"', n)
        b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
        if b:
            x1, y1, x2, y2 = map(int, b.groups())
            out.append({'val': t.group(1) if t else '', 'cx': (x1 + x2) // 2, 'cy': (y1 + y2) // 2})
    return out

def tap(x, y):
    adb('shell', 'input', 'tap', str(x), str(y))

def swipe(x1, y1, x2, y2, ms=400):
    adb('shell', 'input', 'swipe', str(x1), str(y1), str(x2), str(y2), str(ms))

def back():
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')

def shot(name):
    adb('shell', 'screencap', '-p', '/sdcard/uand-shid.png')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/uand-shid.png',
                    os.path.join(OUT, name)], capture_output=True,
                   env={**os.environ, 'MSYS_NO_PATHCONV': '1'})

def wait_text(pred, timeout, poll=0.6, desc=''):
    """pred(texts, xml) -> bool；返回 (ok, 末次xml)"""
    deadline = time.time() + timeout
    x = ''
    while time.time() < deadline:
        x = dump()
        try:
            if pred(texts(x), x):
                return True, x
        except Exception:
            pass
        time.sleep(poll)
    return False, x

def type_field(f, value):
    tap(f['cx'], f['cy'])
    time.sleep(0.9)
    adb('shell', 'input', 'keyevent', 'KEYCODE_MOVE_END')
    for _ in range(48):
        adb('shell', 'input', 'keyevent', 'KEYCODE_DEL')
    adb('shell', 'input', 'text', value)
    time.sleep(0.45)
    back()  # 收 IME（刚输完，键盘必开；立即返回）
    time.sleep(0.6)

def ensure_awake():
    adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
    adb('shell', 'wm', 'dismiss-keyguard')
    time.sleep(0.8)

def cold_start():
    adb('shell', 'am', 'force-stop', PKG)
    time.sleep(1.2)
    adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1')
    time.sleep(6.0)

print('== U-AND F018-F024 驱动启动 ==')
ensure_awake()

# ---------- 0. 冷启动到首页 ----------
cold_start()
ok, x = wait_text(lambda t, _: ('扫描' in ' '.join(t)) or ('蓝牙' in ' '.join(t)), 25, desc='home')
shot('f018-00-home.png')
print('home ok' if ok else 'home TIMEOUT')

# ---------- F018：扫描 → SHID 徽章 + 双入口 ----------
btn = None
for attempt in range(6):
    x = dump()
    # 权限弹窗兜底（首扫触发蓝牙/定位授权）
    for lbl in ('仅在使用中允许', '使用应用时允许', '允许', 'While using the app'):
        pd = center_of_text(lbl, x)
        if pd:
            print(f'权限弹窗：点 {lbl}')
            tap(*pd); time.sleep(1.5)
            break
    btn = center_of_text('开始扫描', x)
    if btn:
        tap(*btn)
        started, _ = wait_text(lambda t, _: any('停止扫描' in s for s in t), 6, desc='scanning')
        print(f'round {attempt+1}: 扫描已启动={started}')
    ok, x = wait_text(lambda t, _: 'SHID-00000001' in ' '.join(t), 14, desc='shid card')
    if ok:
        break
    print(f'scan round {attempt + 1} 未见 SHID，重扫（状态样例: {sorted(texts(x))[:8]}）')
t = texts(x)
has_badge = any('Smart HID' in s for s in t)
has_cfg = any('配置 Smart HID' in s for s in t)
has_conn = '连接' in t
R['f018_shid_card'] = 'PASS' if (ok and has_badge) else 'FAIL'
R['f018_dual_entry'] = 'PASS' if (has_cfg and has_conn) else 'FAIL'
shot('f018-01-shid-card.png')
print(f"F018: card={R['f018_shid_card']} badge={has_badge} dual={R['f018_dual_entry']} (配置={has_cfg} 连接={has_conn})")

# ---------- F019：配置 Smart HID → 连接即配网（configure 相位） ----------
cfg = center_of_text('配置 Smart HID', x)
if cfg:
    tap(*cfg)
    ok, x = wait_text(lambda t, _: '填写配网信息' in ' '.join(t), 50, desc='configure')
    t = texts(x)
    connected = any(s in t for s in ('设备已连接', '已连接')) or '设备已连接' in x
    R['f019_wizard_connect'] = 'PASS' if (ok and connected) else 'FAIL'
    shot('f019-02-configure.png')
    print(f"F019: wizard={R['f019_wizard_connect']} (填写页={ok} 已连接标记={connected})")
else:
    R['f019_wizard_connect'] = 'FAIL'
    print('F019: 未找到 配置 Smart HID 按钮')

# ---------- F020：填表 + scanCode 相册路径 ----------
if R['f019_wizard_connect'] == 'PASS':
    fs = edit_fields(x)
    print(f'EditText×{len(fs)}: {[f["val"] for f in fs]}')
    if len(fs) >= 3:
        type_field(fs[0], SSID)
        type_field(fs[1], PWD)
        x2 = dump()
        fs2 = edit_fields(x2)
        ssid_ok = any(f['val'] == SSID for f in fs2)
        R['f019_form_fill'] = 'PASS' if ssid_ok else 'FAIL'
        print(f"表单回读 SSID={ssid_ok}")
    else:
        R['f019_form_fill'] = 'FAIL'
        print(f'EditText 不足 3 个')
    # 扫码（相册路径）
    qrbtn = center_of_text_containing('扫描 ControlHub 配对码', x2 if len(fs) >= 3 else x)
    R['f020_qr_album'] = 'BLOCKED'
    if qrbtn:
        tap(*qrbtn)
        time.sleep(2.0)
        shot('f020-03-scanner.png')
        ok, x3 = wait_text(lambda t, _: any('相册' in s for s in t), 12, desc='scanner')
        album = center_of_text_containing('相册', x3) if ok else None
        if album:
            tap(*album)
            time.sleep(2.5)
            # 相册选择器：找 f020-pairing-qr（缩略图标签）或先选 DCIM
            ok, x4 = wait_text(lambda t, _: any('f020' in s for s in t) or any('DCIM' in s for s in t) or any('最近' in s for s in t), 12, desc='album')
            shot('f020-04-album.png')
            t4 = texts(x4)
            pick = center_of_text_containing('f020-pairing-qr', x4)
            if not pick:
                dcim = center_of_text_containing('DCIM', x4)
                if dcim:
                    tap(*dcim); time.sleep(1.5)
                    x4 = dump(); pick = center_of_text_containing('f020-pairing-qr', x4)
            if pick:
                tap(*pick); time.sleep(2.5)
            else:
                # 兜底：点第一个疑似缩略图（网格图块）
                print('album 未直接见到二维码文件，dump 前缀：', sorted(t4)[:12])
            # 回到 app：已获取 徽章 + hub 地址回填
            ok, x5 = wait_text(lambda t, _: any('已获取' in s for s in t), 15, desc='qr parsed')
            fs5 = edit_fields(x5)
            hub_ok = any(HUB_ADDR in f['val'] for f in fs5)
            R['f020_qr_album'] = 'PASS' if (ok and hub_ok) else 'FAIL'
            shot('f020-05-qr-filled.png')
            print(f"F020: album-qr={R['f020_qr_album']} (已获取={ok} hub回填={hub_ok})")
        else:
            shot('f020-04-no-album.png')
            print('F020: 扫码 UI 未见 相册 入口（相机物理对准限制）')
            back(); time.sleep(1.0)
    else:
        print('F020: 未找到 扫描 ControlHub 配对码 按钮')

# ---------- F021：下发配置 → 状态跟踪 → wifi_failed ----------
if R.get('f020_qr_album') == 'PASS':
    sub = center_of_text('下发配置', x5)
    if not sub:
        for _ in range(4):
            swipe(540, 1700, 540, 900); time.sleep(0.5)
            x5 = dump(); sub = center_of_text('下发配置', x5)
            if sub: break
    if sub:
        tap(*sub); time.sleep(1.5)
        ok, x6 = wait_text(lambda t, _: any('正在配置' in s for s in t), 12, desc='provisioning')
        R['f021_submit_wait'] = 'PASS' if ok else 'FAIL'
        shot('f021-06-submitting.png')
        print(f"F021: 下发→等待态={R['f021_submit_wait']}")
        ok, x6 = wait_text(lambda t, _: any('Wi-Fi 连接失败' in s for s in t), 75, desc='wifi_failed')
        R['f021_status_tracking'] = 'PASS' if ok else 'FAIL'
        shot('f021-07-wififailed.png')
        print(f"F021/F022: wifi_failed 终态={'PASS' if ok else 'FAIL'}")

        # ---------- F022：恢复（修改配置，表单保留） ----------
        if ok:
            rec = center_of_text('修改配置', x6)
            if rec:
                tap(*rec); time.sleep(1.2)
                ok, x7 = wait_text(lambda t, _: '填写配网信息' in ' '.join(t), 10, desc='recover')
                fs7 = edit_fields(x7)
                kept = any(f['val'] == SSID for f in fs7)
                R['f022_form_recovery'] = 'PASS' if (ok and kept) else 'FAIL'
                shot('f022-08-recovered.png')
                print(f"F022: 修改配置恢复={R['f022_form_recovery']} (表单保留={kept})")
            else:
                R['f022_form_recovery'] = 'FAIL'
                print('F022: 未见 修改配置 按钮')

            # ---------- U-01：等待态离开确认 + 取消等待 ----------
            sub2 = center_of_text('下发配置', x7)
            if sub2:
                tap(*sub2); time.sleep(1.2)
                ok, _ = wait_text(lambda t, _: any('正在配置' in s for s in t), 12, desc='re-submit')
                back()  # 等待态返回 → 应弹离开确认
                ok, x8 = wait_text(lambda t, _: any('配网进行中' in s for s in t) or any('离开将取消等待' in s for s in t), 8, desc='leave dialog')
                shot('u01-09-leave-dialog.png')
                if ok:
                    stay = center_of_text('取消', x8)
                    if stay:
                        tap(*stay); time.sleep(0.8)
                    x9 = dump()
                    still = any('正在配置' in s for s in texts(x9)) or any('取消等待' in s for s in texts(x9))
                    R['u01_leave_wait'] = 'PASS' if (ok and still) else 'FAIL'
                else:
                    R['u01_leave_wait'] = 'FAIL'
                print(f"U-01 等待态离开确认={R['u01_leave_wait']}")
                # 取消等待
                cx = center_of_text('取消等待', x9 if ok else x8)
                if cx:
                    tap(*cx); time.sleep(1.0)
                    okc, _ = wait_text(lambda t, _: any('已取消等待' in s for s in t) or '填写配网信息' in ' '.join(t), 8, desc='cancel')
                    R['u01_cancel_wait'] = 'PASS' if okc else 'FAIL'
                    shot('u01-10-cancelled.png')
                    print(f"取消等待={R['u01_cancel_wait']}")
            else:
                print('U-01: 未找到第二次 下发配置')
        else:
            R['f022_form_recovery'] = 'NOT_RUN'
    else:
        R['f021_submit_wait'] = 'FAIL'
        print('F021: 未找到 下发配置 按钮')

# ---------- F024：连接 → 已连接入口 → P003 → 运行诊断（五项） ----------
# add 页为 navigateTo 子页（tabBar 隐藏）：BACK 回 index（tab 页出现「已连接」tab 即到）
R['f024_diagnostics'] = 'BLOCKED'
xt = ''
for _ in range(3):
    back(); time.sleep(1.3)
    xt = dump()
    if any(_node_attr(n, 'text') == '已连接' for n in _nodes(xt)):
        break
btn = center_of_text('开始扫描', xt)
if btn:
    tap(*btn); time.sleep(2.5)
ok, xc = wait_text(lambda t, _: 'SHID-00000001' in ' '.join(t), 20, desc='rescan')
if ok:
    # 只点 SHID 卡片上的 连接（多卡同文：取与 SHID-00000001 名 y 最近的 连接）
    shid = center_of_text('SHID-00000001', xc)
    conn = None
    if shid:
        best, bd = None, 1 << 30
        for n in _nodes(xc):
            if _node_attr(n, 'text') == '连接':
                c = _node_center(n)
                if c and abs(c[1] - shid[1]) < bd:
                    bd, best = abs(c[1] - shid[1]), c
        conn = best
    if conn:
        tap(*conn); time.sleep(1.0)
        ok, xd = wait_text(lambda t, _: any('服务' in s for s in t) or any('GATT' in s for s in t) or any('已连接' in s for s in t), 30, desc='connect')
        shot('f024-11-connected-detail.png')
        print(f"F024 前置连接={ok}")
        if ok:
            back(); time.sleep(1.6)
            xt2 = dump()
            tab = center_of_text('已连接', xt2)
            if tab:
                tap(*tab); time.sleep(1.6)
                # 已连接列表：SHID 入口（buildConnectedDeviceOpenUrl → P003）
                ok, xe = wait_text(lambda t, _: 'SHID-00000001' in ' '.join(t), 12, desc='connected list')
                shid2 = center_of_text('SHID-00000001', xe)
                if shid2:
                    tap(*shid2); time.sleep(2.0)
                    ok, xf = wait_text(lambda t, _: any('运行诊断' in s for s in t), 15, desc='p003')
                    shot('f024-12-p003.png')
                    diag = center_of_text('运行诊断', xf) if ok else None
                    if diag:
                        tap(*diag); time.sleep(1.5)
                        ok, xg = wait_text(lambda t, _: any('当前状态' in s for s in t), 20, desc='diag page')
                        tg = texts(xg)
                        five = all(any(k in s for s in tg) for k in ('BLE', 'Wi-Fi', 'ControlHub', '控制连接', '设备 Ready'))
                        R['f024_diagnostics'] = 'PASS' if (ok and five) else 'FAIL'
                        shot('f024-13-diagnostics.png')
                        print(f"F024: 五项诊断={R['f024_diagnostics']} (页={ok} 五项={five}: {sorted(tg)[:16]})")
                    else:
                        print('F024: P003 未见 运行诊断（页面未达 P003？）')
                else:
                    print('F024: 已连接 tab 未见 SHID 入口')
            else:
                print('F024: 未见 已连接 tab（未回到 tab 页？）')
    else:
        print('F024: 未见 SHID 卡 连接 按钮')
else:
    print('F024: 重扫未见 SHID')

with open(os.path.join(OUT, 'uand-f018-f024-results.json'), 'w', encoding='utf-8') as f:
    json.dump(R, f, ensure_ascii=False, indent=2)
print('== 结果 ==')
for k, v in R.items():
    print(f'{k}: {v}')
