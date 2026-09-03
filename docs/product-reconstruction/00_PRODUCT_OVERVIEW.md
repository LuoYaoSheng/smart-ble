# SMART BLE PRODUCT RECONSTRUCTION

## 产品定位

Smart BLE 是一个开源 BLE 调试、学习和硬件联动平台。

真实产品模型：

> 通用 BLE Inspector + 可扩展设备 Profile 系统。

核心不是某一个硬件，而是提供从发现 BLE 设备、查看广播、连接 GATT、调试通信、升级固件，到接入第一方硬件 Profile 的完整工具链。

## 用户类型

- BLE 固件开发者
- 硬件工程师
- 测试与售后人员
- Android/iOS/微信 BLE 开发者
- 学习 BLE 协议的开发者
- 自研硬件接入者

## 产品边界

Smart BLE 是：

- BLE Scanner
- Advertisement 查看工具
- GATT 调试工具
- BLE 日志工具
- Peripheral 广播工具
- OTA 调试工具
- Profile 扩展平台

Smart BLE 不是：

- 单一 Smart HID App
- 单一设备控制 App
- 普通蓝牙扫描器
- 只服务某个硬件的客户端

## 核心原则

1. 通用 BLE 能力永远存在。
2. 特殊硬件通过 Profile 扩展。
3. Profile 不替代 BLE Inspector。
4. 扫描列表是所有设备统一入口。
5. 所有设备支持查看广播、连接、GATT 调试。
6. 特殊设备增加专属任务入口。

## 当前真实产品结构

扫描入口
→ 设备识别
→ 通用 BLE 能力
→ Profile 判断
→ 特殊流程

例如：

普通 BLE：扫描 → 广播 → 连接 → GATT

Smart HID：扫描 → 广播 → 身份确认 → 专属配置 + 通用 BLE

Bike VCU：扫描 → 广播 → 身份确认 → 专属车辆能力 + 通用 BLE
