# Smart BLE 全面产品交付基线冻结（G0）

> 日期：2026-08-31
> Gate：G0
> 状态：COMPLETE / 仅记录事实，未修改 App、固件、落地页或 workflow
> 规则：没有证据不得写 PASS/VERIFIED。本文件是 G1/G2 的事实源，不是修复清单。

---

## 1. 仓库、分支与工作区

| 项 | 值 |
|---|---|
| 工作区 | `/Users/luoyaosheng/Desktop/project/Open/smart-ble` |
| 当前分支 | `main` |
| HEAD（本轮开始） | `e817d1cba89fa5de295a1b28ffdd8a58ad4f9336` |
| HEAD 说明 | `docs(product): define UniApp reference contract` |
| 相对 `github/main` | ahead 1 |
| 相对 `origin/main` | 本地 `main` 不跟踪 origin；`origin/main` 在 `6093b33` |
| 远端 github | `https://github.com/LuoYaoSheng/smart-ble.git` |
| 远端 origin | `https://gitee.com/luoyaosheng/lys-smart-ble.git` |
| 其他本地分支 | `AI` → `origin/AI`；`refactor/multi-platform` → `origin/refactor/multi-platform` ahead 1 |

### 1.1 本轮开始工作区

`git status --short --branch`（开始时）：

```text
## main...github/main [ahead 1]
 M docs/plans/2026-08-31-uniapp-reference-product-plan.md
?? docs/plans/2026-08-31-uniapp-esp32-complete-debugging-plan.md
?? docs/plans/2026-08-31-uniapp-esp32-full-product-delivery-plan.md
?? docs/prompts/
?? docs/verification/full-delivery-gate-board.md
?? docs/verification/landing-page-link-and-claim-matrix.md
?? docs/verification/uniapp-esp32-page-operation-matrix.md
```

判定：

- `apps/uniapp`、`hardware`、`core`、`.github/workflows`、`docs/index.md`、VitePress 配置 **无未提交业务改动**。
- 既有脏文件全部是用户确认方向下的规划/看板/矩阵，**不得 reset/stash/覆盖**。
- 不输出 `DIRTY_WORKTREE_BLOCKED`。
- `git diff --check` 在开始时因 `docs/plans/2026-08-31-uniapp-reference-product-plan.md` 行尾空白失败。该文件是用户基线，本轮不改。

### 1.2 近期提交（`git log --oneline --decorate -n 12`）

```text
e817d1c (HEAD -> main) docs(product): define UniApp reference contract
dd114df (github/main, github/HEAD) fix(uniapp): harden page flows and platform fallbacks
6093b33 (origin/main) feat(uniapp): make flows operable and open multi-profile extension
c8b4b3b fix(uniapp): 补齐并行修复未覆盖的 R4/R5/R6 + 连接计数口径，修复 disconnect 语法断裂
5e2b40c merge: integrate github/main audit docs and BLE error normalization
2a8c554 feat(uniapp): complete Phase 1–6 audit remediation
4798324 docs(product-audit): 小程序全项目逐页产品审计（00-12 十三件套）
bf5d17e docs(smart-hid): add miniapp page map and fix plan
c326913 fix(uniapp): land audit fixes for BLE runtime, HID flows and design tokens
276d9dc feat(uniapp): restore BLE flows and redesign interface
8fc4bc9 refactor: align cross-platform product surfaces
90c27fb refactor: simplify UniApp Profile flows
```

### 1.3 本轮实际检查的工具版本

| 工具 | 版本 | 用途 |
|---|---|---|
| Node | v24.12.0 | 单测、SFC、VitePress |
| npm | 11.6.2 | docs 构建 |
| Git | 2.50.1 (Apple Git-155) | 基线与空白检查 |
| Python | 3.14.5 | 记录；本轮未刷固件 |
| PlatformIO (`pio`) | 未安装 | Hardware: NOT EXECUTED |
| VitePress | 1.6.4（`docs/package.json`） | `docs:build` 成功 |

---

## 2. 十个页面、四个 Tab、真实文件

来源：`apps/uniapp/pages.json`。注册页恰好 10 个，无 `subPackages`，每个 path 都有对应 `.vue`。

