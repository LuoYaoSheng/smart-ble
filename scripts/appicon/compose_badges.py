#!/usr/bin/env python3
"""Smart BLE 跨端应用图标流水线：同一底图 + 技术栈角标。

用法:
  python compose_badges.py compose                 # 从 .gen/base.png 生成全部角标变体到 out/
  python compose_badges.py distribute --variant X  # 把 out/ 变体分发到对应端的图标目录
  python compose_badges.py distribute --all        # 分发全部变体

设计契约: docs/specs/07_design_system（主色 #1B6DFF / 深 #0E4FC4 / 青绿 #17C7A8 / 墨 #101521）
角标几何: 底边/右边各留 160px（1024 画布），最远角半径 498px < 内切圆 502px，
         传统图标被启动器裁圆也不会裁掉角标；同时满足 Android adaptive 安全区。
"""
import argparse
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
GEN_DIR = ROOT / ".gen"
OUT_DIR = ROOT / "out"

CANVAS = 1024
BADGE_MARGIN = 160          # 距底边/右边
BADGE_H = 180               # 角标高度（1024 基准）
BADGE_MAX_W = 500           # 文字自动缩的上限宽度
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\segoeuib.ttf",   # Segoe UI Bold
    r"C:\Windows\Fonts\calibrib.ttf",
    r"C:\Windows\Fonts\ariblk.ttf",
]

# label → (底色, 文字色)，均为各技术栈官方品牌色
PLATFORMS = {
    "uniapp":  ("#00B876", "#FFFFFF"),   # uni-app 绿
    "flutter": ("#54C5F8", "#0B2A3B"),   # Flutter 蓝
    "kotlin":  ("#7F52FF", "#FFFFFF"),   # Kotlin 紫（Android 原生）
    "swift":   ("#F05138", "#FFFFFF"),   # Swift 橙（iOS/macOS 原生）
    "tauri":   ("#FFC131", "#243040"),   # Tauri 琥珀
    "electron": ("#47848F", "#FFFFFF"),  # Electron 青
}


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def hex_rgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def darken(rgb, f=0.78):
    return tuple(max(0, int(c * f)) for c in rgb)


