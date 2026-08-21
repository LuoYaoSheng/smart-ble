# 功能矩阵

| ID | 功能 | 用户目标 | 页面/实现 | 平台能力 | 状态/证据 |
|---|---|---|---|---|---|
| F001 | BLE 适配器状态 | 知道能否开始 | P001、BLE Store、Runtime | `openBluetoothAdapter` | ⚠️ E1 |
| F002 | 连续扫描 | 每次都得到新结果/明确错误 | P001、`store/ble.js` | discovery | ❌ E1+用户实测 |
| F003 | 广播 Snapshot | 看真实发现字段 | P001 | device found result | ⚠️ E1 |
| F004 | GATT 调试 | 服务发现、读写、notify、OTA | P005、Runtime | BLE GATT | 🟡 E1/E2 单测局部 |
| F005 | Smart HID 识别 | 从通用发现中筛选 Profile | P003/Profile | UUID、Device Info | 🟡 E1/E2 单测 |
| F006 | Smart HID 配网 | Wi-Fi+Hub+Token 下发并等待结果 | P003/transport | BLE、相机扫码 | 🟡 E1/E2 协议单测 |
| F007 | Smart HID 非敏感记录 | 配网后保留最近配置元数据 | P004/Pinia | 本地存储 | 🟡 E2；无独立顶级页面 |
| F008 | Smart HID 诊断 | 从历史设备诊断 | P006 | BLE 重连/读 | ⚠️ E1 |
| F009 | 手机外设广播 | 广播自定义数据 | P007 | 原生插件/微信 BLE peripheral | 🟡 E1，微信待证 |
| F010 | 关于/资源 | 正常显示品牌/关联应用 | P008/static | image | ❌ E1+dist 检查 |
| F011 | 微信分享 | 分享工具入口 | P001/P008 | share menu | 🟡 E1，产品价值待定 |
| F012 | 跳转关联小程序 | 打开开发者其它产品 | P008 | navigateToMiniProgram | 🟡 E1 |