| ID | 路径 | 导航标题 | 类型 | 真实文件 |
|---|---|---|---|---|
| PAGE-001 | `pages/index/index` | BLE Toolkit+（custom nav） | Tab「扫描」 | `apps/uniapp/pages/index/index.vue` |
| PAGE-002 | `pages/hid/add` | 配置 Smart HID | 流程页 | `apps/uniapp/pages/hid/add.vue` |
| PAGE-003 | `pages/hid/detail` | Smart HID 设备 | 详情页 | `apps/uniapp/pages/hid/detail.vue` |
| PAGE-004 | `pages/hid/history` | Smart HID 历史 | 列表页 | `apps/uniapp/pages/hid/history.vue` |
| PAGE-005 | `pages/hid/diagnostics` | 诊断 | 工具页 | `apps/uniapp/pages/hid/diagnostics.vue` |
| PAGE-006 | `pages/device/detail` | 设备详情 | 工具页 | `apps/uniapp/pages/device/detail.vue` |
| PAGE-007 | `pages/connected/index` | 已连接设备（custom nav） | Tab「已连接」 | `apps/uniapp/pages/connected/index.vue` |
| PAGE-008 | `pages/broadcast/index` | BLE广播 | Tab「广播」 | `apps/uniapp/pages/broadcast/index.vue` |
| PAGE-009 | `pages/about/index` | 关于 | Tab「关于」 | `apps/uniapp/pages/about/index.vue` |
| PAGE-010 | `pages/about/version` | 版本记录 | 普通页 | `apps/uniapp/pages/about/version.vue` |
| WEB-001 | `docs/index.md` | 公开落地页 | 站点首页 | `docs/index.md` + `docs/.vitepress/config.mjs` |

### 2.1 四个 Tab

| Tab 文案 | pagePath | 图标 |
|---|---|---|
| 扫描 | `pages/index/index` | `static/tabs/device.png` |
| 已连接 | `pages/connected/index` | `static/tabs/hid.png` |
| 广播 | `pages/broadcast/index` | `static/tabs/broadcast.png` |
| 关于 | `pages/about/index` | `static/tabs/about.png` |

Smart HID 不占独立 Tab，符合 `docs/product-contract/04_PAGE_CONTRACTS.md`。

### 2.2 旧审计 P001～P010 历史映射（只映射，不再混用）

旧编号来源：`docs/product-audit/01_页面总表.md`（2026-08-28/31 审计）。

| 新 ID | 旧 ID | 旧名称 | 说明 |
|---|---|---|---|
| PAGE-001 | P001 | 扫描 | 同页 |
| PAGE-002 | P002 | Smart HID 配网 | 同页 |
| PAGE-003 | P003 | Smart HID 详情 | 同页 |
| PAGE-004 | P010 | Smart HID 历史 | **旧顺序把历史放在 P010** |
| PAGE-005 | P004 | Smart HID 诊断 | 旧审计诊断为 P004 |
| PAGE-006 | P005 | 通用设备详情 | 旧审计详情为 P005 |
| PAGE-007 | P006 | 已连接设备 | 旧审计已连接为 P006 |
| PAGE-008 | P007 | BLE 广播 | 同职责 |
| PAGE-009 | P008 | 关于 | 同职责 |
| PAGE-010 | P009 | 版本记录 | 旧审计版本为 P009 |

---

## 3. 版本来源与漂移

| 来源 | 位置 | 当前值 |
|---|---|---|
| UniApp `package.json` name/version | `apps/uniapp/package.json` | name `LightBLE`，version `1.0.0` |
| manifest `name` / `versionName` / `versionCode` | `apps/uniapp/manifest.json` | `BLE Toolkit+` / `1.0.5` / `101` |
| 微信 AppID | `apps/uniapp/manifest.json` `mp-weixin.appid` | `wxf6c58b1dcac4c82d` |
| 产品配置 fallback | `apps/uniapp/config/product.js` `versionFallback` | `1.0.5` |
| 关于页运行时 | `pages/about/index.vue` `getAppVersion()` | App：`plus.runtime.getProperty`；微信：`uni.getAccountInfoSync().miniProgram.version`，失败回退 `1.0.5` |
| 版本记录首项 | `pages/about/version.vue` 硬编码数组 | `v1.0.5` / `2026-08-29` |
| docs 站点 | `docs/package.json` | `1.0.0` |
| 落地页 Hero | `docs/index.md` | **无当前版本号** |
| 旧功能证据图 | `docs/verification/uniapp-functional-map.md` | 记录过 `1.0.4` / versionCode `100`（历史快照，非当前 manifest） |

漂移结论：

