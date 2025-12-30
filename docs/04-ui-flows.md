# Smart BLE UI 流程文档

> 版本：v1.0
> 更新日期：2024-12-30
> 项目：Smart BLE - 跨平台蓝牙调试工具

---

## 1. 概述

本文档描述 Smart BLE 的用户界面设计、交互流程和视觉规范。

---

## 2. 页面导航结构

### 2.1 导航图

```
                    ┌─────────────────┐
                    │   启动页/首页    │
                    │   (index)       │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │  设备详情页  │ │  广播配置页  │ │   关于页     │
     │ (device)    │ │ (broadcast) │ │  (about)    │
     └─────────────┘ └─────────────┘ └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  版本记录页  │
                    │  (version)  │
                    └─────────────┘
```

### 2.2 页面路由配置

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "BLE Toolkit+"
      }
    },
    {
      "path": "pages/device/detail",
      "style": {
        "navigationBarTitleText": "设备详情"
      }
    },
    {
      "path": "pages/broadcast/index",
      "style": {
        "navigationBarTitleText": "BLE 广播"
      }
    },
    {
      "path": "pages/about/index",
      "style": {
        "navigationBarTitleText": "关于"
      }
    },
    {
      "path": "pages/about/version",
      "style": {
        "navigationBarTitleText": "版本记录"
      }
    }
  ]
}
```

---

## 3. 首页（设备列表页）

### 3.1 页面布局

```
┌─────────────────────────────────────┐
│  ← BLE Toolkit+          [广播][关于] │  导航栏
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │       过滤设置                 │  │  过滤面板
│  │  信号强度: [════━━] -60 dBm   │  │
│  │  名称前缀: [___________]       │  │
│  │  □ 隐藏无名称设备              │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│         [🔍 搜索设备]                │  操作按钮
├─────────────────────────────────────┤
│  发现设备 (5)          ● 扫描中       │  列表头部
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ 📱 ESP32-BLE    [BLE]     [🔗] │  │  设备项 1
│  │    ...E7:88        ▂▃▅▇  -65   │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 📱 nRF52-HRM     [BLE]     [🔗] │  │  设备项 2
│  │    ...AA:BB        ▂▃▅  -72   │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 📱 未知设备                  [🔗] │  │  设备项 3
│  │    ...CC:DD        ▂  -85    │  │
│  └───────────────────────────────┘  │
│                                    │  可滚动
└─────────────────────────────────────┘
```

### 3.2 组件结构

```
pages/index/index.vue
├── FilterPanel (过滤面板)
│   ├── FilterHeader (标题 + 导航按钮)
│   ├── RSSISlider (信号强度滑块)
│   ├── PrefixInput (名称前缀输入)
│   └── HideNameSwitch (隐藏无名称设备开关)
├── ButtonGroup (操作按钮组)
│   └── ScanButton (搜索/停止按钮)
├── DeviceList (设备列表)
│   ├── ListHeader (标题 + 状态)
│   ├── DeviceScroll (滚动区域)
│   │   └── DeviceItem (设备项) x N
│   │       ├── DeviceName (名称 + 类型标签)
│   │       ├── DeviceId (设备ID)
│   │       ├── SignalStrength (信号格数 + dBm)
│   │       └── ConnectButton (连接按钮)
└── AdvertisingDataModal (广播数据弹窗)
```

### 3.3 交互流程

#### 扫描流程

```
用户点击"搜索设备"
       │
       ▼
┌──────────────────┐
│  检查蓝牙状态     │ ── 失败 ──> 提示"请先开启蓝牙"
└────────┬─────────┘
         │
         ▼ 成功
┌──────────────────┐
│  检查定位权限     │ ─── 失败 ──> 弹窗引导授权
└────────┬─────────┘
         │
         ▼ 成功
┌──────────────────┐
│  开始扫描         │
│  按钮变红         │
│  状态显示"扫描中" │
└──────────────────┘
```

#### 连接流程

```
用户点击"连接"
       │
       ▼
┌──────────────────┐
│  跳转设备详情页   │
│  uni.navigateTo()│
└──────────────────┘
```

#### 查看广播数据

```
用户点击设备卡片
       │
       ▼
