# Desktop · 平台原型（D2 spike 未启动 · 原型先行）

> 2026-09-03 按三规范重构补齐。**原型齐备 ≠ 开发排期**：D2（Electron vs Tauri + BLE 原生层）spike 仍为开发前置；本实例只表现桌面平台形态，不预判选型。
> 说明文档四件套：[PLATFORM_SPEC](PLATFORM_SPEC.md) · [PAGE_SPEC](PAGE_SPEC.md) · [FLOW](FLOW.md) · [COMPONENT_RULE](COMPONENT_RULE.md)

## 1. 结构

```
desktop/
├── low-fi/index.html    线框：9 页 × 状态 × 流程 + 桌面「平台差异注入点」
├── high-fi/             完整实例：基准内核（字节复制）+ desktop.js 覆写层 + 窗口 chrome
├── PLATFORM_SPEC / PAGE_SPEC / FLOW / COMPONENT_RULE.md
└── README.md（本文）
```

## 2. high-fi：基准内核 + 覆写层 + 桌面窗框

- 内核**字节复制自 v1-new**（components.js = v1.0.1：SHID 卡双入口）；差异收敛在 `desktop.js`：
  - **操作系统维度（2026-09-03 用户走查追加）**：macOS / Windows / Linux 三宿主（原生层 CoreBluetooth / WinRT / BlueZ，10_platform §2.4 + 11_ecosystem 矩阵 WIN/MAC/LINUX 行一致）——P009「操作系统」切换入口、P008 平台徽标 `Desktop · {OS}` 与原生层提示（Linux 广播外围受 BlueZ/内核权限影响【待验证】）、窗口 chrome 三形态（os-mac 交通灯 / os-win 右侧─▢✕ / os-linux 仅✕，系统还原层）、**评审栏生态能力矩阵卡随 OS 随动**；
  - 配对码**扫码为主**（摄像头取景器 sheet，识别自动回填，2026-09-03 用户修正）+ **粘贴/手输兜底**（`shid://pair` 正则解析）；
  - P006 三栏重排（DOM + CSS，SOP §12）/ 日志与分享导出（复制为主，文件候选拦截）/ 外链系统浏览器 modal / 窗口关闭退出确认（活动会话明示断开）。
- 窗口 chrome（.dwin/.dtb）为平台还原图层；740×600 演示画布。

## 3. 三查自评（SOP §11 / 10_platform §7）

| 查 | 结论 |
|---|---|
| 功能保留 | ✅ 页面全集自带（9 页 44 场景同基准；SHID 卡双入口 = 基准 v1.0.1 口径）；六域矩阵 △～✅ 取决于原生层【待 spike】（10_platform §3），界面按基准口径呈现 |
| 限制合规 | ✅ 常驻 + 退出确认（§4 生命周期 Desktop 列）；配对码扫码为主 + 粘贴兜底（§2.4 修订后口径）；无静默降级 |
| 增强利用 | ✅ 已用：宽幅三栏（布局调整）、文件系统出口预留。候选未决策默认不做：日志文件流 / OTA 固件库 / 多窗口并排（均拦截提示） |

## 4. 运行

```bash
cd docs/specs/prototype/platform && python3 -m http.server 8952
# high-fi：http://127.0.0.1:8952/desktop/high-fi/index.html
# low-fi ：http://127.0.0.1:8952/desktop/low-fi/index.html
```

## 5. 资源清单

| 文件 | 来源 |
|---|---|
| high-fi/{app.js, mock-data/, pages/, components/, assets/{tokens,components,pages}.css} | **字节复制自 v1-new**（diff 校验） |
| high-fi/assets/desktop.css | 窗口 chrome 还原层 + P006 三栏布局类（头注豁免/说明） |
| high-fi/desktop.js | 平台覆写层（ACTION 覆写 + DOM 重排，基线零改动） |
| low-fi/index.html | 线框（注入点标注） |

## 6. 【未知】/待验证登记（禁止脑补）

- BLE 原生层选型与能力（CoreBluetooth/WinRT/BlueZ/btleplug；Linux 广播权限）【待验证：D2 spike】；
- Electron Web Bluetooth 完整性【待验证】；
- 三栏布局为**设计建议**，需评审确认后进入 08_development。

## 7. 验证记录

- 2026-09-03（修正轮）：high-fi 断言 16/16 —— P002 扫码为主（基准文案/图标保持 + 取景器 sheet + 扫描二维码口径 + 1.6s 自动识别回填 got 态 + 关闭 sheet 计时器不误触）/ 粘贴兜底（sheet + 示例 + 解析回填）/ 三栏重排保持 / 退出确认（会话文案）/ SHID 卡双入口（内核 v1.0.1）；console 0 error。初轮 16/16 见 git 历史。
- 2026-09-03（OS 轮）：15/15 —— 三档切换（mac 默认交通灯 / win 右侧三钮可见 / linux 仅✕）+ MOCK.env 随动 + P008 徽标 `Desktop · {OS}` + linux check/start BlueZ【待验证】提示日志 + 回归（P002 扫码 / P006 三栏 / 退出确认 busy 文案 / SHID 双入口）；console 0 error。
- 2026-09-03（生态矩阵轮，v1.2.0）：13/13 —— 评审栏矩阵卡随 OS 三档随动（mac 发送 ❌待验证 C2 / win ⚠️WinRT / linux 监听✅BlueZ·发送⚠️内核权限）+ P008/P002 回归；console 0 error；内核 diff 零差异。
- 2026-09-03（推广承接轮，v1.3.0）：15/15 —— `p009-promo` 覆写为非微信渠道承接 sheet（用户指示：非微信平台需落地页/二维码）：小程序码示意 128px 三定位角 + 打开落地页（系统浏览器 toast）+ 下载小程序码（演示 toast）+ 双推广卡入口；note 行内排版（C.note）与按钮单行在 sheet 内复核；console 0 error；内核 diff 零差异（仅覆写层与壳）。