1. `package.json` `1.0.0` 与 manifest/关于页/版本记录 `1.0.5` 不一致。
2. `package.json` 仍用历史名 `LightBLE`，manifest/关于页用 `BLE Toolkit+`，仓库总名是 `Smart BLE`。
3. PAGE-010 首项是静态数组，**没有**与运行时版本做相等校验。
4. 落地页没有版本、commit、证据 run。
5. 无统一 `VERSION` 文件或 release metadata 驱动三处版本。

---

## 4. BLE Runtime、Store、Profile 与页面责任边界

### 4.1 目标分层

```text
页面 Vue
  → composable（生命周期与页面动作）
  → Pinia store（扫描集合 / 已连接 map / HID 历史）
  → services/ble-runtime（全局 BLE callback 唯一所有者）
  → services/provisioning（通用 GATT + Profile 注册表）
  → services/smart-hid（第一方业务语义）
  → uni / wx / plus / LysBlePeripheral
```

### 4.2 关键文件

| 层 | 文件 | 责任 |
|---|---|---|
| Runtime | `apps/uniapp/services/ble-runtime/index.js` | 唯一注册 `onBLECharacteristicValueChange` / `onBLEConnectionStateChange` / `onBluetoothDeviceFound` / `onBluetoothAdapterStateChange`。Notify 用 `deviceId\|serviceId\|characteristicId` tuple。 |
| Scan session | `apps/uniapp/services/ble-runtime/scan-session.js` | 单一全局扫描会话；第二轮 start 若仍有 active 则 join 而非并行。 |
| Advertisement | `apps/uniapp/services/ble-runtime/advertisement.js` | 广播快照归一化；区分未提供 / 空 / 有字节。 |
| Collection | `apps/uniapp/services/ble-runtime/device-collection.js` | deviceId 去重、RSSI 更新、上限 100。 |
| Filter | `apps/uniapp/services/ble-runtime/device-filter.js` | RSSI / 前缀 / 隐藏无名，不改源数据。 |
| Platform | `apps/uniapp/services/ble-runtime/platform.js` | 注入 uni/wx/测试 fake。 |
| Store BLE | `apps/uniapp/store/ble.js` | 扫描列表、连接 map、start/stop scan、bind session。 |
| Store HID | `apps/uniapp/store/hid.js` | 非敏感 knownDevices 持久化；token/密码不落盘。 |
| Session registry | `apps/uniapp/services/connected-session-registry.js` | 应用级 session 绑定；页面 unload 不 close。 |
| Scan UI | `apps/uniapp/composables/use-ble-scan.js` | 权限、5s 超时、hide/unload 停止。 |
| GATT UI | `apps/uniapp/composables/use-device-session.js` | 连接/有限重连/复用 session；unload 只摘 UI listener。 |
| HID 向导 | `apps/uniapp/composables/use-smart-hid-provisioning.js` | 连接 → 表单 → 状态。 |
| Profile 路由 | `apps/uniapp/services/provisioning/profile-navigation.js` | Profile 动作与已连接打开。 |
| Smart HID | `apps/uniapp/services/smart-hid/index.js` | Device Info、candidate、status waiter、diagnose。 |
| Peripheral 微信 | `apps/uniapp/services/wx-peripheral-mode.js` + `wx-peripheral-server.js` | adapter owner；活动连接时不关 adapter。 |
| Peripheral App | `pages/broadcast/index.vue` + `LysBlePeripheral` | 原生插件。 |
| OTA | `apps/uniapp/utils/ota_manager.js` + `components/ota-dialog/ota-dialog.vue` | 需设备 JSON status success。 |

### 4.3 已核实的代码事实

- `apps/uniapp/pages/**/*.vue` **没有**直接调用 `uni.createBLEConnection` / `startBluetoothDevicesDiscovery` / `onBLECharacteristicValueChange`。页面走 Runtime。
- Runtime 之外：`scan-permission.js` 通过 Runtime 的 `openAdapter`；微信权限用 `wx.getSetting` / `wx.authorize`（非 BLE callback）。
- `wx-peripheral-server.js` 调用 `createBLEPeripheralServer`（微信外设 API，不属于 Central Runtime callback 覆盖问题）。
- PAGE-006 `onUnload` 不 `close()` 应用级 session；Notify 页面控制器会 `dispose()`。
- PAGE-008 微信 hide/unload 释放 peripheral owner；App 在 hide 时停止广播。
- `core/ble-core` 被 UniApp 用于 logger、framing；真正 BLE API 在 UniApp Runtime，不在 core 里跑真机。

---

