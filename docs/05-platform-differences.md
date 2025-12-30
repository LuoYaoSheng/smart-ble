# Smart BLE 平台差异说明

> 版本：v1.0
> 更新日期：2024-12-30
> 项目：Smart BLE - 跨平台蓝牙调试工具

---

## 1. 概述

本文档详细说明 Smart BLE 在不同平台（微信小程序、Android App、iOS App）上的功能差异、API 差异和实现细节。

---

## 2. 平台对比总览

### 2.1 功能支持矩阵

| 功能模块 | 微信小程序 | Android App | iOS App | H5 |
|----------|-----------|-------------|---------|-----|
| 蓝牙扫描 | ✅ | ✅ | ✅ | ⚠️ Web Bluetooth |
| 设备连接 | ✅ | ✅ | ✅ | ⚠️ Web Bluetooth |
| 服务发现 | ✅ | ✅ | ✅ | ⚠️ Web Bluetooth |
| 特征值读取 | ✅ | ✅ | ✅ | ⚠️ Web Bluetooth |
| 特征值写入 | ✅ | ✅ | ✅ | ⚠️ Web Bluetooth |
| 通知订阅 | ✅ | ✅ | ✅ | ⚠️ Web Bluetooth |
| BLE 广播 | ✅ | ✅ (插件) | ✅ (插件) | ❌ |
| 后台运行 | ❌ | ✅ | ⚠️ 有限 | ❌ |
| 多设备连接 | ⚠️ 有限 | ✅ | ✅ | ❌ |

### 2.2 权限需求对比

| 平台 | 蓝牙权限 | 定位权限 | 广播权限 | 后台权限 |
|------|----------|----------|----------|----------|
| 微信小程序 | scope.bluetooth | scope.userLocation | - | - |
| Android | BLUETOOTH | ACCESS_FINE_LOCATION | BLUETOOTH_ADVERTISE | FOREGROUND_SERVICE |
| Android 12+ | BLUETOOTH_SCAN | ACCESS_FINE_LOCATION | BLUETOOTH_ADVERTISE | FOREGROUND_SERVICE |
| | BLUETOOTH_CONNECT | | | |
| iOS | NSBluetoothAlwaysUsageDescription | - | - | - |

---

## 3. 微信小程序平台

### 3.1 API 差异

#### 蓝牙适配器初始化

```javascript
// 微信小程序 - 标准模式
wx.openBluetoothAdapter({
  success: () => {
    console.log('初始化成功')
  }
})

// 微信小程序 - 外设模式（用于广播）
wx.openBluetoothAdapter({
  mode: 'peripheral',  // 关键差异
  success: () => {
    console.log('外设模式初始化成功')
  }
})
```

#### 设备发现

```javascript
// 微信小程序
wx.onBluetoothDeviceFound((res) => {
  res.devices.forEach(device => {
    console.log(device.deviceId, device.name, device.RSSI)
  })
})

wx.startBluetoothDevicesDiscovery({
  allowDuplicatesKey: false  // 是否允许重复上报
})
```

#### BLE 广播（外设模式）

```javascript
// 1. 创建外设服务器
wx.createBLEPeripheralServer({
  success: (res) => {
    const server = res.server

    // 2. 开始广播
    server.startAdvertising({
      advertiseRequest: {
        deviceName: 'MyDevice',
        serviceUuids: ['FFE0']
      },
      powerLevel: 'high',
      success: () => {
        console.log('广播启动成功')
      }
    })
  }
})
```

### 3.2 特殊限制

| 限制项 | 说明 |
|--------|------|
| 同时连接设备数 | 最多 10 个（部分手机限制更少） |
| 广播数据大小 | 最大 31 字节 |
| 扫描时长 | 需要主动停止，建议设置超时 |
| 后台运行 | 不支持，小程序切换到后台会断开 |
| MTU | 最大 512 字节 |

### 3.3 权限处理

