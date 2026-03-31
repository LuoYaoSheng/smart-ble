# 项目故事：为什么我要做 Smart BLE？

## 标题
```
项目故事：为什么我要花半年时间，做一款开源的蓝牙调试工具？
```

---

## 正文内容

```markdown
# 项目故事：为什么我要花半年时间，做一款开源的蓝牙调试工具？

## 起源

2024 年初，我接手了一个 IoT 项目，需要开发一个蓝牙设备控制的 App。

本以为很简单，结果踩了一堆坑...

---

## 一、踩坑历程

### 1.1 工具之痛

**微信小程序开发**

我先用微信小程序开发，用官方的 BLE API：

```javascript
// 扫描
wx.startBluetoothDevicesDiscovery({
  success: () => {
    // 开始扫描
  }
})

// 但 iOS 和 Android 表现不一致！
```

问题来了：
- iOS 扫描不到某些设备
- Android 某些机型连接失败
- H5 根本不支持蓝牙

**Android 原生开发**

没办法，又用 Android 原生重写：

```kotlin
// 扫描
val bluetoothAdapter = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
bluetoothAdapter.adapter.bluetoothLeScanner.startScan(scanCallback)

// 又是不同的 API...
```

**iOS 原生开发**

iOS 也要单独写：

```swift
// Central Manager
let centralManager = CBCentralManager(delegate: self, queue: nil)
centralManager.scanForPeripherals(withServices: nil)
```

**桌面端调试**

想在电脑上调试，又发现：
- Windows 没好用的免费工具
- Mac 只能用 LightBlue（收费）
- Linux 没有图形界面工具

### 1.2 开源代码之殇

于是我搜索开源项目，希望找到参考代码。

结果发现：

| 问题 | 描述 |
|------|------|
| 代码不完整 | 很多只实现了扫描，没有读写 |
| 只支持单一平台 | Flutter 的不能用 Vue 参考代码 |
| 文档缺失 | 代码注释很少，不知道怎么用 |
| 不维护 | 很多项目几年没更新了 |

### 1.3 硬件脱节

软件有了，但硬件呢？

- ESP32 示例代码分散在各处
- 没有端到端的完整方案
- 协议定义不统一

---

## 二、想法诞生

痛定思痛，我决定：

**做一个真正完整、真正开源的蓝牙调试工具！**

目标很明确：

1. **多平台** - 覆盖所有主流平台
2. **完全开源** - 代码、固件、协议全部公开
3. **端到端** - 软件 + 硬件一站式
4. **教学友好** - 文档齐全，代码注释详细

---

## 三、架构设计

### 3.1 核心思路

```
┌─────────────────────────────────────────┐
│          业务逻辑层 (统一)               │
├─────────────────────────────────────────┤
│          BLE 抽象层                      │
├─────────┬─────────┬─────────┬───────────┤
│ uni-app │ Flutter │ Electron │  ...    │
│   实现  │  实现   │   实现   │         │
└─────────┴─────────┴─────────┴───────────┘
```

核心是 **BLE 抽象层**：
- 统一的接口定义
- 各平台分别实现
- 业务逻辑只写一次

### 3.2 平台选择

**移动端**
- uni-app：小程序 + App + H5 一套代码
- Flutter：原生体验，适合专业开发

**桌面端**
- Electron：JavaScript 全家桶
- Tauri：Rust 高性能
- macOS Native：原生体验
- Avalonia：.NET 生态

**硬件**
- ESP32：最流行的 IoT 芯片
- 完整固件，开箱即用

---

## 四、开发历程

### 第一阶段：uni-app 版本（2 周）

- [x] 基础扫描功能
- [x] 连接管理
- [x] 特征值读写
- [x] 通知订阅
- [x] 操作日志

**挑战**：微信小程序和 App 的差异处理

**解决**：封装统一 API，平台差异下沉

### 第二阶段：Flutter 版本（3 周）

- [x] 使用 flutter_blue_plus
- [x] Riverpod 状态管理
- [x] 支持 BLE 外设模式

**挑战**：Flutter 和 uni-app 的 API 差异

**解决**：抽象层设计

### 第三阶段：桌面端（4 周）

- [x] Electron + noble
- [x] Tauri + btleplug
- [x] macOS Native + AppKit

**挑战**：不同操作系统的蓝牙 API 差异

**解决**：使用跨平台库 + 原生适配

### 第四阶段：硬件固件（2 周）

- [x] ESP32 服务设计
- [x] LED 控制实现
- [x] JSON 协议支持
- [x] 多权限特征值

**挑战**：硬件资源限制

**解决**：精简设计，专注核心功能

### 第五阶段：文档和优化（3 周）

- [x] 5 篇核心文档
- [x] 代码注释完善
- [x] 示例代码
- [x] 测试和修复

---

## 五、技术难点

### 5.1 平台差异

**扫描逻辑差异**

```typescript
// 微信小程序：需要手动停止
wx.startBluetoothDevicesDiscovery()
setTimeout(() => wx.stopBluetoothDevicesDiscovery(), 5000)

