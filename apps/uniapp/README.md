# BLE Toolkit+（UniApp / 微信小程序）

BLE Toolkit+ 是 Smart BLE 产品家族的微信生态和轻量跨端入口。它提供通用 BLE 扫描、连接、GATT 读写、通知、广播能力，并通过 Profile 注册表扩展 Smart HID 等设备专属任务。

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

## 微信小程序专项处理

- AppID：`wxf6c58b1dcac4c82d`
- 使用微信 BLE API 完成扫描与连接
- 关于页通过 `uni.navigateToMiniProgram` 打开开发者其他小程序
- 微信端外部网址使用复制链接降级
- 好友与朋友圈分享使用微信小程序原生钩子
- 扫描前区分系统蓝牙关闭、微信蓝牙授权拒绝和定位授权拒绝，并给出对应设置入口
- 扫描使用 central 模式，广播使用 peripheral 模式；无活动连接时由页面生命周期完成模式交接
- 业务按钮使用原生 `button` 和 `styles/design-system.css` 的 `ble-btn` 类，避免自定义组件样式隔离导致文字不可见

## 代码结构

```text
pages/                    页面与路由编排
components/common/        通用状态与导航组件
components/scan/          扫描和广播快照组件
components/hid/           Smart HID 配网展示组件
components/about/         关于页推广组件
composables/              页面级生命周期和动作编排
services/ble-runtime/     唯一 BLE Runtime 与扫描会话
services/wx-peripheral-mode.js 微信 central/peripheral 模式所有权
services/provisioning/    通用 GATT 配网 transport / Profile 注册表
services/smart-hid/       Smart HID Profile 业务语义
store/                    Pinia 状态
static/                   小程序资源
```

## 本地检查

```bash
bash ../../scripts/verify-uniapp.sh
```

该命令统一运行单元测试、Smart HID 协议锁、静态资源检查、Vue SFC 解析与 Git 空白检查。HBuilderX 编译、微信开发者工具自动化，以及最终 BLE、扫码、小程序跳转和真机页面效果仍是独立验证阶段，不能由本地检查替代。

完成 HBuilderX 微信编译后，可强制核对编译产物资源：

```bash
node ../../scripts/check-uniapp-assets.mjs --require-compiled
```

安装官方 HBuilderX 自动化测试插件及其测试环境后，运行微信页面自动化：

```bash
/Applications/HBuilderX.app/Contents/MacOS/cli uniapp.test mp-weixin \
  --project /Users/luoyaosheng/Desktop/project/Open/smart-ble/apps/uniapp
```

验证基线与时序文档：

- `../../docs/verification/uniapp-functional-map.md`
- `../../docs/verification/uniapp-real-device-checklist.md`
- `../../docs/plans/2026-08-22-uniapp-connected-session-sequence.md`
- `../../docs/plans/2026-08-22-uniapp-smart-hid-sequence.md`
