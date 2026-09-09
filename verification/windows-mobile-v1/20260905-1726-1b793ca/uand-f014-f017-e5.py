# -*- coding: utf-8 -*-
# U-AND E5：UniApp Android（HBuilder 标准基座）F014-F017 广播域驱动 v3
# 布景：E5 跑 U-AND（io.dcloud.HBuilder 标准基座 = 无 LysBlePeripheral 原生插件）
#   + ESP32 fixture_observer_s3（COM12）——正路径广播需自定义基座（HBuilderX 云打包登录，
#   BLOCKED_TOOLCHAIN），本驱动覆盖：F016 预算算术/超限拦截 + F015 标准基座降级路径。
# v3 教训（v1/v2）：
#   - webview 只暴露可视区内容：开关在 y1187-1580、按钮/预算在 y2057+ 折叠下方 → 滚动编排；
#   - 键盘关闭态发 BACK 会把 uni-app 页面弹栈（broadcast→已连接）→ BACK 仅紧跟输入且发后
#     轮询页面仍在，被弹则重进 Tab 重做该步；
#   - EditText 属性顺序 text 在 class 前（v1 正则假设 class→text 全漏配）。
# 驱动方式：uiautomator dump → 文本断言 → 坐标 tap（WebView 文本可被 dump 暴露）
import re, subprocess, sys, time, json, os

SERIAL = sys.argv[1] if len(sys.argv) > 1 else 'R5CR1284Y7H'
PKG = 'io.dcloud.HBuilder'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'uniapp-android')
os.makedirs(OUT, exist_ok=True)
XML = r'C:/Users/11066/AppData/Local/Temp/uand-bcast.xml'

def adb(*args, binary=False, timeout=60):
    r = subprocess.run(['adb', '-s', SERIAL, *args], capture_output=True, timeout=timeout)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')

def dump():
    adb('shell', 'uiautomator dump /sdcard/uand-bcast.xml')
    subprocess.run(['adb', '-s', SERIAL, 'pull', '/sdcard/uand-bcast.xml', XML],
                   capture_output=True, env={**os.environ, 'MSYS_NO_PATHCONV': '1'})
    try:
        return open(XML, encoding='utf-8', errors='replace').read()
    except OSError:
        return ''

def texts(x):
    return set(t for t in re.findall(r'text="([^"]{1,80})"', x) if t.strip() and not t.startswith('&#'))

