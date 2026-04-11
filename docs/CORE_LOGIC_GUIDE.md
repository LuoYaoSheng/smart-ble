# 跨端核心通讯全栈对齐规范 (Core Logic Standardization)

在构建横跨 7 个平台的大型低功耗蓝牙 (BLE) 工具箱生态时，最大的挑战不在于 UI 框架的堆叠，而在于**如何让底层二进制、日志生命周期与命令分发具备跨平台绝对的一致性**。

本指引总结并梳理了使得 SmartBLE 内核坚若磐石的 **6 大核心逻辑对齐里程碑**。开发者在接手核心协议层开发前，必先了解这些已成为项目事实标准的机制：

---

## 🚀 1. 全局 UUID 静态资源映射中枢 (BleUuids)

在原先散落的代码中，对于 `180A` 为“设备信息”、`2A00` 为“设备名称”可能要在写 7 遍判定。
**现行规范**：已全部剥离为强归一化的资源字典。
- 无论你是处于 `.dart`、`.kt`、`.swift` 还是 `.ts` 中，统一调用类似 `BleUuids.getServiceName(uuid)` 与 `BleUuids.getCharName(uuid)` 的静态单例库。
- 若未来新增特定的硬件名称（如公司内部心率计等私有协议UUID），只需查缺补漏地在同名配置文件中修改一次字典，其他平台对照同步即可。

---

## 🧱 2. 领域数据模型统领 (Domain Models)

废除了原先 Android 中叫 `BleDevice` 而 Flutter 叫 `BleScanResult` 的方言混乱。所有对发现外围硬件的封装均回归标准基类字典！
要求所有宿主环境抛出的实体必须涵盖以下严格结构：
- **`BleDevice`**: `deviceId`, `name`, `rssi`, `advertisDataHex`, `serviceUuids`, `timestamp`。
- **`BleService`**: `uuid`, `name`, `isPrimary`, `characteristics[]`。
- **`BleCharacteristic`**: 封装好属性开关读写位（Readable, Writable, Notify...）。
- **`LogEntry`**: `timestamp`, `type` (成功/拦截/错误/系统), `message`, `hexDump`。

---

## 🔧 3. 跨端统一编解码器 (DataConverter)

在低功耗蓝牙应用中，**跨端 Endianness（端序差异）与 HEX/UTF-8 随意转化往往是乱码之源**。
现已建立各端相互隔离的原生扩展类或工具单例 —— `DataConverter` (或 `BleCodec`)。
- 绝不允许工程师自行手写 `hexStringToBytes` 等代码。必须利用由官方接管提供的转换器应对所有的 ArrayBuffers（前端）、Data/NSData（苹果）、ByteArray（安卓/JVM）、`List<int>`（Flutter/Dart）。
- 安全性：提供静态的防超限越界抛错处理。

---

## 📡 4. 日志时序总线 (Logger Bus)

之前，每个平台或 ViewModel 都在使用自己的日志数组与设备状态深深耦合绑定，导致一退出局部页面日志极易丢失！
**现行标准：重构为解耦分离的事件广播总线！**
- 通过建立如 `Logger.shared` (iOS) 或 `logger.ts` 的 Reactive 全程单例，并采取面向连接生命周期的持久化数组管理。
- 即便是断开页面、切换标签，底层的连接日志会以带有绝对精确系统时间戳的 `LogEntry` 模型源源不断压入。外层的 UI 图形组件（`LogPanel`）以弱引用的观察者身份仅仅负责消费流即可。

---

## ⏱️ 5. 防并发与分包异步队列系统 (CommandQueue)

所有做原生 Android/iOS 及多端 BLE 混合开发的先驱都知道一个臭名昭著的问题：短时间高频并发对 Characteristics 进行 Write 调用时，会导致队列堵塞甚至让硬件溢出报错（GATT ERROR 133 等）。
**防灾策略达成**：
我们专门抽象实现并统一交付了名为 `CommandQueue` 的异步队列缓存管家。
- **任务打包机制**：发送任何请求都会封装为 `CommandItem` 丢入队尾。
- **并发锁与缓冲间隙**：依靠内置 `intervalMs = 50ms` (默认)，利用系统自带的 `Task/await` 及 `Promise/Async` 拦截频繁的调用爆发。
- **功能性延伸**：赋予了队列强大的宏播放器特性，允许 UI 端自由唤起“反复循环 10 次测试”、“中途暂停”、“强行终止流”。

---

## 🛡️ 6. 平台级原生唤醒韧性架构 (Initialization Resilience)

尤其在桌面端系统如 Windows，蓝牙核心网卡服务常态由于节能模式而睡眠。若应用强行开机秒寻往往获取到的适配器总量为 0 导致服务抛锚（Tauri / Electron 高发区）。
**核心防御体系建立**：
- 在桌面端 (`btleplug` / `noble`) 引进了启动轮询探针。哪怕 `manager.adapters()` 获取为空或检测到 `poweredOff`/`unknown` 时也不会武断宣布“无蓝牙”，而是展开退避等待。
- **指数退避重试 (Exponential Backoff)**：对于移动端 UniApp 包装等弱连接状态下抛出 `10001 未就绪`时，执行 1s => 2s => 4s 的非阻塞探测，优雅降级抵抗住了系统的瞬间拉起迟滞。保障开屏即成功。

---

感谢遵循 SmartBLE 内核对齐纲要。我们始终坚信，一个极其严谨扎实并能统一所有环境时序差异的 Core Logic 中台，是构建伟大众源物联网平台的最核心底气！架构一旦对齐，所有 Bug 都会无处遁形。
