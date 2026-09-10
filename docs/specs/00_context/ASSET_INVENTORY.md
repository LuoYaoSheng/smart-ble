# ASSET_INVENTORY —— 代码与资源资产清单

> SOP v2.0 Phase 1 产出 · 2026-09-02
> 事实源：REVERSE_ANALYSIS §2（结构）、§3（页面清单）、§2.2（组件）、§2.3（服务模块）、§9（未完成能力）。

## 1. 页面资产（10 页，pages.json + page-flow.test.js 双重锁定）

| 编号 | 页面 | 文件 | 规模 | 性质 |
|---|---|---|---|---|
| PAGE001 | 扫描首页 | pages/index/index.vue | 196 行 | tabBar「扫描」 |
| PAGE002 | Smart HID 配网向导 | pages/hid/add.vue | 145 行 | 二级 |
| PAGE003 | Smart HID 设备详情 | pages/hid/detail.vue | 150 行 | 二级 |
| PAGE004 | Smart HID 历史 | pages/hid/history.vue | 162 行 | 二级（**2026-09-02 用户决策移除，新开发不实现**） |
| PAGE005 | Smart HID 诊断 | pages/hid/diagnostics.vue | 189 行 | 二级 |
| PAGE006 | 通用设备详情（GATT 调试） | pages/device/detail.vue | 294 行 | 二级 |
| PAGE007 | 已连接设备 | pages/connected/index.vue | 151 行 | tabBar「已连接」 |
| PAGE008 | BLE 广播 | pages/broadcast/index.vue | 854 行（最大页） | tabBar「广播」 |
| PAGE009 | 关于 | pages/about/index.vue | 242 行 | tabBar「关于」 |
| PAGE010 | 版本记录 | pages/about/version.vue | 255 行 | 二级 |

## 2. 组件资产（15 个，全部 `<script setup>` 已实现）

| 组件 | 职责 | 使用方 |
|---|---|---|
| common/app-navbar | 自绘导航栏（胶囊安全区） | index、connected |
| common/empty-state | 空态占位卡 | index、connected、hid/history |
| common/error-banner | 错误横幅（role=alert） | scan-summary 内嵌 |
| common/operation-state | 四态组件（empty/loading/error/success/idle） | hid/add、service-panel |
| device-card/device-card | 设备卡（251 行，头像/徽章/RSSI 四格/按钮组） | index、connected |
| filter-panel/filter-panel | 扫描过滤器（v-model） | index |
| scan/scan-summary | 扫描工具条+错误横幅 | index |
| scan/advertisement-dialog | 广播原始数据弹窗 | index |
| service-panel/service-panel | GATT 服务/特征折叠树 | device/detail |
| write-dialog/write-dialog | 写入弹窗（TEXT/HEX） | device/detail |
| log-panel/log-panel | 通信日志（dock/card 两变体，六色 chip） | device/detail、broadcast |
| ota-dialog/ota-dialog | OTA 完整交互弹窗（非受控） | device/detail |
| hid/provision-stepper | 配网三步骤条 | hid/add |
| hid/provision-progress | 配网四行进度 | hid/add |
| ~~about/app-card~~ | ~~推广小程序卡片~~（随 F028 推广区 2026-09-10 移除） | — |

## 3. 组合式函数（4 个，每页一个专属编排器）

`use-ble-scan`（首页扫描）/ `use-device-session`（280 行，GATT 调试）/ `use-broadcast-session`（广播）/ `use-smart-hid-provisioning`（375 行，最大，配网全流程）。

## 4. 服务层资产（6 组）

| 模块 | 文件数 | 职责要点 |
|---|---|---|
| services/ble-runtime | 16 | uni BLE 全局回调唯一所有者 + 会话注册表（8 态）+ 写队列（串行/5s/深16）+ 重连（3 次 1s/3s/5s） |
| services/provisioning | 5 | 设备无关配网框架：Profile 注册表、GATT transport（MTU 247/明文写/帧间隔 30ms/失败立即上抛）、orchestrator、builtins |
| services/smart-hid | 11 | Smart HID 专属：门面/Profile/工作流引擎（纯 JS 状态机）/表单/known-devices（随 F023 移除） |
| services/broadcast | 6 | 广播会话（单 owner 6 态）/适配器/31B 负载预算/观察证据 |
| services/ota | 3 | OTA 事务状态机（12 态）/包模型/校验器 |
| 散装服务 | 13 | scan-permission（唯一直调 wx.*）、路由上下文、断开汇总、版本元数据、日志脱敏、wx 外围双控制器、hid-navigation（@deprecated）等 |

## 5. 数据层

`store/ble.js`（249 行，扫描会话+已连接表，内存 reactive Map）；`store/hid.js`（200 行，配网会话/进度/诊断；knownDevices 持久化随 2026-09-02 决策移除）。

## 6. 配置与静态资源

- `config/product.js`（产品信息/功能特性；推广位 RELATED_MINI_PROGRAMS 随 F028 2026-09-10 移除）、`config/release-metadata.generated.*`（脚本生成）
- `static/`：logo / share / tabs 8 图 / placeholders 8 图 / brand（other-apps 图标目录随 86952f4 缩写徽章方案先行退役，2026-09-10 F028 移除后目录确认不存在）
- `styles/design-system.css`：`--ble-*` token 唯一来源
- `locale/`：zh-CN + en-US（未接线资产）

## 7. 共享层资产（仓库根 core/，被 14 文件相对 import）

protocols 受锁镜像 4 文件 + ble-core（framing / framing-strategies / profile-contract / logger / command-queue / data-converter / types / interfaces/adapter）。

## 8. 资产健康度速览（死资产/占位，重构时清理或决策）

| 项 | 状态 |
|---|---|
| @dcloudio/uni-ui 依赖 + easycom | 死依赖/死配置 |
| fui-* easycom | 指向不存在目录 |
| scan-summary filteredCount prop | 已声明未消费 |
| esp32-demo verifyDeviceInfo | 恒 true（演示占位） |
| workflow-engine 与 workflow.js | 四函数双份重复；workflow-engine.js:135 未 import PROVISIONING_ERROR_HINTS（确证 bug，经 workflow.js 引入故未触发） |
| OTA_STATE.CONNECTING | 已定义从不进入 |
| observer-evidence-adapter | 已实现、无页面消费 |
| hid-navigation.js | 整文件 @deprecated |

（详表：REVERSE_ANALYSIS §9.2）
