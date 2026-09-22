#!/usr/bin/env python3
"""F-WIN Windows 侧 GATT 真机走查驱动（20260921-FWIN-GATT-WALK）。

背景：FINAL-REPORT §7 登记缺口——F-WIN（flutter_blue_plus winrt 后端 = 独立原生路径）
此前仅扫描证据，无 Windows 侧 GATT 连接链真机取证。本驱动补齐：
  扫描 → 设备卡「连接」→ P006 详情（服务发现/枚举）→ 读 INFO → 订阅/退订 STATUS
  → 「导出」（剪贴板全量文本日志 = 文本证据缝）→ 断开 → WM_CLOSE 退出确认。
铁律：全程不触碰「写入」按钮，不写 INPUT 特征（SHID-FW-LOCK-001）。

机制沿用 probe_f_pages.py / fwin_drive.py 坑位账：
  SetProcessDPIAware + GetDpiForWindow 真实 dpr、DWM EXTENDED_FRAME_BOUNDS、
  all_screens=True、CREATE_NO_WINDOW、后代进程树认窗（venv 启动器坑）、TOPMOST 防浮窗吃点击。
截图坐标 = 物理像素（frame_bounds 原点为 (l,t)），click 直接用物理屏幕坐标。

子命令（跨进程共享 state.json）：
  launch            启动 exe、认窗、置顶、落 state
  state             打印当前窗口状态
  shot NAME         截图存 evidence/NAME.png，回显尺寸
  click X Y         物理屏幕坐标点击
  wclick WX WY      窗口(frame)相对坐标点击
  clipempty         清空剪贴板（导出前占位）
  clip              读剪贴板文本（导出后取证）
  close             PostMessage WM_CLOSE
  kill              taskkill 整树
"""
from __future__ import annotations

import ctypes
import ctypes.wintypes as wt
import json
import os
import subprocess
import sys
import time

from PIL import ImageGrab

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32
dwmapi = ctypes.windll.dwmapi
WM_CLOSE = 0x0010
HWND_TOPMOST = -1
SWP_NOMOVE, SWP_NOSIZE = 0x0002, 0x0001

HERE = os.path.dirname(os.path.abspath(__file__))
EV = os.path.join(HERE, "evidence")
STATE = os.path.join(HERE, "state.json")
CONSOLE = os.path.join(EV, "driver-console.txt")
EXE = os.path.normpath(os.path.join(HERE, "..", "..", "..", "apps", "flutter",
                                    "build", "windows", "x64", "runner", "Release", "smart_ble.exe"))
TITLE = "SmartBLE"


class PE32W(ctypes.Structure):
    _fields_ = [("dwSize", wt.DWORD), ("cntUsage", wt.DWORD), ("th32ProcessID", wt.DWORD),
                ("th32DefaultHeapID", ctypes.POINTER(ctypes.c_ulong)), ("th32ModuleID", wt.DWORD),
                ("cntThreads", wt.DWORD), ("th32ParentProcessID", wt.DWORD),
                ("pcPriClassBase", wt.LONG), ("dwFlags", wt.DWORD),
                ("szExeFile", ctypes.c_char * 260)]


def log(msg: str) -> None:
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line)
    os.makedirs(EV, exist_ok=True)
    with open(CONSOLE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def descendant_pids(root: int) -> set[int]:
    snap = kernel32.CreateToolhelp32Snapshot(0x2, 0)
    entry = PE32W(); entry.dwSize = ctypes.sizeof(PE32W)
    ok = kernel32.Process32First(snap, ctypes.byref(entry))
    procs = []
    while ok:
        procs.append((entry.th32ProcessID, entry.th32ParentProcessID))
        ok = kernel32.Process32Next(snap, ctypes.byref(entry))
    kernel32.CloseHandle(snap)
    out = {root}
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
        n = user32.GetWindowTextLengthW(hwnd)
        buf = ctypes.create_unicode_buffer(n + 1)
        user32.GetWindowTextW(hwnd, buf, n + 1)
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


def load_state() -> dict:
    with open(STATE, encoding="utf-8") as f:
        return json.load(f)


def save_state(d: dict) -> None:
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(d, f)


def need_hwnd() -> int:
    st = load_state()
    h = int(st["hwnd"])
    if not user32.IsWindow(h):
        raise SystemExit(f"[FAIL] hwnd {h} 已失效")
    return h


def click(x: int, y: int) -> None:
    user32.SetCursorPos(x, y)
    time.sleep(0.1)
    user32.mouse_event(0x0002, 0, 0, 0, 0)  # LEFTDOWN
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)  # LEFTUP