## 5. LightBLE 当前事实

路径：`hardware/esp32/LightBLE/`。无独立 `README.md`（读取失败）。`test/` 只有 PlatformIO 模板 README，无用例。

### 5.1 构建与端口

`hardware/esp32/LightBLE/platformio.ini`：

- env：`esp32dev` / Arduino + NimBLE-Arduino ^1.4.0
- 分区：`partitions_ota.csv`（OTA 双分区）
- **写死** `upload_port = COM3`、`monitor_port = COM3`
- monitor 115200

### 5.2 名称漂移

| 符号 | 值 | 位置 |
|---|---|---|
| `DEVICE_NAME` 宏 | `BLEToolkit-Server` | `src/main.cpp:43`，写入 JSON `device_name` |
| 实际 `NimBLEDevice::init` | `"ESP32-BLE-Server"` | `src/main.cpp:552` |

扫描端看到的广播名是 **ESP32-BLE-Server**，不是宏名。契约文档按 UUID 描述，未强制广播名。

### 5.3 UUID / 服务（固件宏，与 `docs/product-contract/06_ESP32_REFERENCE.md` 一致）

主服务 `4fafc201-1fb5-459e-8fcc-c5c9c331914b`：

- Control `...26a8` Read/Write/Notify
- Notify `...26a9` Read/Write/Notify

权限演示服务 `...914c`：`26b0`～`26b6` 七种属性组合。

OTA 服务 `...914d`：

- Control `...26c0`
- Data `...26c1`
- Status `...26c2`

`core/protocols/smart-ble-protocol.ts` 含主服务与权限特征值，**不含 OTA UUID**。UniApp `ota_manager.js` 自带 OTA UUID。协议正典未单一化。

### 5.4 Observer 模式

在 `hardware/esp32/` 搜索 `observer|Observer`：**无匹配**。当前固件只有 Peripheral Server。PAGE-008 的第二观察设备 **没有第一方 Observer 夹具**。

### 5.5 LED / OTA / 测试

- LED 命令与契约 `FF 00/01/02/03` 在固件 write callback 中实现（需 E5 才能标 PASS）。
- OTA 状态机在固件中存在（含 Control）；UniApp 只订 STATUS、写 DATA，**不写 Control**。
- `FIRMWARE_VERSION` 宏为 `1.0.0`，与 App 展示 1.0.5 不是同一版本线。
- 故障注入模式：契约标记「待实现」；本轮未在 `main.cpp` 看到 `delayed_response` 等编译开关。
- `test/`：无真实测试。ESP-008 仍是发布缺口。

---

## 6. HTML 原型覆盖边界

来源：`docs/prototypes/README.md`、`docs/prototypes/unified-device-discovery.html`、`docs/prototypes/2026-08-22-all-pages-audit.md`。

| 原型屏 | 对应页面 | 边界 |
|---|---|---|
| Device scan | PAGE-001 | 扫描、广播弹窗、连接、Profile |
| Connected | PAGE-007 | 打开、断开、批量断开 |
| Generic session | PAGE-006 | GATT/日志/OTA 弹窗 |
| HID provision | PAGE-002 | 三阶段 |
| HID detail | PAGE-003 | 重配/诊断/高级 BLE |
| HID diagnostics | PAGE-005 | 刷新与错误码 |
| Broadcast | PAGE-008 | 字段、字节、起停 |
| About | PAGE-009 | 含 sibling apps |
| Version | PAGE-010 | 静态版本史 |

缺口：

- 原型矩阵 **未单列 PAGE-004 历史页**（history 可能被扫进扫描屏或缺失独立屏）。
- 原型是 E4 交互母版，**不能**替代 E5。
- 落地页没有链到在线 10 页原型。

---

## 7. VitePress Hero、平台卡、下载、导航、SEO

事实源：`docs/index.md`、`docs/.vitepress/config.mjs`。本轮 **未修改** 这些文件。

### 7.1 必须核实的声明（全部成立）

