# Smart BLE 组件交互与流程规范

由于 `Smart BLE` 作为一个跨多端的生态组合工程（Vue 3 / Flutter / Android Compose / iOS SwiftUI / Tauri 等），不同平台之间往往容易导致 UI 控制流分化、代码大量堆积。为此我们将所有 UI 层分解为**五大标准细粒度组件**。

所有客户端不论什么前端底层技术，**必须**遵循这套装配规范和事件抛出机制来渲染界面。

---

## 页面装配级组件树 (View-Level Component Tree)

主页面应仅作为状态承接中心（Hub），**严禁** 在其中手写各类复杂的逻辑嵌套。

### 1. 扫描与连接中心 (Scan / List Page)
该页面负责统领设备的发现与已连接设备的列表管理。

```text
├── NavBar (顶部导航，负责提供多设备断连状态展示)
├── FilterPanel (条件过滤面板)
├── TabBar / SegmentedControl (扫描结果与已连接状态的切换选项卡)
│   └── Scan Control Area (开始/停止扫描按钮及数量气泡)
└── ListView (滚动展示区域)
    └── DeviceCard × N (设备展示名片块)
```
> **注意**：扫描列表与已连接列表必须复用同一个 `DeviceCard` 原子模型，仅仅根据入参改变状态，禁止重写底层结构。

### 2. 详情交互中心 (Device Detail Page)
该页面专攻对于单一设备的多服务 Characteristic 交互、OTA 与日志诊断。

```text
├── NavBar (顶部导航及系统返回防误触机制拦截)
├── DeviceHeader (设备抬头，展示当前名、设备 ID 及操作[导出日志/重连断开/固件升级])
├── ServicePanel (折叠包裹全树渲染块)
│   └── CharacteristicItem × N (包含属性读写标签及读/写/Notify按钮组)
├── WriteDialog (通过双向绑定或独立状态唤出的遮罩拦截指令操作框)
└── LogPanel (吸底放置的，专职处理彩色字体的通信截获面板)
```

---

## 核心组件状态机与接口契约 (Interface Contracts)

### `FilterPanel`
控制对周边广播设备的可见性处理。
- **输入参数 (Props/State)**: 
  - `setting.rssi`: Integer (-100 ~ 0 之间，控制信号截断底线)
  - `setting.prefix`: String (根据设备名截断)
  - `setting.hideNoName`: Boolean (隐去无名设备)
- **输出事件 (Emits)**:
  - `onChange(newSettings)`: 当任意条件或重置按钮被触发，抛出最新格式字典供页面的视图计算池刷新。
- **内部职责**: 负责渲染自我折叠展开与 “重置过滤 ↺” 的重置控制。

### `DeviceCard`
抽象单个外设卡片的渲染细节。
- **输入参数 (Props)**:
  - `device`: DeviceObject (自带 rssi, name, id, isConnected参数)
  - `isConnectionTab`: Boolean (此标志如果是 true 则隐藏信号彩条，替换展示断开危急按钮)
- **输出事件 (Emits)**:
  - `onAction(device)`: 根据环境判定是回执**发起连接**亦或是**强制断开**操作。
  - `onClick(device)`: 唤出系统底层的广播协议封包信息解读供抓包测试。

### `ServicePanel` / `ServiceList`
对原始原生蓝牙协议获取的多级特征回调做 UI 拆解降维渲染。
- **输入参数 (Props)**:
  - `services`: NSArray / List (包含多级折叠树并根据单项判断 `.notifying` 的按钮监听色差变化)
- **输出回调 (Emits)**:
  - `onRead({serviceId, charId})`: 暴露给 BleManager 去发起硬件读取握手。
  - `onWrite({serviceId, charId})`: 仅发出该按钮被触发的要求去开启指令输入器。
  - `onToggleNotify({serviceId, charId})`: 向系统请求切换该订阅地址的硬接收注册。

### `LogPanel`
缓解低功耗蓝牙串口透传极快速度吞吐大日志时的滚动堆积。
- **输入数据 (Props)**:
  - `logs`: Array<{time, type, message}> 数据源结构
- **行为规范**: 接受到新增类型比如 系统/报错/接收/写入 时，通过特定框架语法保证底层富文本渲染及色彩变化，且内容高度大于定宽时不人工拖动即默认自动锁死到底部视距。

### `WriteDialog`
应对串口特征命令时的十六进制封装备战隔离沙盒。
- **输入状态 (Props)**:
  - `visible`: Boolean 
  - `isSending`: Boolean (如果处于发送，按钮锁死展现 Loading 等状态避免连发乱序)
- **输出规则 (Emits)**:
  - `onConfirm({type: Enum('hex', 'text'), data: String})` (对字符内部容错校验规整去除首尾和格式异常后才正式通知蓝牙模块打封包传输)。

---

## 页面跨端交互流转链路 (Interaction Paths)

五大组件被页面容器融合组装后，产生的数据涟漪流。

### 1. 过滤流：搜索控制交互逻辑
1. 开发者/用户在 `FilterPanel` 滑块或预设选区处触控。
2. 触发了 `onChange()` 推向了设备列表承接主页。
3. （在 Flutter 中 Provider 数据被写入，UniApp 中同步改变 Pinia 的 state 值）。
4. Getter 聚合模型被引起响应变动，判定库中所有缓存 Object。
5. 所有被筛出局的 `DeviceCard` 从 UI 层直接被移除渲染，而并非底层停止发现协议。

### 2. 写入回路：指令下发的闭环流动
1. `ServicePanel` 下对应的服务组 ✏️点击被触发。
2. 该操作上浮将靶 UUID 送至 Detail Page。
3. 唤醒更改了 `WriteDialog` 的底层展现依赖布尔值让 Modal 可视化。
4. 用户键入命令文本，确认检验有效后 `onConfirm` 抛出。
5. `Manager核心工具包` 进行二进制/十六进制数据转译发包：
   - 在收到系统 `success` 回报时。
   - `LogPanel` 被触发推入橘红色的 `[写入]...` 日志记录。
   - 随即关闭 `WriteDialog`。

### 3. 断连流：防页面意外弹出现象控制
无论位于首页面还是多特征详情页内部断开行为：
- 系统绝不强制通过路由直接把开发者给“踢至”上个堆栈的列表页。
- UI只应该接收到 `State / Store` 的标志事件下发，将当前详情头部绿指示灯立刻拉灰；将 `ServicePanel` 内数据一概销毁为空面板呈现。
- 这极大化保障了连接突然抖动时用于定位异常的调试信息 `LogPanel` 内的数据现场得以无损停留封存和研判。