def bounds_of(x, label):
    for m in re.finditer(r'<node[^>]*text="' + re.escape(label) + r'"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', x):
        a, b, c, d = map(int, m.groups())
        return ((a + c) // 2, (b + d) // 2, a, b, c, d)
    return None

def edit_fields(x):
    out = []
    for m in re.finditer(r'<node[^>]*class="android.widget.EditText"[^>]*/?>', x):
        n = m.group(0)
        t = re.search(r'text="([^"]{0,80})"', n)
        b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
        if b:
            x1, y1, x2, y2 = map(int, b.groups())
            out.append({'val': t.group(1) if t else '', 'cx': (x1 + x2) // 2, 'cy': (y1 + y2) // 2})
    return out

def tap(x, y):
    adb('shell', 'input', 'tap', str(x), str(y))

def swipe(x1, y1, x2, y2, ms=400):
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
    results.append({'name': name, 'ok': ok, 'detail': detail[:260]})
    print(f"{'PASS' if ok else 'FAIL'} {name} | {detail[:170]}", flush=True)

def poll(pred, tries, gap):
    x = ''
    for _ in range(tries):
        x = dump()
        if pred(x):
            return x
        time.sleep(gap)
    return x

def budget_total(x):
    m = re.search(r'预计广播包大小：(\d+) / 31 字节', x)
    return int(m.group(1)) if m else None

def on_bcast_page(x):
    return bounds_of(x, '广播设置') is not None

def goto_bcast_tab():
    x = poll(lambda x: bounds_of(x, '广播') is not None, 8, 2.0)
    b = bounds_of(x, '广播')
    if not b:
        return ''
    tap(b[0], b[1])
    time.sleep(2.5)
    return poll(on_bcast_page, 8, 2.0)

def scroll_top():
    swipe(540, 1500, 540, 700, 400)
    time.sleep(1.0)

def scroll_bottom():
    swipe(540, 1500, 540, 2200, 400)
    time.sleep(1.0)

def tap_switch(x, label):
    """开关在标签行右端（x~846-1020 区域），点 (950, 标签cy)"""
    b = bounds_of(x, label)
    if not b:
        return False
    tap(950, b[1])
    time.sleep(1.5)
    return True

def type_field(idx, new_text):
    """编辑第 idx 个 EditText：tap 聚焦→清空→输入→BACK 收键盘（发后验页面未被弹栈）"""
    x = dump()
    fs = edit_fields(x)
    if len(fs) <= idx:
        return False
    f = fs[idx]
    tap(f['cx'], f['cy'])
    time.sleep(1.0)
    adb('shell', 'input', 'keyevent', 'KEYCODE_MOVE_END')
    for _ in range(64):
        adb('shell', 'input', 'keyevent', 'KEYCODE_DEL')
    time.sleep(0.2)
    adb('shell', 'input', 'text', new_text)
    time.sleep(0.6)
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')  # 键盘开 → 收键盘
    time.sleep(1.0)
    x2 = poll(on_bcast_page, 5, 1.5)
    if not on_bcast_page(x2):
        # 被弹栈（键未开时 BACK）→ 重进 Tab（输入是否生效由后续断言判定）
        goto_bcast_tab()
    return True

def main():
    t0 = time.strftime('%H:%M:%S')
    print(f'== U-AND F014-F017 广播域驱动 v3 start {t0} ==', flush=True)
    adb('shell', 'svc', 'power', 'stayon', 'usb')
    for p in ('android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT',
              'android.permission.BLUETOOTH_ADVERTISE', 'android.permission.ACCESS_FINE_LOCATION'):
        adb('shell', 'pm', 'grant', PKG, p)

    # 1. 冷启动 → 广播 Tab → 顶部
    adb('shell', 'am', 'force-stop', PKG)
    time.sleep(1.2)
    adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1')
    time.sleep(6.0)
    ensure_awake()
    x = goto_bcast_tab()
    shot('uand-f014-p008-top.png')
    fs = edit_fields(x)
    android_block = bounds_of(x, '添加服务UUID') is not None and bounds_of(x, '广播模式') is not None
    check('P008-open', on_bcast_page(x) and android_block and len(fs) >= 4
          and any(f['val'] == 'SmartBLE-A' for f in fs),
          f'广播页就绪：Android 块（模式/功率/开关）+4 字段默认值 {[f["val"][:12] for f in fs[:4]]}'
          f'（WIN-UAND-002 修复后）')

    # 2. F016 预算默认 7：滚到底部读预算
    scroll_bottom()
    x2 = poll(lambda x: budget_total(x) is not None, 5, 1.5)
    bt = budget_total(x2)
    shot('uand-f016-default-7.png')
    check('F016-budget-default', bt == 7, f'默认预算 {bt}/31（名称不含+UUID不含+厂商块 2+2+3）')
    scroll_top()

    # 3. F016 算术：添加服务UUID → 11；再包含设备名称 → 23
    x = dump()
    ok_sw = tap_switch(x, '添加服务UUID')
    scroll_bottom()
    x2 = poll(lambda x: budget_total(x) == 11, 5, 1.5)
    b11 = budget_total(x2)
    shot('uand-f016-uuid-on-11.png')
    check('F016-budget-uuid-toggle', ok_sw and b11 == 11, f'添加服务UUID 开 → 7→{b11}（+2+2 FFE0）')
    scroll_top()
    x = dump()
    ok_sw2 = tap_switch(x, '包含设备名称')
    scroll_bottom()
    x3 = poll(lambda x: budget_total(x) == 23, 5, 1.5)
    b23 = budget_total(x3)
    shot('uand-f016-name-on-23.png')
    check('F016-budget-name-toggle', ok_sw2 and b23 == 23, f'包含设备名称 开 → 11→{b23}（+2+10 SmartBLE-A）')
    # 还原两开关（关）
    scroll_top()
    x = dump()
    tap_switch(x, '包含设备名称')
    x = dump()
    tap_switch(x, '添加服务UUID')
    scroll_bottom()
    x4 = poll(lambda x: budget_total(x) == 7, 5, 1.5)
    check('F016-budget-toggles-restore', budget_total(x4) == 7, f'两开关还原关 → {budget_total(x4)}/31')

    # 4. F016 超限：厂商数据 30 字符 → 34/31 红显 + 开始广播被 toast 拦截
    scroll_top()
    typed = type_field(3, 'C' * 30)
    scroll_bottom()
    x5 = poll(lambda x: budget_total(x) is not None and budget_total(x) > 31, 6, 1.5)
    over = budget_total(x5)
    over_shown = '超出限制' in ' '.join(texts(x5))
    shot('uand-f016-overflow-34.png')
    b_start = bounds_of(x5, '开始广播')
    toast_hit = False
    if b_start and b_start[5] - b_start[4] > 5:
        tap(b_start[0], b_start[1])
        for _ in range(12):
            xt = dump()
            if any('广播包' in t and '超过' in t for t in texts(xt)):
                toast_hit = True
                break
            time.sleep(0.5)
        shot('uand-f016-overflow-toast.png')
    no_adv = '停止广播' not in ' '.join(texts(dump()))
    check('F016-overflow-blocked', typed and over == 34 and over_shown and toast_hit and no_adv,
          f'厂商数据 30 字符 → {over}/31 超限红显={over_shown}；toast 拦截={toast_hit}；未进入广播={no_adv}')

    # 5. 恢复默认（tab 切换不重跑 onLoad 字段留存——force-stop 冷重启 → onLoad 默认值）
    adb('shell', 'am', 'force-stop', PKG)
    time.sleep(1.2)
    adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1')
    time.sleep(5.5)
    ensure_awake()
    goto_bcast_tab()
    scroll_bottom()
    x6 = poll(lambda x: budget_total(x) == 7, 6, 1.5)
    shot('uand-f016-restored.png')
    fs6 = edit_fields(dump())
    check('F016-budget-restore', budget_total(x6) == 7,
          f'冷重启默认恢复 → {budget_total(x6)}/31（字段={[f["val"][:12] for f in fs6[:4]]}）')

    # 6. F015 降级路径①：检查支持 → 插件未初始化 + 未就绪
    b_chk = bounds_of(x6, '检查支持')
    if b_chk and b_chk[5] - b_chk[4] > 5:
        tap(b_chk[0], b_chk[1])
        time.sleep(2.0)
        swipe(540, 1500, 540, 700, 400)  # 日志面板在页面更下方
        time.sleep(1.2)
        x7 = poll(lambda x: '插件未初始化' in ' '.join(texts(x)), 6, 1.5)
        joined = ' '.join(texts(x7))
        shot('uand-f015-checksupport.png')
        check('F015-standard-base-plugin-missing', '插件未初始化' in joined,
              '标准基座无原生插件：检查支持 → 日志「插件未初始化」（未就绪态）')
    else:
        check('F015-standard-base-plugin-missing', False, '检查支持按钮不可见')

    # 7. F015 降级路径②：合法载荷启动 → 插件未初始化 toast（正路径=BLOCKED_TOOLCHAIN）
    swipe(540, 1500, 540, 2200, 400)
    time.sleep(1.0)
    x8 = dump()
    b_start = bounds_of(x8, '开始广播')
    if b_start and b_start[5] - b_start[4] > 5:
        tap(b_start[0], b_start[1])
        time.sleep(2.5)  # 蓝牙开+权限链（预授）
        toast2 = False
        for _ in range(12):
            xt = dump()
            if any('广播插件未初始化' in t or '插件未初始化' in t for t in texts(xt)):
                toast2 = True
                break
            time.sleep(0.6)
        shot('uand-f015-start-blocked.png')
        no_adv2 = '停止广播' not in ' '.join(texts(dump()))
        check('F015-standard-base-start-fallback', toast2 and no_adv2,
              '合法载荷启动 → 插件未初始化错误且不进入广播；正路径需自定义基座=BLOCKED_TOOLCHAIN')
    else:
        check('F015-standard-base-start-fallback', False, '开始广播按钮不可见')

    adb('shell', 'svc', 'power', 'stayon', 'false')
    resfile = os.path.join(OUT, 'uand-f014-f017-results.json')
    ok_n = sum(1 for r in results if r['ok'])
    with open(resfile, 'w', encoding='utf-8') as f:
        json.dump({'driver': 'uand-f014-f017-e5.py', 'serial_dev': SERIAL, 'started': t0,
                   'total': len(results), 'pass': ok_n, 'fail': len(results) - ok_n,
                   'results': results}, f, ensure_ascii=False, indent=1)
    print(f'== 完成：{ok_n}/{len(results)} PASS，结果 {resfile} ==', flush=True)

if __name__ == '__main__':
    main()
