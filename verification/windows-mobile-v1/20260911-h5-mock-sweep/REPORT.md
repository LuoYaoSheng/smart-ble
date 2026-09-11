# UI 全面轮 · uniapp H5 假数据通道 九页六态截图 + 正典文案断言 — 报告

- 日期：2026-09-11（Mac 线 M5 + UI 六态收口轮；用户口径「假数据也好，先全面处理页面 UI」）
- 分支：refactor/uniapp-v1（基线 fea7659 后本地工作树）
- 载体：**uniapp H5 dev server**（`uni -p h5`）+ Playwright headless chromium（393×852 @2x）
- 数据：`apps/uniapp/services/mock/`（`?mock=1` 桥）——正典演示集（prototype/v1-new/mock-data）的 uniapp 运行时形态，经 normalizeAdvertisement / profile 匹配 / store computed 真实渲染管线
- 判定口径：**code-level 视觉/文案对照**（H5 为 dev 载体）——**不折算 U-WX/U-AND 真机 VISUAL_PASS**；真机六态仍属视觉 Gate 与真机回归窗口

## 1. 通道基建（本轮新增）

| 件 | 说明 |
|---|---|
| `services/mock/mock-dataset.js` | 正典数据集：6 扫描设备（SHID 强/弱匹配·未命名·ESP32·空广播）/3 会话/GATT 4 服务 7 特征/诊断五行/P008 表单默认值/F022 错误码摘录 |
| `services/mock/mock-registry.js` | 页面本地态靶标注册表（`#ifdef H5` 内注册，mp/app 构建剥离） |
| `services/mock/mock-bridge.js` | `window.__MOCK__`（seed/set/go/switchTab/dataset），hash 路由 query 解析 |
| 页面钩子 | P001/P002/P005/P006/P008 五页 `#ifdef H5` 注册本地 refs；mp-weixin 构建产物 0 引用（实证） |
| `scripts/ui/uniapp-h5-mock-sweep.mjs` | 43 状态截图采集 → 本目录 |
| `scripts/ui/uniapp-h5-mock-copycheck.mjs` | 36 组正典文案断言（PAGE_SPEC §11 + 逐页文案 + 原型条件渲染口径） |

**根因修复（工具链）**：uniapp H5 构建长期产出空壳的原因 = `@dcloudio/uni-h5{,-vite,-vue}` 未在 apps/uniapp/package.json 声明 → uni CLI 按 cwd 依赖表扫平台插件时整套 h5 vite 插件（含 main.js 挂载注入）不加载。已补声明（同版本 alpha），并加 `dev:h5`/`build:h5` scripts。

## 2. 结果

- **截图：43/43 落袋**（P001×8 / P002×10 / P003×2 / P005×6 / P006×5 / P007×4 / P008×6 / P009 / P010），MANIFEST.json 在册
- **正典文案断言：36/36 通过**（含两空态文案逐字、扫描三态标签、配网错误码恢复按钮、诊断六态徽章、GATT 服务树中文名、广播字节预算 N/31、版本页投影声明）
- 抽样目检（P001 complete / P002 configure+status-error / P003 ready / P005 live / P006 ready / P008 advertising）：区块序/文案/徽章/按钮主次与原型正典一致

## 3. 本轮修复的 UI 缺陷

| # | 缺陷 | 修复 |
|---|---|---|
| UI-DEF-01 | DeviceCard 弃用运行时 `displayName` 多级链（name→localName→AD 0x09/0x08→Profile→厂商→「未命名 BLE · ID后四位」），未命名设备显示「未命名 BLE 设备」而非正典兜底（PAGE_SPEC P001 数据展示规则；F-AND 侧 FEAT-F-003 已按正典实现，U 侧为对齐缺口） | `components/ui/DeviceCard.vue` displayName/idText/avatarLetter 接入 `device.displayName` 优先 |
| UI-DEF-02 | error-banner 标题 32rpx(16px) 圈外——正典 `.ebanner .t` 为 `var(--fs-h2)`(15px) | `components/common/error-banner.vue` 改 `var(--fs-h2)` |
| UI-DEF-03 | P003 设备名 32rpx(16px) 圈外——原型 p003 为 `var(--fs-h1)`(17px) w800 | `pages/hid/detail.vue` 改 `var(--fs-h1)`（w800 保留） |
| 通道内 | P008 靶标注册引用未声明 refs（TDZ 崩页）；P006 面板态复位缺 `autoRetryExhausted`/`hasOtaService` 暴露；OTA 服务 UUID 末段 914b→正典 914d | 见 broadcast/index.vue、use-device-session.js（新增返回 autoRetryExhausted）、mock-dataset.js |

## 4. M5 UI 契约 phase-2 落地（check:dimensions 扩容）

`scripts/check-dimension-usage.mjs` 新增角色级断言，全绿：

1. **页面 wrapper 水平 gutter 32rpx**（PAGE_LAYOUT §1）：9 页文件级（本地 wrapper 32rpx 或挂 .ble-content，全局类由独立规则钉死）
2. **导航 padding 域**：AppNavbar 必须 `16rpx 36rpx 24rpx`（8/18/12）、AppSubnav 必须 `16rpx 28rpx 20rpx`（8/14/10）
3. **阴影白名单**：裸 box-shadow 归一化（rpx÷2/0px→0/去空白）必须命中正典族——点光 8px·徽章光 6px·danger 6/16·dev:hover 复合；flutter BoxShadow 元组对账同源
4. **regFS 9/16 文件级圈定**：9 仅 AppTabBar（角标计数）/16 仅 write-dialog 与 flutter 配网弹层标题（PAGE_LAYOUT §6 modal）