def cmd_launch() -> None:
    user32.SetProcessDPIAware()
    log(f"[launch] exe={EXE} exists={os.path.exists(EXE)}")
    proc = subprocess.Popen([EXE], cwd=os.path.dirname(EXE), creationflags=0x08000000)
    log(f"[launch] pid={proc.pid}")
    hwnd = None
    for _ in range(80):
        hwnd = find_window(descendant_pids(proc.pid), TITLE)
        if hwnd:
            break
        time.sleep(0.25)
    if not hwnd:
        log("[FAIL] 未找到窗口")
        sys.exit(1)
    time.sleep(2.0)
    user32.SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE)
    time.sleep(0.3)
    l, t, r, b = frame_bounds(hwnd)
    dpr = user32.GetDpiForWindow(hwnd) / 96.0
    save_state({"pid": proc.pid, "hwnd": hwnd, "l": l, "t": t, "r": r, "b": b})
    log(f"[launch] hwnd={hwnd} frame=({l},{t},{r},{b}) size={r-l}x{b-t} dpr={dpr:.2f}")


def cmd_state() -> None:
    h = need_hwnd()
    l, t, r, b = frame_bounds(h)
    buf = ctypes.create_unicode_buffer(256)
    user32.GetWindowTextW(h, buf, 256)
    dpr = user32.GetDpiForWindow(h) / 96.0
    log(f"[state] hwnd={h} title={buf.value!r} frame=({l},{t},{r},{b}) dpr={dpr:.2f}")


def cmd_shot(name: str) -> None:
    h = need_hwnd()
    l, t, r, b = frame_bounds(h)
    im = ImageGrab.grab(bbox=(l, t, r, b), all_screens=True).convert("RGB")
    path = os.path.join(EV, f"{name}.png")
    os.makedirs(EV, exist_ok=True)
    im.save(path)
    log(f"[shot] {name}.png {im.size}")


def cmd_click(x: int, y: int) -> None:
    click(x, y)
    log(f"[click] screen({x},{y})")


def cmd_wclick(wx: int, wy: int) -> None:
    st = load_state()
    l, t = int(st["l"]), int(st["t"])
    h = need_hwnd()
    l2, t2, _, _ = frame_bounds(h)
    click(l2 + wx, t2 + wy)
    log(f"[wclick] win({wx},{wy}) -> screen({l2 + wx},{t2 + wy})")


def _with_clipboard(fn) -> str:
    CF_UNICODETEXT = 13
    if not user32.OpenClipboard(0):
        raise SystemExit("[FAIL] OpenClipboard 失败")
    try:
        return fn(CF_UNICODETEXT)
    finally:
        user32.CloseClipboard()


def cmd_clipempty() -> None:
    def fn(_):
        user32.EmptyClipboard()
        return ""
    _with_clipboard(fn)
    log("[clipempty] 剪贴板已清空（导出前占位）")


def cmd_clip() -> None:
    # 64 位句柄必须显式 c_void_p：默认 restype 是 32 位 signed，
    # 截断后 GlobalLock 必失败（本轮踩坑，CLIPTEST 往返定位）
    user32.GetClipboardData.restype = ctypes.c_void_p
    kernel32.GlobalLock.restype = ctypes.c_void_p
    kernel32.GlobalLock.argtypes = [ctypes.c_void_p]
    kernel32.GlobalUnlock.argtypes = [ctypes.c_void_p]

    def fn(cf):
        h = user32.GetClipboardData(cf)
        if not h:
            return ""
        ptr = kernel32.GlobalLock(h)
        try:
            return ctypes.c_wchar_p(ptr).value or ""
        finally:
            kernel32.GlobalUnlock(h)
    text = _with_clipboard(fn)
    path = os.path.join(EV, "clipboard-export.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    log(f"[clip] {len(text)} chars -> {os.path.basename(path)}")
    print(text)


def cmd_close() -> None:
    h = need_hwnd()
    user32.PostMessageW(h, WM_CLOSE, 0, 0)
    log("[close] WM_CLOSE 已投递")


def cmd_kill() -> None:
    st = load_state()
    subprocess.run(["taskkill", "/PID", str(st["pid"]), "/T", "/F"], capture_output=True)
    log(f"[kill] taskkill {st['pid']}")


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    user32.SetProcessDPIAware()
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == "launch":
        cmd_launch()
    elif cmd == "state":
        cmd_state()
    elif cmd == "shot":
        cmd_shot(args[0])
    elif cmd == "click":
        cmd_click(int(args[0]), int(args[1]))
    elif cmd == "wclick":
        cmd_wclick(int(args[0]), int(args[1]))
    elif cmd == "clipempty":
        cmd_clipempty()
    elif cmd == "clip":
        cmd_clip()
    elif cmd == "close":
        cmd_close()
    elif cmd == "kill":
        cmd_kill()
    else:
        print(f"未知子命令: {cmd}")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
