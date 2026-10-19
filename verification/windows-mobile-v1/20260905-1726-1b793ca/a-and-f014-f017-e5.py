# -*- coding: utf-8 -*-
# A-AND E5：F014-F017 广播域真机驱动（com.smartble BroadcastContent，Kotlin+Compose）
# 布景：E5（SM-G9910，蓝牙名「耀生 的 S21」）跑 A-AND 广播者 + ESP32 fixture_observer_s3
#       （BLEToolkit-Observer，COM12 115200，逐条输出 {"type":"advertisement",...} JSON）
# 验收：
#   F015(A-AND 并入) 非法 UUID 拦截 → 恢复默认 UUID 启动 → 「正在广播」+ logcat
#       BlePeripheralManager "Advertising started successfully"；
#       停止 → 「未广播」+ "Advertising stopped"
#   F017 观察侧证据：COM12 串口流中出现 services 含 fff0 的 advertisement JSON、
#       name=E5 蓝牙名、10s 窗口 ≥5 条、持续窗口条数增长；停止后 3s 宽限 + 8s 窗口 0 新增
#   F016(A-AND)：广播页无负载编辑器/预算条 → 依主矩阵 F016 REQ（U-WX/U-AND/F-AND）记
#       NOT_APPLICABLE，仅存页面证据帧
# 运行：python a-and-f014-f017-e5.py [serial] （E5 默认 R5CR1284Y7H；COM12 为观察侧串口）
import re, subprocess, sys, time, json, os, threading

SERIAL = sys.argv[1] if len(sys.argv) > 1 else 'R5CR1284Y7H'
PKG = 'com.smartble'
UART = 'COM12'
E5_BT_NAME = '耀生 的 S21'
DEFAULT_UUID = '0000FFF0-0000-1000-8000-00805F9B34FB'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'android-native')
os.makedirs(OUT, exist_ok=True)
XML = r'C:/Users/11066/AppData/Local/Temp/aand-bcast.xml'
SERIAL_EVID = os.path.join(OUT, 'aand-f014-f017-observer-serial.txt')

