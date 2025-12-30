# Smart BLE - 构建脚本

## 脚本说明

### setup.sh
初始化开发环境，安装依赖。

```bash
./scripts/setup.sh
```

功能：
- 检查 Node.js 版本
- 检查 Flutter 环境
- 检查 .NET SDK（Windows）
- 安装 uni-app 依赖
- 安装 Flutter 依赖

### build.sh
构建所有平台项目。

```bash
./scripts/build.sh
```

功能：
- 构建 uni-app 生产版本
- 构建 Flutter 应用
- 构建 Android APK
- 构建 iOS IPA
- 构建 Windows 桌面
- 构建 macOS 桌面

### clean.sh
清理所有构建产物。

```bash
./scripts/clean.sh
```

### dev.sh
启动开发模式。

```bash
./scripts/dev.sh [platform]
```

支持的平台：
- `uniapp` - uni-app 开发模式
- `flutter` - Flutter 开发模式
- `android` - Android 原生
- `ios` - iOS 原生
- `windows` - Windows 桌面
- `macos` - macOS 桌面

## 待实现

当前脚本目录已创建，具体脚本内容待实现。
