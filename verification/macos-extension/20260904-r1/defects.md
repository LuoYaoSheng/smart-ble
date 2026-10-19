# 缺陷登记 — run 20260904-r1

## 产品/插件层（Mac 只登记不修）

### D1 [插件][复现] flutter_blue_plus 1.36.8 macOS 启动竞态
- 复现：App/探针启动后立即 startScan（PoweredOn 前 ~10ms 窗口）
- 现象：`PlatformException(startScan, bluetooth must be turned on. (CBManagerStateUnknown))`
- 影响：自动开扫类 UI（如进入扫描页即扫）可能首扫失败；Android 路径不同
- 建议：共享层加适配器就绪守卫（见 integration-notes S2）
- 状态：探针已内置守卫规避，共享层待 Windows 处理

### D2 [插件][观察] FBP darwin isSupported duplicate response
- 现象：冷启动 `isSupported` 后 stderr 报 duplicate response（响应仍送达）
- 影响：日志噪音；无功能影响
- 状态：登记，随 FBP 升级观察

### D3 [插件][观察] flutter_ble_peripheral 2.1.1 `isAdvertising` getter 在 darwin 恒 false
- 现象：广播状态流已达 `advertising`，getter 仍 false（实测两次）
- 影响：依赖该 getter 的 UI 会显示错误状态；状态流可用
- 建议：共享层以 `onPeripheralStateChanged` 为准
- 状态：登记

### D4 [共享层既有] dart format 漂移 20 文件（见 integration-notes S1）

## 原生 App 层（本轮已修复，见 native-macos-baseline.md）

### D5 [原生][已修复] Package.swift sources 列表遗漏 Components → 开箱不可编译
### D6 [原生][已修复] connect(to:) 参数标签错误（ScanViewController:338）
### D7 [原生][已修复] NSImage 可选未解包（ScanViewController:52）
### D8 [原生][已修复] @MainActor delegate 一致性需 @preconcurrency（Swift 6.2 编译器）
### D9 [原生][已修复][高危] @main 默认引导在 SPM 无 bundle 可执行下不进应用生命周期
  （进程空转、无窗口无日志）——改为显式 static main + .regular activation policy

## 原生 App 层（登记不修，超出本轮允许扩建范围）

### D10 [原生] 单连接（单 connectedPeripheral）、无 Session Registry
### D11 [原生] 无自动重连
### D12 [原生] 无写队列/事务
### D13 [原生] 无 Profile / Smart HID / 31B 广播预算层
### D14 [原生] 日志未脱敏
### D15 [原生] UI 英文硬编码 7+ 处、平台 API 与 UI 强耦合、页面为早期原型

## 平台结构性事实（非缺陷，但约束 D2 决策）

### P1 macOS 同机控制器不回送自身 LE 广播
- 两次对照实验：原生广播+原生扫（过滤/无过滤）、Flutter 广播+原生扫，均不可见
- 推论：Peripheral 外部可见性（E5）必须真第二观察端；本机自测永不可证