| 问题 | 事实 | 位置 |
|---|---|---|
| Hero 是否仍写「跨平台 BLE 控制台与统一协议内核」 | **是** | `docs/index.md` `hero.text` |
| Tagline 是否仍同时宣传 UniApp、Flutter、Tauri、Android、iOS | **是**（还含硬件联动） | `docs/index.md` `hero.tagline` |
| 首页是否仍写「6+ 运行入口同时维护」 | **是**（文案为「6+ / 运行入口」+「同时维护」） | `docs/index.md` signal 第一卡 |
| Flutter 是否仍标 Mobile Mainline | **是** | Platform Matrix 第二张卡 badge |
| Android、Windows、macOS 下载是否都指向同一个 Release | **是** | 三张卡均 `https://github.com/luoyaosheng/smart-ble/releases/latest` |
| SEO/OG 是否仍宣传「大一统开发库」 | **是** | `config.mjs` `og:title` / `twitter:title`：「跨平台低功耗蓝牙大一统开发库」 |
| Release workflow 是否仍构建 Flutter APK 和 Tauri MSI | **是** | `.github/workflows/release-build.yml` jobs `build-flutter` / `build-tauri` |
| 页面和落地页是否缺真实版本、证据、限制、截图、ESP32 两模式和真实下载 | **是** | 首页无版本/证据/限制/二维码/Observer；截图为 `/brand/hero.png` 概念图 |

### 7.2 Hero / CTA

- 产品名：Smart BLE
- 主 CTA：UniApp 产品规范 → `/product-contract/`
- 次 CTA：快速开始 → `/tutorials/01_introduction_and_setup`；下载全部平台 → `#download-hub`；架构白皮书 → `/MASTER_ARCHITECTURE`

### 7.3 导航 / Sidebar

Nav：首页、UniApp 产品规范、快速上手、API/架构参考（MASTER）。

Sidebar 已把「UniApp 第一完整版本（当前正典）」放在最前，但首页 Learning Paths 与 Hero 仍把 MASTER 当作主 CTA。开发者指南仍并列 Flutter / Tauri / 原生。

### 7.4 SEO / OG / canonical

- `description`：覆盖 Flutter / Tauri / UniApp / iOS / Android 全端生态
- `og:url` / `og:image`：`https://lightble.i2kai.com/` 与 `/brand/share.png`
- 无独立 canonical link 标签（VitePress `base: '/'` + og:url）
- keywords 含「开源蓝牙库, BLE SDK」

### 7.5 缺失区块（对照 `10_LANDING_PAGE_SPEC.md`）

- 真实 App 截图
- 在线 10 页原型
- Peripheral / Observer 两种 ESP32 夹具说明与下载
- 当前版本 / commit / 证据
- 已知限制
- Smart HID Profile 独立说明
- 微信二维码
- 贡献 / 安全 / 许可证显著入口
- Android 5 分钟 / 微信 5 分钟 / ESP32 5 分钟 三条快速开始

---

## 8. CI、Pages、Release workflow

| Workflow | 文件 | 当前行为 |
|---|---|---|
| CI | `.github/workflows/ci.yml` | Flutter analyze/test；Android assembleDebug；iOS swift build；Tauri cargo check；Electron npm ci；**ESP32 `pio run`**；UniApp 契约锁 + 一批 unit + Vue SFC parse。**无**完整 `verify-uniapp.sh`（缺若干较新 unit 若只跑 CI 列表）。 |
| Pages | `.github/workflows/deploy-docs.yml` | main/master/`refactor/multi-platform` 构建 VitePress 并 deploy-pages |
| Release | `.github/workflows/release-build.yml` | tag `v*` → **Flutter APK** + **Tauri Windows MSI** → GitHub Release。**不构建 UniApp Android APK**，不记录微信提交，不构建 ESP32 固件 |

CI 主线仍把 Flutter/Android 原生/Apple/Tauri 当默认检查；与首版「UniApp Android + 微信」产品主线不一致。这是发布系统事实，不是本轮修复范围。

---

## 9. 现有 E0～E5 证据边界

| 等级 | 当前边界 | 事实源 |
|---|---|---|
| E0 | 页面路由、契约、本基线 | 本文件 + product-contract |
| E1 | 29 个 `tests/unit/*.test.mjs` 本轮实际跑过并全部通过（见第 11 节） | `scripts/verify-uniapp.sh` 前半 |
| E2 | Fake Runtime 覆盖扫描会话、Notify tuple、peripheral owner、HID waiter | 同上 |
| E3 | CI 含 UniApp SFC、ESP32 pio（CI 机器）；本机 **未**执行 `pio run` | `ci.yml`；本机 pio 未安装 |
| E4 | 2026-08-22 微信开发者工具 + UniAutomator 有记录；HTML 原型有审计 | `docs/verification/evidence/` |
| E5 | **缺失**：Android 真机、微信真机 BLE、ESP32 串口、Observer、Smart HID 固件、OTA | `docs/verification/evidence/README.md` |
| E6 | 未开始 | 无干净电脑复现、无可信公开下载 |