def render_badge(label: str, color: str, text_color: str) -> Image.Image:
    """渲染单枚角标 RGBA 图（透明底），右下锚定在 (CANVAS-BADGE_MARGIN, CANVAS-BADGE_MARGIN)。"""
    fs = 116
    while fs > 40:
        font = load_font(fs)
        w = ImageDraw.Draw(Image.new("RGBA", (8, 8))).textlength(label, font=font)
        if w <= BADGE_MAX_W - 80:
            break
        fs -= 4
    pill_w = int(w) + 80
    pill_h = BADGE_H
    r = pill_h // 2

    badge = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x1 = CANVAS - BADGE_MARGIN
    y1 = CANVAS - BADGE_MARGIN - pill_h
    box = (x1 - pill_w, y1, x1, y1 + pill_h)

    # 投影
    shadow = Image.new("L", (CANVAS, CANVAS), 0)
    ImageDraw.Draw(shadow).rounded_rectangle(
        (box[0], box[1] + 14, box[2], box[3] + 14), r, fill=120)
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    badge.paste(Image.new("RGBA", (CANVAS, CANVAS), (6, 12, 24, 255)), (0, 0), shadow)

    d = ImageDraw.Draw(badge)
    d.rounded_rectangle(box, r, fill=hex_rgb(color), outline=darken(hex_rgb(color)), width=5)
    d.text(((box[0] + box[2]) // 2, (box[1] + box[3]) // 2), label,
           font=font, fill=hex_rgb(text_color), anchor="mm")
    return badge


def compose_variant(base: Image.Image, key: str) -> Image.Image:
    out = base.convert("RGBA").copy()
    color, text_color = PLATFORMS[key]
    out.alpha_composite(render_badge(key, color, text_color))
    return out


def cmd_compose(args):
    base_path = Path(args.base) if args.base else GEN_DIR / "base.png"
    if not base_path.exists():
        sys.exit(f"底图不存在: {base_path}（先跑生成，或用 --base 指定）")
    base = Image.open(base_path).convert("RGBA")
    if base.size != (CANVAS, CANVAS):
        base = base.resize((CANVAS, CANVAS), Image.LANCZOS)
    OUT_DIR.mkdir(exist_ok=True)
    save_png(base, OUT_DIR / "base.png")
    for key in PLATFORMS:
        img = compose_variant(base, key)
        save_png(img, OUT_DIR / f"base-{key}.png")
        print(f"[compose] out/base-{key}.png")
    print("[compose] 完成：base.png（无角标母版）+ 6 个角标变体")


def resize_to(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def save_png(img: Image.Image, path):
    """无损保存：完全不透明时去掉 alpha 通道，optimize 压缩；装有 pyoxipng 时再深度压缩。"""
    if img.mode == "RGBA" and img.getchannel("A").getextrema()[0] == 255:
        img = img.convert("RGB")
    img.save(path, optimize=True)
    try:
        import oxipng
        oxipng.optimize(Path(path), level=4, fix_errors=True)
    except Exception:
        pass


def write_ico(img: Image.Image, path: Path):
    sizes = [(s, s) for s in (16, 24, 32, 48, 64, 128, 256)]
    img.save(path, format="ICO", sizes=sizes)


def write_icns(img: Image.Image, path: Path):
    imgs = [resize_to(img, s) for s in (512, 256, 128, 64, 32, 16)]
    img.save(path, format="ICNS", append_images=imgs)


def regen_sized_dir(variant_img: Image.Image, directory: Path):
    """按目录里现有 PNG 文件名中的 NxN 尺寸逐个重生成（unpackage/res/icons、iconset 等）。"""
    count = 0
    for f in sorted(directory.glob("*.png")):
        m = re.match(r"^.*?(\d+)x(\d+)(?:@2x)?.*\.png$", f.name)
        if not m:
            continue
        n = int(m.group(1))
        save_png(resize_to(variant_img, n), f)
        count += 1
    return count


APPS = ROOT.parent.parent / "apps"  # scripts/appicon -> scripts -> repo 根

# 简单分发目标（变体 -> [(目标路径, 尺寸)]）
SIMPLE_TARGETS = {
    "uniapp": [
        (APPS / "uniapp/static/logo.png", 512),
    ],
    "flutter": [
        (APPS / "flutter/assets/images/icon.png", 1024),
    ],
    "kotlin": [
        (APPS / "android/app/src/main/res/drawable/brand_icon.png", 512),
        (APPS / "android/app/src/main/res/mipmap-mdpi/ic_launcher.png", 48),
        (APPS / "android/app/src/main/res/mipmap-hdpi/ic_launcher.png", 72),
        (APPS / "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png", 96),
        (APPS / "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png", 144),
        (APPS / "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", 192),
    ],
    "swift": [
        (APPS / "ios/Sources/Resources/Brand/icon.png", 512),
        (APPS / "ios/Sources/Resources/Brand/brand_icon.png", 512),
        (APPS / "desktop/macos/SmartBLE-mac/Resources/AppIcon-1024.png", 1024),
    ],
    "tauri": [
        (APPS / "desktop/tauri/src/brand/icon.png", 512),
        (APPS / "desktop/tauri/src-tauri/icons/icon.png", 512),
    ],
    "electron": [
        (APPS / "desktop/electron/public/brand/icon.png", 512),
        (APPS / "desktop/electron/assets/icon.png", 512),
    ],
}

# 需要按目录内容重新生成尺寸的目录
DIR_TARGETS = {
    "uniapp": [APPS / "uniapp/unpackage/res/icons"],
    "tauri": [
        APPS / "desktop/tauri/src-tauri/icons",
        APPS / "desktop/tauri/src-tauri/icons/icon.iconset",
    ],
}

BUNDLE_TARGETS = {
    "tauri": [
        (APPS / "desktop/tauri/src-tauri/icons/icon.ico", "ico"),
        (APPS / "desktop/tauri/src-tauri/icons/icon.icns", "icns"),
    ],
    "electron": [
        (APPS / "desktop/electron/assets/icon.ico", "ico"),
        (APPS / "desktop/electron/assets/icon.icns", "icns"),
    ],
    "swift": [
        (APPS / "desktop/macos/SmartBLE-mac/Resources/AppIcon.icns", "icns"),
    ],
}


def distribute_one(key: str):
    src = OUT_DIR / f"base-{key}.png"
    if not src.exists():
        sys.exit(f"缺少 {src}，先跑 compose")
    img = Image.open(src).convert("RGBA")
    for path, size in SIMPLE_TARGETS.get(key, []):
        path.parent.mkdir(parents=True, exist_ok=True)
        save_png(resize_to(img, size), path)
        print(f"[{key}] {path.relative_to(APPS)}  <- {size}px")
    for d in DIR_TARGETS.get(key, []):
        if d.exists():
            n = regen_sized_dir(img, d)
            print(f"[{key}] {d.relative_to(APPS)}  <- 重生成 {n} 个尺寸")
    for path, kind in BUNDLE_TARGETS.get(key, []):
        path.parent.mkdir(parents=True, exist_ok=True)
        (write_ico if kind == "ico" else write_icns)(img, path)
        print(f"[{key}] {path.relative_to(APPS)}  <- {kind}")


def cmd_distribute(args):
    keys = list(PLATFORMS) if args.all else [args.variant]
    if not args.all and args.variant not in PLATFORMS:
        sys.exit(f"未知变体: {args.variant}，可选: {', '.join(PLATFORMS)}")
    for key in keys:
        distribute_one(key)
    print("[distribute] 完成。注意：flutter 端还需运行 "
          "`cd apps/flutter && dart run flutter_launcher_icons` 重生成 Android mipmap/macOS 图标集")


def rounded_tile(img: Image.Image, size: int) -> Image.Image:
    """满幅底图 → 圆角磁贴（透明角），iOS 风 22.5% 圆角。"""
    tile = img.convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), int(size * 0.225), fill=255)
    tile.putalpha(mask)
    return tile


