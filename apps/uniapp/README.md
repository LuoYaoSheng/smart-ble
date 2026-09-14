# BLE Toolkit+（UniApp / App · H5）

BLE Toolkit+ 是 Smart BLE 产品家族的轻量跨端入口（UniApp 一线多端：Android App 为主线，iOS 为后续目标，H5 为降级预览）。它提供通用 BLE 扫描、连接、GATT 读写、通知、广播能力，并通过 Profile 注册表扩展 Smart HID 等设备专属任务。

> **平台范围（2026-09-11 用户裁决，2026-09-14 MAC-001 落正）**：微信小程序运行目标已整体退役——`dev:mp-weixin` / `build:mp-weixin`、微信 Peripheral 模块与微信真机门禁均已删除，不得回流。H5 是页面预览与文档形态，不支持真实 BLE。

> **产品规范（公共）**：本应用是 [docs/specs/](../../docs/specs/README.md) 产品基准规范的**基准平台**实现。功能、页面、流程、交互、设计系统以规范为准；平台差异只在 [10_platform 差异设计](../../docs/specs/10_platform/PLATFORM_EXTENSION.md) 圈定范围内实现。

## 产品导航

TabBar 固定为：

1. 扫描
2. 已连接
3. 广播
4. 关于

首页只负责扫描、过滤、查看广播快照与进入设备详情。“已连接”使用独立 TabBar 页面承接多设备会话入口。Smart HID 不占用独立 Tab，也不维护第二套扫描器。

首页设备卡片交互：

- 点击卡片：查看广播快照
- 点击“连接”：进入通用 GATT 设备会话
- 匹配到 Profile 时：额外显示 Profile 任务，例如“Smart HID 配网”

## Smart HID 配网

Smart HID 配网只有三个用户阶段：

1. 自动连接首页选中的设备并读取 Device Info
2. 在一个页面填写 Wi-Fi 名称、密码和 ControlHub 地址；扫描 ControlHub 二维码获取一次性 token
3. 下发 canonical V1 candidate，并查看 Wi-Fi、配对、MQTT、Ready 状态

Wi-Fi 密码和 pairing token 只存在于当前内存会话，不写入日志、路由或本地存储。BLE 只用于配网和诊断，HID 实时控制仍走 ControlHub → MQTT → ESP32。

## App / H5 平台语义

- 扫描前置权限走 `services/scan-permission.js`（可注入平台面）：无平台面或无 `openBluetoothAdapter` → 诚实 `ble_not_supported`；授权拒绝映射 `bluetooth_permission_denied`；蓝牙关闭映射 `bluetooth_unavailable`；适配器打开始终经 `services/ble-runtime` 平台缝。
- H5 状态区恒显示“不支持 BLE”，不发起任何真实 BLE API；H5 用于页面预览、交互原型与文档。
- App 端外部网址走系统浏览器；分享走系统分享。
- 广播（Peripheral）在 App 端依赖原生插件；插件缺失时页面进入 Unsupported/Error，不无响应。
- 业务按钮使用原生 `button` 和 `styles/design-system.css` 的 `ble-btn` 类，避免自定义组件样式隔离导致文字不可见。

## 代码结构

```text
pages/                    页面与路由编排
components/common/        通用状态与导航组件
components/scan/          扫描和广播快照组件
components/hid/           Smart HID 配网展示组件
components/about/         关于页组件
composables/              页面级生命周期和动作编排
services/ble-runtime/     唯一 BLE Runtime 与扫描会话（平台注入缝）
services/broadcast/       广播会话/负载/校验（通用，非微信专属）
services/scan-permission.js 扫描前置权限状态机（可注入平台面）
services/provisioning/    通用 GATT 配网 transport / Profile 注册表
services/smart-hid/       Smart HID Profile 业务语义
services/ota/             OTA 固件包校验（Web Crypto 优先，Node 兜底）
store/                    Pinia 状态
static/                   静态资源
```

## 本地检查

```bash
bash ../../scripts/verify-uniapp.sh
```

该命令统一运行单元测试、Smart HID 协议锁、静态资源检查、Vue SFC 解析与 Git 空白检查。最终 BLE、扫码和真机页面效果仍是独立验证阶段，不能由本地检查替代。

当前 10 个注册页面及主要跳转回归：

```bash
bash ../../scripts/verify-uniapp-pages.sh
```

## 编译（纯 CLI，不经 HBuilderX）

编译工具链来自 `apps/uniapp/package.json` devDependencies（@dcloudio vite 线，锁定版本），首次使用先 `npm install`：

```bash
npm run build:h5     # H5 产物 -> unpackage/dist/build/h5
npm run dev:h5       # H5 dev 模式 -> unpackage/dist/dev/h5
npm run build:app    # APP 资源编译 -> unpackage/dist/build/app（真机运行/基座/APK 打包仍由 HBuilderX 承担）
```

入口是 `scripts/uniapp/run-uni.mjs`：它把 HBuilderX 根目录工程布局映射到 CLI（UNI_INPUT_DIR/UNI_OUTPUT_DIR），产物保持 `unpackage/dist/{dev|build}/<platform>` 布局。`vite.config.js` 的 APP inline 补丁只作用于 APP 平台；工程 node_modules 缺失时回退 HBuilderX 内置编译器。

编译完成后可强制核对编译产物资源（dev/build 任一最新产物均可）：

```bash
node ../../scripts/check-uniapp-assets.mjs --require-compiled
```

验证基线与时序文档：

- `../../docs/verification/uniapp-functional-map.md`
- `../../docs/verification/uniapp-real-device-checklist.md`
- `../../docs/plans/2026-08-22-uniapp-connected-session-sequence.md`
- `../../docs/plans/2026-08-22-uniapp-smart-hid-sequence.md`
