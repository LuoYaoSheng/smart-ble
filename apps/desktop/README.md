# SmartBLE Desktop

Smart BLE 调试工具的桌面端实现，支持多个技术栈。

## 可用版本

| 版本 | 技术栈 | 平台 | 状态 | 推荐场景 |
|------|--------|------|------|----------|
| **Electron** | JavaScript/Node.js | Windows/macOS/Linux | ✅ 完整 | 快速开发、跨平台 |
| **Tauri** | Rust + Web | Windows/macOS/Linux | ✅ 完整 | 轻量级、高性能 |
| **macOS Native** | Swift + AppKit | macOS 13+ | ✅ 新增 | macOS 原生体验 |
| **Avalonia** | .NET 8 + C# | Windows (优先) | 🚧 部分实现 | Windows 原型验证 |

---

## 版本对比

### Electron 版本

**优点:**
- 开发速度快，使用熟悉的 Web 技术
- 功能完整，支持广播模式（Linux）
- 跨平台一致性好

**缺点:**
- 安装包大（~100MB+）
- 内存占用较高

**技术栈:** Electron 27 + noble

**运行:**
```bash
cd apps/desktop/electron
npm install
npm start
```

---

### Tauri 版本

**优点:**
- 安装包小（~10MB）
- 内存占用低
- 性能优秀
- Rust 后端安全可靠

**缺点:**
- 不支持广播模式（btleplug 限制）
- 开发环境配置稍复杂

**技术栈:** Tauri 1.5 + Rust + btleplug

**运行:**
```bash
cd apps/desktop/tauri
cargo install tauri-cli
cargo tauri dev
```

**详见:** [Tauri README](./tauri/README.md)

---

### macOS 原生版本

**优点:**
- 原生 macOS 体验
- 与系统集成好
- 轻量级
- 使用 AppKit 避免 SwiftUI 输入框问题

**缺点:**
- 仅支持 macOS 13+
- 不支持其他平台

**技术栈:** Swift 5.9 + AppKit + CoreBluetooth

**运行:**
```bash
cd apps/desktop/macos/SmartBLE-mac
swift build
swift run
```

**详见:** [macOS README](./macos/SmartBLE-mac/README.md)

---

### Avalonia (.NET) 版本

**优点:**
- .NET 生态
- Windows 优先设计

**缺点:**
- 当前仍是原型，特征值读写和通知流程未完成

**技术栈:** .NET 8 + Avalonia UI 11

**运行:**
```bash
cd apps/desktop/avalonia/SmartBLE.Desktop
dotnet restore
dotnet run
```

---

## 功能对比

| 功能 | Electron | Tauri | macOS Native | Avalonia |
|------|----------|-------|--------------|----------|
| 蓝牙扫描 | ✅ | ✅ | ✅ | ✅ |
| 设备连接 | ✅ | ✅ | ✅ | ✅ |
| 服务发现 | ✅ | ✅ | ✅ | ✅ |
| 特征值读取 | ✅ | ✅ | ✅ | ⏳ |
| 特征值写入 | ✅ | ✅ | ✅ | ⏳ |
| 通知订阅 | ✅ | ✅ | ✅ | ⏳ |
| 广播模式 | ✅ (Linux) | ❌ | ✅ | ❌ |
| 操作日志 | ✅ | ✅ | ✅ | ✅ |

---

## 平台支持

### Windows

推荐版本: **Electron** 或 **Tauri**

- Avalonia: 当前更适合作为原型参考，不建议作为默认发行版本
- Electron: 使用 noble-uwp，兼容性好
- Tauri: 轻量级选择

### macOS

推荐版本: **macOS Native** 或 **Tauri**

- macOS Native: 原生体验，使用 AppKit
- Tauri: 轻量级，性能好
- Electron: 功能完整

### Linux

推荐版本: **Electron** 或 **Tauri**

- Electron: 支持广播模式（需要 bleno）
- Tauri: 需要 bluez 库

```bash
# 安装 bluez
sudo apt-get install bluez
# 启动蓝牙服务
sudo systemctl start bluetooth
```

---

## 开发说明

### 权限要求

**macOS:**
- 需要在 `Info.plist` 中声明蓝牙权限
- 首次运行会提示授权

**Windows 10/11:**
- 需要启用蓝牙功能
- 可能需要管理员权限

**Linux:**
- 需要安装 bluez
- 需要蓝牙服务运行
- 可能需要将用户加入 bluetooth 组

### BLE 库选择

| 平台 | 推荐库 |
|------|--------|
| Windows | noble-uwp / WindowsBluetooth / btleplug |
| macOS | @abandonware/noble / CoreBluetooth / btleplug |
| Linux | @abandonware/noble / bluez / btleplug |

---

## 项目结构

```
apps/desktop/
├── electron/           # Electron 版本
│   ├── src/           # 源代码
│   ├── public/        # 前端资源
│   └── package.json
├── tauri/             # Tauri 版本
│   ├── src/           # 前端
│   ├── src-tauri/     # Rust 后端
│   └── Cargo.toml
├── macos/             # macOS 原生版本
│   └── SmartBLE-mac/
│       ├── Sources/   # Swift 源代码
│       ├── Package.swift
│       └── Info.plist
├── avalonia/          # Avalonia (.NET) 版本
│   └── SmartBLE.Desktop/
├── windows/           # Windows 原生方案占位（README）
├── linux/             # Linux 原生方案占位（README）
└── README.md
```

---

## 构建打包

### Electron

```bash
cd apps/desktop/electron
npm run build        # 当前平台
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### Tauri

```bash
cd apps/desktop/tauri
cargo tauri build
```

### macOS Native

```bash
cd apps/desktop/macos/SmartBLE-mac
swift build -c release
```

---

## 常见问题

### Q: macOS 上提示 "未授权蓝牙访问"
A: 在系统设置中允许蓝牙访问，或重新安装应用

### Q: Linux 上扫描不到设备
A: 确保 bluetooth 服务运行，并检查权限

### Q: Tauri 构建失败
A: 确保 Rust 和系统依赖已安装

---

## License

MIT
