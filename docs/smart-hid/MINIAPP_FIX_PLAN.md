# 小程序修复计划（基于两轮审计）

> 输入：《UniApp 全项目逐页面运行时业务链路深度审计》（见 [MINIAPP_PAGE_MAP.md](./MINIAPP_PAGE_MAP.md)）与《组件化、公共能力与架构复用审计》两轮结论。
> 原则：先修运行时断链（用户"点了没反应/必失败"），再做入口补齐，最后才动视觉统一类重构。
> 范围：`apps/uniapp`。`core/protocols/hid-provisioning-protocol.ts` 为受锁定镜像，本轮不触碰。

## 固件事实基线（所有 HID 侧修复的依据）

| 事实 | 出处 | 影响 |
| --- | --- | --- |
| 设备 READY 后**停止 BLE 广播** | `BLE_PROVISIONING_PROTOCOL.md:99` | 已配网设备无法再被扫描发现，重新连接/重新配置/诊断重连均会失败 |
| BLE 扫描自 2021 起不再要求 `scope.userLocation` | 微信平台（代码侧证据：本项目无任何定位 API 调用） | 现有权限门是错误前置条件 |
| `createBLEConnection` 要求适配器已初始化（errCode 10000） | 微信 BLE API | 连接路径必须先 `openBluetoothAdapter` |

## 修复项总表

| ID | 优先级 | 问题（审计编号） | 修复方案 | 代码落点 |
| --- | --- | --- | --- | --- |
| FIX-01 | P0 | 定位权限门阻断唯一扫描触发（BRK-01/DUP-14） | 删除 `requestBleScanPermission`，扫描直接走 store；清理 manifest 中 `requiredPrivateInfos` 与 `scope.userLocation` | `composables/use-ble-scan.js`、`manifest.json` |
| FIX-02 | P0 | 连接路径不保证适配器初始化；错误对象 `errMsg` vs `message` 失配导致友好文案永不生效（BRK-02） | runtime 新增 `ensureAdapterReady()`（幂等）+ `errors.js` 统一 errCode→中文提示；`connectDevice` 接入；`device/detail` 删除自有初始化 | `services/ble-runtime/index.js`、`services/ble-runtime/errors.js`（新）、`pages/device/detail.vue` |
| FIX-03 | P0 | 诊断页 `onUnload` 杀死配网向导的共享会话 → 首页"重新下发"死循环 | 会话所有权规则：诊断页仅断开**自己建立**的连接，且配网向导仍在页面栈时不断开 | `pages/hid/diagnostics.vue` |
| FIX-04 | P0 | READY 设备 4 个必败按钮无引导（BRK-04 系） | ① detail"重新配置"先弹窗说明需让设备进入配网模式；② add 页连接失败展示 READY 停广播提示；③ "重新下发"在 BLE 断开时先走重连；④ 诊断页重连文案带固件事实 | `pages/hid/detail.vue`、`pages/hid/add.vue`、`composables/use-smart-hid-provisioning.js`、`services/smart-hid/index.js`、`pages/hid/diagnostics.vue` |
| FIX-05 | P1 | knownDevices 持久化后无任何 UI 入口（隐式依赖 L-04） | 新增 `pages/hid/history.vue` 历史列表（查看/删除），首页增加入口卡 | `pages.json`、`pages/hid/history.vue`（新）、`pages/index/index.vue` |
| FIX-06 | P1 | `ble-utils.js` UUID→名称表零引用，service-panel 只能显示"特征值 N"（漏接线） | runtime 服务发现时填充 `name`；ble-utils 未收录时返回空串由 UI fallback | `utils/ble-utils.js`、`services/ble-runtime/index.js`、`components/service-panel/service-panel.vue` |
| FIX-07 | P1 | `hid/detail` 与 `device/detail` 标题同名"设备详情" | HID 详情标题改为 "Smart HID 设备" | `pages.json` |
| FIX-08 | P1 | 分享文案品牌漂移（"智能蓝牙助手"），版本记录停在 v1.0.4 | 统一为 "BLE Toolkit+"；补 v1.0.5 记录；manifest/product.js 版本号对齐 | `pages/about/version.vue`、`manifest.json`、`config/product.js` |
| FIX-09 | P1 | 整台设备 JSON 经 URL 传参（DUP-15，超长/敏感广播数据入路径） | 改传 `deviceId`，详情页从 store 查找，查不到降级显示 deviceId | `pages/index/index.vue`、`pages/device/detail.vue` |
| FIX-10 | P2 | 双 token 系统（app_theme.css 孤儿 + dark mode 无效） | ✅ 已完成：App.vue 停止 import app_theme.css（该文件是跨平台生成产物，改内容会被 generate_assets.py 覆盖且影响 Electron/Tauri，小程序侧 `--ble-*` 成为唯一 token 来源）；uni.scss `$uni-*` fallback 对齐 BLE 色板；version.vue 徽章 iOS 色收敛为 BLE 色板 | `App.vue`、`uni.scss`、`pages/about/version.vue` |
| FIX-11 | P2 | 3 个模态壳、2 个状态行、2 个日志面板、卡片配方 11 处字面量（DUP-01/02/04/05/13） | ✅ 已完成：design-system.css 新增 `ble-modal-*` 公共模态层（mask/sheet/header/title/close/body/footer/btn）与 `.ble-card-pad`；write-dialog/ota-dialog/advertisement-dialog 三壳迁移；broadcast/about/device-detail/hid-add/hid-diagnostics 五处卡片配方替换为 `.ble-card`；broadcast 内重复的 `.log-panel-brd` 定义收敛。状态行仅剩单实例、两个日志面板视觉语言不同（chip vs 文本），维持局部实现 | `styles/design-system.css`、`components/{ota-dialog,write-dialog,scan/advertisement-dialog}`、5 个页面 |
| FIX-12 | P2 | 死代码：`scanSmartHid()`、`setSmartDevices`、store/ble 日志字符串嗅探（DUP-16） | ✅ 已完成：三处删除（`watch`/`useBleStore`/`matchScannedDevices` 独占导入一并清理）；`smartDevices` ref 保留并注释为二期 Profile 扫描预留（读取方：use-smart-hid-provisioning 设备解析链） | `services/smart-hid/index.js`、`store/hid.js`、`store/ble.js` |

