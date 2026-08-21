# BLE Toolkit+ Smart HID 模块页面结构 v1.2

## 1. 产品边界

微信小程序仍是：
> 开源 BLE Toolkit+ + Smart HID 配置工具

不做：
- 登录
- 会员
- License
- 支付
- 订单
- 商业设备管理

## 2. TabBar

```text
设备 | HID | 广播 | 关于
```

## 3. 新增页面

```text
pages/hid/index.vue
pages/hid/add.vue
pages/hid/detail.vue
pages/hid/diagnostics.vue
```

只增加 4 个主页面。

## 4. HID 首页

未配置：

```text
Smart HID

配置 Smart HID 的 Wi-Fi
和 ControlHub。

[搜索 Smart HID]
```

历史设备可以显示最近配置记录，但不要假装实时在线。

## 5. Add Wizard

最终 6 步：

```text
W01 准备
W02 搜索 Smart HID
W03 ControlHub
W04 Wi-Fi
W05 配置
W06 完成
```

### W02
当前没有设备二维码。

流程：

```text
扫描附近 BLE
→ 用 Smart HID Service UUID 过滤
→ 显示 SHID-XXXXXX
→ 用户选择
→ BLE connect
→ get_info
→ 得到 Device ID
```

### W03
扫描 ControlHub 动态二维码。

### W04
手动输入 Wi-Fi SSID 与密码（V1 协议无设备侧 Wi-Fi 扫描特征）。

### W05
显示人话进度：

```text
Smart HID
Wi-Fi
ControlHub
控制连接
USB HID
```

普通 UI 不显示 MQTT。

## 6. Detail

显示：
- Device ID
- Hardware
- Firmware
- Protocol
- 最近配置 Wi-Fi
- ControlHub
- 重新配置
- 诊断
- 高级 BLE 调试

## 7. Diagnostics

显示：
- BLE
- Wi-Fi
- ControlHub
- 控制连接
- USB HID

错误码放“详细信息”，主 UI 显示人话。

## 8. Store

新增：

```text
store/hid.js
```

职责：
- smartDevices
- currentDevice
- provisionSession
- currentStep
- hubInfo
- wifiNetworks
- progress
- knownDevices
- diagnostic
- lastError

敏感字段不要持久化。

## 9. BLE 复用

必须复用现有 `store/ble.js`。

不要：
- 再创建第二个扫描器
- 页面直接调用 `uni.writeBLECharacteristicValue`

推荐：

```text
Page
→ hidStore
→ smart-hid service（设备档案：UUID / QR / 状态语义）
→ services/provisioning（通用配网框架：transport + profiles 注册表）
→ bleStore（扫描）/ uni.* GATT 原语（收敛在框架层）
```

## 10. Service

建议：

```text
services/smart-hid/index.js
```

对 UI 暴露（V1，已真实实现，基于 services/provisioning 通用框架）：

```text
scanSmartHid()                 // 按 profile 过滤（serviceUuid / SHID- 名前缀）
connect(deviceId)              // GATT 连接 + MTU + notify 订阅 + 读 Device Info
getDeviceInfo()                // 读 info 特征
provisionCandidate(input)      // 单次分帧写入 {v,wifi_ssid,wifi_password,hub_host,hub_port,token}
waitForProvisionResult(ms)     // 等 ready / error（status notify 驱动）
getStatus()                    // 读 status 特征
diagnose()                     // info+status → 诊断行
disconnect()
```

旧版 scanWifi / setWifi / setControlHub 两段式写入已随 V1 单次 candidate 移除。
