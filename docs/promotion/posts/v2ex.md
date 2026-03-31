# V2EX 发布内容

## 标题
```
[分享] Smart BLE - 我开源了一个跨平台蓝牙调试工具，支持 8+ 种实现
```

---

## 正文内容

```
分享一个我自己开发的蓝牙调试工具项目 —— **Smart BLE**。

## 为什么要做这个项目？

作为蓝牙开发者，日常调试设备很痛苦：
- 每个平台要用不同的工具
- 网上的开源代码要么不完整，要么只支持单一平台
- 软件工具和硬件固件往往分离

所以做了一个**真正完整、真正开源**的方案。

## 主要特点

### 1. 8+ 种平台实现

- uni-app (Vue 3) - 一套代码跑小程序/App/H5
- Flutter - Android/iOS/macOS 原生体验
- Electron - JavaScript 全家桶桌面版
- Tauri - Rust 后端，安装包才 10MB
- macOS 原生 - Swift + AppKit
- Avalonia - .NET 8 + C#

### 2. 完全开源

- 前端代码全部开放
- 桌面端全部开放
- ESP32 硬件固件也开放
- MIT 协议，商用无忧

### 3. 硬件支持

- 内置 ESP32 完整固件
- LED 控制（常亮/快闪/慢闪）
- JSON 格式数据交互
- 可以端到端测试

## 核心功能

- 设备扫描（信号强度过滤、名称过滤）
- 连接管理（服务发现、特征值读写）
- 通知订阅（实时数据监控）
- BLE 广播（手机变身蓝牙设备）
- 操作日志（完整记录）

## 快速体验

微信小程序扫码即可体验，或者：

```bash
git clone https://github.com/luoyaosheng/smart-ble.git
cd smart-ble/apps/uniapp
npm install
npm run dev:mp-weixin
```

## 项目地址

GitHub: https://github.com/luoyaosheng/smart-ble
Gitee: https://gitee.com/luoyaosheng/lys-smart-ble/tree/refactor%2Fmulti-platform/

## 适用人群

- 蓝牙设备开发者
- 跨平台应用开发者
- 嵌入式工程师
- 蓝牙技术学习者

## 后续计划

- OTA 升级功能
- 多设备同时连接
- 数据记录和回放
- 脚本自动化测试

如果觉得有用，欢迎给个 Star ⭐

也欢迎各位大佬提提意见和建议！
```

---

## 发布建议

- **节点选择**：酷工作 / 分享发现 / 极客硬件
- **发布时间**：工作日 20:00-22:00
- **回复建议**：
  - 第一时间回复评论
  - 保持礼貌和开放态度
  - 记录用户反馈建议
