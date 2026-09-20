#!/usr/bin/env python3
"""
SmartBLE 桌面壳应用图标统一脚本（WIN-015）。

正典源（唯一权威，改动只改它再重跑本脚本）：
  apps/desktop/electron/public/brand/icon.png   512x512 品牌图标
  apps/desktop/electron/assets/icon.ico          多尺寸 ICO（E-WIN/V-WIN 已在用的同一份字节）

分发目标（全部从正典字节直拷，保证跨壳字节级一致）：
  Electron   apps/desktop/electron/assets/icon.ico                （= 正典，原样）
  Tauri      apps/desktop/tauri/src-tauri/icons/icon.ico          ← 正典
  Avalonia   apps/desktop/avalonia/SmartBLE.Desktop/Assets/icon.ico ← 正典
  Flutter    apps/flutter/windows/runner/Resources/app_icon.ico   ← 正典（替换模板图标）
  Qt         apps/desktop/qt/assets/app.ico + icon.png(256)       ← 正典
  Wails      apps/desktop/wails/build/appicon.png + wails.ico     ← 正典

页内品牌图（同设计同用途的拷贝，非应用图标）：
  Tauri src/brand/icon.png ← Electron public/brand/icon.png

用法：python tools/unify_icons.py   （仓库根执行；幂等，可重复跑）
"""
import hashlib
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

CANON_PNG = ROOT / "apps/desktop/electron/public/brand/icon.png"
CANON_ICO = ROOT / "apps/desktop/electron/assets/icon.ico"

# (目标路径, 源文件)；None 目标 = 仅校验存在与哈希一致
ICO_TARGETS = [
    ROOT / "apps/desktop/electron/assets/icon.ico",                                  # 正典本体
    ROOT / "apps/desktop/tauri/src-tauri/icons/icon.ico",
    ROOT / "apps/desktop/avalonia/SmartBLE.Desktop/Assets/icon.ico",
    ROOT / "apps/flutter/windows/runner/Resources/app_icon.ico",
    ROOT / "apps/desktop/qt/assets/app.ico",
    ROOT / "apps/desktop/wails/build/wails.ico",
]

PNG_COPY_TARGETS = [
    (ROOT / "apps/desktop/tauri/src/brand/icon.png", CANON_PNG),
    (ROOT / "apps/desktop/qt/assets/icon.png", CANON_PNG),
    (ROOT / "apps/desktop/wails/build/appicon.png", CANON_PNG),
]


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main() -> int:
    if not CANON_PNG.exists() or not CANON_ICO.exists():
        print(f"[ERR] 正典源缺失: {CANON_PNG} / {CANON_ICO}")
        return 1

    canon_hash = sha256(CANON_ICO)
    with Image.open(CANON_PNG) as im:
        if im.size != (512, 512):
            print(f"[ERR] 正典 PNG 应为 512x512，实际 {im.size}")
            return 1
    print(f"[canon] icon.ico sha256={canon_hash[:16]}… icon.png=512x512 OK")

    for target in ICO_TARGETS:
        target.parent.mkdir(parents=True, exist_ok=True)
        if target == CANON_ICO:
            continue
        shutil.copyfile(CANON_ICO, target)
        print(f"[ico ] {target.relative_to(ROOT)} <- canonical ({sha256(target)[:16]}…)")

    for target, src in PNG_COPY_TARGETS:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, target)
        print(f"[png ] {target.relative_to(ROOT)} <- {src.relative_to(ROOT)}")

    # Qt 页内/窗口用 256px 渲染（从正典 PNG 等比缩放，RGB）
    qt_png = ROOT / "apps/desktop/qt/assets/icon.png"
    if qt_png.exists():  # 上一段已拷 512 全尺寸，覆盖为 256 规格
        with Image.open(CANON_PNG) as im:
            im.resize((256, 256), Image.LANCZOS).save(qt_png)
        print(f"[png ] {qt_png.relative_to(ROOT)} resized 256x256")

    # 终检：所有 ICO 字节级一致
    bad = [t for t in ICO_TARGETS if t.exists() and sha256(t) != canon_hash]
    if bad:
        print("[ERR] 以下 ICO 与正典不一致:", *[str(b) for b in bad], sep="\n  ")
        return 1
    print(f"[OK] {len(ICO_TARGETS)} 个 .ico 全部与正典字节一致")
    return 0


if __name__ == "__main__":
    sys.exit(main())
