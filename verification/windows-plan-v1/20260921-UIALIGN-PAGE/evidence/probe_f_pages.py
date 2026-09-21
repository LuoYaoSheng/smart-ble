"""F-WIN 页面级活体探针（UIALIGN-PAGE 20260921）。

F-WIN 无 CDP/automation 缝（Flutter 单纹理渲染），采 Win32 窗口截图 +
SendInput 合成点击切换 Tab，逐页断言正典几何/色值：
  A. tabbar：64px·dpr + 1px 顶线 + 四等宽簇 + 选中主色
  B. navbar：渐变 + 1px #EDF2F9 底线 + kicker 主色 + bt-chip 绿点
  C. .page 边距：左 16·dpr
  D. 扫描钮 40·dpr 高主色渐变
  E. P007 chip / P008 badge / P009 verchip（#F1F5FB 胶囊）
坑位沿用 UIALIGN-TABBAR：DWM EXTENDED_FRAME_BOUNDS、all_screens=True、
CREATE_NO_WINDOW、后代进程树认窗、SetProcessDPIAware。
用法：python probe_f_pages.py [exe-path]
"""

from __future__ import annotations

import ctypes
import ctypes.wintypes as wt
import os
import subprocess
import sys
import time

from PIL import ImageGrab

# 正典色
C_BG = (0xF8, 0xFB, 0xFF)
C_LINE_SOFT = (0xED, 0xF2, 0xF9)
C_LINE = (0xE3, 0xEA, 0xF3)
C_PRIMARY = (0x1B, 0x6D, 0xFF)
C_FILL = (0xF1, 0xF5, 0xFB)
C_SUCCESS = (0x17, 0xC7, 0xA8)

FAILS: list[str] = []

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
dwmapi = ctypes.windll.dwmapi


class PE32W(ctypes.Structure):
    _fields_ = [("dwSize", wt.DWORD), ("cntUsage", wt.DWORD), ("th32ProcessID", wt.DWORD),
                ("th32DefaultHeapID", ctypes.POINTER(ctypes.c_ulong)), ("th32ModuleID", wt.DWORD),
                ("cntThreads", wt.DWORD), ("th32ParentProcessID", wt.DWORD), ("pcPriClassBase", wt.LONG),
                ("dwFlags", wt.DWORD), ("szExeFile", ctypes.c_char * 260)]


def descendant_pids(root: int) -> set[int]:
    snap = kernel32.CreateToolhelp32Snapshot(0x2, 0)
    entry = PE32W(); entry.dwSize = ctypes.sizeof(PE32W)
    out = {root}
    ok = kernel32.Process32First(snap, ctypes.byref(entry))
    procs = []
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


def find_window(pids: set[int], title: str):
    hwnds = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
    def cb(hwnd, _):
        length = user32.GetWindowTextLengthW(hwnd)
        buf = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buf, length + 1)
        if buf.value == title:
            pid = wt.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            if pid.value in pids:
                hwnds.append(hwnd)
        return True

    user32.EnumWindows(cb, 0)
    return hwnds[0] if hwnds else None


def frame_bounds(hwnd):
    rect = wt.RECT()
    dwmapi.DwmGetWindowAttribute(hwnd, 9, ctypes.byref(rect), ctypes.sizeof(rect))
    return rect.left, rect.top, rect.right, rect.bottom


def click(x: int, y: int) -> None:
    """mouse_event 绝对坐标合成点击（0..65535 归一化，主屏坐标系）。"""
    nx = int(x * 65535 / user32.GetSystemMetrics(0))
    ny = int(y * 65535 / user32.GetSystemMetrics(1))
    ctypes.windll.user32.SetCursorPos(x, y)
    time.sleep(0.08)
    ctypes.windll.user32.mouse_event(0x0002, 0, 0, 0, 0)  # LEFTDOWN
    time.sleep(0.05)
    ctypes.windll.user32.mouse_event(0x0004, 0, 0, 0, 0)  # LEFTUP


def near(a, b, tol=12) -> bool:
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def check(name: str, cond: bool, detail: str = "") -> None:
    mark = "PASS" if cond else "FAIL"
    print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))
    if not cond:
        FAILS.append(name)


