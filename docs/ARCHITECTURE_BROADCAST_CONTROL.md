# 🌌 Smart BLE: 无连接纯广播群控生态架构白皮书

> **文档版本**: v1.0.0-draft  
> **核心概念**: `GAP Broadcaster/Observer` 拓扑、`Manufacturer Specific Data` 载荷窃听、极速节流控制 (Throttler)。

传统的 Bluetooth Low Energy (BLE) 工业控制多采用 **点对点 GATT (主从单链)**。当我们需要控制一个场馆内的 100 盏氛围灯时，如果采用连接模式，不论是手机操作还是连接耗时都将导致系统雪崩崩溃。
为解决大航界群控需求，本工程独立辟出**【零延迟散发群控生态】**，即手机只发不连，所有的终端灯具/开关静默监听，解析并触发机制！

---

## 1. 核心通讯封装：厂商特定字段 (Manufacturer Data) 劫持

我们摒弃服务 `Service UUID / Characteristic` 连接写入，转用 BLE 规范里最初始的 `Advertising Payload`（广播封包）中的 `Manufacturer Specific Data (0xFF)` 进行数据下发。

每个广播包最多包含极其有限的有效字节（传统 BLE 为 31 字节，除去基础位后留给厂家的仅剩 20 多字节）。
我们定义的**紧凑指令集包规约**如下：

```text
+----------+----------+--------+-------------------------------------+
| 长标识符 | 数据类型 | 厂商 ID|  自定指令集 Data (18 Bytes)         |
+----------+----------+--------+-------------------------------------+
| e.g. 0x1A| 0xFF     | 0xABCD | [CMD] [P1] [P2] [P3] ... [Checksum] |
+----------+----------+--------+-------------------------------------+
```

### 【通信载荷 (Payload) 定义表】
* **`0xABCD` 发头**：作为过滤标志。所有我们出产的下位机硬件如果在广播里看到前带 `0xABCD` 的电波，就会立刻捕获。
* **`CMD` 指令槽**：
  * `0x01` (灯具统一切换开关) -> 参数 P1: `0 (关闭) / 1 (打开)`
  * `0x02` (全局氛围灯无级调色) -> 参数 P1,P2,P3: `R`, `G`, `B` 值 (0~255)
* **`Checksum` 校验和**：对抗电磁环境污染的最终校验字。

---

## 2. 前端发射中枢与降噪防卡死 (Throttler)

在手机/桌面端，主界面将衍生出专门的 **[群组调色盘] / [物理总控开关]** UI。
用户在屏幕上大范围滑动选取渐变色时，极容易触发每秒钟上百次重发要求，直接将 Android 或 iOS 的蓝牙基带打死或报错（`Advertise Error`）。

### 建立 `BroadcastThrottler` (引擎发源池)
在 `core/ble-core/` 或 `ble_manager.dart` 内，必须引入防冲刷发流器：
```javascript
// 伪代码架构：
class BroadcastThrottler {
   private payload = null;
   private isAdvertising = false;
   
   // 挂载 RequestAnimationFrame 层级的限流
   updateGroupColor(r, g, b) {
      this.payload = [0x02, r, g, b];
      this.throttleFlush(); // 每 100ms 只允许强制覆盖更新一次蓝牙广播天线的 Payload
   }
}
```

---

## 3. 硬件下位机：无极窃听者架构与硬件分水岭 (Hardware Compatibility)

在 Smart BLE 生态中，为了兼容不同成本和性能的下位机硬件，我们在硬件接收端划分了 **两大阵营 (Tiered Compatibility Strategy)**：

### 阵营 A: 原生无线芯片 (如 ESP32 / STM32WBA) -> 支持零延迟广播群控
只有具备自持射频基带 (Baseband) 的硬件，单片机才能直接在蓝牙等待模式下开启 **Scan / Observer (观察者)** 能力。
我们在项目自带的 `hardware/esp32/LightBLE/src/main.cpp` 中已全面实现：通过 `NimBLEScanCallbacks` 静默拦截带有 `0xABCD` 前缀的 Manufacturer Specific Data 帧。让上百盏灯无需建立连接，瞬间解析出 RGB 并驱动 PWM 同步变色，这是该架构最高级的商用体现。

### 阵营 B: 独立主控+透传天线模块 (如 STM32F103 + JDY-23) -> 仅支持经典 GATT 连接控制
传统的双模拼接板架构（如我们官方演示工程 `hardware/stm32/BlePeripheralMock`）中，蓝牙模块 (JDY-23 等) 出厂固件被焊死，**物理层级上不支持向下位机主控开放外界环境的广播窃听数据流**。
针对这类下位机，Smart BLE 生态框架会自动使其降级为“标准点对点网络”。它们**物理上无法参与**零延迟广播矩阵，但在手机主控单一配对连上后，仍旧能通过内部 C 协议解析器正常吃掉相同的控制协议包（常规下发的 `0x02, R, G, B` 发包）。

### 底层过滤改造代码示例 (针对阵营 A芯片)
在单片机 C 语言端，将截获点对点数据，映射为主机观察者模式：
```c
// 硬件 C 层中断截获
void on_ble_adv_report_scanned(BleAdvReport* report) {
    // 1. 是否是 Manufacturer Data？是否头部为 0xABCD？
    if(check_smart_ble_signature(report->data)) {
        // 2. 剥离得到 [CMD] [P1] [P2] [P3]
        if(report->cmd == 0x02) {
             // 3. 直接通过 Bsp 驱动无缝变光！！全屋上百盏等同帧率响应！
             BSP_LED_Color(report->p1, report->p2, report->p3);
        }
    }
}
```

## 4. 生态展望

一旦这套跨端群控基底搭建完成，项目就将正式踏足高级商业场规。它能瞬间从单调的工具应用，无感衍生出**“高定智能电竞仓”、“车载独立外设屏律动控制”、“场馆全局矩阵打光器”**等超级场景！
