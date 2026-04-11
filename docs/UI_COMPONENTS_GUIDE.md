# 跨平台原子化 UI 组件指南 (5-Components Core Model)

作为开源项目，保持多平台（UniApp、Flutter、Android、iOS 等 7 大环境）的代码易读性与维护性至关重要。为此，本开源项目独创式地推行了 **5 大原子化组件架构 (5-Components Core Model)**。

无论是重构老代码还是进行新平台的移植（如 Avalonia 等原型探索），页面视图（View / Page）不应承载任何复杂的拆解逻辑。所有的前端页面必须拼装自以下这 **5 个核心 UI 组件**。

---

## 一、 组件架构概览 🧩

整体蓝牙页面的核心被强约束在这 5 个独立的积木块中，它们有着各自严格的数据输入边界和事件输出（状态上报）职责。

1. **`FilterPanel` (过滤面板)** - 负责设备的过滤与筛选。
2. **`DeviceCard` (设备卡片)** - 负责信号强度、名称解析、设备名片的展示。
3. **`ServicePanel` (服务与特征面板)** - 统一的嵌套折叠面板，负责展示复杂的 GATT `Service -> Characteristic` 树形树状结构。
4. **`LogPanel` (日志面板)** - 抽离出来的独立控制台，负责时间戳和带颜色的日志终端渲染。
5. **`WriteDialog` (写入操作对话框)** - 负责安全无误的数据编码 (Hex / UTF-8) 选择与发送准备，阻止不合法的长字符串输入。

这使得主页面（如 `DeviceListPage`，`DeviceDetailPage` 等）只需充当“粘合剂”、“状态管理器”的作用，杜绝“面条代码”引发的修改雪崩。

---

## 二、 核心组件规格手册 📖

### 1. FilterPanel (过滤面板组件)

**职责定位：** 接管蓝牙界面的所有过滤触发，收敛扫描前期的过滤设置。

- **输入 (Props/States)**:
  - `rssiThreshold` (`int`): 信号过滤阈值（默认如 `-100` 或 `-80` dBm）。
  - `namePrefix` (`String`): 过滤的前缀或关键字。
  - `hideNoName` (`bool`): 是否隐藏无名设备 (`null` / `Unnamed`)。
  - `autoStopDuration` (`int`): 设置扫描的超时自动停止时间。
- **输出 (Events)**:
  - `onFilterChanged`: 触发外层刷新扫描规则。
- **UI 风格基准**: 横排或者 Flex 瀑布流的紧凑控件，多支持滑动条（Slider）与开关（Toggle/Switch），支持输入框的防抖处理。

### 2. DeviceCard (设备发现卡片)

**职责定位：** 仅用来在列表中渲染一个蓝牙模块的面貌。

- **输入**:
  - `device` (实体模型): 必须包含 `deviceId`, `name`, `rssi`, `advertisDataHex`, `serviceUuids` 等字段。
- **内部封装**: 
  - 自动高亮绿色的连接圆点。
  - 右侧有明显指向性的箭头 (`>`) 或“连接”按钮。
  - 底部可选项显示该设备被广播包暴露出的 UUID 缩略标识。

### 3. ServicePanel (服务结构面板)

**职责定位：** 项目交互的核心，渲染出 BLE 所发现的一切特征值。

- **输入**: 
  - `services` (列表模型): 包含每一个 Service 以及内部包含的 Characteristic。
- **内部行为强制规范**:
  - **Read**: 按下时触发只读命令调用。
  - **Write/Write without Response**: 唤起（Emit 事件）专门的 `WriteDialog` 抽屉。
  - **Notify/Indicate**: 提供 `Switch / Toggle` 组件。开启则高亮为活跃状态，收到数据推向日志总线。
- **显示策略**:
  - 通过注入统一下发的 `BleUuids` 静态字典库，特征面板在渲染时必须**自动带上中文解释**（例如将 `0000180A...` 渲染为 `[180A: Device Information]` 以帮助硬件测试工程师免背字典）。

### 4. LogPanel (日志面板)

**职责定位：** 收服所有设备的“控制台记录”。

- **状态**: 监听 `Logger Bus` 全局事件或传入 `logs` (Array<LogEntry>)。
- **内部特性**: 
  - 反转滚动/自动滚动到尾部 (Scroll to Bottom)。
  - **彩色区分**:
    - 🔵 `Info`
    - 🟢 `Success` / `Receive`
    - 🔴 `Error` 
    - 🟠 `Warning`
  - **配套工具栏**: 需在右上方或者下方随带【导出日志至剪贴板/文件】与【清空】按钮。

### 5. WriteDialog (数据下发对话框)

**职责定位：** 阻挡因为测试人员或开发者随意输错 HEX 字符导致的设备死机。

- **输入**:
  - `characteristic`: 正在操作的那个特征值。
- **功能规定**:
  - **编码切换**: 允许以 `HEX` 或 `UTF-8文本` 及其他二进制形式发送数据。
  - **Hex 防呆校验**: 当在 `HEX` 模式下，非法字符（包含多余的非16进制字母如 `G,X,Z` 等），输入框必须标红拦停，不允许被发送。使用统一提取的 `DataConverter.isValidHex()` 进行强校验。
  - **循环模式**：可设定“循环次数 (0为长循)”和“帧间隔间隔(ms)”。

---

## 三、 致组件贡献者 (Contributors) 🤝

为了保证在不同图形框架上的丝滑统一，所有平台下新补充的功能（如“OTA 升级卡片”、“图传分析面板”），都需遵守以下哲学：

1. **绝对隔离**：不可在组件内调用如 `android.bluetooth.*` 或 `flutter_blue_plus` 等原生底层 API。
2. **事件抛出**：视图应当只是一个绘制皮囊，把“要读取数据啦”、“要改变过滤啦”的行为作为纯接口（Closure / Callback / Emit）向上层页面 (Page / ViewModel) 抛出去以保证易测性。
3. **同等审美**：在编写 Desktop 端组件时，请参照移动端的圆角、深浅主题以及空状态占位 (Empty State) 设计，确保它感觉起来像属于用一个模子刻出来的同一个 App 宇宙。