┌──────────────────┐
│  显示广播数据弹窗 │
│  - 设备ID         │
│  - 设备名称       │
│  - RSSI           │
│  - 服务UUID列表   │
│  - 广播数据Hex    │
│  [复制] [关闭]    │
└──────────────────┘
```

### 3.4 设备卡片状态

| 状态 | 按钮文字 | 按钮颜色 | 按钮状态 |
|------|----------|----------|----------|
| 未连接 | 连接 | 蓝色 | 可点击 |
| 已连接 | 已连接 | 灰色 | 禁用 |

---

## 4. 设备详情页

### 4.1 页面布局

```
┌─────────────────────────────────────┐
│  ← 设备详情              [断开连接]  │  导航栏
├─────────────────────────────────────┤
│  当前设备: ESP32-BLE                 │  面板头部
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ ▶ 服务: 4fafc201...            │  │  服务项（折叠）
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ ▼ 服务: 0000180A...           │  │  服务项（展开）
│  │   ┌─────────────────────────┐ │  │
│  │   │ 特征值: 2A29             │ │  │  特征值项
│  │   │ [读取] [写入] [监听]     │ │  │
│  │   ├─────────────────────────┤ │  │
│  │   │ 特征值: 2A24             │ │  │  特征值项
│  │   │ [读取]                   │ │  │
│  │   └─────────────────────────┘ │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ ▶ 服务: 0000180F...           │  │  服务项（折叠）
│  └───────────────────────────────┘  │
│                                    │  可滚动
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │  操作日志            [清除]   │  │  日志面板
│  │  ┌─────────────────────────┐  │  │
│  │  │ [14:23:15] [系统] ...  │  │  │  日志内容
│  │  │ [14:23:16] [读取] ...  │  │  │
│  │  │ [14:23:17] [接收] ...  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 4.2 组件结构

```
pages/device/detail.vue
├── PanelHeader (面板头部)
│   ├── DeviceName (设备名称)
│   └── DisconnectButton (断开连接按钮)
├── ServicesList (服务列表)
│   └── ServiceItem (服务项) x N
│       ├── ServiceHeader (服务头部)
│       │   ├── ServiceUUID (服务UUID)
│       │   └── ExpandIcon (展开/折叠图标)
│       └── CharacteristicsList (特征值列表)
│           └── CharacteristicItem (特征值项) x M
│               ├── CharacteristicUUID (特征值UUID)
│               ├── Properties (属性标签)
│               └── ActionButtons (操作按钮组)
│                   ├── ReadButton (读取按钮)
│                   ├── WriteButton (写入按钮)
│                   └── NotifyButton (监听按钮)
└── LogPanel (日志面板)
    ├── LogHeader (日志头部)
    │   ├── Title (标题)
    │   └── ClearButton (清除按钮)
    └── LogContent (日志内容)
        └── LogItem (日志条目) x N
            ├── Time (时间)
            ├── Type (类型标签)
            └── Message (消息内容)
```

### 4.3 交互流程

#### 读取特征值

```
用户点击"读取"
       │
       ▼
┌──────────────────┐
│  调用读取API      │
│  显示加载状态     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  等待设备响应     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  收到数据         │
│  添加到日志       │
└──────────────────┘
```

#### 写入特征值

```
用户点击"写入"
       │
       ▼
┌──────────────────┐
│  弹出输入框       │
│  ┌────────────┐  │
│  │ 请输入数据  │  │
│  │ [________] │  │
│  │  [取消][确定]│  │
│  └────────────┘  │
└────────┬─────────┘
         │
         ├── 取消 ──> 关闭弹窗
         │
         ▼ 确认
┌──────────────────┐
│  获取输入内容     │
│  检测数据格式     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  转换为Buffer    │
│  调用写入API      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  添加到日志       │
└──────────────────┘
```

#### 监听特征值

```
用户点击"监听"
       │
       ▼
┌──────────────────┐
│  调用通知API      │
│  state: true      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  按钮变为         │
│  "停止监听"       │
└──────────────────┘
         │
         ▼ (接收数据)
┌──────────────────┐
│  自动添加到日志   │
│  类型: "接收"     │
└──────────────────┘
```

---

## 5. 广播配置页

### 5.1 页面布局

```
┌─────────────────────────────────────┐
│  ← BLE 广播                          │  导航栏
├─────────────────────────────────────┤
│  设备名称: [BLEToolkit_Android___]   │  表单
│  服务UUID: [FFE0_______________]     │
│  厂商ID:   [0001_______________]     │
│  厂商数据:[BLEToolkit_Test______]   │
│                                     │
│  广播模式: [低延迟 ▼]                │  (仅Android)
│  发射功率: [高功率 ▼]                │
│  □ 可连接                            │
│  □ 包含设备名称                      │
│  □ 添加服务UUID                      │
├─────────────────────────────────────┤
│  [📡 开始广播]                       │
│  [🔍 检查状态]                       │
├─────────────────────────────────────┤
│  设备支持状态: 支持                   │  状态信息
│  广播状态: 正在广播中                 │
├─────────────────────────────────────┤
│  日志信息:                           │
│  ┌───────────────────────────────┐  │
│  │ [14:30:00] 初始化成功         │  │
│  │ [14:30:01] 广播启动成功       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 5.2 组件结构

```
pages/broadcast/index.vue
├── Form (表单)
│   ├── DeviceNameInput (设备名称输入)
│   ├── ServiceUUIDInput (服务UUID输入)
│   ├── ManufacturerIdInput (厂商ID输入)
│   ├── ManufacturerDataInput (厂商数据输入)
│   ├── AdvertiseModePicker (广播模式选择器, Android only)
│   ├── TxPowerLevelPicker (发射功率选择器, Android only)
│   ├── ConnectableSwitch (可连接开关)
│   ├── IncludeDeviceNameSwitch (包含设备名称开关)
│   └── AddServiceUuidSwitch (添加服务UUID开关)
├── ButtonGroup (操作按钮组)
│   ├── ToggleAdvertisingButton (开始/停止广播)
│   └── CheckStatusButton (检查状态)
└── StatusPanel (状态面板)
    ├── SupportStatus (支持状态)
    ├── AdvertisingStatus (广播状态)
    └── LogPanel (日志面板)
