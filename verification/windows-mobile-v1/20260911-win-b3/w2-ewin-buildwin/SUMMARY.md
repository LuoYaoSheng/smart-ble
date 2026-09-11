# W2 E-WIN 打包冒烟（PARITY-005 收口）

- 日期：2026-09-11
- 基线：1e300d0（W1 提交后，`git pull --ff-only` = Already up to date）
- 工具链：node（PATH）+ electron-builder 24.13.3 + electron 27.3.11
- 验收判据：`npm run build:win` 退出码 0，nsis+portable 双目标产出
- 结果：**通过**（run2 exit 0；run1 因 GitHub 下载超时失败，见下）

## PARITY-005 原文与现场核实

原文（主矩阵 §4.4）：「electron-builder build:win 引用不存在的 assets/icon.ico → Windows 打包阻断」。

**现场已变化**：icon.ico 已由 Mac 侧 `8e58f0e`（跨端统一图标）补齐，`apps/desktop/electron/assets/` 三图标齐全（icon.ico 93,510 B / icon.icns 1.4 MB / icon.png 179,070 B）。本轮动作 = 直接跑冒烟验证收口。

## 过程记录

| 轮 | 结果 | 详情 |
|---|---|---|
| run1 | FAIL | Electron 主包从 GitHub 下载成功（105 MB / 4m11s），随后 winCodeSign-2.6.0.7z 下载 `wsarecv` 连接超时（GitHub 边缘节点 20.205.243.166 不可达），NSIS 工具链同因未到位 → `ERR_ELECTRON_BUILDER_CANNOT_EXECUTE`（evidence/buildwin-run1-github-timeout.log） |
| run2 | **PASS** | `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run build:win` → exit 0；nsis-3.0.4.1 + nsis-resources-3.4.1 经镜像 2 秒下完；nsis + portable 双目标产出（evidence/buildwin-run2-mirror-pass.log） |

## 产物（dist/，已 gitignore）

- `BLE Toolkit+ Setup 1.0.5.exe`（81,137,760 B，nsis oneClick）
- `BLE Toolkit+ 1.0.5.exe`（80,901,334 B，portable）
- `BLE Toolkit+ Setup 1.0.5.exe.blockmap`
- `win-unpacked/BLE Toolkit+.exe`（172,731,904 B）

## 图标嵌入实证

- run2 日志中 rcedit 前两次重试 `Unable to commit changes`（典型 AV/文件锁抖动），第三次重试成功，整体 exit 0。
- PowerShell `Icon.ExtractAssociatedIcon` 从 win-unpacked exe 提取内嵌图标成功（32×32；evidence/exe-embedded-icon-extracted.png）。
- 与 `assets/icon.png`（统一图标）逐像素比对：平均绝对差 0.58/通道（0=完全一致，<10 即同源）→ exe 内嵌即跨端统一图标。

## 复现（本机网络环境）

```bash
cd apps/desktop/electron
ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ \
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
npm run build:win   # exit 0
```

注：不走镜像直连 GitHub 在本机大概率超时（run1 实证）；镜像变量仅本机复现需要，未写入 package.json（机器网络属用户域，不入库）。
