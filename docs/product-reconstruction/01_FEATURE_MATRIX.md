# FEATURE MATRIX

|ID|功能|类型|状态|页面/模块|依据|
|-|-|-|-|-|-|
|BLE-001|扫描设备|基础BLE|已有|PAGE-001|feature catalog|
|BLE-002|查看广播快照|基础BLE|已有|PAGE-001|DISC-006|
|BLE-003|连接设备|基础BLE|已有|PAGE-001/PAGE-006|CONN-001|
|BLE-004|Service Discovery|基础BLE|已有|PAGE-006|CONN-002|
|BLE-005|Read|GATT|已有|PAGE-006|GATT-002|
|BLE-006|Write TEXT/HEX|GATT|已有|PAGE-006|GATT-003/004|
|BLE-007|Notify|GATT|已有|PAGE-006|GATT-005|
|BLE-008|通信日志|调试|已有|PAGE-006|LOG|
|ADV-001|读取广播|广播|已有|PAGE-001|DISC-006|
|ADV-002|App Peripheral广播|广播|已有|PAGE-008|ADV|
|OTA-001|固件升级|OTA|已有|PAGE-006|OTA contract|
|PROFILE-001|Profile识别|扩展|已有|扫描链路|PRO-001|
|HID-001|Smart HID配置|特殊硬件|已有|PAGE-002|HID contract|
|HID-002|Smart HID诊断|特殊硬件|已有|PAGE-005|HID contract|
|VCU-001|Bike VCU Profile|特殊硬件|扩展方向|待确认|Profile模型|

## 分类原则

普通 BLE：扫描、广播、连接、GATT、日志、OTA。

特殊硬件：基于 Profile 增加业务能力。

Profile 不允许删除通用调试能力。
