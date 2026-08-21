# Smart HID 公开侧文档

本目录持有 `smart-ble` 仓库作为**事实源（Source of Truth）**的 Smart HID 公开协议与规格。
私有侧设计（ControlHub / Firmware / Cloud / Web）在独立的 `Smart-HID-Workspace` 工作区。

## 文档

| 文档 | 内容 | 协议事实源 |
|------|------|-----------|
| [BLE_PROVISIONING_PROTOCOL.md](./BLE_PROVISIONING_PROTOCOL.md) | Smart HID BLE 配网协议 V1 | [`core/protocols/hid-provisioning-protocol.ts`](../../core/protocols/hid-provisioning-protocol.ts) |
| [MINIAPP_HID_MODULE.md](./MINIAPP_HID_MODULE.md) | BLE Toolkit+ 小程序 HID 模块页面结构 v1.2 | [`apps/uniapp/pages/hid/`](../../apps/uniapp/pages/hid/) |

## 与代码的对应关系

- **BLE 配网协议**：Markdown 是人类可读说明；TypeScript 文件 `core/protocols/hid-provisioning-protocol.ts` 是权威定义（UUID、接口、错误码、状态枚举）。两者须保持一致；修订时先改 TypeScript，再同步文档。
- **小程序 HID 模块**：`MINIAPP_HID_MODULE.md` 描述页面结构（`pages/hid/` 4 页 + `store/hid.js` + `services/smart-hid/`），实现位于 [`apps/uniapp/`](../../apps/uniapp/)。

## 设计基线

来源：`smart-hid-development-pack-v1.0`（2026-08-11）。当前结论：

- 微信小程序是开源个人小程序，不做会员 / 支付 / 订单 / License。
- Smart HID 设备当前**没有设备二维码**；通过"搜索附近 Smart HID → BLE 连接 → 读取 Device Info"识别设备。
- 当前唯一需要二维码的是 ControlHub 动态 Pairing QR。
- BLE 只负责配置与诊断，**不负责 HID 实时控制**（实时控制走 ControlHub → MQTT → ESP32）。
- 小程序底部导航：`设备 | HID | 广播 | 关于`。