`uniapp-functional-map.md` 明确：**NOT READY FOR RELEASE**。其 HEAD 快照是旧 commit `8fc4bc9`，不能当作本轮 HEAD 的 E5。

---

## 10. 第一批 P0 / P1 / P2 风险

状态全部为代码/文档审查结论，**不是 E5 FAIL**。

### P0（若按当前文案公开发布会直接误导）

| ID | 分类 | 事实 |
|---|---|---|
| P0-WEB-01 | Web | 落地页以多端大一统为卖点，与首版 UniApp+ESP32 主线冲突 |
| P0-WEB-02 | Web | Android/Windows/macOS 下载共用 `releases/latest`，且 Release 产物是 Flutter APK + Tauri MSI，不是 UniApp Android |
| P0-WEB-03 | Release | `release-build.yml` 不生产首版承诺的 UniApp APK / 微信记录 / ESP32 固件 |
| P0-ESP-01 | ESP32 | 无 Observer 固件，PAGE-008 E5 无第一方观察端 |
| P0-E5-01 | 证据 | 全部 BLE Must 能力停留 UNPROVEN（无 E5） |

### P1

| ID | 分类 | 事实 |
|---|---|---|
| P1-ESP-02 | ESP32 | 广播名 `ESP32-BLE-Server` 与 `DEVICE_NAME` `BLEToolkit-Server` 不一致 |
| P1-ESP-03 | ESP32 | `COM3` 写死，跨电脑不可复现 |
| P1-ESP-04 | ESP32 | `smart-ble-protocol.ts` 无 OTA UUID；`test/` 无用例 |
| P1-PAGE-09 | 页面 | 关于页「支持平台」列出 Windows/macOS/Linux 等未经验证能力 |
| P1-PAGE-07 | 页面 | 已连接卡片文案「连接稳定」，契约禁止无健康指标时使用 |
| P1-VER | 版本 | `package.json` 1.0.0 vs manifest/关于/版本记录 1.0.5 |
| P1-OTA | OTA | 无安全恢复设备时仍展示「固件更新」；`OtaManager` 不写 `CHAR_CTRL`（无 start/commit/reboot），只写 DATA 并等 STATUS JSON；E5/回滚缺口 |

### P2

| ID | 分类 | 事实 |
|---|---|---|
| P2-PAGE-01 | 页面 | 扫描页嵌入 Smart HID 历史列表，与 PAGE-004 重复，且筛选数量未展示 |
| P2-DISC-04 | Runtime | 显示名未实现 AD 0x08/0x09 解析（功能目录 DISC-004 已标 Gap） |
| P2-PAGE-03 | 页面 | PAGE-003 未标明「历史记录，不代表在线」 |
| P2-PAGE-09 | 页面 | 「更多小程序」压在产品/开源信息之前；缺仓库/文档/ESP32/许可证入口 |
| P2-ADV | 广播 | Android 名称可能系统接管；`useBroadcastSession.js` 无页面引用 |
| P2-WS | 工作区 | 用户基线计划文件 trailing whitespace 使 `verify-uniapp.sh` 的 `git diff --check` 失败 |

---

## 11. 本轮允许的验证（G0 执行记录）

| 命令 | 工作目录 | exit | 证据等级 | 说明 |
|---|---|---|---|---|
| `bash ./scripts/verify-uniapp.sh` | repo root | **2** | E1 单测通过；脚本总失败 | 全部 unit + SFC/资产/契约锁通过；最后 `git diff --check` 因用户计划文件空白失败 |
| `npm run docs:build` | `docs/` | **0** | E3 网站可构建 | 不等于下载/二维码真实 |
| `git diff --check` | repo root | 非 0（开始时） | E0 | 仅用户基线 md 空白 |
| Hardware / E5 | — | NOT EXECUTED | — | 无 pio、无真机本轮 |

构建产物 `docs/.vitepress/dist/` 若出现在工作区，**不得提交**。

---

## 12. G0 退出检查

| 项 | 结果 |
|---|---|
| 基线文件存在 | 本文件 |
| 引用真实文件位置 | 是 |
| 7 条落地页/workflow 核实问题均有引文 | 是 |
| 未修改 App/固件/网站/workflow | 是 |
| 风险已分类 | 是 |

G0 状态：**PASS**（基线完整）。G0 PASS 不等于任何产品能力 PASS。
