# Smart BLE - uni-app 版本

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

## 运行

```bash
npm install
npm run dev:mp-weixin  # 微信小程序
npm run dev:app        # App
```
