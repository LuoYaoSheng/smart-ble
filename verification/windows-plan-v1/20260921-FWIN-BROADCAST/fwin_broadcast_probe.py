"""F-WIN 广播翻门控空口验证（20260921-FWIN-BROADCAST，裁决项 #2）。

双端联调：F app（flutter_ble_peripheral WinRT 后端，仅厂商块）真发射，
华为 TAS-AN00 A-AND 扫描 onScanResult logcat 旁证行做空口观察者
（WIN-017 同基建同口径：CID 0x0001 + "BLE" 载荷 = F 表单默认值）。

流程：F 启动→切广播 Tab→点开始广播（默认表单 0001/"BLE"）→手机扫描收包
→断言厂商块→停播对照→截图取证。
坑位沿用 UIALIGN：DWM 边框/进程树认窗/SetProcessDPIAware/CREATE_NO_WINDOW。

用法: python fwin_broadcast_probe.py
"""

from __future__ import annotations

import ctypes
import ctypes.wintypes as wt
import re
import subprocess
import sys
import time

from PIL import ImageGrab

EVID = r"E:\project\xf\smart-ble\verification\windows-plan-v1\20260921-FWIN-BROADCAST"
EXE = r"E:\project\xf\smart-ble\apps\flutter\build\windows\x64\runner\Release\smart_ble.exe"

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
dwmapi = ctypes.windll.dwmapi

FAILS: list[str] = []


def sh(args, **kw):
    return subprocess.run(args, capture_output=True, text=True,
                          encoding="utf-8", errors="replace",
                          creationflags=0x08000000, **kw)


class PE32W(ctypes.Structure):
    _fields_ = [("dwSize", wt.DWORD), ("cntUsage", wt.DWORD), ("th32ProcessID", wt.DWORD),
                ("th32DefaultHeapID", ctypes.POINTER(ctypes.c_ulong)), ("th32ModuleID", wt.DWORD),
                ("cntThreads", wt.DWORD), ("th32ParentProcessID", wt.DWORD),
                ("pcPriClassBase", wt.LONG), ("dwFlags", wt.DWORD),
                ("szExeFile", ctypes.c_char * 260)]


def descendant_pids(root: int) -> set[int]:
    snap = kernel32.CreateToolhelp32Snapshot(0x2, 0)
    entry = PE32W(); entry.dwSize = ctypes.sizeof(PE32W)
    out = {root}
    procs = []
    ok = kernel32.Process32First(snap, ctypes.byref(entry))
    while ok:
        procs.append((entry.th32ProcessID, entry.th32ParentProcessID))
        ok = kernel32.Process32Next(snap, ctypes.byref(entry))
    kernel32.CloseHandle(snap)
    changed = True
    while changed:
        changed = False
        for pid, ppid in procs:
            if ppid in out and pid not in out:
                out.add(pid); changed = True
    return out


def find_window(pids: set[int]):
    hwnds = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
    def cb(hwnd, _):
        length = user32.GetWindowTextLengthW(hwnd)
        buf = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buf, length + 1)
        if buf.value:
            pid = wt.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            if pid.value in pids and user32.IsWindowVisible(hwnd):
                hwnds.append(hwnd)
        return True

    user32.EnumWindows(cb, 0)
    return hwnds[0] if hwnds else None


def frame_rect(hwnd):
    rect = wt.RECT()
    dwmapi.DwmGetWindowAttribute(hwnd, 9, ctypes.byref(rect), ctypes.sizeof(rect))
    return rect


def shot(hwnd, name):
    r = frame_rect(hwnd)
    img = ImageGrab.grab(bbox=(r.left, r.top, r.right, r.bottom), all_screens=True)
    img.save(f"{EVID}\\{name}.png")
    return img, (r.right - r.left, r.bottom - r.top)


def click(hwnd, x, y):
    """前台化后注入点击（mouse_event 打的是前台窗口，防焦点漂移打空）。"""
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.25)
    ctypes.windll.user32.SetCursorPos(int(x), int(y))
    time.sleep(0.1)
    ctypes.windll.user32.mouse_event(0x0002, 0, 0, 0, 0)
    ctypes.windll.user32.mouse_event(0x0004, 0, 0, 0, 0)
    time.sleep(0.2)


