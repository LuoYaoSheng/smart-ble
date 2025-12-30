# SmartBLE Desktop

Smart BLE 调试工具的桌面端实现，支持多个技术栈。

## 可用版本

| 版本 | 技术栈 | 平台 | 状态 |
|------|--------|------|------|
| **Electron** | JavaScript/Node.js | Windows/macOS/Linux | ✅ |
| **Tauri** | Rust + Web | Windows/macOS/Linux | ✅ |
| **Avalonia** | .NET 8 + C# | Windows (优先) | ✅ |

---

## Electron 版本

基于 Electron 的跨平台桌面应用，使用原生 Node.js BLE 库。

### 技术栈
- Electron 27
- noble / noble-uwp (BLE)
- HTML + CSS + Vanilla JavaScript

### 安装和运行

```bash
cd apps/desktop/electron
npm install
npm start
```

### 打包

```bash
npm run build        # 当前平台
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

---

## Tauri 版本

基于 Rust 的轻量级跨平台桌面应用，使用 Web 技术构建 UI。

### 技术栈
- Tauri 1.5
- Rust
- btleplug (BLE)

### 安装和运行

```bash
cd apps/desktop/tauri/src-tauri
cargo build
cargo run
```

### 打包

```bash
cargo tauri build
```

---

## Avalonia (.NET) 版本

基于 .NET 8 的跨平台 UI 框架，优先支持 Windows。

### 技术栈
- .NET 8
- Avalonia UI 11
- WindowsBluetooth (Windows BLE API)
- CommunityToolkit.Mvvm

### 安装和运行

```bash
cd apps/desktop/avalonia/SmartBLE.Desktop
dotnet restore
dotnet run
```

### 打包

```bash
dotnet publish -c Release -r win-x64 --self-contained
```

---

## 功能对比

| 功能 | Electron | Tauri | Avalonia |
|------|----------|-------|----------|
| 蓝牙扫描 | ✅ | ✅ | ✅ |
| 设备连接 | ✅ | ✅ | ✅ |
| 服务发现 | ✅ | ✅ | ✅ |
| 特征值读取 | ✅ | ✅ | ⏳ |
| 特征值写入 | ✅ | ✅ | ⏳ |
| 通知订阅 | ✅ | ✅ | ⏳ |
| 操作日志 | ✅ | ✅ | ✅ |

---

## 平台支持

### Windows

推荐版本：**Avalonia** 或 **Electron**

- Avalonia: 使用原生 Windows BLE API，性能最佳
- Electron: 使用 noble-uwp，兼容性好

### macOS

推荐版本：**Tauri** 或 **Electron**

- Tauri: 轻量级，性能好
- Electron: 功能完整

### Linux

推荐版本：**Electron** 或 **Tauri**

- 需要 bluez 相关库支持

---

## 开发说明

### 权限要求

**macOS**:
- 需要在 `Info.plist` 中声明蓝牙权限
- 可能需要开发者签名

**Windows 10/11**:
- 需要启用蓝牙功能
- 可能需要管理员权限

**Linux**:
- 需要安装 bluez: `sudo apt-get install bluez`
- 需要蓝牙服务运行: `sudo systemctl start bluetooth`

### BLE 库选择

| 平台 | 推荐库 |
|------|--------|
| Windows | noble-uwp / WindowsBluetooth |
| macOS | @abandonware/noble / CoreBluetooth |
| Linux | @abandonware/noble / bluez |

---

## License

MIT License
