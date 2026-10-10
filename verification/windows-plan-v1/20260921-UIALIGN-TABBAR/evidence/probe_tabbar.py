# -*- coding: utf-8 -*-
"""TabBar 正典几何探针（UIALIGN 20260921，F/Q 通用）。

用法：
  python probe_tabbar.py --exe <path> [--title SmartBLE] --png out.png
  python probe_tabbar.py --py <venv-python> --cwd <qt-dir> --png out.png

量测（正典 .tabbar）：
  A. 顶线 y 位置 → 底栏高 = H - y_line，期望 64（border-box）
  B. 顶线颜色 ≈ #EDF2F9
  C. 图标簇（非背景像素列聚类）数量 = 4，中心距等宽（flex:1）
  D. 首枚（选中）含 #1B6DFF 主色像素；未选枚含 #60758D 灰
"""
import argparse
import ctypes
import ctypes.wintypes as wt
import math
import subprocess
import sys
import time
from pathlib import Path

from PIL import ImageGrab

user32 = ctypes.windll.user32


def close(a, b, tol=12):
    return abs(a[0] - b[0]) <= tol and abs(a[1] - b[1]) <= tol and abs(a[2] - b[2]) <= tol


class PE32W(ctypes.Structure):
    _fields_ = [("dwSize", wt.DWORD), ("cntUsage", wt.DWORD),
                ("th32ProcessID", wt.DWORD),
                ("th32DefaultHeapID", ctypes.POINTER(ctypes.c_ulong)),
                ("th32ModuleID", wt.DWORD), ("cntThreads", wt.DWORD),
                ("th32ParentProcessID", wt.DWORD), ("pcPriClassBase", ctypes.c_long),
                ("dwFlags", wt.DWORD), ("szExeFile", ctypes.c_wchar * 260)]


def descendant_pids(root):
    """进程树（含 root）。坑：venv 启动器会把基础解释器当子进程拉起，
    Qt 窗口归孙子进程所有——按 PID 过滤必须走进程树。"""
    snap = ctypes.windll.kernel32.CreateToolhelp32Snapshot(2, 0)
    if snap == -1:
        return {root}
    parents = {}
    e = PE32W()
    e.dwSize = ctypes.sizeof(PE32W)
    ok = ctypes.windll.kernel32.Process32FirstW(snap, ctypes.byref(e))
    while ok:
        parents[e.th32ProcessID] = e.th32ParentProcessID
        ok = ctypes.windll.kernel32.Process32NextW(snap, ctypes.byref(e))
    ctypes.windll.kernel32.CloseHandle(snap)
    tree, frontier = {root}, [root]
    while frontier:
        p = frontier.pop()
        for pid, par in parents.items():
            if par == p and pid not in tree:
                tree.add(pid)
                frontier.append(pid)
    return tree


def find_window(pid, title, timeout=25):
    deadline = time.time() + timeout
    while time.time() < deadline:
        pids = descendant_pids(pid)
        hits = []

        @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
        def cb(h, _):
            if user32.IsWindowVisible(h):
                buf = ctypes.create_unicode_buffer(256)
                user32.GetWindowTextW(h, buf, 256)
                if buf.value == title:
                    wpid = wt.DWORD()
                    user32.GetWindowThreadProcessId(h, ctypes.byref(wpid))
                    if wpid.value in pids:
                        hits.append(h)
            return True

        user32.EnumWindows(cb, 0)
        if hits:
            return hits[0]
        time.sleep(0.4)
    return None


def shot(hwnd):
    # 坑（VWIN-UIALIGN2）：GetWindowRect 含 DWM 不可见调整边框 → 用可见框
    r = wt.RECT()
    dwm = ctypes.windll.dwmapi
    if dwm.DwmGetWindowAttribute(hwnd, 9, ctypes.byref(r), ctypes.sizeof(r)) == 0:
        pass  # r 已被填为 EXTENDED_FRAME_BOUNDS
    else:
        user32.GetWindowRect(hwnd, ctypes.byref(r))
    bbox = (r.left, r.top, r.right, r.bottom)
    # 坑：多显示器下默认只抓主屏坐标系——窗口在副屏时整图黑，必须 all_screens=True
    return ImageGrab.grab(bbox=bbox, all_screens=True), bbox


