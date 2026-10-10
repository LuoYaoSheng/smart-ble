"""Q-WIN 页面级活体探针（UIALIGN-PAGE 20260921）。

经 SMARTBLE_AUTOMATION_PORT TCP 缝驱动 + QWidget.grab() 离屏渲染截图，
逐页断言正典几何与色值：
  A. navbar：底渐变 + 1px #EDF2F9 底线、kicker 主色、bt-chip 点
  B. .page 边距：内容左 16·dpr（卡片左缘到窗口缘）
  C. 设备卡：白底 + 1px #E3EAF3 边 + 44·dpr ava 渐变 + acts 主色按钮
  D. 筛选面板：pre pill #F1F5FB 底、选中 #1B6DFF 底白字
  E. 扫描钮：40·dpr 高、主色渐变
  F. P007：空态 + navbar chip；P008 note #E8F1FF 底；P009 身份卡/verchip
用法：python probe_q_pages.py [qt-dir]
"""

from __future__ import annotations

import base64
import io
import json
import os
import socket
import subprocess
import sys
import time

PORT = 9476

# 正典色
C_BG = (0xF8, 0xFB, 0xFF)
C_LINE_SOFT = (0xED, 0xF2, 0xF9)
C_LINE = (0xE3, 0xEA, 0xF3)
C_PRIMARY = (0x1B, 0x6D, 0xFF)
C_PRIMARY_DEEP = (0x0E, 0x4F, 0xC4)
C_FILL = (0xF1, 0xF5, 0xFB)
C_SUCCESS = (0x17, 0xC7, 0xA8)
C_WHITE = (255, 255, 255)

FAILS: list[str] = []


def rpc(sock: socket.socket, cmd: str, args: dict | None = None, rid: int = 0, timeout: float = 20.0):
    sock.settimeout(timeout)
    req = {"id": rid, "cmd": cmd, "args": args or {}}
    sock.sendall((json.dumps(req, ensure_ascii=False) + "\n").encode("utf-8"))
    f = sock.makefile("rb")
    while True:
        line = f.readline()
        if not line:
            raise RuntimeError("seam closed")
        resp = json.loads(line.decode("utf-8"))
        if resp.get("id") == rid:
            if not resp.get("ok"):
                raise RuntimeError(f"{cmd}: {resp.get('err')}")
            return resp.get("v")


def snap_png(sock, rid: int):
    v = rpc(sock, "snap", rid=rid)
    import PIL.Image as Image
    return Image.open(io.BytesIO(base64.b64decode(v))).convert("RGB")


def near(a, b, tol=14) -> bool:
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def check(name: str, cond: bool, detail: str = "") -> None:
    mark = "PASS" if cond else "FAIL"
    print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))
    if not cond:
        FAILS.append(name)


def px(im, x: int, y: int):
    return im.getpixel((x, y))


