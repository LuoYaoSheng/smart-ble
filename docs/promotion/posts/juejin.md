# 掘金发布内容

## 标题
```
一款真正开源的跨平台 BLE 调试工具：8+ 种实现 + 硬件固件，全部开放！
```

---

## 正文内容

```markdown
# 一款真正开源的跨平台 BLE 调试工具：8+ 种实现 + 硬件固件，全部开放！

> 市面上的蓝牙调试工具不少，但**完全开源**的寥寥无几。
> 能跨平台的也有，但大多只是**概念验证**，代码不完整。
> 能调试的很多，但**带硬件固件**的几乎没有。

今天给大家介绍一个不一样的项目——**Smart BLE**。

![Smart BLE](https://github.com/luoyaosheng/smart-ble)

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

### 🔓 完全开源

很多号称"开源"的蓝牙工具，核心代码往往闭源，或者只是一个简化版。

**Smart BLE 不同**：

| 开源内容 | 说明 |
|---------|------|
| ✅ 前端代码 | uni-app、Flutter、Android、iOS 全部开放 |
| ✅ 桌面端代码 | Electron、Tauri、macOS 原生、Avalonia |
| ✅ 硬件固件 | ESP32 完整固件，可直接烧录使用 |
| ✅ 协议设计 | BLE 服务、数据格式、交互协议全部公开 |
| ✅ MIT 协议 | 商用无忧，可自由修改和分发 |

**没有黑盒，没有隐藏，代码即文档。**

---

### 🔌 8+ 种实现，覆盖所有主流平台

这不是一个"能跑就行"的 Demo，而是**生产级别的完整实现**：

#### 平台一：uni-app 版本 ✅

```
apps/uniapp/
├── pages/           # 页面
├── components/      # 组件
├── utils/           # BLE 封装
└── manifest.json    # 配置
```

- **技术栈**：Vue 3 + uni-ui
- **支持平台**：微信小程序、Android App、iOS App、H5
- **开发状态**：✅ 已完成，可直接使用

#### 平台二：Flutter 版本 ✅

```
apps/flutter/
├── lib/
│   ├── core/           # BLE 抽象层
│   ├── providers/      # Riverpod 状态管理
│   ├── screens/        # 页面
│   └── models/         # 数据模型
└── pubspec.yaml
```

- **技术栈**：Flutter 3.0+ + flutter_blue_plus + Riverpod
- **支持平台**：Android、iOS、macOS
- **特色功能**：支持 BLE 外设模式（手机变身蓝牙设备）
- **开发状态**：✅ 已完成，可直接使用

#### 桌面端全家桶 🎁

| 版本 | 技术栈 | 平台 | 特色 |
|------|--------|------|------|
| **Electron** | JS/Node.js + noble | Win/Mac/Linux | 功能最完整 |
| **Tauri** | Rust + btleplug | Win/Mac/Linux | 安装包仅 ~10MB |
| **macOS 原生** | Swift + AppKit | macOS 13+ | 原生体验 |
| **Avalonia** | .NET 8 + C# | Windows | .NET 生态 |

---

### 🤖 硬件固件，端到端测试

软件调试工具有很多，但**带硬件固件**的很少。

Smart BLE 项目内置 **ESP32 完整固件**：

```
hardware/esp32/
├── main/
│   ├── ble_server.cpp      # BLE 服务实现
│   ├── led_control.cpp     # LED 控制
│   └── command_handler.cpp # 命令处理
├── sdkconfig               # 配置文件
└── CMakeLists.txt
```

#### 固件功能

| 功能 | 说明 |
|------|------|
| 🔤 自定义设备名称 | 可配置广播名称 |
| 📡 LED 控制 | 常亮 / 快闪 / 慢闪 |
| 📄 JSON 数据交互 | 标准化数据格式 |
| 🔒 多权限特征值 | Read / Write / Notify |

#### 实测硬件支持

- ✅ ESP32 系列全兼容
- ✅ ESP32-C3（已测试）
- ✅ ESP32-S2/S3（理论上兼容）

#### 端到端测试流程

```
手机 App ──BLE 扫描──> 发现 ESP32 设备
    │
    ├── 连接 ──> 发现服务
    │
    ├── 写入 ──> {"cmd":"led","mode":"fast"}
    │
    └── 订阅 ──> 接收设备状态通知