def analyze(im, log, dpr, active_index=0):
    W, H = im.size
    px = im.load()
    bar_phys = round(64 * dpr)  # 正典 64 逻辑 px

    # A/B. 底栏顶线：自底向上找第一条「整行大面积接近 #EDF2F9」的行
    y_line = None
    for y in range(H - 1, H - (bar_phys + 48), -1):
        n = sum(1 for x in range(40, W - 40, 8) if close(px[x, y], (0xED, 0xF2, 0xF9), 10))
        if n > (W - 80) / 8 * 0.8:
            y_line = y
            break
    bar_h = H - y_line if y_line is not None else None
    log.append(f"topline y={y_line} bar_height={bar_h}px = {bar_h / dpr if bar_h else -1:.1f}L (canon 64L, dpr={dpr})")

    # C. 图标/文字簇：列暗度直方图 + 窗口平滑（抗笔画断裂），再聚类
    y0 = (y_line if y_line is not None else H - bar_phys) + round(8 * dpr)
    y1 = H - round(16 * dpr)
    counts = [0] * W
    for x in range(8, W - 8):
        for y in range(y0, y1, 2):
            r, g, b = px[x, y][:3]
            if abs(r - 255) + abs(g - 255) + abs(b - 255) > 90:  # 非白底
                counts[x] += 1
    k = round(14 * dpr)
    smooth = [max(counts[max(0, x - k):x + k + 1] or [0]) for x in range(W)]
    clusters = []
    run = None
    for x in range(8, W - 8):
        if smooth[x] > 0:
            run = [x, x] if run is None else [run[0], x]
        elif run:
            if run[1] - run[0] >= round(24 * dpr):
                clusters.append(tuple(run))
            run = None
    if run and run[1] - run[0] >= round(24 * dpr):
        clusters.append(tuple(run))
    centers = [(a + b) / 2 for a, b in clusters]
    gaps = [round(centers[i + 1] - centers[i], 1) for i in range(len(centers) - 1)]
    log.append(f"clusters={len(clusters)} centers={[round(c) for c in centers]} gaps={gaps} (canon 4 枚等距)")
    equal = len(gaps) == 3 and max(gaps) - min(gaps) <= 4 * dpr

    # D. 色态：选中=首簇含 #1B6DFF；未选=含 #60758D
    def has_color(a, b, target, tol=36):
        for x in range(int(a), int(b), 2):
            for y in range(y0, y1, 2):
                if close(px[x, y][:3], target, tol):
                    return True
        return False

    primary = has_color(*clusters[active_index], (0x1B, 0x6D, 0xFF)) if len(clusters) > active_index else False
    mut_ok = all(has_color(*c, (0x60, 0x75, 0x8D))
                 for i, c in enumerate(clusters) if i != active_index) if len(clusters) == 4 else False
    log.append(f"active[{active_index}]-primary={primary} inactive-mut={mut_ok}")

    ok = (bar_h is not None and abs(bar_h - bar_phys) <= round(2 * dpr)
          and len(clusters) == 4 and equal and primary and mut_ok)
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--exe")
    ap.add_argument("--py")
    ap.add_argument("--cwd")
    ap.add_argument("--title", default="SmartBLE")
    ap.add_argument("--png", required=True)
    ap.add_argument("--wait", type=float, default=6.0)
    ap.add_argument("--args", default="")
    a = ap.parse_args()

    user32.SetProcessDPIAware()
    if a.exe:
        proc = subprocess.Popen([a.exe] + (a.args.split() if a.args else []))
    else:
        # CREATE_NO_WINDOW：控制台子进程会自弹黑窗盖住被测窗口（实测像素被污染）
        proc = subprocess.Popen([a.py, "main.py"], cwd=a.cwd, creationflags=0x08000000)
    try:
        hwnd = find_window(proc.pid, a.title)
        if not hwnd:
            print("FAIL: window not found")
            return 2
        time.sleep(a.wait)
        # 置顶防遮挡（坑：后台控制台/浮窗盖点）
        user32.SetWindowPos(hwnd, -1, 40, 30, 0, 0, 0x0003)
        time.sleep(0.5)
        im, bbox = shot(hwnd)
        Path(a.png).parent.mkdir(parents=True, exist_ok=True)
        im.save(a.png)
        dpi = user32.GetDpiForWindow(hwnd)
        dpr = (dpi / 96.0) if dpi else 1.0
        log = [f"window bbox={bbox} size={im.size} dpr={dpr}"]
        ok = analyze(im, log, dpr)
        for line in log:
            print(line)
        print("PROBE", "GREEN" if ok else "RED")
        return 0 if ok else 1
    finally:
        subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True)


if __name__ == "__main__":
    sys.exit(main())