```javascript
// 检查蓝牙权限
wx.getSetting({
  success: (res) => {
    if (!res.authSetting['scope.bluetooth']) {
      wx.authorize({
        scope: 'scope.bluetooth',
        success: () => {
          console.log('蓝牙权限授权成功')
        }
      })
    }
  }
})

// 检查定位权限（扫描需要）
wx.getSetting({
  success: (res) => {
    if (!res.authSetting['scope.userLocation']) {
      wx.authorize({
        scope: 'scope.userLocation',
        success: () => {
          console.log('定位权限授权成功')
        }
      })
    }
  }
})
```

### 3.4 条件编译

```vue
<!-- 只在微信小程序生效 -->
<!-- #ifdef MP-WEIXIN -->
<button @click="startScan">微信小程序扫描</button>
<!-- #endif -->

<!-- 只在非微信小程序生效 -->
<!-- #ifndef MP-WEIXIN -->
<button @click="startScan">App扫描</button>
<!-- #endif -->
```

---

## 4. Android App 平台

### 4.1 API 差异

#### 蓝牙适配器初始化

```javascript
// uni-app Android - 使用标准 uni API
uni.openBluetoothAdapter({
  success: () => {
    console.log('初始化成功')
  },
  fail: (err) => {
    // Android 常见错误码
    if (err.errCode === 10001) {
      console.log('蓝牙未开启')
    }
  }
})
```

#### BLE 广播（需要原生插件）

```javascript
// 使用 LysBlePeripheral 原生插件
const blePeripheral = uni.requireNativePlugin('LysBlePeripheral')

// 构建广播参数
const options = {
  settings: {
    advertiseMode: 2,    // 0:低功耗, 1:平衡, 2:低延迟
    txPowerLevel: 3,     // 0:超低, 1:低, 2:中, 3:高
    connectable: true
  },
  advertiseData: {
    includeDeviceName: false,
    manufacturerId: 0x0001,
    manufacturerData: "BLETool",
    serviceUuid: "FFE0"
  }
}

// 开始广播
blePeripheral.startAdvertising(options, (result) => {
  if (result.code === 0) {
    console.log('广播启动成功')
  }
})
```

### 4.2 Android 12+ 权限处理

```javascript
// 检查 Android 版本
const Build = plus.android.importClass("android.os.Build")
if (Build.VERSION.SDK_INT >= 31) {
  // Android 12+ 需要新的蓝牙权限
  const permissions = [
    "android.permission.BLUETOOTH_SCAN",
    "android.permission.BLUETOOTH_CONNECT",
    "android.permission.BLUETOOTH_ADVERTISE",
    "android.permission.ACCESS_FINE_LOCATION"
  ]
} else {
  // Android 11 及以下
  const permissions = [
    "android.permission.BLUETOOTH",
    "android.permission.BLUETOOTH_ADMIN",
    "android.permission.ACCESS_FINE_LOCATION"
  ]
}

// 检查权限
const main = plus.android.runtimeMainActivity()
const PackageManager = plus.android.importClass("android.content.pm.PackageManager")

permissions.forEach(permission => {
  if (main.checkSelfPermission(permission) !== PackageManager.PERMISSION_GRANTED) {
    // 请求权限
    console.log('缺少权限:', permission)
  }
})
```

### 4.3 原生权限请求

```javascript
// 使用 plus.android 请求权限
plus.android.requestPermissions(
  ["android.permission.BLUETOOTH_SCAN"],
  (result) => {
    if (result.granted && result.granted.includes("android.permission.BLUETOOTH_SCAN")) {
      console.log('权限已授予')
    }
  }
)
```

### 4.4 特殊限制

| 限制项 | 说明 |
|--------|------|
| 同时连接设备数 | 取决于硬件，通常 7-10 个 |
| 广播数据大小 | 最大 31 字节（经典广播） |
| 后台扫描 | 需要前台服务 + 通知 |
| MTU | 可协商，最大 517 字节 |

---

## 5. iOS App 平台

### 5.1 API 差异

#### 蓝牙适配器初始化

