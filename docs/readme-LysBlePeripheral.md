# LysBlePeripheral

一个支持 Android 和 iOS 的 BLE 广播插件。

## 功能特点

- 支持 Android 和 iOS 平台
- 提供统一的接口
- 支持自定义广播数据
- 支持设置广播参数
- 支持状态监控
- 无需权限检查，直接操作BLE广播
- 支持多次启停广播，不会出现丢失问题（v1.0.4新增）

## 安装说明

1. 将插件添加到项目中
2. 在 `manifest.json` 中配置插件：
```json
{
    "plugins": {
        "LysBlePeripheral": {
            "version": "1.0.4"
        }
    }
}
```

## 权限配置

虽然1.0.3+版本已移除权限检查逻辑，但您仍需在清单文件中声明权限，以确保高版本Android系统中的正常运行。

### Android
在 `AndroidManifest.xml` 中添加以下权限：
```xml
<!-- Android 12 及以上 -->
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- Android 12 以下 -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### iOS
在 `Info.plist` 中添加以下描述：
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>需要使用蓝牙来发送广播数据</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>需要使用蓝牙来发送广播数据</string>
```

## API 说明

所有方法均为异步方法，通过回调返回结果。

### isSupported(callback)
检查设备是否支持 BLE 广播。

**回调参数：**
```javascript
{
    code: 0,            // 0: 成功，其他: 失败
    supported: true,    // true: 支持，false: 不支持
    message: "success"  // 结果描述
}
```

### isAdvertising(callback)
检查当前是否正在广播。

**回调参数：**
```javascript
{
    code: 0,             // 0: 成功，其他: 失败
    advertising: true,   // true: 正在广播，false: 未广播
    message: "success"   // 结果描述
}
```

### startAdvertising(options, callback)
开始广播。如果已有广播在运行，会先自动停止当前广播，然后再启动新的广播。

**参数说明：**
```javascript
// Android 参数
{
    settings: {
        advertiseMode: 2,      // 广播模式：0-低功耗，1-平衡，2-低延迟
        txPowerLevel: 3,       // 发射功率：0-超低，1-低，2-中，3-高
        connectable: true      // 是否可连接
    },
    advertiseData: {
        includeDeviceName: false,          // 是否包含设备名称（建议设为false，设备名称会占用大量空间）
        manufacturerId: 0x0001,            // 厂商ID
        manufacturerData: "Hello World",   // 广播数据（不超过20字节）
        serviceUuid: "1234"                // 服务UUID（可选）
    }
}

// iOS 参数
{
    localName: "MyDevice",              // 本地名称
    services: ["180D"],                 // 服务UUID列表
    manufacturerData: {
        id: 0x0001,                     // 厂商ID
        data: "Hello World"             // 广播数据
    }
}
```

> **⚠️ 重要提示：** 
> 1. BLE广播数据有严格的大小限制，整个广播包不能超过31字节
> 2. 包含设备名称会占用大量空间，建议设置 `includeDeviceName: false`
> 3. 厂商数据请控制在20字节以内
> 4. 服务UUID也会占用空间，请谨慎使用

**回调参数：**
```javascript
{
    code: 0,            // 0: 成功，其他: 失败
    message: "success"  // 结果描述
}
```

### stopAdvertising(callback)
停止广播。即使当前没有广播在运行，调用此方法也是安全的。

**回调参数：**
```javascript
{
    code: 0,            // 0: 成功，其他: 失败
    message: "success"  // 结果描述
}
```

## 错误码说明

- 0: 成功
- -1: 设备不支持
- -4: 系统错误
- -5: 蓝牙未开启

### 广播错误详细解释
当 `startAdvertising` 失败时，可能会返回以下详细错误信息：

- 广播数据过大（错误码1）：广播数据包超出了31字节的限制
- 广播器数量过多（错误码2）：同时使用了太多广播实例
- 广播已经启动（错误码3）：当前已有一个广播正在运行
- 内部错误（错误码4）：蓝牙栈内部错误
- 设备不支持此功能（错误码5）：设备不完全支持BLE广播功能

