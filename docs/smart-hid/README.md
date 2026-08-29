# Smart HID 公开侧文档

本目录是 **smart-ble 开源仓** 内 Smart HID 的说明与 TS 镜像索引。

## 协议权威来源

| 层级 | 位置 |
|---|---|
| **语义正典** | [Smart-HID-Workspace](https://github.com/LuoYaoSheng/Smart-HID-Workspace) `protocols/contracts/smart-hid-v1.json` + `PROVISIONING_V1.md` |
| **兼容锁** | [`core/protocols/smart-hid-contract.lock.json`](../../core/protocols/smart-hid-contract.lock.json) |
| **可执行镜像** | [`core/protocols/hid-provisioning-protocol.ts`](../../core/protocols/hid-provisioning-protocol.ts) |
| **Runtime Profile** | [`apps/uniapp/services/smart-hid/profile.js`](../../apps/uniapp/services/smart-hid/profile.js) |

修订流程见 [docs/contracts/README.md](../contracts/README.md)。

## 文档

| 文档 | 内容 |
|---|---|
| [BLE_PROVISIONING_PROTOCOL.md](./BLE_PROVISIONING_PROTOCOL.md) | Smart HID BLE 配网 V1（人类可读摘要） |
| [MINIAPP_HID_MODULE.md](./MINIAPP_HID_MODULE.md) | 小程序 HID 页面结构 |

## 与 smart-ble 开源定位

- **smart-ble**：通用 BLE 工具（扫描 / GATT / 广播 / OTA）+ 可注册多 Profile
- **Smart HID**：内置第一方 Profile，可拔除；专属页面在 `pages/hid/`
- 集成架构见主仓 [integration plan](https://github.com/LuoYaoSheng/Smart-HID-Workspace/blob/main/docs/plans/2026-08-21-smart-ble-smart-hid-integration.md)

添加其它设备型号：[docs/profiles/README.md](../profiles/README.md)

## 设计基线

- 微信小程序为开源个人工具，无会员/支付
- Smart HID 通过扫描 + Device Info 识别；ControlHub 配对码为唯一需扫码环节
- BLE 负责配置与诊断；HID 实时控制走 ControlHub → MQTT
- Tab：**扫描 | 已连接 | 广播 | 关于**（Smart HID 从扫描 Profile 入口进入）