## 5. 防回归

- mp-weixin 生产构建 DONE 且产物 **0 处 mock 引用**（条件编译剥离实证）
- 门禁套件：check:dimensions（含 phase-2）/ check:token-usage / check:icon-usage / check:uniapp-sfc / check:f023-zero-persistence（333 文件含 services/mock）/ check:apple-tokens 全 PASS
- uniapp jest：11 失败为基线既有的 automator 环境类（BLOCKED_TOOLCHAIN 在册），**本轮零新增失败**（stash 对照实证）
- Flutter：analyze 0 issues · test 113/113

## 6. 分工与后续（Windows/Mac）

- **Mac（本机，已完成）**：uniapp 假数据通道 + 43 态截图 + 36 断言 + UI-DEF-01/02/03 修复 + M5 phase-2 门禁
- **Mac（后续候选）**：F-AND 六态视觉 sweep 需 Flutter 侧 mock 桥（本轮未建，登记待排期）；真机/开发者工具复核仍待窗口
- **Windows 机（不在本轮）**：桌面三线（apps/desktop）G1-G10 结构级重建（P002/P003/P005/P010 四页缺失 + 窗口形态/退出确认/三栏 GATT/字节预算等）——依赖用户 D2 二选一裁决（Electron vs Tauri）后由胜者壳先行套「基准内核 + desktop.js 覆写」；`?mock=true` 静态渲染通道已具备（D2 准备轮）
- **用户队列（不自主执行）**：main 推送/站点部署、U-WX 开发者工具扫码、W-3 营销字号、C-1 stepper ✓、C4、D2 胜者

---

## 7. 同日第二轮：关键弹窗补齐 + F-AND 六态测试 + UI-DEF-04/05/06（2026-09-11 晚）

用户指令：「继续推进，把 UI 都处理好」。

### uniapp 关键弹窗（六态矩阵「关键弹窗」维度，7 态新增）

截图 **49/49**（43 页面态 + 6 弹窗态，DIALOG-* 目录）、文案断言 **43/43**（+7 弹窗组）：
广播数据弹层（kv 四行+Service UUIDs+AD 结构逐段+整包 hex+厂商 ID）/ 写入弹窗（TEXT·HEX 单选）/
OTA 弹窗 / P002 离开确认（「离开将取消等待设备状态。确定离开吗？」）/ P005 离线确认（BLE 未连接·连接并检测）/
P003 记录不存在 modal。

载体注记：H5 上组件自定义事件 `tap` 与原生 tap 命名冲突致 $emit 载荷丢失（真机目标端无此问题，F004 有真机在案证据）——
驱动层 `fixAdv` 经桥回填弹窗 payload，不影响产品码。

### UI-DEF-04（本轮修复）：U 线 P-03 预警条两处皆缺

原型 p006 ready 态有 B9 warn 预警（N-MAC 双实现、F-MAC 2026-09-10 已修，U 线两处皆无）：
1. `pages/device/detail.vue` ready 态补 note-warn（原型逐字：**OTA 端到端链路 BLOCKED**（固件侧暂未开放）：右上「固件更新」可演示完整流程…）
2. `components/ota-dialog/ota-dialog.vue` 头部补预警行（PATTERN §75 / N-MAC·F-MAC 同款逐字）

### F-AND 六态正典文案测试（新增 `apps/flutter/test/ui_six_state_copy_test.dart`，9/9）

provider override 驱动（bleState/scanResults/scanning/filters）+ 393×1800 视口（ListView 懒构建防漏建）：
P001 idle/complete(六设备卡)/scanning/bt-off/unavailable/filter 门控 + P007 空态 + P008 表单 + P009/P010。
边界如实登记：空态B 与「扫描完成·发现 N 台」受 `_hasScanned` 门控（与 uniapp hasScanned 同口径），
harness 无 seam——F-MAC 真扫描路径已有 vis1-fmac 截图在册；golden 未做（无 CJK 字体资产会渲染豆腐块）。

### UI-DEF-05（本轮修复）：F-AND 缺 ESP32 演示 Profile

Dart `_builtinProfiles` 仅 smartHid（uniapp 注册双内置）→ BLEToolkit-Server 卡无徽章无入口。修复：
`profile_registry.dart` 补 `esp32DemoProfile`（含 badge 字段，chip「ESP32 · 强匹配」对齐 uniapp presentation.badge）；
`device_list_page.dart` `_openProvisioning` 按 Profile 分流（非 smart-hid → 通用 GATT 详情，对齐 buildProfileActionUrl）。

### UI-DEF-06（本轮修复）：F-AND 动作按钮行溢出

`_ActionChip` 内 label 无弹性收尾，393 宽双按钮行（「配置 Smart HID」+「连接」）溢出 18px（测试字体放大实测暴露）——
Flexible+ellipsis 修复，长文案窄屏同样受保护。

### 防回归（第二轮）

flutter analyze 0 issues · test **122/122**（113 既有 + 9 新增）；uniapp 门禁四件全 PASS ·
copycheck 43/43 · mp-weixin 构建 DONE 产物零 mock 引用。