```

### 5.3 交互流程

#### 开始广播

```
用户点击"开始广播"
       │
       ▼
┌──────────────────┐
│  检查蓝牙状态     │ ── 失败 ──> 提示"请先开启蓝牙"
└────────┬─────────┘
         │
         ▼ 成功
┌──────────────────┐
│  检查权限         │ ─── 失败 ──> 引导授权
└────────┬─────────┘
         │
         ▼ 成功
┌──────────────────┐
│  构建广播参数     │
│  验证数据长度     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  调用广播API      │
└────────┬─────────┘
         │
         ├── 失败 ──> 记录错误日志
         │
         ▼ 成功
┌──────────────────┐
│  更新状态         │
│  按钮变红         │
│  显示"正在广播中" │
└──────────────────┘
```

---

## 6. 关于页

### 6.1 页面布局

```
┌─────────────────────────────────────┐
│  ← 关于                              │  导航栏
├─────────────────────────────────────┤
│         ┌─────────┐                  │
│         │   LOGO  │                  │  图标
│         └─────────┘                  │
│                                     │
│         BLE Toolkit+                │  应用名称
│         v1.0.4                      │  版本号
│                                     │
│  专业的蓝牙调试工具                   │  描述
│  支持微信小程序、iOS和Android         │
│                                     │
│  [版本记录]                          │  链接按钮
│  [开源协议]                          │
│  [问题反馈]                          │
│                                     │
│  ┌───────────────────────────────┐  │
│  │        微信小程序码            │  │  二维码
│  │         [QR CODE]             │  │
│  │     扫码使用小程序版           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 6.2 交互流程

```
用户点击"版本记录"
       │
       ▼
┌──────────────────┐
│  跳转版本记录页   │
└──────────────────┘
```

---

## 7. 视觉设计规范

### 7.1 色彩系统

```css
/* 主题色 */
--primary-color: #007AFF;              /* 蓝色 */
--primary-light: #409EFF;              /* 浅蓝 */
--primary-dark: #0066DD;               /* 深蓝 */

/* 功能色 */
--success-color: #34C759;              /* 绿色 */
--warning-color: #FF9500;              /* 橙色 */
--error-color: #FF3B30;                /* 红色 */
--info-color: #5856D6;                 /* 紫色 */

/* 中性色 */
--bg-color: #F7F8FA;                   /* 背景色 */
--card-bg: #FFFFFF;                    /* 卡片背景 */
--text-primary: #333333;               /* 主文本 */
--text-secondary: #666666;             /* 次要文本 */
--text-tertiary: #999999;              /* 辅助文本 */
--border-color: #EEEEEE;               /* 边框色 */

/* 渐变 */
--gradient-primary: linear-gradient(135deg, #007AFF 0%, #409EFF 100%);
--gradient-success: linear-gradient(135deg, #34C759 0%, #30D158 100%);
--gradient-warning: linear-gradient(135deg, #FF9500 0%, #FF9F0A 100%);
--gradient-error: linear-gradient(135deg, #FF3B30 0%, #FF2D55 100%);
--gradient-info: linear-gradient(135deg, #5856D6 0%, #5E5CE6 100%);
```

### 7.2 字体规范

```css
/* 字号 */
--font-size-xs: 24rpx;    /* 辅助文本 */
--font-size-sm: 26rpx;    /* 小字 */
--font-size-base: 28rpx;  /* 正文 */
--font-size-md: 32rpx;    /* 标题 */
--font-size-lg: 36rpx;    /* 大标题 */
--font-size-xl: 40rpx;    /* 超大标题 */

/* 字重 */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### 7.3 圆角规范

```css
--radius-xs: 6rpx;
--radius-sm: 8rpx;
--radius-base: 12rpx;
--radius-md: 16rpx;
--radius-lg: 20rpx;
--radius-pill: 100rpx;    /* 完全圆角 */
```

### 7.4 间距规范

```css
--spacing-xs: 8rpx;
--spacing-sm: 12rpx;
--spacing-base: 16rpx;
--spacing-md: 24rpx;
--spacing-lg: 30rpx;
--spacing-xl: 40rpx;
```

### 7.5 阴影规范

```css
--shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
--shadow-base: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
--shadow-md: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
--shadow-lg: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
```

---

## 8. 组件样式规范

### 8.1 按钮

```css
/* 主要按钮 */
.btn-primary {
    background: var(--gradient-primary);
    color: #FFFFFF;
    border-radius: var(--radius-pill);
    height: 88rpx;
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
}

