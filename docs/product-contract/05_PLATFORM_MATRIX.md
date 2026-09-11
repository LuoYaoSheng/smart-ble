# 平台适配矩阵

## 支持等级

- `Full`：第一阶段正式发布并要求真机证据。
- `Adapted`：功能目标相同，但按平台权限/API 调整。
- `Degraded`：页面可用并解释限制，不宣称功能可用。
- `Later`：后续阶段补齐，不阻塞 Android + 微信首发。

## 平台定位

| 平台 | 第一阶段等级 | 定位 |
|---|---|---|
| UniApp Android App | Full | 第一个完整 Core BLE、ESP32、广播和 OTA 运行时 |
| 微信小程序 | Full/Adapted | 微信生态入口，完成微信允许的 BLE 与 Profile 能力 |
| UniApp iOS App | Later | 使用同一页面契约，按 CoreBluetooth/插件能力补证据 |
| H5 | Degraded | 产品预览、文档和页面体验；不支持真实 BLE |

## 能力矩阵

| 能力 | Android App | 微信小程序 | iOS App（后续） | H5 |
|---|---|---|---|---|
| 页面与四 Tab | Full | Full | Later | Full |
| BLE 扫描 | Full | Adapted：微信授权/定位策略 | Later | Unsupported，明确提示 |
| 设备名称解析 | Full | Full：兼容 `name/localName/AD` | Later | 仅模拟数据 |
| 广播快照 | Full | Full：API 字段可能不完整 | Later | 模拟/文档 |
| 多设备连接 | Full | Full，受系统/微信限制 | Later | Unsupported |
| GATT Read/Write/Notify | Full | Full | Later | Unsupported |
| 后台保持连接 | Adapted：系统策略 | 不承诺 | Later：后台模式 | Unsupported |
| 文件选择 OTA | Full | Adapted：微信文件能力 | Later | Unsupported |
| Peripheral 广播 | Full：原生插件 | Adapted：微信 BLE Peripheral API | Later：原生插件 | Unsupported |
| 广播名称 | 系统可能接管 | 微信 API 约束 | Later | 仅展示 |
| QR 扫码 | App 扫码能力 | 微信 `scanCode` | Later | 可模拟/上传，不进入正式验收 |
| 分享 | 系统分享 | 微信好友/朋友圈 | Later | Web Share/复制链接 |
| 外部链接 | 系统浏览器 | 复制链接/小程序跳转 | Later | 新标签页 |

## 平台差异规则

### Android App

- Android 12+ 请求 `BLUETOOTH_SCAN`、`BLUETOOTH_CONNECT`、`BLUETOOTH_ADVERTISE`；旧版本按定位策略处理。
- 权限拒绝区分“首次拒绝”“永久拒绝”“系统蓝牙关闭”。
- 文件 OTA、后台连接和 Peripheral 广播需要单独真机验收。
- 原生插件不存在或版本不匹配时，PAGE-008 必须进入 Unsupported/Error，而不是无响应。

### 微信小程序

- 使用微信 BLE API；扫描与广播共享适配器时必须明确 central/peripheral 所有权。
- 活动连接存在时不得为了广播静默关闭连接。
- 开发者工具只证明页面与错误反馈；BLE 成功必须真机。
- 外部 URL 默认复制；其他小程序使用正式 appId、path 和失败反馈。

### iOS App（后续）

- 遵循 iOS 蓝牙权限和后台模式；不复制 Android 设置入口。
- Peripheral 本地名称、广播字节和系统缓存行为按 CoreBluetooth 记录差异。
- iOS deviceId 是稳定 UUID 语义，不假设可获得 MAC 地址。

### H5

- 扫描页状态显示“当前平台不支持 BLE”，点击操作给出微信/App 入口。
- 广播页显示 Web/不支持；不得发起不存在的 BLE API。
- H5 可以展示交互原型和公开文档，但不能进入真机通过统计。

## HTML 原型中的平台切换

原型顶部提供 `微信 / Android / iOS / H5` 切换。切换后：

- 页面编号、任务和数据不变。
- 导航外观、权限文案、可见字段和能力状态按本矩阵变化。
- Unsupported 控件不可伪装成可点击成功；必须显示原因。
- iOS 视图可完成页面与交互设计，但标记为“后续真机验收”。
