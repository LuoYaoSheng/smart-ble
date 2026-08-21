# BLE Toolkit+（UniApp / 微信小程序）

BLE Toolkit+ 是 Smart BLE 产品家族的微信生态和轻量跨端入口。它提供通用 BLE 扫描、连接、GATT 读写、通知、广播能力，并通过 Profile 注册表扩展 Smart HID 等设备专属任务。

## 产品导航

TabBar 固定为：

1. 设备
2. 广播
3. 关于

“扫描设备”和“已连接”是设备页内的两个视图。Smart HID 不占用独立 Tab，也不维护第二套扫描器。

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

## 代码结构

```text
pages/                    页面与路由编排
components/common/        通用状态与导航组件
components/scan/          扫描和广播快照组件
components/hid/           Smart HID 配网展示组件
components/about/         关于页推广组件
composables/              页面级生命周期和动作编排
services/ble-runtime/     唯一 BLE Runtime 与扫描会话
services/provisioning/    通用 GATT 配网 transport / Profile 注册表
services/smart-hid/       Smart HID Profile 业务语义
store/                    Pinia 状态
static/                   小程序资源
```

## 本地检查

```bash
node ../../tests/unit/provisioning.test.mjs
node ../../tests/unit/smart-hid-provision-form.test.mjs
node ../../scripts/check-smart-hid-contract.mjs
node ../../scripts/check-uniapp-assets.mjs
```

最终 BLE、扫码、小程序跳转和真机页面效果仍需在微信开发者工具与微信真机中验证。