def client_origin(hwnd):
    rc = wt.RECT()
    user32.GetClientRect(hwnd, ctypes.byref(rc))
    pt = wt.POINT(rc.left, rc.top)
    user32.ClientToScreen(hwnd, ctypes.byref(pt))
    return pt.x, pt.y


def grab(hwnd):
    l, t, r, b = frame_bounds(hwnd)
    return ImageGrab.grab(bbox=(l, t, r, b), all_screens=True).convert("RGB"), (l, t, r, b)


def analyze(im, dpr: float, page: str) -> None:
    w, h = im.size

    def px(x, y):
        return im.getpixel((int(x), int(y)))

    def rows_with(color, x0, x1, y0, y1, ratio=0.6, tol=6):
        step = max(1, int((x1 - x0) // 64))
        xs = list(range(int(x0), int(x1), step))
        out = []
        for y in range(int(y0), int(y1)):
            if sum(1 for x in xs if near(px(x, y), color, tol)) >= ratio * len(xs):
                out.append(y)
        return out

    # A. tabbar 顶线 + 高度
    tline = rows_with(C_LINE_SOFT, 20 * dpr, w - 20 * dpr, h - 80 * dpr, h - 40 * dpr)
    check(f"{page}/tabbar 顶线", bool(tline))
    if tline:
        check(f"{page}/tabbar 高≈64·dpr", abs((h - tline[0]) - 64 * dpr) <= 3 * dpr,
              f"h={h - tline[0]}")
    # B. navbar 底线（页面首条 LINE_SOFT）
    nline = rows_with(C_LINE_SOFT, 20 * dpr, w - 20 * dpr, 30 * dpr, 140 * dpr)
    check(f"{page}/navbar 底线", bool(nline), str(nline[:2]))
    nb = nline[0] if nline else 60 * dpr
    # navbar 渐变：顶部近白、底线之上近底色
    g_top = px(w * 0.5, nb - int(40 * dpr))
    g_bot = px(w * 0.5, nb - 2)
    check(f"{page}/navbar 渐变(白→底)", near(g_top, (255, 255, 255), 8) and near(g_bot, C_BG, 10),
          f"{g_top}→{g_bot}")
    # kicker 主色（左上）
    kicker = any(near(px(x, y), C_PRIMARY, 40)
                 for y in range(int(12 * dpr), int(30 * dpr))
                 for x in range(int(16 * dpr), int(220 * dpr)))
    check(f"{page}/kicker 主色", kicker)
    return nb


def analyze_scan(im, dpr: float, cl_off: int) -> None:
    w, h = im.size

    def px(x, y):
        return im.getpixel((int(x), int(y)))

    # 扫描钮：scantool 行右侧主色簇（连续纵段 40·dpr）
    blues = []
    for y in range(int(70 * dpr), int(200 * dpr)):
        for x in range(int(w * 0.5), w, 2):
            if near(px(x, y), C_PRIMARY, 45):
                blues.append(y)
                break
    check("scan/扫描钮主色簇", bool(blues))
    if blues:
        ys = sorted(set(blues))
        segs = []
        for y in ys:
            if segs and segs[-1][1] >= y - 1:
                segs[-1][1] = y
            else:
                segs.append([y, y])
        seg = max(segs, key=lambda s: s[1] - s[0])
        check("scan/扫描钮高≈40·dpr", abs((seg[1] - seg[0] + 1) - 40 * dpr) <= 3 * dpr,
              f"h={seg[1] - seg[0] + 1} segs={segs}")
    # bt-chip 绿点（navbar 右区）
    dot = any(near(px(x, y), C_SUCCESS, 35)
              for y in range(int(28 * dpr), int(143 * dpr))
              for x in range(int(w * 0.7), w))
    check("scan/bt-chip 就绪绿点", dot)
    # 页边距：以客户区左缘为基准（DWM 边框不含在内）
    firsts = []
    for y in range(int(150 * dpr), int(260 * dpr), 8):
        first = next((x for x in range(cl_off, int(cl_off + 90 * dpr))
                      if not near(px(x, y), C_BG, 8)), -1)
        if first >= 0:
            firsts.append(first - cl_off)
    margin = min(firsts) if firsts else -1
    check("scan/页边距左≈16·dpr（客户区）", margin >= 0 and abs(margin - 16 * dpr) <= 4 * dpr,
          f"margin={margin} rows={len(firsts)} expect≈{16 * dpr:.0f}")


def analyze_connected(im, dpr: float) -> None:
    w, h = im.size

    def px(x, y):
        return im.getpixel((int(x), int(y)))

    chip = any(near(px(x, y), C_FILL, 6)
               for y in range(int(28 * dpr), int(60 * dpr))
               for x in range(int(w * 0.7), w))
    check("conn/navbar chip #F1F5FB", chip)


def analyze_broadcast(im, dpr: float) -> None:
    w, h = im.size

    def px(x, y):
        return im.getpixel((int(x), int(y)))

    chip = any(near(px(x, y), C_FILL, 6)
               for y in range(int(28 * dpr), int(60 * dpr))
               for x in range(int(w * 0.7), w))
    check("bcast/navbar 平台 chip", chip)


def analyze_about(im, dpr: float) -> None:
    w, h = im.size

    def px(x, y):
        return im.getpixel((int(x), int(y)))

    chip = any(near(px(x, y), C_FILL, 6)
               for y in range(int(28 * dpr), int(60 * dpr))
               for x in range(int(w * 0.7), w))
    check("about/verchip #F1F5FB", chip)
    # 内容卡：页面下部有白卡（0..768·dpr 列）
    white = any(near(px(x, y), (255, 255, 255), 4)
                for y in range(int(90 * dpr), int(400 * dpr))
                for x in range(int(16 * dpr), int(min(w, 780 * dpr)), 4))
    check("about/白卡内容", white)


def main() -> int:
    exe = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__)))))), "apps", "flutter", "build", "windows", "x64",
        "runner", "Release", "smart_ble.exe")
    outdir = os.path.dirname(os.path.abspath(__file__))
    user32.SetProcessDPIAware()
    dpr_h = ctypes.windll.shcore.GetScaleFactorForDevice(0) / 100.0 if hasattr(ctypes.windll, "shcore") else 1.0

    proc = subprocess.Popen([exe], cwd=os.path.dirname(exe), creationflags=0x08000000)
    try:
        hwnd = None
        for _ in range(80):
            hwnd = find_window(descendant_pids(proc.pid), "SmartBLE")
            if hwnd:
                break
            time.sleep(0.25)
        if not hwnd:
            check("F 窗口找到", False)
            return 1
        time.sleep(2.0)

        # tab0 扫描
        im, (l, t, r, b) = grab(hwnd)
        dpr = user32.GetDpiForWindow(hwnd) / 96.0  # 真实 DPI（物理=逻辑×dpr）
        print(f"# tab0 {im.size} dpr={dpr:.2f} frame=({l},{t},{r},{b})")
        im.save(os.path.join(outdir, "f-tab0.png"))
        cl = client_origin(hwnd)[0] - l
        analyze(im, dpr, "scan")
        analyze_scan(im, dpr, cl)

        # 合成点击切 tab：1=已连接 2=广播 3=关于
        tabs = [("f-tab1.png", 1, analyze_connected),
                ("f-tab2.png", 2, analyze_broadcast),
                ("f-tab3.png", 3, analyze_about)]
        for fname, idx, fn in tabs:
            cx = l + (r - l) * (2 * idx + 1) / 8
            cy = b - 32 * dpr
            click(int(cx), int(cy))
            time.sleep(1.2)
            im, _ = grab(hwnd)
            im.save(os.path.join(outdir, fname))
            analyze(im, dpr, fname.split("-")[1].split(".")[0])
            fn(im, dpr)
    finally:
        subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                       capture_output=True)

    print(f"\n{'ALL GREEN' if not FAILS else 'FAILURES: ' + ', '.join(FAILS)}")
    return 0 if not FAILS else 1


if __name__ == "__main__":
    sys.exit(main())
