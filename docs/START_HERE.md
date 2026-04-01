# Smart BLE Start Here

> 给第一次看到 `Smart BLE` 的学习者
> 如果你还不知道先体验什么、先读什么、先看哪个实现，就从这里开始。

---

## 先记住这三个名字

- `Smart BLE`：总项目名，也是主入口名
- `BLE Toolkit+`：微信小程序当前对外显示名
- `LightBLE`：历史命名和旧仓库线

如果你只记一个名字，请记：

> `Smart BLE`

---

## 推荐学习顺序

### 1. 先体验

最适合第一次进入的入口是：

- `BLE Toolkit+（Smart BLE 小程序版）`

先体验的目标不是把所有功能学会，而是先知道这个项目到底在解决什么问题：

- BLE 扫描
- 设备连接
- 服务和特征值查看
- 读写与通知

### 2. 再看快速入门

建议下一步看：

- [5 分钟快速入门](./promotion/articles/005-5分钟快速入门.md)

### 3. 再看项目故事和平台对比

如果你想知道为什么这个仓库会保留这么多实现，再继续看：

- [项目故事：为什么我要做 Smart BLE？](./promotion/articles/003-项目故事为什么做SmartBLE.md)
- [平台选择指南](./PLATFORM_SELECTION.md)
- [BLE FAQ](./BLE_FAQ.md)
- [8 种平台对比评测](./promotion/articles/004-8种平台对比评测.md)

### 4. 最后回到仓库和实现

当你已经知道问题和入口之后，再回到仓库选实现：

- 小程序 / uni-app：[`../apps/uniapp/`](../apps/uniapp/)
- 跨平台移动：[`../apps/flutter/`](../apps/flutter/)
- Android 原生：[`../apps/android/`](../apps/android/)
- iOS / macOS 原生：[`../apps/ios/`](../apps/ios/)
- 轻量桌面：[`../apps/desktop/tauri/`](../apps/desktop/tauri/)
- 硬件示例：[`../hardware/esp32/`](../hardware/esp32/)

---

## 你应该从哪条线开始

### 只想先学 BLE 基础

先看：

- 小程序体验
- 5 分钟快速入门
- BLE FAQ

### 想对比不同平台实现

先看：

- 平台对比文档
- 各平台 README

### 想看硬件联动

先看：

- `hardware/esp32/`
- 协议和数据流文档

---

## 下一步

建议继续进入：

- [功能规格](./01-functional-specs.md)
- [数据流图](./02-data-flow.md)
- [BLE 协议](./03-ble-protocol.md)
- [平台选择指南](./PLATFORM_SELECTION.md)
- [BLE FAQ](./BLE_FAQ.md)
- [平台差异](./05-platform-differences.md)