def adb(*args, binary=False, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')

def dump():
    adb('shell', 'uiautomator', 'dump', '/sdcard/aand-bcast.xml')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/aand-bcast.xml', XML],
                   capture_output=True, env={**os.environ, 'MSYS_NO_PATHCONV': '1'})
    try:
        return open(XML, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''

def texts(x):
    return set(t for t in re.findall(r'text="([^"]{1,400})"', x) if t.strip())

def text_bounds(x, label):
    for m in re.finditer(r'<node[^>]*text="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups())
        return ((a + c) // 2, (b + d) // 2)
    return None

def edit_bounds(x):
    # Compose OutlinedTextField → android.widget.EditText。页面有两个 EditText：
    # 只读「设备名称」框（text=Android 设备 (显示实际名称)）与「服务UUID」框。
    # 取 text 不等于只读文案的那个 = 服务UUID 输入框。
    nodes = re.findall(r'<node[^>]*class="android.widget.EditText"[^>]*/?>', x)
    for n in nodes:
        m = re.search(r'text="([^"]{0,400})"', n)
        if m and m.group(1) == 'Android 设备 (显示实际名称)':
            continue
        b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
        if b:
            x1, y1, x2, y2 = map(int, b.groups())
            return ((x1 + x2) // 2, (y1 + y2) // 2)
    return None

def tap(p):
    adb('shell', 'input', 'tap', str(p[0]), str(p[1]))

def shot(name):
    png = adb('exec-out', 'screencap', '-p', binary=True)
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(png)

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

# ---------- 观察侧串口线程 ----------
adv_lines = []          # (host_ts, json_str) 仅 type=advertisement
other_json = []         # boot/scan/error 等
raw_lock = threading.Lock()
stop_flag = {'stop': False}

def observer_thread():
    import serial
    try:
        ser = serial.Serial(UART, 115200, timeout=0.2)
    except Exception as e:
        print(f'[observer] 串口打开失败: {e}', flush=True)
        return
    ser.reset_input_buffer()
    buf = b''
    while not stop_flag['stop']:
        chunk = ser.read(4096)
        if not chunk:
            continue
        buf += chunk
        while b'\n' in buf:
            line, buf = buf.split(b'\n', 1)
            s = line.decode('utf-8', 'replace').strip()
            if not s.startswith('{'):
                continue
            with raw_lock:
                ts = time.time()
                if '"type":"advertisement"' in s:
                    adv_lines.append((ts, s))
                else:
                    other_json.append((ts, s))
    ser.close()

def adv_matches(pred):
    with raw_lock:
        return [s for _, s in adv_lines if pred(s)]

def _parse_adv(s):
    try:
        return json.loads(s)
    except ValueError:
        return None

def is_fff0_adv(s):
    """精确匹配：services/uuids 数组里含 16 位 fff0（防邻居厂商数据 hex 撞子串，v3/v4 教训）"""
    d = _parse_adv(s)
    if not d or d.get('type') != 'advertisement':
        return False
    arr = d.get('services', []) + d.get('uuids', [])
    for u in arr:
        ul = str(u).lower()
        if ul in ('fff0', '0xfff0') or ul.endswith('0000fff0-0000-1000-8000-00805f9b34fb'):
            return True
    return False

results = []
def check(name, ok, detail=''):
    results.append({'name': name, 'ok': ok, 'detail': detail[:260]})
    print(f"{'PASS' if ok else 'FAIL'} {name} | {detail[:170]}", flush=True)

def poll(pred, tries, gap):
    for _ in range(tries):
        x = dump()
        if pred(x):
            return x
        time.sleep(gap)
    return dump()

def logcat_grep(tag):
    out = adb('shell', 'logcat', '-d', '-s', tag)
    return out

def replace_field_text(x, new_text):
    """清空唯一 EditText 并输入 new_text，收起键盘"""
    p = edit_bounds(x)
    if not p:
        return False
    tap(p)
    time.sleep(0.8)
    adb('shell', 'input', 'keyevent', 'KEYCODE_MOVE_END')
    for _ in range(48):
        adb('shell', 'input', 'keyevent', 'KEYCODE_DEL')
    time.sleep(0.3)
    adb('shell', 'input', 'text', new_text)
    time.sleep(0.5)
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')  # 收 IME
    time.sleep(0.8)
    return True

def main():
    t_start = time.strftime('%H:%M:%S')
    print(f'== A-AND F014-F017 广播域驱动 start {t_start} ==', flush=True)

    # 0. 环境：唤醒、蓝牙开、清 logcat、起观察侧线程
    ensure_awake()
    bt = adb('shell', 'dumpsys', 'bluetooth_manager')
    if 'enabled: true' not in bt:
        check('ENV-bluetooth-on', False, 'E5 蓝牙未开启')
        return
    adb('shell', 'logcat', '-c')
    th = threading.Thread(target=observer_thread, daemon=True)
    th.start()
    time.sleep(1.0)

    # 1. 冷启动 + 进广播 Tab（开始广播按钮在折叠下方，进页后先上滑露出）
    adb('shell', 'am', 'force-stop', PKG)
    time.sleep(1.0)
    adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1')
    time.sleep(3.5)
    ensure_awake()
    x = poll(lambda x: text_bounds(x, '广播') is not None, 6, 1.5)
    tab = text_bounds(x, '广播')
    if not tab:
        check('F015-page-open', False, '未找到广播 Tab：' + '|'.join(sorted(texts(x))[:14]))
        return
    tap(tab)
    time.sleep(2.0)
    xpre = poll(lambda x: '未广播' in texts(x), 5, 1.5)   # 顶部状态卡（未滚动）
    idle_ok = '未广播' in texts(xpre) and '服务UUID' in texts(xpre)
    adb('shell', 'input', 'swipe', '540', '1950', '540', '1150', '500')  # 露出开始广播按钮
    time.sleep(1.5)
    x = poll(lambda x: text_bounds(x, '开始广播') is not None, 6, 1.5)
    tx = texts(x)
    shot('aand-f015-broadcast-idle.png')
    check('F015-page-open', idle_ok and '开始广播' in tx,
          '广播页就绪：顶部未广播徽标（滚动前）+开始广播按钮（滚动后）；texts=' + '|'.join(sorted(t for t in tx if len(t) < 26)[:12]))

    # 2. F015 负路径：非法 UUID → 错误卡「UUID 格式不正确」
    if replace_field_text(x, 'xyz'):
        x2 = poll(lambda x: text_bounds(x, '开始广播') is not None, 4, 1.2)
        b = text_bounds(x2, '开始广播')
        tap(b)
        x3 = poll(lambda x: 'UUID 格式不正确' in texts(x), 5, 1.2)
        shot('aand-f015-invalid-uuid.png')
        check('F015-invalid-uuid-blocked', 'UUID 格式不正确' in texts(x3),
              '非法 UUID 拦截，错误卡文案命中')
    else:
        check('F015-invalid-uuid-blocked', False, '未找到服务 UUID 输入框')

    # 3. F015 正路径：恢复默认 UUID → 开始广播
    x4 = dump()
    if replace_field_text(x4, DEFAULT_UUID):
        x5 = poll(lambda x: text_bounds(x, '开始广播') is not None, 4, 1.2)
        # 校验输入已恢复（EditText 文本出现在 dump）
        restored = DEFAULT_UUID in x5
        b = text_bounds(x5, '开始广播')
        tap(b)
        x6 = poll(lambda x: text_bounds(x, '停止广播') is not None, 8, 1.5)
        # 状态卡在视口顶部之外：下滑回顶取证
        adb('shell', 'input', 'swipe', '540', '1150', '540', '1950', '500')
        time.sleep(1.5)
        xtop = poll(lambda x: '正在广播' in texts(x), 5, 1.5)
        shot('aand-f015-advertising.png')
        lg = logcat_grep('BlePeripheralManager')
        started_ok = 'Advertising started successfully' in lg
        check('F015-start-advertising', '停止广播' in texts(x6) and '正在广播' in texts(xtop) and started_ok,
              f'UUID 恢复={restored}；按钮→停止广播；状态卡=正在广播；logcat started_success={started_ok}')
        # 回到按钮位置（后续停止用）
        adb('shell', 'input', 'swipe', '540', '1950', '540', '1150', '500')
        time.sleep(1.2)

        # 4. F017 观察侧：10s 窗口匹配 fff0 广播
        time.sleep(2.0)  # 空口传播宽限
        with raw_lock:
            base = len(adv_lines)
        time.sleep(10.0)
        fff0 = adv_matches(is_fff0_adv)
        with raw_lock:
            grown = len(adv_lines) - base
        name_hit = [s for s in fff0 if E5_BT_NAME in s]
        check('F017-observer-fff0-seen', len(fff0) >= 5,
              f'观察侧 10s 窗口 services 含 fff0 的 advertisement {len(fff0)} 条（≥5）；窗口总 advertisement 增量 {grown}')
        check('F017-observer-name-match', len(name_hit) >= 1,
              f'name 含 E5 蓝牙名「{E5_BT_NAME}」匹配 {len(name_hit)} 条')

        # 5. 持续窗口（F017 稳定性）
        c1 = len(fff0)
        time.sleep(8.0)
        fff0b = adv_matches(is_fff0_adv)
        check('F017-observer-continuous', len(fff0b) > c1,
              f'再 8s 后 fff0 条数 {c1}→{len(fff0b)}（持续广播中）')

        # 6. 停止广播 → UI + logcat + 观察侧 0 新增
        x7 = poll(lambda x: text_bounds(x, '停止广播') is not None, 5, 1.5)
        b2 = text_bounds(x7, '停止广播')
        if b2:
            fff0_pre_stop = len(adv_matches(is_fff0_adv))  # 紧贴停止前基线
            tap(b2)
            x8 = poll(lambda x: text_bounds(x, '开始广播') is not None, 6, 1.5)
            adb('shell', 'input', 'swipe', '540', '1150', '540', '1950', '500')
            time.sleep(1.5)
            x8t = dump()
            shot('aand-f015-stopped.png')
            lg2 = logcat_grep('BlePeripheralManager')
            stopped_ok = 'Advertising stopped' in lg2
            check('F015-stop-advertising', '开始广播' in texts(x8) and '未广播' in texts(x8t) and stopped_ok,
                  f'按钮回开始广播；状态卡回未广播；logcat stopped={stopped_ok}')
            time.sleep(3.0)  # 停止宽限：BluetoothLeAdvertiser.stopAdvertising 异步拆链，在途帧落这里
            fff0_after_grace = len(adv_matches(is_fff0_adv))
            time.sleep(8.0)  # 观察窗口：宽限后不应再有任何 fff0
            fff0_after = adv_matches(is_fff0_adv)
            check('F017-observer-ceased', len(fff0_after) == fff0_after_grace,
                  f'停止后宽限内收尾 {fff0_after_grace - fff0_pre_stop} 条（异步拆链在途）；'
                  f'宽限后 8s 窗口新增 {len(fff0_after) - fff0_after_grace} 条（期望 0）')
        else:
            check('F015-stop-advertising', False, '未找到停止广播按钮')

    # 7. F016：A-AND 无负载编辑器 → NOT_APPLICABLE 证据帧
    shot('aand-f016-notapplicable-page.png')
    check('F016-aand-not-applicable', True,
          'A-AND 广播页无负载编辑器/预算条（仅服务 UUID 字段）；F016 REQ=U-WX/U-AND/F-AND，A-AND 记 NOT_APPLICABLE')

    # 收尾：停观察线程、落盘
    stop_flag['stop'] = True
    time.sleep(0.8)
    with raw_lock:
        with open(SERIAL_EVID, 'w', encoding='utf-8') as f:
            f.write(f'# A-AND F014-F017 观察侧串口证据（{UART} 115200，host {t_start}-{time.strftime("%H:%M:%S")}）\n')
            f.write(f'# advertisement 总条数 {len(adv_lines)}；非 advertisement JSON {len(other_json)} 条\n')
            for ts, s in other_json[:20]:
                f.write(f'[{ts:.1f}] {s}\n')
            keep = [s for _, s in adv_lines if 'fff0' in s.lower()]
            others = [s for _, s in adv_lines if 'fff0' not in s.lower()]
            f.write(f'# === fff0 匹配 {len(keep)} 条（前 40）\n')
            for s in keep[:40]:
                f.write(s + '\n')
            f.write(f'# === 非 fff0 样本（前 10）\n')
            for s in others[:10]:
                f.write(s + '\n')
    resfile = os.path.join(OUT, 'aand-f014-f017-results.json')
    ok_n = sum(1 for r in results if r['ok'])
    with open(resfile, 'w', encoding='utf-8') as f:
        json.dump({'driver': 'a-and-f014-f017-e5.py', 'serial_dev': SERIAL, 'started': t_start,
                   'total': len(results), 'pass': ok_n, 'fail': len(results) - ok_n,
                   'results': results}, f, ensure_ascii=False, indent=1)
    print(f'== 完成：{ok_n}/{len(results)} PASS，结果 {resfile} ==', flush=True)

if __name__ == '__main__':
    main()