```javascript
// uni-app iOS - 使用标准 uni API
uni.openBluetoothAdapter({
  success: () => {
    console.log('初始化成功')
  },
  fail: (err) => {
    // iOS 错误处理
    console.log('初始化失败:', err)
  }
})
```

#### BLE 广播（需要原生插件）

```javascript
// 使用 LysBlePeripheral 原生插件
const blePeripheral = uni.requireNativePlugin('LysBlePeripheral')

// iOS 广播参数（与 Android 不同）
const options = {
  localName: "BLEToolkit_iOS",
  services: ["FFE0"],  // 注意：iOS 使用短 UUID
  manufacturerData: {
    id: 0x0A00,
    data: "BLETool"
  }
}

blePeripheral.startAdvertising(options, (result) => {
  if (result.code === 0) {
    console.log('广播启动成功')
  }
})
```

### 5.2 Info.plist 配置

```xml
<!-- Info.plist 需要添加 -->
<key>NSBluetoothAlwaysUsageDescription</key>
<string>需要使用蓝牙功能进行设备连接和数据传输</string>

<key>NSBluetoothPeripheralUsageDescription</key>
<string>需要使用蓝牙外设模式进行广播</string>

<key>UIBackgroundModes</key>
<array>
    <string>bluetooth-central</string>
    <string>bluetooth-peripheral</string>
</array>
```

### 5.3 特殊限制

| 限制项 | 说明 |
|--------|------|
| 同时连接设备数 | 理论无限，实际建议不超过 15 个 |
| 广播数据大小 | 最大 31 字节 |
| 后台运行 | 支持 central/peripheral 模式 |
| MTU | 可协商，iOS 默认 185，最大 1850+ |
| 广播重启 | 杀死后台应用后需要手动重启 |

---

## 6. uni-app 平台差异处理

### 6.1 条件编译

```javascript
// 平台检测
// #ifdef MP-WEIXIN
// 微信小程序代码
console.log('微信小程序')
// #endif

// #ifdef APP-PLUS
// App 代码
console.log('App')
// #endif

// #ifdef APP-PLUS-ANDROID
// Android 特有代码
console.log('Android')
// #endif

// #ifdef APP-PLUS-IOS
// iOS 特有代码
console.log('iOS')
// #endif

// #ifdef H5
// H5 代码
console.log('H5')
// #endif
```

### 6.2 API 兼容层

```javascript
// utils/ble-helper.js

class BLEHelper {
  // 获取平台信息
  static getPlatform() {
    // #ifdef MP-WEIXIN
    return 'weixin'
    // #endif
    // #ifdef APP-PLUS-ANDROID
    return 'android'
    // #endif
    // #ifdef APP-PLUS-IOS
    return 'ios'
    // #endif
    return 'unknown'
  }

  // 是否支持广播
  static supportsAdvertising() {
    const platform = this.getPlatform()
    return platform === 'weixin' || platform === 'android' || platform === 'ios'
  }

  // 获取广播插件
  static getPeripheralPlugin() {
    // #ifdef APP-PLUS
    return uni.requireNativePlugin('LysBlePeripheral')
    // #endif
    return null
  }
}

export default BLEHelper
```

---

## 7. 代码示例：跨平台实现

### 7.1 扫描功能跨平台实现

