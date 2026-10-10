# UI Parity 全线验证总报告（2026-09-12）

- 基线：`567f78a`（F028 原型补漏）+ `fb8e317`（本轮 P1 修复）
- 策略：以「框架线」为主轴逐线全页面验证，最后按页面做四端横向并排终检
- 产物：本目录 75 张 PNG + 5 份分线报告 + 3 个可复跑驱动脚本

## 总矩阵

| 线 | 范围 | 通道 | 结果 | 报告 |
|---|---|---|---|---|
| uni-app H5（基准实现） | 9 页 × 40 态全覆盖 | vite dev + mock 桥 + Playwright | **PASS**（抽样 8 深度态视觉审查 0 异常） | REPORT-h5.md |
| Web 官网 .vitepress | 全站重建 + 4 页抽检 | docs:build + 静态服务 + Playwright | **PASS（修复 P1 后）** | REPORT-web.md |
| Electron（首验） | 10 视图 + **真实 BLE 链**（扫 7 台真机、连 BLEToolkit-Server、真 GATT 服务树） | --remote-debugging-port + 裸 CDP | **PASS** | REPORT-electron.md |
| Tauri 渲染层（首验） | 10 视图 | 静态前端 + Playwright | **PASS** | REPORT-tauri.md |
| 四端横向终检 | 关于页 + 扫描页 ×（原型/H5/Electron/Tauri） | 并排矩阵送审 | **PASS**（结构/品牌/设计语言一致；无推广区残留） | matrix-*-4way.png |

## 本轮修复

- **fb8e317（P1）**：`latest.json public_surfaces` 拆散键补齐，修复官网 SSR 构建崩溃（自 05410de 起源码构建不可用）

## 发现项清单（未修复，按优先级）

| 级 | 项 | 位置 |
|---|---|---|
| P2-1 | prop `code` 类型警告（String vs Number 10006） | uniapp 广播失败态路径 |
| P2-2 | prop `deviceId` 收到 undefined ×3（导航时序，渲染不受影响） | uniapp device/detail |
| P2-3 | Electron mock 重载语义与 E2E 文档不符（dummy 注入仅首轮） | apps/desktop/electron |
| P2-4 | Tauri 纯浏览器场景 mock 注入不可达（startScan 先抛错） | apps/desktop/tauri |
| 既有 | 原型静态资产缺失（tab 图标破图 14 个 404）、原型版本号硬编码 1.0.4 | docs/prototypes |
| 既有 | 官网「微信码主推」vs 9/11 小程序裁撤决议冲突 | 待用户裁决 |
| 既有 | 维度门禁 2 处 enforce 违例（about z-index / vitepress line-height） | 已提交存量 |

## 未覆盖线与理由

- **模拟器/真机线**（iOS 原生 / Kotlin / Flutter / SmartBLE-mac）：受「用户用机期间禁 GUI 通道」约束 +
  本轮预算；且四线均有近期视觉验证记录（Apple 原生四轮 UI 审计 PASS、vis1-fmac 12 张、F-AND 宿主
  截屏通道）。建议单独排期（装机截图演练轮 playbook 可复用）。
- **Avalonia/Qt**：AGENTS.md 口径 windows/linux 为 placeholder、avalonia 为 experimental——非本轮有效
  验证对象，归 Windows 机专项。
- **Tauri 壳内 WKWebView**：macOS 无 CDP；渲染层与 Electron 前端同构已覆盖 UI parity，壳内实况归
  桌面线装机轮。

## 复跑方式

```bash
# H5：cd apps/uniapp && npm run dev:h5 → Playwright 走查（mock 桥 ?mock=1）
# Electron：cd apps/desktop/electron && npx electron . --remote-debugging-port=9222
#           → node verification/ui-parity-20260912/scripts/electron-capture.mjs（+ electron-real.mjs）
# Tauri：python3 -m http.server 8933 --directory apps/desktop/tauri/src → Playwright 直种 state
# Web：cd docs && npm run docs:build
```