## 分批实施

- **批次 1（本次，P0）**：FIX-01 → FIX-02 → FIX-03 → FIX-04。验收：真机/工具模拟下扫描-连接-配网-诊断四条链路的每一按钮均有真实反馈；错误提示全部为人话中文。
- **批次 2（本次，P1 小项）**：FIX-05 ~ FIX-09。验收：配网完成的设备可从首页历史入口找回；服务面板显示标准服务/特征中文名；无品牌漂移。
- **批次 3（已完成，P2/P3）**：FIX-10 ~ FIX-12 已实施，见修复项总表中的实际落点记录。

## 每项验收标准

| ID | 验收 |
| --- | --- |
| FIX-01 | 首页点"开始扫描"立即进入 scanning 状态，无任何定位弹窗；`make` 产物中无 `scope.userLocation` 残留 |
| FIX-02 | 冷启动直接从已连接列表进设备详情（不经扫描）可连接成功；蓝牙关闭时错误提示为"蓝牙开关未打开…"而非"请靠近设备" |
| FIX-03 | 配网失败 → 进入诊断 → 返回配网页 → "重新下发"可用（会话未被诊断页杀死） |
| FIX-04 | READY 设备点"重新配置/运行诊断/重新检测/重新连接"，每一步都有与固件行为一致的说明或可行路径 |
| FIX-05 | 配网成功后回到首页可见入口；历史页可进 detail、可删除记录 |
| FIX-06 | 连接一台标准 BLE 设备（如电池服务 0x180F），服务面板显示"电池服务 / 电池电量" |
| FIX-07 | 两类详情页标题可区分 |
| FIX-08 | 分享卡片标题与 About 页品牌一致 |
| FIX-09 | URL 长度 ≤ 128，页面功能不回退 |
| FIX-10 | 全项目源码中无 `#007AFF`/`var(--primary)` 等孤儿 token 消费；系统深色模式下页面文本/背景不再出现明暗错配 |
| FIX-11 | 三个对话框（写入/OTA/广播数据）遮罩、面板、头部、底部按钮视觉一致；各页面卡片外观一致（同一圆角/描边/阴影来源） |
| FIX-12 | 源码中 `scanSmartHid`/`setSmartDevices` 零引用；`addDeviceLog` 无字符串嗅探分支 |

## 回归风险与保护

1. `manifest.json` 只清 `mp-weixin` 段的定位项；`app-plus` 的 Android 位置权限**保留**（原生平台 BLE 扫描仍可能需要）。
2. 错误归一化保持 `errCode` 字段（`scanError` 消费方依赖），不复制 `errMsg`（让消费方读到友好 message）。
3. `openAdapter()` 原语义保留（store 扫描路径不回归），仅叠加 `adapterReady` 标记。
4. device/detail 的 3 次重连逻辑不动，只删冗余的显式 open。
5. `apps/uniapp/app_theme.css` 是 `core/assets-generator/generate_assets.py` 的跨平台产物（Electron/Tauri 同源），**不要手改该文件**；小程序侧主题统一走 `styles/design-system.css`。
