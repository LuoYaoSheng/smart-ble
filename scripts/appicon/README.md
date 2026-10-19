# Smart BLE 跨端应用图标流水线

同一张底图 + 各技术栈角标（uniapp / flutter / kotlin / swift / tauri / electron），
让多端包并装在同一台设备上时一眼可辨。角标 = 技术栈，不是操作系统。

## 目录

- `compose_badges.py` — 合成与分发脚本（唯一入口）
- `.gen/` — ChatGPT2API 工作目录（payload / 响应 / 候选图），已 gitignore
- `out/` — 产出：`base.png`（无角标母版）+ `base-<platform>.png`（1024 角标变体）

## 流程

### 1. 生成底图（只在换设计时跑）

```bash
curl -sS --max-time 560 -X POST https://c2a-files.i2kai.com/v1/images/generations \
  -H "Authorization: Bearer <AUTH_KEY>" -H "Content-Type: application/json" \
  --data-binary @.gen/req-v2.json -o .gen/resp-v2.json
```

prompt 要点（见 `req-v2.json`）：**满幅直角方形**，四边四角被品牌蓝渐变（#1E6DFF→#0E4FC4）
填满，圆角由各端系统自裁；蓝牙符文 + 信号弧；右下象限留空给角标；禁止任何文字。
生成后从 `resp-v2.json` 拆 b64 到 `.gen/candidate-*.png`，挑一张 `cp` 为 `.gen/base.png`。

### 2. 合成角标变体

```bash
python compose_badges.py compose            # 读 .gen/base.png → out/
```

角标几何（1024 基准）：高 180px 胶囊，右/下各留 160px。最远角半径 498px < 内切圆
502px，传统图标被启动器裁圆也不会切到角标；同时满足 Android adaptive 66/108 安全区。

### 3. 分发到各端

```bash
python compose_badges.py distribute --all
cd ../../apps/flutter && dart run flutter_launcher_icons   # 重生成 Android mipmap + macOS 图标集
```

分发映射：uniapp → `static/logo.png` + `unpackage/res/icons/`；flutter →
`assets/images/icon.png`（launcher_icons 的源）；kotlin → Android 原生 mipmap 全密度；
swift → `ios/Sources/Resources/Brand/` + macOS `AppIcon`；tauri → `src-tauri/icons/`
全套（含 ico/icns）；electron → `assets/icon.*`（electron-builder 读 package.json）+ `public/brand/`。

## 注意

- 微信小程序无桌面图标（头像在公众平台后台设置），uniapp 变体只影响 App 端与分享图。
- macOS dock 传统上用自带圆角的 icns；当前流水线保持满幅直角（系统会按新版样式裁剪），
  如需旧式圆角可给 `distribute` 的 swift 目标加 squircle mask。
- 换底图后 `out/` 与各端产物全部可由上面三步确定性重建，不消耗生图额度。
