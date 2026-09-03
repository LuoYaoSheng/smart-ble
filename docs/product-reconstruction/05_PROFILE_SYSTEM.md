# PROFILE SYSTEM

## 通用层

Generic BLE：

负责：

- 扫描
- 广播
- 连接
- GATT
- 日志
- OTA

## Profile层

负责特殊设备业务。

例如：

Smart HID:
- 身份确认
- 配网
- 状态
- 诊断

Bike VCU:
- 车辆协议
- 控制能力

## 约束

Profile不能：

- 替代扫描
- 替代连接
- 隐藏GATT
- 创建独立设备模型

正确关系：

Device
 ├─ Generic BLE
 └─ Profile Extension