SPLASH_BG = "#F8FBFF"   # 正典 cBg 冰蓝（启动图 → 首页自然衔接）
WORDMARK = "BLE Toolkit+"  # 与两端 android:label 一致；Pillow 渲染，杜绝 AI 拼写
INK = "#18222E"         # 正典 cText

UNIAPP_SPLASH_SIZES = {  # manifest distribute.splashscreen.android 引用的四密度竖屏
    "hdpi": (480, 762), "xhdpi": (720, 1184),
    "xxhdpi": (1080, 1818), "xxxhdpi": (1440, 2424),
}


def make_lockup(variant_img: Image.Image, canvas: int = 1254, tile: int = 640) -> Image.Image:
    """透明底竖排组合：圆角磁贴 + 字标（flutter_native_splash image 用）。"""
    im = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    top = int(canvas * 0.30)
    im.alpha_composite(rounded_tile(variant_img, tile), ((canvas - tile) // 2, top))
    d = ImageDraw.Draw(im)
    d.text((canvas // 2, top + tile + int(canvas * 0.10)), WORDMARK,
           font=load_font(int(canvas * 0.085)), fill=hex_rgb(INK), anchor="mm")
    return im


def make_a12_icon(variant_img: Image.Image, canvas: int = 1152, tile: int = 712) -> Image.Image:
    """Android12 系统启动图图标：磁贴居中，tile ≤ 2/3 画布防圆形裁切。"""
    im = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    im.alpha_composite(rounded_tile(variant_img, tile), ((canvas - tile) // 2, (canvas - tile) // 2))
    return im


def make_portrait(variant_img: Image.Image, w: int, h: int) -> Image.Image:
    """uniapp 竖屏整幅启动图：冰蓝底 + 磁贴 + 字标。"""
    im = Image.new("RGB", (w, h), hex_rgb(SPLASH_BG))
    s = w / 1080.0
    tile = int(432 * s)                       # 40% 画布宽
    top = int(h * 0.40)
    t = rounded_tile(variant_img, tile)
    im.paste(t, ((w - tile) // 2, top), t)
    ImageDraw.Draw(im).text((w // 2, top + tile + int(84 * s)), WORDMARK,
                            font=load_font(int(96 * s)), fill=hex_rgb(INK), anchor="mm")
    return im


def cmd_splash(args):
    # 启动页是品牌时刻：各端统一用无角标母版（角标只用于桌面图标区分技术栈）
    OUT_DIR.mkdir(exist_ok=True)
    base = Image.open(OUT_DIR / "base.png")
    save_png(make_lockup(base), APPS / "flutter/assets/images/splash_logo.png")
    save_png(make_a12_icon(base), APPS / "flutter/assets/images/splash_icon_a12.png")
    splash_dir = APPS / "uniapp/static/splash"
    splash_dir.mkdir(exist_ok=True)
    for name, (w, h) in UNIAPP_SPLASH_SIZES.items():
        save_png(make_portrait(base, w, h), splash_dir / f"{name}.png")
    print("[splash] flutter: splash_logo.png(1254 lockup) + splash_icon_a12.png(1152) 已更新（统一 base）")
    print("[splash] uniapp: static/splash/ 四密度竖屏已更新（统一 base；重打包需 HBuilderX）")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("compose", help="生成角标变体")
    c.add_argument("--base", help="底图路径，默认 .gen/base.png")
    sub.add_parser("splash", help="从 out/base.png（无角标）重生成两端启动图")
    d = sub.add_parser("distribute", help="分发变体到各端")
    d.add_argument("--variant", help="单个变体名")
    d.add_argument("--all", action="store_true", help="全部分发")
    args = ap.parse_args()
    {"compose": cmd_compose, "distribute": cmd_distribute, "splash": cmd_splash}[args.cmd](args)


if __name__ == "__main__":
    main()