```javascript
export class BLEScanner {
  constructor() {
    this.platform = this._getPlatform()
    this.isScanning = false
  }

  _getPlatform() {
    // #ifdef MP-WEIXIN
    return 'weixin'
    // #endif
    // #ifdef APP-PLUS
    const systemInfo = uni.getSystemInfoSync()
    return systemInfo.platform
    // #endif
    return 'unknown'
  }

  async startScan() {
    // 先初始化蓝牙适配器
    await this._initAdapter()

    // 微信小程序需要检查定位权限
    // #ifdef MP-WEIXIN
    await this._checkLocationPermission()
    // #endif

    // 开始扫描
    return new Promise((resolve, reject) => {
      uni.startBluetoothDevicesDiscovery({
        success: () => {
          this.isScanning = true
          this._setupDeviceFoundListener()
          resolve()
        },
        fail: reject
      })
    })
  }

  _initAdapter() {
    return new Promise((resolve, reject) => {
      uni.openBluetoothAdapter({
        success: resolve,
        fail: (err) => {
          if (err.errCode === 10001) {
            reject(new Error('蓝牙未开启'))
          } else {
            reject(err)
          }
        }
      })
    })
  }

  // #ifdef MP-WEIXIN
  _checkLocationPermission() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.userLocation']) {
            resolve()
          } else {
            wx.authorize({
              scope: 'scope.userLocation',
              success: resolve,
              fail: () => reject(new Error('需要定位权限'))
            })
          }
        }
      })
    })
  }
  // #endif

  _setupDeviceFoundListener() {
    uni.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        this._onDeviceFound(device)
      })
    })
  }

  _onDeviceFound(device) {
    // 平台差异处理
    const normalizedDevice = {
      deviceId: device.deviceId,
      name: device.name || device.localName || '',
      RSSI: device.RSSI,
      advertisData: this._parseAdvertisingData(device)
    }
    // 触发回调
    if (this.onDeviceFoundCallback) {
      this.onDeviceFoundCallback(normalizedDevice)
    }
  }

  _parseAdvertisingData(device) {
    // #ifdef MP-WEIXIN
    return device.advertisData
    // #endif
    // #ifdef APP-PLUS
    return device.advertisData || device.advertisement
    // #endif
    return null
  }
}
```

### 7.2 广播功能跨平台实现

```javascript
export class BLEAdvertiser {
  constructor() {
    this.platform = this._getPlatform()
    this.peripheral = this._getPeripheral()
    this.server = null
    this.isAdvertising = false
  }

  _getPlatform() {
    // #ifdef MP-WEIXIN
    return 'weixin'
    // #endif
    // #ifdef APP-PLUS
    const systemInfo = uni.getSystemInfoSync()
    return systemInfo.platform
    // #endif
    return 'unknown'
  }

  _getPeripheral() {
    // #ifdef APP-PLUS
    return uni.requireNativePlugin('LysBlePeripheral')
    // #endif
    return null
  }

  async startAdvertising(options) {
    switch (this.platform) {
      case 'weixin':
        return this._startWeixinAdvertising(options)
      case 'android':
        return this._startAndroidAdvertising(options)
      case 'ios':
        return this._startIOSAdvertising(options)
      default:
        throw new Error('不支持的平台')
    }
  }

  // #ifdef MP-WEIXIN
  async _startWeixinAdvertising(options) {
    // 初始化外设模式
    await this._initPeripheralServer()

    // 构建广播请求
    const advertiseRequest = {
      deviceName: options.deviceName.substring(0, 8),  // 限制长度
      serviceUuids: [options.serviceUUID.split('-')[0]]  // 使用短UUID
    }

    return new Promise((resolve, reject) => {
      this.server.startAdvertising({
        advertiseRequest,
        powerLevel: 'high',
        success: () => {
          this.isAdvertising = true
          resolve()
        },
        fail: reject
      })
    })
  }

  async _initPeripheralServer() {
    if (this.server) return

    await new Promise((resolve, reject) => {
      wx.openBluetoothAdapter({
        mode: 'peripheral',
        success: resolve,
        fail: reject
      })
    })

    await new Promise((resolve, reject) => {
      wx.createBLEPeripheralServer({
        success: (res) => {
          this.server = res.server
          resolve()
        },
        fail: reject
      })
    })
  }
  // #endif

  // #ifdef APP-PLUS
  async _startAndroidAdvertising(options) {
    const advertisingOptions = {
      settings: {
        advertiseMode: options.advertiseMode || 2,
        txPowerLevel: options.txPowerLevel || 3,
        connectable: options.connectable !== false
      },
      advertiseData: {
        includeDeviceName: options.includeDeviceName || false,
        manufacturerId: parseInt(options.manufacturerId, 16) || 0,
        manufacturerData: options.manufacturerData || ''
      }
    }

    return new Promise((resolve, reject) => {
      this.peripheral.startAdvertising(advertisingOptions, (result) => {
        if (result.code === 0) {
          this.isAdvertising = true
          resolve()
        } else {
          reject(new Error(result.message || '广播启动失败'))
        }
      })
    })
  }

  async _startIOSAdvertising(options) {
    const advertisingOptions = {
      localName: options.deviceName,
      services: [options.serviceUUID],
      manufacturerData: {
        id: parseInt(options.manufacturerId, 16) || 0,
        data: options.manufacturerData || ''
      }
    }

    return new Promise((resolve, reject) => {
      this.peripheral.startAdvertising(advertisingOptions, (result) => {
        if (result.code === 0) {
          this.isAdvertising = true
          resolve()
        } else {
          reject(new Error(result.message || '广播启动失败'))
        }
      })
    })
  }
  // #endif
}
```