```

**软件 + 硬件，一站式解决方案。**

---

## 核心功能一览

### 📱 设备端（Central 模式）

| 功能 | 描述 |
|------|------|
| 扫描设备 | 信号强度过滤、名称过滤、节流处理 |
| 连接管理 | 一键连接、自动发现服务 |
| 数据读写 | UTF-8 / HEX 双格式支持 |
| 通知订阅 | 实时接收设备数据 |
| 操作日志 | 完整记录每一步操作 |

### 📡 外设端（Peripheral 模式）

| 功能 | 描述 |
|------|------|
| BLE 广播 | 自定义名称、服务 UUID、厂商数据 |
| 模拟设备 | 手机可变身蓝牙设备，用于测试 |
| 跨平台 | Android / iOS / macOS 全支持 |

---

## 代码质量保证

### 统一抽象层

所有平台共享相同的 BLE 抽象接口：

```typescript
interface IBLEAdapter {
    // 初始化
    initialize(): Promise<void>

    // 扫描
    startScan(options?: ScanOptions): Promise<void>
    stopScan(): Promise<void>

    // 连接
    connect(deviceId: string): Promise<void>
    disconnect(deviceId: string): Promise<void>

    // 服务发现
    discoverServices(deviceId: string): Promise<Service[]>

    // 读写操作
    readCharacteristic(serviceId: string, charId: string): Promise<DataBuffer>
    writeCharacteristic(serviceId: string, charId: string, data: DataBuffer): Promise<void>

    // 通知
    setNotification(serviceId: string, charId: string, enable: boolean): Promise<void>

    // 外设模式
    startAdvertising(options: AdvertisingOptions): Promise<void>
    stopAdvertising(): Promise<void>
}
```

**学习一个平台，其他平台触类旁通。**

---

## 快速开始

### 方式一：uni-app 版本

```bash
# 克隆项目
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp

# 安装依赖
npm install

# 微信小程序
npm run dev:mp-weixin

# H5 版本
npm run dev:h5
```

### 方式二：Flutter 版本

```bash
cd smart-ble/apps/flutter
flutter pub get
flutter run
```

### 方式三：桌面端 Electron

```bash
cd smart-ble/apps/desktop/electron
npm install
npm start
```

### 方式四：ESP32 固件

```bash
cd smart-ble/hardware/esp32
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

---

## 谁适合使用？

| 用户类型 | 推荐使用方式 |
|---------|-------------|
| 蓝牙设备开发者 | 直接使用 App 作为日常调试工具 |
| 跨平台开发者 | 参考代码，移植到自己的项目 |
| 嵌入式工程师 | 使用 ESP32 固件作为开发模板 |
| 蓝牙学习者 | 阅读代码 + 烧录硬件，实践学习 |
| 企业用户 | 基于 MIT 协议进行二次开发 |

---

## 开源协议

**MIT License**

- ✅ 商业使用
- ✅ 修改和分发
- ✅ 专利使用
- ✅ 私人使用

**没有任何限制，完全自由。**

---

## 项目地址

**GitHub**: https://github.com/luoyaosheng/smart-ble
**Gitee**: https://gitee.com/luoyaosheng/lys-smart-ble/tree/refactor%2Fmulti-platform/

---

**如果觉得这个项目有帮助，请给一个 Star ⭐**

**让蓝牙开发，从此简单！**

---

*标签：#BLE #蓝牙 #调试工具 #开源 #ESP32 #Flutter #uni-app #Tauri #跨平台 #物联网*
```

---

## 发布建议

- **分类**：后端 / 前端 / 开源项目
- **标签**：`#BLE` `#蓝牙` `#开源项目` `#Flutter` `#uni-app` `#ESP32` `#物联网`
- **发布时间**：工作日 10:00 或 20:00
- **封面图**：准备一张项目架构图或 Logo
