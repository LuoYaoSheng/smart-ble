# 微信小程序 BLE 开发避坑与最佳实践指南

> 版本：v1.0
> 更新日期：2026-04
> 项目：Smart BLE - 跨平台蓝牙调试工具

微信小程序作为轻量级应用的重要入口，拥有极高的普及率。但在进行低功耗蓝牙（BLE）开发时，因为底层架构、权限控制机制及宿主（WeChat）生命周期的影响，经常会遇到各类疑难与“坑点”。

本文档汇总了 `Smart BLE` 在将系统打通至微信小程序端时所遇到的核心痛点，并提供了对应的解决方案和最佳实践。

---

## 1. 权限墙：扫描设备必须绑定“定位权限”

**坑点表现：**
只申请 `scope.bluetooth` 权限并在系统设置中心开启蓝牙后，调用 `wx.startBluetoothDevicesDiscovery` 依然搜不到任何设备，回调一直静默。

**避坑原理与方案：**
在 Android 系统中（以及微信小程序的封装特性中），蓝牙扫描被视为可以推算出用户地理位置的高危操作。因此，**必须同时申请蓝牙权限和定位权限**，缺一不可。

*实践代码* (`Smart BLE` 实际应用逻辑)：
```javascript
// 权限拦截层验证
wx.getSetting({
  success: (res) => {
    // 1. 验证并请求蓝牙
    if (!res.authSetting['scope.bluetooth']) {
      wx.authorize({ scope: 'scope.bluetooth' })
    }
    // 2. 无定位于静默扫描无果，必须请求地理位置定位！
    if (!res.authSetting['scope.userLocation']) {
      wx.authorize({ scope: 'scope.userLocation' })
    }
  }
})
```

---

## 2. UI 适配墙：自定义标题栏与“胶囊按钮”的重叠碰撞

**坑点表现：**
当我们在 `pages.json` 将 `navigationStyle` 改为 `custom` 后，由于各路刘海屏、灵动岛的介入，单纯依靠 `uni.getSystemInfoSync().statusBarHeight` 并不能计算出完整的标题栏下沿，导致自写的返回按钮和标题会和微信小程序自带的“胶囊按钮（更多/关闭）”发生惨烈重叠或高度错位。

**避坑原理与方案：**
必须使用仅在微信环境特有的 API `wx.getMenuButtonBoundingClientRect()`，精准计算出胶囊的坐标系，再结合系统状态栏反推所需的动态高度。

*实践代码* (`Smart BLE` 采用方案)：
```javascript
// #ifdef MP-WEIXIN
const sysInfo = uni.getSystemInfoSync();
const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
// 动态算出导航栏最终安全覆盖高度: (胶囊top - 状态栏高度)*2 + 胶囊自身高度
this.navBarHeight = (menuButtonInfo.top - sysInfo.statusBarHeight) * 2 + menuButtonInfo.height;
// #endif
```

---

## 3. BLE 广播墙：苛刻的 31 字节与 UUID 规范

**坑点表现：**
利用小程序的 `wx.createBLEPeripheralServer` 进行外设模拟（广播模式）时，常常收到参数无效错误，或广播启动成功但 Android/iOS 其他设备就是扫描不到。

**避坑原理与方案：**
- **长度拦截：** 传统 BLE 广播数据包最大只能承载 31 Bytes，包含设备名、Flag 及服务 UUID。若名字过长，会挤压 UUID 导致广播包畸形直接被宿主干掉。
- **UUID 约束：** 微信在 Android 宿主执行广播时，必须使用合规的 128 位完整 UUID 或被蓝牙 SIG 规范认可的短 UUID (如 `FFE0`)。乱写非标 UUID 会直接返回失败。

*实践代码*：
在 `Smart BLE` 广播页发送前进行严格切割和校验拦截：
```javascript
// 名字硬截断保护
const safeName = deviceName.length > 8 ? deviceName.substring(0, 8) : deviceName;

// UUID 前置校验
const isValid128 = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(serviceUUID);
const isValid16 = /^[0-9a-fA-F]{4}$/.test(serviceUUID); // 如 FFE0
if (!isValid128 && !isValid16) {
    uni.showToast({ title: '广播失败，必须遵循规范 UUID', icon: 'none'});
}
```

---

## 4. 特征值写入墙：隐式要求明确且强校验 `writeType`

**坑点表现：**
使用 `uni.writeBLECharacteristicValue` 向外设写入数据时，在部分安卓机或 iOS 微信里抛出 `10007 (property not support)` 或直接无响应，但此设备在原生 App 里明明写入通畅。

**避坑原理与方案：**
微信小程序对于蓝牙协议库的桥接十分严格，在做底层转发时不会去聪明地“猜”你是想 write 还是 writeWithoutResponse。因此即便设备的 descriptor 支持写入，你也必须按照开发者文档在对象里**强行指明**具体动作。

*实践代码*：
```javascript
uni.writeBLECharacteristicValue({
    deviceId: this.deviceInfo.deviceId,
    serviceId: serviceId,
    characteristicId: characteristicId,
    value: buffer,
    // 坑点解除：极其关键的一行！强制向微信声明当前类型
    writeType: 'write' // 或 'writeNoResponse'
});
```

---

## 5. 吞吐墙：并发扫描节流与 OTA 固件传输的 MTU 协商包大小隐患

**坑点表现：**
- 开启寻迹扫描时，小程序进程卡顿、UI无响应。（因为 `onBluetoothDeviceFound` 每秒抛出上百次广播）。
- 向设备写入大量数据（如 OTA 固件更新）时，在超过 20 字节的地方直接截断报错。

**避坑方案：**
1. **缓存与节流：** 用数组缓存上报设备，并通过 `throttle` 降低对 Vue/React 视图层的数据推入速率。
2. **强制分包与协商：** 小程序默认 MTU 极小（20 Bytes），必须主动发起 `wx.setBLEMTU({ mtu: 512 })` 协商。如果老旧设备不支持协商，则必须使用 `ArrayBuffer` 的 `slice()` 将包体拆分为 `20 Byte` 依次循环排队延时发送。

> 在 `Smart BLE` 中，我们为核心的 BLE 解析与 OTA 下发建立了一整套队列控制与防串扰策略，详见代码逻辑实现。