---

## 8. 常见问题与解决方案

### 8.1 微信小程序

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 扫描不到设备 | 定位权限未授予 | 引导用户授权 scope.userLocation |
| 广播失败 | 设备名称过长 | 限制设备名称在 8 字节以内 |
| 连接后断开 | 小程序切后台 | 提示用户保持小程序在前台 |

### 8.2 Android

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 扫描不到设备 | Android 12+ 权限变化 | 请求 BLUETOOTH_SCAN 权限 |
| 广播失败 | 缺少 BLUETOOTH_ADVERTISE 权限 | 动态请求权限或引导用户到设置 |
| 后台扫描中断 | 未启动前台服务 | 添加前台服务通知 |

### 8.3 iOS

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 初始化失败 | Info.plist 缺少权限描述 | 添加蓝牙使用描述 |
| 广播立即停止 | 数据包过大 | 减少广播数据，去掉不必要字段 |
| MTU 过小 | 未协商 MTU | 主动请求 MTU 交换 |

---

## 9. 附录

### 9.1 错误码对照表

#### 微信小程序

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| -1 | 通用错误 |
| 10001 | 当前蓝牙适配器不可用 |
| 10002 | 没有找到蓝牙设备 |
| 10003 | 连接失败 |
| 10004 | 没有找到指定服务 |
| 10005 | 没有找到指定特征值 |
| 10006 | 当前连接已断开 |
| 10007 | 当前特征值不支持此操作 |
| 10008 | 其余所有系统上报的异常 |
| 10009 | Android 系统特有，系统版本低于 4.3 不支持 BLE |
| 10012 | 连接超时 |

#### uni-app

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 10001 | 蓝牙未开启 |
| 10002 | 没有找到蓝牙设备 |
| 10003 | 连接失败 |
| 10004 | 没有找到指定服务 |
| 10005 | 没有找到指定特征值 |
| 10006 | 当前连接已断开 |
| 10007 | 当前特征值不支持此操作 |
| 10008 | 其余所有系统上报的异常 |
| 10009 | 系统版本低于 4.3 不支持 BLE |
| 10012 | 连接超时 |
| 10013 | 连接 deviceId 为空或格式不正确 |

### 9.2 相关文档
- [功能规格文档](./01-functional-specs.md)
- [数据流图文档](./02-data-flow.md)
- [BLE 协议定义](./03-ble-protocol.md)
- [UI 流程文档](./04-ui-flows.md)

### 9.3 参考资源
- [uni-app 蓝牙 API](https://uniapp.dcloud.net.cn/api/system/ble.html)
- [微信小程序 BLE API](https://developers.weixin.qq.com/miniprogram/dev/api/device/ble/wx.openBluetoothAdapter.html)
- [Android 蓝牙指南](https://developer.android.com/guide/topics/connectivity/bluetooth)
- [iOS CoreBluetooth](https://developer.apple.com/documentation/corebluetooth)