def find_rows_with_color(im, color, x0, x1, y0, y1, ratio=0.6, tol=8):
    """在区域内找接近 color 的整行（采样 xs 中 ≥ratio 命中）。"""
    w, h = im.size
    step = max(1, (x1 - x0) // 64)
    xs = list(range(x0, x1, step))
    rows = []
    for y in range(max(0, y0), min(h, y1)):
        hit = sum(1 for x in xs if near(px(im, x, y), color, tol))
        if hit >= ratio * len(xs):
            rows.append(y)
    return rows


def first_x_near_color_row(im, color, y, tol=10):
    w, _ = im.size
    for x in range(0, w):
        if near(px(im, x, y), color, tol):
            return x
    return -1


def analyze_scan_empty(im, dpr: float, log) -> None:
    w, h = im.size
    # A. navbar 底线 #EDF2F9（0~navbar_bottom 区域，约 60~100·dpr）
    line_rows = find_rows_with_color(im, C_LINE_SOFT, int(20 * dpr), int(w - 20 * dpr), int(40 * dpr), int(120 * dpr))
    check("scan/navbar 底线 #EDF2F9 存在", bool(line_rows), str(line_rows[:3]))
    nb = line_rows[0] if line_rows else int(90 * dpr)
    # B. 扫描钮：右上部主色簇；取最长连续纵段（排除右侧「筛选」主色文字干扰）
    blues = [(x, y) for y in range(int(nb + 5 * dpr), int(nb + 120 * dpr))
             for x in range(int(w * 0.55), w) if near(px(im, x, y), C_PRIMARY, 40)]
    check("scan/扫描钮主色簇存在", bool(blues))
    if blues:
        ys = sorted({b[1] for b in blues})
        segs = []
        for y in ys:
            if segs and segs[-1][1] >= y - 1:
                segs[-1][1] = y
            else:
                segs.append([y, y])
        seg = max(segs, key=lambda s: s[1] - s[0])
        bh = seg[1] - seg[0] + 1
        xs = [b[0] for b in blues if seg[0] <= b[1] <= seg[1]]
        bw = max(xs) - min(xs) + 1
        check("scan/扫描钮高≈40·dpr", abs(bh - 40 * dpr) <= 3 * dpr,
              f"h={bh} expect≈{40 * dpr} segs={segs}")
        check("scan/扫描钮宽≥74·dpr（padding 18）", bw >= 74 * dpr, f"w={bw}")
    # C. 空态雷达插画存在（LINE 同心圆 → 上半有 LINE 色像素）
    mid_x = w // 2
    found = any(near(px(im, mid_x + dx, y), C_LINE, 12)
                for y in range(int(nb + 40 * dpr), int(h - 100 * dpr))
                for dx in range(-60, 61, 6))
    check("scan/空态插画（雷达线圈）可见", found)
    # D. bt-chip 绿点（navbar 右侧 success 8·dpr）
    dot = any(near(px(im, x, y), C_SUCCESS, 30)
              for y in range(int(30 * dpr), nb)
              for x in range(int(w * 0.7), w))
    check("scan/bt-chip 蓝牙就绪绿点", dot)


def analyze_scan_cards(im, dpr: float, log) -> None:
    w, h = im.size
    # 卡片上边框（#E3EAF3 横贯行）：在 sec-t 之下找
    rows = find_rows_with_color(im, C_LINE, int(30 * dpr), int(w - 30 * dpr), int(150 * dpr), int(400 * dpr), ratio=0.7)
    check("scan/设备卡上边框存在", bool(rows), str(rows[:3]))
    if not rows:
        return
    top = rows[0]
    # .page 左边距：量卡内行的竖边框（边框行只 1px，取卡内 20·dpr 行的左缘）
    lx = first_x_near_color_row(im, C_LINE, top + int(20 * dpr), tol=8)
    check("scan/页边距左 16·dpr", lx >= 0 and abs(lx - 16 * dpr) <= 2 * dpr, f"lx={lx} expect≈{16 * dpr}")
    # ava：卡内 (16+16)·dpr 起 44·dpr 渐变方块（主浅色 #E8F1FF~#DCE9FF）
    ax0 = int((16 + 16 + 4) * dpr)
    ay = top + int(20 * dpr)
    ava_px = px(im, ax0 + int(10 * dpr), ay)
    check("scan/ava 渐变浅主色", near(ava_px, (0xE8, 0xF1, 0xFF), 22) or near(ava_px, (0xDC, 0xE9, 0xFF), 22),
          f"ava={ava_px}")
    # acts 主色连接按钮（卡下部主色簇）
    blues = [y for y in range(top + int(60 * dpr), min(top + int(160 * dpr), h))
             if any(near(px(im, x, y), C_PRIMARY, 40) for x in range(int(40 * dpr), int(w - 40 * dpr)))]
    check("scan/卡内连接钮主色", bool(blues))


def analyze_filter(im, dpr: float) -> None:
    w, h = im.size
    # pre pill：FILL 底（扫过区域找成片 FILL 行）
    fills = [(x, y) for y in range(int(120 * dpr), int(320 * dpr))
             for x in range(int(30 * dpr), int(w * 0.9), 2) if near(px(im, x, y), C_FILL, 6)]
    check("filter/pre pill #F1F5FB 底存在", len(fills) > 40, f"n={len(fills)}")
    # 选中档主色 pill
    sel = [(x, y) for y in range(int(120 * dpr), int(320 * dpr))
           for x in range(int(30 * dpr), int(w * 0.9), 2) if near(px(im, x, y), C_PRIMARY, 30)]
    check("filter/选中档 #1B6DFF 主色底", len(sel) > 20, f"n={len(sel)}")


def analyze_connected(im, dpr: float) -> None:
    w, h = im.size
    line_rows = find_rows_with_color(im, C_LINE_SOFT, int(20 * dpr), int(w - 20 * dpr), int(40 * dpr), int(120 * dpr))
    check("conn/navbar 底线存在", bool(line_rows))
    # navbar 右 chip：FILL 底胶囊
    if line_rows:
        nb = line_rows[0]
        chip = any(near(px(im, x, y), C_FILL, 6)
                   for y in range(int(30 * dpr), nb)
                   for x in range(int(w * 0.7), w))
        check("conn/navbar chip #F1F5FB", chip)
    # 空态标题区（正典 .empty 位于列表区顶部：navbar 下第一块）
    dark = any(sum(px(im, x, y)) < 350
               for y in range(int(90 * dpr), int(320 * dpr))
               for x in range(int(w * 0.2), int(w * 0.8), 3))
    check("conn/空态可见", dark)


def analyze_broadcast(im, dpr: float) -> None:
    w, h = im.size
    note = [(x, y) for y in range(int(80 * dpr), int(280 * dpr))
            for x in range(int(20 * dpr), int(w - 20 * dpr), 3)
            if near(px(im, x, y), (0xE8, 0xF1, 0xFF), 6)]
    check("bcast/note info #E8F1FF 底", len(note) > 60, f"n={len(note)}")


def analyze_about(im, dpr: float) -> None:
    w, h = im.size
    # 身份卡行穿越（y=卡中部）：bg→边框→白卡 … 白卡→边框→bg，列宽 768 居中
    # 注意 ClearType 次像素纹：用「非 bg」穿越而非颜色匹配
    y = int(110 * dpr)

    def is_bg(p):
        return near(p, C_BG, 6)

    first = last = -1
    inside = False
    for x in range(0, w):
        p = px(im, x, y)
        if not inside:
            if not is_bg(p):
                first = x
                inside = True
        else:
            if is_bg(p) and x > first + int(50 * dpr):
                last = x - 1
                break
    expect_l = (w - 768 * dpr) / 2
    check("about/768 列居中（左缘）", first >= 0 and abs(first + 1 - expect_l) <= 3 * dpr,
          f"first={first} expect≈{expect_l - 1:.0f}")
    if last > 0:
        check("about/列宽≈768·dpr", abs((last - first) - 768 * dpr) <= 4 * dpr,
              f"w={last - first}")
    # logo：渐变主色 38·dpr（中心点取样，避开 ClearType 纹）
    logo_x = int(expect_l + 17 * dpr + 19 * dpr)
    logo_y = int(110 * dpr)
    p = px(im, logo_x, logo_y)
    grad = near(p, C_PRIMARY, 50) or near(p, C_PRIMARY_DEEP, 50)
    check("about/logo 渐变主色", grad, f"{p}")
    # verchip：navbar 右 FILL 胶囊
    chip = any(near(px(im, x, y2), C_FILL, 6)
               for y2 in range(int(28 * dpr), int(90 * dpr))
               for x in range(int(w * 0.72), w))
    check("about/navbar verchip #F1F5FB", chip)


def main() -> int:
    qt_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__)))))), "apps", "desktop", "qt")
    py = os.path.join(qt_dir, ".venv-pkg", "Scripts", "python.exe")
    env = dict(os.environ)
    env["SMARTBLE_AUTOMATION_PORT"] = str(PORT)
    proc = subprocess.Popen([py, os.path.join(qt_dir, "main.py")], cwd=qt_dir, env=env,
                            creationflags=0x08000000)
    outdir = os.path.dirname(os.path.abspath(__file__))
    try:
        sock = socket.create_connection(("127.0.0.1", PORT), timeout=20)
        for _ in range(60):
            try:
                rpc(sock, "ping", rid=1)
                break
            except Exception:
                time.sleep(0.25)

        # ── tab0 空态 ──
        im = snap_png(sock, 2)
        dpr = im.size[0] / 1200.0
        print(f"# tab0 empty {im.size} dpr={dpr:.2f}")
        im.save(os.path.join(outdir, "q-tab0-empty.png"))
        analyze_scan_empty(im, dpr, print)

        # ── 真扫描 → 设备卡 ──
        rpc(sock, "scan", rid=3)
        time.sleep(7.5)
        st = rpc(sock, "state", rid=4)
        devs = st.get("devices", [])
        check("scan/真扫描发现设备（适配器+环境 ESP32）", len(devs) > 0, f"n={len(devs)}")
        print(f"# hits: {[d['name'] for d in devs][:6]}")
        im = snap_png(sock, 5)
        im.save(os.path.join(outdir, "q-tab0-cards.png"))
        if devs:
            analyze_scan_cards(im, dpr, print)

        # ── 筛选面板（先选档再开面板：默认 -100 无选中档） ──
        rpc(sock, "filter_set", {"rssi": -60}, rid=60)
        rpc(sock, "filter_toggle", rid=6)
        time.sleep(0.3)
        im = snap_png(sock, 7)
        im.save(os.path.join(outdir, "q-tab0-filter.png"))
        analyze_filter(im, dpr)

        # ── tab1 已连接 ──
        rpc(sock, "tab", {"index": 1}, rid=8)
        time.sleep(0.3)
        im = snap_png(sock, 9)
        im.save(os.path.join(outdir, "q-tab1.png"))
        analyze_connected(im, dpr)

        # ── tab2 广播 ──
        rpc(sock, "tab", {"index": 2}, rid=10)
        time.sleep(0.3)
        im = snap_png(sock, 11)
        im.save(os.path.join(outdir, "q-tab2.png"))
        analyze_broadcast(im, dpr)

        # ── tab3 关于 ──
        rpc(sock, "tab", {"index": 3}, rid=12)
        time.sleep(0.3)
        im = snap_png(sock, 13)
        im.save(os.path.join(outdir, "q-tab3.png"))
        analyze_about(im, dpr)

        sock.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()

    print(f"\n{'ALL GREEN' if not FAILS else 'FAILURES: ' + ', '.join(FAILS)}")
    return 0 if not FAILS else 1


if __name__ == "__main__":
    sys.exit(main())