// Flutter：可以设置超时
await flutterBluePlus.startScan(timeout: Duration(seconds: 5))
```

**解决**：抽象层统一超时处理

### 5.2 数据格式

不同平台对蓝牙数据的处理方式不同：

```typescript
// 微信小程序：ArrayBuffer
wx.writeBLECharacteristicValue({
  value: new ArrayBuffer([0xFF, 0x01])
})

// Flutter：Uint8List
await characteristic.write([0xFF, 0x01]);
```

**解决**：定义统一的 DataBuffer 类型

### 5.3 状态管理

不同框架的状态管理方式差异大：

- Vue 3：Composition API
- Flutter：Riverpod
- React：Hooks / Redux

**解决**：设计平台无关的状态模型

---

## 六、开源的意义

### 6.1 技术价值

- 跨平台 BLE 开发的最佳实践
- 完整的抽象层设计参考
- 真实可用的硬件固件

### 6.2 教学价值

- 从零到一的完整项目
- 详细的代码注释
- 系列技术文档

### 6.3 社区价值

- 填补开源空白
- 降低开发门槛
- 促进知识分享

---

## 七、未来计划

### 短期（3 个月）

- [ ] Bug 修复和优化
- [ ] OTA 升级功能
- [ ] 多设备同时连接
- [ ] 数据记录和回放

### 中期（6 个月）

- [ ] 数据可视化
- [ ] 脚本自动化测试
- [ ] 插件系统
- [ ] Web Bluetooth 版本

### 长期（1 年）

- [ ] 云端设备配置同步
- [ ] 社区设备库
- [ ] 更多平台支持
- [ ] 企业版功能

---

## 八、给开发者的建议

### 如果你想做跨平台项目

1. **先设计抽象层** - 不要一开始就写具体实现
2. **选择合适的平台** - 不要贪多，选主流的
3. **文档先行** - 代码容易写，文档难写

### 如果你想做开源项目

1. **解决真实问题** - 不要为了开源而开源
2. **代码质量第一** - 代码本身就是最好的文档
3. **持续维护** - 发布只是开始

---

## 九、写在最后

Smart BLE 不是为了重复造轮子，而是：

1. **填补空白** - 真正完整的跨平台 BLE 工具
2. **降低门槛** - 让蓝牙开发更简单
3. **服务社区** - 分享我的实践和经验

如果你觉得这个项目有帮助：

- ⭐ 给个 Star
- 🍴 Fork 代码
- 📢 分享给朋友
- 💬 提 Issue 和 PR

---

## 项目地址

- **GitHub**: https://github.com/luoyaosheng/smart-ble
- **Gitee**: https://gitee.com/luoyaosheng/lys-smart-ble/tree/refactor%2Fmulti-platform/

---

*让蓝牙开发，从此简单！*

*标签：#开源 #项目故事 #BLE #蓝牙 #跨平台*
```
