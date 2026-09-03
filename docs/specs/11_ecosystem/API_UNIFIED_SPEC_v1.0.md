# Smart BLE API统一接口规范 v1.0

版本：v1.0

## 1. 文档目标

定义 Smart BLE 在 uni-app、Flutter、Native、Desktop 多实现中的统一 API
标准。

目标：

-   不同语言保持一致能力模型
-   避免平台实现分叉
-   支持开源贡献
-   支持自动化生成测试

------------------------------------------------------------------------

# 2. 总体架构

    应用层

    ↓

    Smart BLE API

    ↓

    平台适配层

    ↓

    系统 BLE Framework

------------------------------------------------------------------------

# 3. BLEManager

所有平台必须提供统一入口。

## 初始化

API：

    BLE.initialize()

返回：

``` json
{
  "success": true,
  "state": "poweredOn"
}
```

------------------------------------------------------------------------

## 获取能力

API：

    BLE.getCapabilities()

返回：

``` json
{
  "scan": true,
  "connect": true,
  "notify": true,
  "advertise": false,
  "ota": true
}
```

------------------------------------------------------------------------

# 4. 蓝牙状态 API

## 获取状态

    BLE.getBluetoothState()

返回：

``` json
{
 "state":"poweredOn"
}
```

状态：

-   unknown
-   poweredOff
-   poweredOn
-   unauthorized

------------------------------------------------------------------------

# 5. 扫描 API

## 开始扫描

    BLE.scan(options)

参数：

``` json
{
 "timeout":10,
 "serviceUUID":"",
 "allowDuplicates":false
}
```

返回：

``` json
{
 "deviceId":"xxx",
 "name":"Smart BLE",
 "rssi":-50
}
```

------------------------------------------------------------------------

## 停止扫描

    BLE.stopScan()

------------------------------------------------------------------------

# 6. Device对象

统一设备模型：

``` json
{
"id":"",
"name":"",
"rssi":-50,
"connected":false,
"advertisement":{}
}
```

字段：

  字段            说明
  --------------- ------------
  id              设备唯一ID
  name            设备名称
  rssi            信号强度
  advertisement   广播数据

------------------------------------------------------------------------

# 7. 连接 API

## 连接设备

    BLE.connect(deviceId)

返回：

``` json
{
"state":"connected"
}
```

------------------------------------------------------------------------

## 断开设备

    BLE.disconnect(deviceId)

------------------------------------------------------------------------

## 获取连接状态

    BLE.getConnectionState(deviceId)

状态：

    disconnected

    connecting

    connected

    ready

    error

------------------------------------------------------------------------

# 8. GATT API

## 发现服务

    BLE.discoverServices(deviceId)

返回：

``` json
[
 {
  "uuid":"FFE0"
 }
]
```

------------------------------------------------------------------------

## 获取Characteristic

    BLE.discoverCharacteristics(serviceUUID)

返回：

``` json
[
 {
  "uuid":"FFE1",
  "properties":[
   "read",
   "write",
   "notify"
  ]
 }
]
```

------------------------------------------------------------------------

# 9. 数据通信 API

## Read

    BLE.read(serviceUUID,charUUID)

返回：

``` json
{
"data":"AA BB CC"
}
```

------------------------------------------------------------------------

## Write

    BLE.write(serviceUUID,charUUID,data)

参数：

``` json
{
"data":[1,2,3]
}
```

------------------------------------------------------------------------

## Notify

开启：

    BLE.enableNotify(serviceUUID,charUUID)

关闭：

    BLE.disableNotify(serviceUUID,charUUID)

事件：

``` json
{
"type":"notify",
"data":[1,2,3]
}
```

------------------------------------------------------------------------

# 10. 广播 API

## 获取广播数据

    BLE.getAdvertisement()

包含：

-   Manufacturer Data
-   Service Data
-   UUID
-   Raw Data

------------------------------------------------------------------------

## 开启广播

    BLE.startAdvertise(options)

参数：

``` json
{
"name":"Smart BLE",
"uuid":"xxxx"
}
```

注意：

根据平台能力决定是否支持。

------------------------------------------------------------------------

# 11. OTA API

## 检查版本

    BLE.getFirmwareVersion()

------------------------------------------------------------------------

## 开始升级

    BLE.startOTA(file)

事件：

``` json
{
"progress":50
}
```

------------------------------------------------------------------------

## OTA状态

状态：

    idle

    checking

    upgrading

    success

    failed

------------------------------------------------------------------------

# 12. 日志 API

## 输出日志

    BLE.log(level,message)

等级：

-   DEBUG
-   INFO
-   WARN
-   ERROR

------------------------------------------------------------------------

## 获取日志

    BLE.getLogs()

------------------------------------------------------------------------

# 13. Profile API

用于支持不同设备。

## 注册Profile

    BLE.registerProfile(profile)

示例：

``` json
{
"type":"hid",
"services":[
"battery",
"hid"
]
}
```

------------------------------------------------------------------------

## 识别设备

    BLE.matchProfile(device)

返回：

``` json
{
"profile":"hid"
}
```

------------------------------------------------------------------------

# 14. 错误码规范

  错误码    说明
  --------- ------------
  BLE_001   蓝牙未开启
  BLE_002   权限不足
  BLE_003   扫描失败
  BLE_004   连接失败
  BLE_005   服务不存在
  BLE_006   写入失败
  BLE_007   Notify失败
  BLE_008   OTA失败

------------------------------------------------------------------------

# 15. 各语言实现要求

## uni-app

提供：

-   JS API封装
-   小程序适配
-   App原生插件

## Flutter

提供：

-   Dart API
-   Platform Channel

## Native

提供：

-   iOS Swift SDK
-   Android Kotlin SDK

## Desktop

提供：

-   Windows SDK
-   macOS SDK
-   Linux BlueZ Adapter

------------------------------------------------------------------------

# 16. 后续文档

下一阶段：

《Smart BLE 设备Profile规范 v1.0》

用于：

-   HID设备
-   智能车
-   传感器
-   灯控设备
-   自定义硬件