## 使用示例

### 基本使用
```vue
<template>
  <view>
    <button @click="checkSupport">检查支持</button>
    <button @click="startAd">开始广播</button>
    <button @click="checkStatus">检查状态</button>
    <button @click="stopAd">停止广播</button>
  </view>
</template>

<script>
const bleModule = uni.requireNativePlugin('LysBlePeripheral')

export default {
  methods: {
    // 检查支持
    checkSupport() {
      bleModule.isSupported((result) => {
        console.log('支持状态：', result)
      })
    },
    
    // 开始广播
    startAd() {
      const options = {
        settings: {
          advertiseMode: 2,
          txPowerLevel: 3,
          connectable: true
        },
        advertiseData: {
          includeDeviceName: false, // 不包含设备名称，节省空间
          manufacturerId: 0x0001,
          manufacturerData: "Hello" // 保持数据简短
        }
      }
      
      bleModule.startAdvertising(options, (result) => {
        console.log('启动结果：', result)
      })
    },
    
    // 检查状态
    checkStatus() {
      bleModule.isAdvertising((result) => {
        console.log('广播状态：', result)
      })
    },
    
    // 停止广播
    stopAd() {
      bleModule.stopAdvertising((result) => {
        console.log('停止结果：', result)
      })
    }
  }
}
</script>
```

## 最佳实践

1. **广播数据优化：**
   - 不要包含设备名称（`includeDeviceName: false`）
   - 保持厂商数据简短，不超过20字节
   - 避免同时使用多个数据类型（如服务UUID和厂商数据）

2. **系统兼容性：**
   - 低端设备可能不支持BLE广播，使用前先调用`isSupported`检查
   - 在不同 Android 版本上都能正常工作，无需进行权限检查

3. **广播资源管理：**
   - 停止广播后再次启动时，无需担心资源释放问题，插件会自动处理
   - 即使无法检测到是否有广播正在运行，也可以放心调用`stopAdvertising`和`startAdvertising`
   - 页面关闭时记得调用`stopAdvertising`停止广播
   - 在`onLoad`时检查设备支持情况，在`onUnload`时释放资源

4. **稳定性建议：**
   - 如果需要更改广播内容，建议先停止当前广播，然后再启动新的广播
   - 广播参数变更频繁时，在启动前增加短暂延时（100-200ms）可能有助于提高稳定性
   - 如果出现广播检测不到的情况，可以尝试停止广播后等待200ms再重新启动

## 注意事项

1. Android 需要在清单中声明蓝牙权限，但插件内部不再检查权限
2. iOS 需要在真机上测试
3. 部分 Android 设备可能不支持 BLE 广播功能
4. 建议在使用前先调用 `isSupported()` 检查设备支持情况
5. 使用前确保蓝牙已开启
6. 页面关闭时记得调用 `stopAdvertising()` 停止广播
7. 广播数据有严格的大小限制，请避免使用过大的数据包
8. 多次启停广播时不再需要额外处理资源释放，插件会自动管理（v1.0.4+）

## 更新日志

### 1.0.4
- 修复重复启停广播后广播信号丢失的问题
- 完善资源释放机制，确保多次广播可被稳定搜索到
- 增强广播启动前的清理工作，防止资源泄漏
- 改进停止广播的可靠性，无论当前状态如何都能正确停止
- 添加更详细的日志，便于调试和问题排查

### 1.0.3
- 彻底移除权限检查逻辑，解决Android上因权限检查导致的广播失败问题
- 修复onActivityDestroy方法中的条件判断错误
- 优化错误处理
- 简化代码结构
- 改进示例代码，更符合实际使用场景

### 1.0.2
- 添加跳过权限检查选项
- 改进对 Android 权限问题的处理
- 优化错误信息展示

### 1.0.1
- 优化广播数据处理，解决数据过大问题
- 添加更详细的错误信息
- 改进Android 12+权限处理
- 统一Android和iOS接口为异步调用
- 优化错误处理
- 完善文档说明

### 1.0.0
- 初始版本
- 支持Android和iOS
- 实现基本的广播功能 