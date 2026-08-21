# Smart BLE Start Here

> 给第一次体验 `BLE Toolkit+` 和第一次进入 `Smart BLE` 仓库的人。

---

## 先记住这三个名字

- `Smart BLE`：总项目名，也是当前唯一主入口名
- `BLE Toolkit+`：微信小程序当前对外名称
- `LightBLE`：历史命名和旧仓库线

如果你第一次进入这个项目，先把这三个名字记住，再继续往下看。

---

## 最推荐的进入顺序

1. 先体验 `BLE Toolkit+`
2. 再看 [快速入门教程](./tutorials/01_introduction_and_setup.md)
3. 再看 [平台选择指南](./PLATFORM_SELECTION.md)
4. 再看 [BLE FAQ](./BLE_FAQ.md)
5. 最后再进入 [进阶与广播指引](./tutorials/02_advanced_usage_and_broadcast.md) 和更底层的架构文档

这个顺序比“一上来先读所有源码和所有实现”更适合第一次进入。

---

## 你现在最可能要的入口

### 我只想最快体验一下

- 先去项目站：`https://lightble.i2kai.com/`
- 或直接回到站点首页继续看：[Smart BLE 首页](/)

### 我想先学 BLE 的四个基本动作

先看：

- [快速入门教程](./tutorials/01_introduction_and_setup.md)

先把这 4 个动作跑通：

1. 扫描设备
2. 连接设备
3. 查看服务和特征值
4. 读写特征值

### 我想知道不同实现怎么选

先看：

- [平台选择指南](./PLATFORM_SELECTION.md)

### 我想继续深入广播、外设模式和更复杂玩法

再看：

- [进阶与广播指引](./tutorials/02_advanced_usage_and_broadcast.md)
- [MASTER ARCHITECTURE](./MASTER_ARCHITECTURE.md)

---

## 按目标选平台

- 想最快体验：`apps/uniapp/`
- 想学跨平台移动：`apps/flutter/`
- 想学原生 Android：`apps/android/`
- 想学原生 iOS / macOS：`apps/ios/`
- 想看轻量桌面版：`apps/desktop/tauri/`
- 想看全功能桌面版：`apps/desktop/electron/`
- 想看硬件联动：`hardware/esp32/`

如果你是第一次进入，不建议一上来同时对比所有实现。

---

## 第一次进入时不要先做什么

- 不要先读完整个 `MASTER ARCHITECTURE`
- 不要先决定长期技术栈
- 不要一上来同时比较所有平台实现
- 不要先钻进历史命名和旧仓库

先跑通一次真实体验，再回来看实现差异，会更容易建立判断。

---

## 下一步继续看

- [平台选择指南](./PLATFORM_SELECTION.md)
- [BLE FAQ](./BLE_FAQ.md)
- [快速入门教程](./tutorials/01_introduction_and_setup.md)
- [进阶与广播指引](./tutorials/02_advanced_usage_and_broadcast.md)
