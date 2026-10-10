#!/usr/bin/env python3
"""F-WIN 真机取证驱动 v6（收口版）。
坑位账（20260920）：
- FindWindowW 按标题会抓到僵尸实例 → 必须按「本进程 PID + EnumWindows」定窗
- 全屏搜狗浮窗/ZCode 会吃点击与遮挡 → 自家窗口 TOPMOST 后再操作
- 暗色主题下扫描钮=浅蓝图标药丸（非实心蓝）；亮色=蓝渐变实心 → 双谓词
流程：启动 → PID 定窗 → 置顶 → 点「扫描」→ 验证全页变化 → 5s 后取证 →
WM_CLOSE → 退出确认取证 → 点「退出」→ 验证自退。"""
import ctypes
import ctypes.wintypes as wt
import subprocess
import sys
import time
from collections import deque
from pathlib import Path

from PIL import ImageChops, ImageGrab

user32 = ctypes.windll.user32
WM_CLOSE = 0x0010
HWND_TOPMOST = -1
SWP_NOMOVE, SWP_NOSIZE = 0x0002, 0x0001
PRIMARY = (0x1B, 0x6D, 0xFF)

EV = Path(__file__).parent
EXE = Path(r"E:\project\xf\smart-ble\apps\flutter\build\windows\x64\runner\Release\smart_ble.exe")
WNDENUMPROC = ctypes.WINFUNCTYPE(wt.BOOL, wt.HWND, wt.LPARAM)


def window_of_pid(pid, timeout=15):
    end = time.time() + timeout
    while time.time() < end:
        found = []

        @WNDENUMPROC
        def cb(h, _):
            if user32.IsWindowVisible(h):
                p = wt.DWORD()
                user32.GetWindowThreadProcessId(h, ctypes.byref(p))
                if p.value == pid:
                    buf = ctypes.create_unicode_buffer(256)
                    user32.GetWindowTextW(h, buf, 256)
                    if buf.value.strip():
                        found.append(h)
            return True

        user32.EnumWindows(cb, 0)
        if found:
            return found[0]
        time.sleep(0.3)
    return 0


def rect_of(h):
    r = wt.RECT()
    user32.GetWindowRect(h, ctypes.byref(r))
    return (r.left, r.top, r.right, r.bottom)


def topmost(h):
    user32.SetWindowPos(h, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE)
    time.sleep(0.3)


def click(x, y):
    user32.SetCursorPos(x, y)
    time.sleep(0.15)
    user32.mouse_event(0x0002, 0, 0, 0, 0)
    time.sleep(0.05)
    user32.mouse_event(0x0004, 0, 0, 0, 0)


def clusters(im, pred, step=2, min_px=12, region=None):
    w, h = im.size
    px = im.load()
    x0, y0, x1, y1 = region or (0, 0, w, h)
    seen = [[False] * (w // step + 2) for _ in range(h // step + 2)]
    out = []
    for gy in range(y0, min(y1, h), step):
        for gx in range(x0, min(x1, w), step):
            if seen[gy // step][gx // step] or not pred(*px[gx, gy][:3]):
                continue
            q = deque([(gx, gy)])
            seen[gy // step][gx // step] = True
            pts = []
            while q:
                x, y = q.popleft()
                pts.append((x, y))
                for dx in (-step, 0, step):
                    for dy in (-step, 0, step):
                        nx, ny = x + dx, y + dy
                        if x0 <= nx < min(x1, w) and y0 <= ny < min(y1, h) and not seen[ny // step][nx // step] and pred(*px[nx, ny][:3]):
                            seen[ny // step][nx // step] = True
                            q.append((nx, ny))
            if len(pts) * step * step >= min_px:
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                out.append((min(xs), min(ys), max(xs), max(ys), len(pts)))
    return out


def is_accent(r, g, b):
    """扫描钮强调色：暗色=浅蓝图标/描边；亮色=蓝渐变实心。"""
    light_blue = b > 235 and 50 < r < 215 and 140 < g < 235 and b - r > 45
    solid = abs(r - PRIMARY[0]) <= 25 and abs(g - PRIMARY[1]) <= 25 and abs(b - PRIMARY[2]) <= 25
    deep = abs(r - 0x0E) <= 25 and abs(g - 0x4F) <= 25 and abs(b - 0xC4) <= 30
    return light_blue or solid or deep


def solid_primary(r, g, b):
    return abs(r - PRIMARY[0]) <= 22 and abs(g - PRIMARY[1]) <= 22 and abs(b - PRIMARY[2]) <= 22


def changed_px(a, b):
    return sum(ImageChops.difference(a, b).convert("L").getdata())


def main():
    proc = subprocess.Popen([str(EXE)], cwd=str(EXE.parent))
    print(f"[launch] pid={proc.pid}")
    h = window_of_pid(proc.pid)
    if not h:
        print("[FAIL] no window for pid")
        return 1
    time.sleep(2.5)
    bbox = rect_of(h)
    print(f"[window] {bbox}")
    topmost(h)

    im0 = ImageGrab.grab(bbox=bbox)
    im0.save(EV / "dbg-a-initial.png")
    cand = clusters(im0, is_accent, region=(950, 8, 1195, 115))
    print("[scan-btn candidates]", cand)
    if not cand:
        print("[FAIL] no accent cluster in header-right")
        return 1
    c = max(cand, key=lambda k: k[4])
    cx = bbox[0] + (c[0] + c[2]) // 2
    cy = bbox[1] + (c[1] + c[3]) // 2
    print(f"[btn] scan ≈ screen({cx},{cy}) from {c}")
    click(cx, cy)
    time.sleep(1.4)
    im1 = ImageGrab.grab(bbox=bbox)
    diff = changed_px(im0, im1)
    print(f"[verify] diff={diff}")
    if diff < 200000:
        print("[FAIL] scan click no visible effect")
        im1.save(EV / "dbg-b-afterclick.png")
        return 1

    time.sleep(7)
    ImageGrab.grab(bbox=bbox).save(EV / "fwin-02-scan-realdevice.png")
    print("[shot] fwin-02-scan-realdevice.png")

    user32.PostMessageW(h, WM_CLOSE, 0, 0)
    time.sleep(1.6)
    im2 = ImageGrab.grab(bbox=bbox)
    im2.save(EV / "fwin-03-exit-confirm.png")
    print("[shot] fwin-03-exit-confirm.png")

    pts = clusters(im2, solid_primary, min_px=100, region=(550, 380, 1190, 880))
    print("[quit candidates]", pts)
    if pts:
        c = max(pts, key=lambda k: k[4])
        cx, cy = bbox[0] + (c[0] + c[2]) // 2, bbox[1] + (c[1] + c[3]) // 2
    else:
        cx, cy = bbox[0] + 1075, bbox[1] + 800
        print("[WARN] fallback quit pos")
    print(f"[btn] quit ≈ ({cx},{cy})")
    click(cx, cy)
    time.sleep(2.5)
    gone = user32.FindWindowW(None, "SmartBLE") == 0 or window_of_pid(proc.pid, timeout=2) == 0
    print(f"[exit] window gone = {gone}")
    return 0 if gone else 1


if __name__ == "__main__":
    sys.exit(main())