def tabbar_selected_frac(img):
    """tabbar 选中簇 x/W（选中 tab 图标+文字为主蓝 #1B6DFF；未选中灰）。"""
    px = img.load()
    w, h = img.size
    xs = []
    for y in range(h - 96, h - 6, 2):
        for x in range(0, w, 4):
            r, g, b = px[x, y][:3]
            if abs(r - 0x1B) < 30 and abs(g - 0x6D) < 30 and abs(b - 0xFF) < 30:
                xs.append(x)
    if not xs:
        return None
    xs.sort()
    return xs[len(xs) // 2] / w


def find_primary_button(img, w):
    """主色 #1B6DFF 像素簇 → 最大簇中心（「开始/停止广播」主按钮）。"""
    px = img.load()
    target = (0x1B, 0x6D, 0xFF)
    cols = {}
    for y in range(0, img.height, 3):
        run_start = None
        for x in range(0, img.width, 3):
            ok = False
            if 0.15 * w < x < 0.95 * w:
                r, g, b = px[x, y][:3]
                ok = abs(r - target[0]) < 28 and abs(g - target[1]) < 28 and abs(b - target[2]) < 28
            if ok and run_start is None:
                run_start = x
            elif not ok and run_start is not None:
                if x - run_start > 60:
                    cols.setdefault(y, (run_start, x))
                run_start = None
    if not cols:
        return None
    ys = sorted(cols)
    # 取簇最密集带的中心行（按钮垂直中心）
    best_y, best_n = ys[0], 0
    for y in ys:
        n = sum(1 for yy in ys if abs(yy - y) < 24)
        if n > best_n:
            best_y, best_n = y, n
    x0, x1 = cols[best_y]
    return (x0 + x1) / 2, best_y


def phone_scan():
    """A-AND 拉前台 → tap「开始扫描」（固定坐标，EMUI uiautomator null-root 绕行）。

    坐标来自 WIN-017 hw-00-first-dump.xml：bounds=[791,365][978,426]
    （A-AND 扫描页未扫描态的主按钮，Compose 布局固定）。
    返回 tap 前的手机时刻（logcat 时间戳口径），供 A2 按时间过滤。
    """
    sh(["adb", "shell", "am", "start", "-n", "com.smartble.android/com.smartble.ui.MainActivity"])
    time.sleep(2.5)
    now = sh(["adb", "shell", "date", "+%m-%dT%H:%M:%S"]).stdout.strip().replace("T", " ")
    sh(["adb", "shell", "input", "tap", "884", "395"])
    print(f"  phone-scan tapped at phone-clock {now}")
    return now


def logcat_dump():
    return sh(["adb", "logcat", "-s", "BleManager", "-d"]).stdout


def main():
    user32.SetProcessDPIAware()

    # 手机基线：清 logcat + 起 A-AND
    sh(["adb", "logcat", "-c"])
    sh(["adb", "shell", "am", "force-stop", "com.smartble.android"])
    time.sleep(1)
    sh(["adb", "shell", "am", "start", "-n", "com.smartble.android/com.smartble.ui.MainActivity"])
    time.sleep(3)

    # F 启动
    proc = subprocess.Popen([EXE], cwd=EXE.rsplit("\\", 1)[0],
                            creationflags=0x08000000)
    hwnd = None
    for _ in range(30):
        time.sleep(1)
        hwnd = find_window(descendant_pids(proc.pid))
        if hwnd:
            break
    if not hwnd:
        print("FAIL_NO_WINDOW")
        return 1
    # 窗口身份自证（坑位：环境常驻多个 BLE Toolkit+ 遗留窗口，防抓错）
    title_buf = ctypes.create_unicode_buffer(128)
    user32.GetWindowTextW(hwnd, title_buf, 128)
    wpid = wt.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(wpid))
    print(f"window: hwnd={hwnd} pid={wpid.value} popen={proc.pid} title={title_buf.value!r}")
    user32.SetWindowPos(hwnd, 0, 60, 60, 0, 0, 0x0001 | 0x0040)
    time.sleep(2)

    img, (w, h) = shot(hwnd, "01-broadcast-page")
    # 切广播 Tab：tabbar 第 3 簇中心（0.625W）；验证选中态失败重试 3 次
    r0 = frame_rect(hwnd)
    sel = tabbar_selected_frac(img)
    print(f"tab-selected-before: {sel}")
    for attempt in range(4):
        if sel is not None and 0.55 < sel < 0.70:
            break
        click(hwnd, r0.left + w * 0.625, r0.top + h - 42)
        time.sleep(2.0)
        img, (w, h) = shot(hwnd, f"02-broadcast-form-a{attempt}")
        sel = tabbar_selected_frac(img)
        print(f"tab-click#{attempt} selected={sel}")
    if not (sel is not None and 0.55 < sel < 0.70):
        print("FAIL_TAB_SWITCH")
        return 1
    img, (w, h) = shot(hwnd, "02-broadcast-form")
    print("form-shot ok", w, h)

    # 点「开始广播」（表单默认值 0001/"BLE" = Phase A 同载荷）并验证开播
    started = False
    for attempt in range(3):
        btn = find_primary_button(img, w)
        if not btn:
            print("FAIL_NO_PRIMARY_BUTTON")
            return 1
        r = frame_rect(hwnd)
        click(hwnd, r.left + btn[0], r.top + btn[1])
        print(f"start-broadcast#{attempt} clicked at {btn}")
        time.sleep(3)
        img2, _ = shot(hwnd, f"03-advertising-a{attempt}")
        btn2 = find_primary_button(img2, w)
        # 开播成功判定：原主按钮位置实心蓝消失（变「停止广播」描边样式）
        if btn2 is None or abs(btn2[0] - btn[0]) > 40 or abs(btn2[1] - btn[1]) > 60:
            started = True
            img = img2
            break
        img = img2
    if not started:
        print("FAIL_BROADCAST_NOT_STARTED")
        return 1
    print("advertising shot ok")

    # 手机扫描收包（5s 窗口）
    t1 = phone_scan()
    time.sleep(8)
    log1 = logcat_dump()
    hits = [l for l in log1.splitlines() if "424c45" in l.lower() or "0100424c45" in l.lower()]
    with open(f"{EVID}\\phone-phaseA-scan.log", "w", encoding="utf-8") as f:
        f.write(log1)
    mac = None
    if hits:
        mac = re.search(r"onScanResult: ([0-9A-F:]{17})", hits[0])
        mac = mac.group(1) if mac else None
        print(f"A1_PHONE_SAW_VENDOR_BLOCK hits={len(hits)} mac={mac}")
        for l in hits[:3]:
            print("  ", l[:150])
    else:
        print("A1_FAIL_NO_VENDOR_BLOCK")
        FAILS.append("A1")

    # 停播对照：F 点停止（同按钮变文案）
    img, (w, h) = shot(hwnd, "04-before-stop")
    btn2 = find_primary_button(img, w)
    if btn2:
        r = frame_rect(hwnd)
        click(hwnd, r.left + btn2[0], r.top + btn2[1])
        time.sleep(2)
        shot(hwnd, "05-stopped")
        print("stop clicked")
    # 手机再扫一轮对照：只统计第二轮 tap 之后的行（logcat -d 含全量缓冲）
    t2 = phone_scan()
    time.sleep(8)
    log2 = logcat_dump()
    with open(f"{EVID}\\phone-stopB-scan.log", "w", encoding="utf-8") as f:
        f.write(log2)
    if mac:
        after = [l for l in log2.splitlines() if mac in l and l[:15] >= t2]
        print(f"A2_STOP_CONTRAST mac={mac} scan2_from={t2} after_hits={len(after)}")
        for l in after[:2]:
            print("  ", l[:130])
    else:
        print("A2_SKIP_NO_MAC")

    # A3：退出 F 进程后再扫一轮——空口应静默（证明包源=F 进程，隔离环境干扰）
    proc.terminate()
    time.sleep(2)
    t3 = phone_scan()
    time.sleep(8)
    log3 = logcat_dump()
    with open(f"{EVID}\\phone-exitC-scan.log", "w", encoding="utf-8") as f:
        f.write(log3)
    if mac:
        after3 = [l for l in log3.splitlines() if mac in l and l[:15] >= t3]
        print(f"A3_AFTER_EXIT mac={mac} scan3_from={t3} hits={len(after3)}")
        if after3:
            FAILS.append("A3")

    # 收尾（A3 已 terminate）
    print("FAILS:", FAILS)
    return 0 if not FAILS else 1


if __name__ == "__main__":
    sys.exit(main())