/* 警告按钮 */
.btn-warning {
    background: var(--gradient-error);
    color: #FFFFFF;
}

/* 小按钮 */
.btn-mini {
    height: auto;
    padding: 4rpx 16rpx;
    font-size: var(--font-size-sm);
    border-radius: var(--radius-pill);
}
```

### 8.2 卡片

```css
.card {
    background-color: var(--card-bg);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    box-shadow: var(--shadow-base);
}
```

### 8.3 输入框

```css
.input {
    height: 76rpx;
    border: 2rpx solid var(--border-color);
    border-radius: var(--radius-base);
    padding: 0 var(--spacing-base);
    font-size: var(--font-size-base);
    background-color: #F9F9F9;
    transition: all 0.3s;
}

.input:focus {
    border-color: var(--primary-color);
    background-color: var(--card-bg);
}
```

### 8.4 日志标签

```css
.log-tag {
    padding: 2rpx 12rpx;
    border-radius: var(--radius-xs);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
}

.log-tag.system {
    background: var(--gradient-primary);
    color: #FFFFFF;
}

.log-tag.error {
    background: var(--gradient-error);
    color: #FFFFFF;
}

.log-tag.read {
    background: var(--gradient-success);
    color: #FFFFFF;
}

.log-tag.write {
    background: var(--gradient-warning);
    color: #FFFFFF;
}

.log-tag.receive {
    background: var(--gradient-info);
    color: #FFFFFF;
}
```

### 8.5 信号强度条

```css
.signal-bars {
    display: flex;
    align-items: flex-end;
    gap: 4rpx;
    height: 24rpx;
}

.signal-bar {
    width: 6rpx;
    background-color: #EEEEEE;
    border-radius: 3rpx;
}

.signal-bar:nth-child(1) { height: 8rpx; }
.signal-bar:nth-child(2) { height: 14rpx; }
.signal-bar:nth-child(3) { height: 20rpx; }
.signal-bar:nth-child(4) { height: 24rpx; }

.signal-bar.active {
    background: var(--gradient-primary);
}
```

---

## 9. 动画规范

### 9.1 按钮点击

```css
.btn:active {
    transform: translateY(2rpx);
    box-shadow: var(--shadow-sm);
}
```

### 9.2 扫描动画

```css
@keyframes pulse {
    0% {
        box-shadow: 0 4rpx 16rpx rgba(52, 199, 89, 0.2);
    }
    50% {
        box-shadow: 0 4rpx 24rpx rgba(52, 199, 89, 0.4);
    }
    100% {
        box-shadow: 0 4rpx 16rpx rgba(52, 199, 89, 0.2);
    }
}

.scanning {
    animation: pulse 2s infinite;
}
```

### 9.3 页面转场

```css
/* 标准滑入滑出 */
page-enter-active, page-leave-active {
    transition: all 0.3s ease;
}
page-enter-from {
    transform: translateX(100%);
}
page-leave-to {
    transform: translateX(-100%);
}
```

---

## 10. 响应式设计

### 10.1 屏幕适配

```css
/* 基于设计稿 750rpx */
.container {
    padding: 30rpx;
}

/* 小屏幕适配 */
@media (max-width: 320px) {
    .container {
        padding: 20rpx;
    }
}
```

### 10.2 横屏适配

```css
@media (orientation: landscape) {
    .device-list {
        height: 60vh;
    }
}
```

---

## 11. 无障碍设计

### 11.1 语义化

```html
<!-- 使用语义化标签 -->
<button aria-label="搜索设备">搜索设备</button>
<div role="list" aria-label="设备列表">...</div>
```

### 11.2 焦点状态

```css
.btn:focus {
    outline: 2rpx solid var(--primary-color);
    outline-offset: 2rpx;
}
```

---

## 12. 附录

### 12.1 相关文档
- [功能规格文档](./01-functional-specs.md)
- [数据流图文档](./02-data-flow.md)
- [BLE 协议定义](./03-ble-protocol.md)
- [平台差异说明](./05-platform-differences.md)

### 12.2 设计资源
- Figma 设计文件: （待补充）
- 图标库: （待补充）
