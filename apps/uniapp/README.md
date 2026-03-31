# Smart BLE - uni-app 版本

uni-app 版本是 `smart-ble` 产品家族里最适合传播和教学的入口之一。

它承接了小程序、H5 和轻量 App 方向，也保留了 `LightBLE` 这条历史实现路线的教学价值。

---

## 在产品家族中的角色

- 微信生态和轻量入口
- 对外最容易体验和传播的版本
- 教学内容和历史演进的重要载体

如果你想：

- **先快速体验 Smart BLE**：优先看这个版本
- **做小程序 / H5 版本 BLE 工具**：看这个版本
- **理解 LightBLE 到 smart-ble 的演进**：也要看这个版本

## 技术栈

- **框架**: uni-app + Vue 3
- **状态管理**: Pinia
- **UI 组件**: uni-ui
- **BLE API**: uni.openBluetoothAdapter
- **支持平台**: 微信小程序、Android App、iOS App

## 项目结构

```
src/
├── pages/           # 页面
│   ├── index/       # 设备列表页（扫描、连接）
│   ├── broadcast/   # 广播页
│   └── log/         # 日志页
├── components/      # 公共组件
│   ├── device-card/ # 设备卡片
│   ├── service-item/# 服务项
│   └── log-panel/   # 日志面板
├── services/        # BLE 服务
│   └── ble-adapter.ts
├── store/           # 状态管理
│   ├── devices.ts   # 设备状态
│   └── logs.ts      # 日志状态
├── utils/           # 工具函数
└── styles/          # 样式文件
```

## 开发计划

- [x] 从 SmartBLE 迁移现有代码
- [ ] 重构为 Vue 3 Composition API
- [ ] 集成 Pinia 状态管理
- [ ] 组件化改造
- [ ] 代码注释完善

---

## 教学价值

这个版本对 `smart-ble` 的意义不只是“一个实现”，还包括：

- 小程序 BLE 能力教学
- 轻量跨端方案展示
- 历史仓库 `LightBLE` 的内容承接
- 与 Flutter / 原生移动的对照学习

如果后续要做文章、演示或教学，uni-app 版本通常是最容易先讲清楚的一条线。

---

## 适合谁

- 微信小程序开发者
- 需要快速演示 BLE 功能的人
- 想学习 uni-app BLE 能力的开发者
- 想看项目历史演进的人

## 运行

```bash
npm install
npm run dev:mp-weixin  # 微信小程序
npm run dev:app        # App
```
