# LightBLE

一个功能强大的多平台蓝牙低功耗(BLE)调试工具。

A powerful multi-platform Bluetooth Low Energy (BLE) debugging tool.

## 功能特点 | Features

### 多平台支持 | Multi-platform Support

- 微信小程序 | WeChat Mini Program

- iOS 原生应用 | iOS Native App

- Android 原生应用 | Android Native App

### 核心功能 | Core Features

- 🔍 BLE 设备扫描与发现 | BLE Device Scanning and Discovery

- 📡 广播数据配置与发送 | Broadcasting Data Configuration and Transmission

- 🔐 自动化权限管理 | Automated Permission Management

- 📱 跨平台统一 API | Cross-platform Unified API

- ⚡ 实时数据监控 | Real-time Data Monitoring

- 🛠️ 灵活的参数配置 | Flexible Parameter Configuration

## 快速开始 | Quick Start

### 安装 | Installation

#### 微信小程序 | WeChat Mini Program

1. 扫描下方二维码使用 | Scan QR code below to use

2. 或在微信开发者工具中导入项目 | Or import project in WeChat DevTools

```bash
# 克隆项目 | Clone the project
git  clone  https://gitee.com/luoyaosheng/smart-ble/tree/AI/
```

#### iOS & Android

从应用商店下载 | Download from App Store/Google Play

- [iOS App Store](#)

- [Google Play](#)

### 基础使用 | Basic Usage

```javascript

// 初始化 BLE | Initialize BLE
const  ble  =  new  LightBLE();

// 开始广播 | Start Broadcasting
await  ble.startBroadcast({
 name:  'MyDevice',
 serviceUUIDs:  ['YOUR_SERVICE_UUID'],
 manufacturerData:  'YOUR_DATA'
});

// 停止广播 | Stop Broadcasting
await  ble.stopBroadcast();
```

## API 文档 | API Documentation

详细的 API 文档请访问：[在线文档](docs.html)

For detailed API documentation, please visit: [Online Documentation](docs.html)

## 配置说明 | Configuration

### 广播参数 | Broadcasting Parameters

```javascript
{
    name: string,            // 设备名称 | Device name
    serviceUUIDs: string[],  // 服务 UUID | Service UUIDs
    manufacturerData: string,// 厂商数据 | Manufacturer data
    txPowerLevel: number,    // 发射功率 | Transmission power
interval: number // 广播间隔 | Broadcasting interval
}
```

## 平台差异 | Platform Differences

### 微信小程序 | WeChat Mini Program

- 需要在 `app.json` 中声明蓝牙权限

- Bluetooth permission declaration required in `app.json`

### iOS

- 需要在 `Info.plist` 中添加蓝牙使用权限声明

- Bluetooth usage permission required in `Info.plist`

### Android

- 需要 Android 5.0 (API 21) 及以上版本

- Android 5.0 (API 21) or above required

- 需要位置权限用于扫描设备

- Location permission required for device scanning

## 示例代码 | Example Code

```javascript

// 完整示例 | Complete example
const  ble  =  new  LightBLE();

try {
 // 检查权限 | Check permissions
 await  ble.checkPermissions();
 // 配置广播参数 | Configure broadcasting parameters
 const  config  = {
     name:  'TestDevice',
     serviceUUIDs:  ['1234'],
     manufacturerData:  'test-data'
  };

 // 开始广播 | Start broadcasting
 await  ble.startBroadcast(config);
 // 30秒后停止 | Stop after 30 seconds
 setTimeout(async () => {
     await  ble.stopBroadcast();
    }, 30000);

} catch (error) {
 console.error('BLE Error:', error);
}
```

## 问题反馈 | Feedback

如果您在使用过程中遇到任何问题，请提交 Issue 或联系我们。

If you encounter any problems during use, please submit an issue or contact us.

## 许可证 | License

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详细信息

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## 贡献指南 | Contributing

我们欢迎任何形式的贡献，包括但不限于：

- 报告问题

- 提交功能建议

- 提交代码改进

- 完善文档

We welcome all forms of contributions, including but not limited to:

- Bug reports

- Feature suggestions

- Code improvements

- Documentation improvements
