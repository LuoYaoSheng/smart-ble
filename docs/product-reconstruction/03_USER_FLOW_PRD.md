# USER FLOW PRD

## FLOW-001 扫描设备

打开蓝牙 → 权限检查 → 开始扫描 → 设备列表。

## FLOW-002 查看广播

扫描列表 → 点击广播 → Advertisement Viewer。

包含：
- Manufacturer Data
- Service Data
- UUID
- HEX

## FLOW-003 连接设备

扫描列表 → 连接按钮 → Session → Discovery → Device Detail。

## FLOW-004 BLE调试

Device Detail → GATT → Read/Write/Notify → Logs。

## FLOW-005 特殊硬件流程

扫描 → Profile识别 → 专属入口。

同时保留：

通用BLE Inspector。

## FLOW-006 OTA

选择固件 → 校验 → Start → Data → Commit → Success。

## FLOW-007 App广播

广播页面 → 配置 → 检查平台 → 开始广播。

## FLOW-008 Smart HID配置

扫描 → HID识别 → 连接 → 配置 → Ready。
