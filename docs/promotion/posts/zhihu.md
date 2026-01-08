# 知乎发布内容

## 标题选项

1. 《一款真正开源的跨平台 BLE 调试工具：8+ 种实现 + 硬件固件》
2. 《我开源了一个蓝牙调试工具，支持 8+ 种平台实现》
3. 《Smart BLE：可能是最全的开源跨平台蓝牙调试工具》

---

## 正文内容

```markdown
# 一款真正开源的跨平台 BLE 调试工具：8+ 种实现 + 硬件固件，全部开放！

## 前言

市面上的蓝牙调试工具不少，但**完全开源**的寥寥无几。

能跨平台的也有，但大多只是**概念验证**，代码不完整。

能调试的很多，但**带硬件固件**的几乎没有。

今天给大家介绍一个不一样的项目——**Smart BLE**。

---

## 为什么要做这个项目？

作为一名蓝牙开发者，我深深体会到：

1. **工具割裂**：每个平台都要用不同的工具，体验不一致
2. **代码分散**：网上代码片段很多，但完整的跨平台实现很少
3. **硬件脱节**：软件工具和硬件开发往往分离，缺乏端到端方案
4. **学习成本**：新人入门蓝牙开发，门槛太高

所以我决定做一个**真正开源、真正完整**的蓝牙调试工具。

---

## 三大核心卖点

### 完全开源

很多号称"开源"的蓝牙工具，核心代码往往闭源。

**Smart BLE 不同**：

| 开源内容 | 说明 |
|---------|------|
| ✅ 前端代码 | uni-app、Flutter、Android、iOS 全部开放 |
| ✅ 桌面端代码 | Electron、Tauri、macOS 原生、Avalonia |
| ✅ 硬件固件 | ESP32 完整固件，可直接烧录使用 |
| ✅ 协议设计 | BLE 服务、数据格式、交互协议全部公开 |
| ✅ MIT 协议 | 商用无忧，可自由修改和分发 |

---

### 8+ 种实现，覆盖所有主流平台

| 平台 | 技术栈 | 状态 |
|------|--------|------|
| uni-app | Vue 3 | ✅ 已完成 |
| Flutter | flutter_blue_plus | ✅ 已完成 |
| Electron | noble | ✅ 已完成 |
| Tauri | Rust + btleplug | ✅ 已完成 |
| macOS 原生 | AppKit | ✅ 已完成 |
| Avalonia | .NET 8 | ✅ 已完成 |

---

### 硬件固件，端到端测试

Smart BLE 项目内置 **ESP32 完整固件**：

- 自定义设备名称
- LED 控制（常亮/快闪/慢闪）
- JSON 格式数据交互
- 多权限特征值演示

**软件 + 硬件，一站式解决方案。**

---

## 核心功能

### 设备端（Central 模式）

- 设备扫描（信号强度过滤、名称过滤）
- 连接管理（服务发现、特征值读写）
- 通知订阅（实时数据监控）
- 操作日志

### 外设端（Peripheral 模式）

- BLE 广播（自定义名称、UUID）
- 手机变身蓝牙设备，用于测试

---

## 快速开始

### uni-app 版本

```bash
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin
```

### Flutter 版本

```bash
cd smart-ble/apps/flutter
flutter pub get
flutter run
```

### ESP32 固件

```bash
cd smart-ble/hardware/esp32
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

---

## 适用场景

| 用户类型 | 推荐使用方式 |
|---------|-------------|
| 蓝牙设备开发者 | 直接使用 App 作为日常调试工具 |
| 跨平台开发者 | 参考代码，移植到自己的项目 |
| 嵌入式工程师 | 使用 ESP32 固件作为开发模板 |
| 蓝牙学习者 | 阅读代码 + 烧录硬件，实践学习 |

---

## 开源协议

**MIT License** —— 商业使用、修改和分发、私人使用，没有任何限制。

---

## 项目地址

**GitHub**: https://github.com/luoyaosheng/smart-ble
**Gitee**: https://gitee.com/luoyaosheng/smart-ble/tree/refactor%2Fmulti-platform/

---

**如果觉得有帮助，请给一个 Star ⭐**

**让蓝牙开发，从此简单！**
```

---

## 发布建议

- **圈子/话题**：开源项目、嵌入式开发、Flutter、物联网
- **发布时间**：周末上午 9:00-11:00
- **配图**：项目截图、架构图
- **后续互动**：及时回复评论和私信
