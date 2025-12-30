# Smart BLE 协议定义文档

> 版本：v1.0
> 更新日期：2024-12-30
> 项目：Smart BLE - 跨平台蓝牙调试工具

---

## 1. 概述

本文档定义 Smart BLE 项目使用的所有蓝牙协议相关内容，包括标准服务 UUID、特征值 UUID、自定义协议和数据格式规范。

---

## 2. BLE 基础概念

### 2.1 GATT (Generic Attribute Profile)
GATT 是 BLE 设备间数据通信的配置文件，定义了：
- **Profile（配置文件）**：特定用例的行为规范
- **Service（服务）**：功能的集合
- **Characteristic（特征值）**：数据的具体值
- **Descriptor（描述符）**：特征值的属性描述

### 2.2 UUID 格式
BLE 使用 128 位 UUID 唯一标识服务和特征值：

```
完整 UUID: 0000xxxx-0000-1000-8000-00805F9B34FB
短 UUID:   xxxx (仅用于标准 UUID)
```

标准蓝牙 UUID 基础：
```
Bluetooth Base UUID: 00000000-0000-1000-8000-00805F9B34FB
```

---

## 3. 标准服务 UUID 定义

### 3.1 通用服务

| UUID (16位) | 完整 UUID | 服务名称 | 说明 |
|-------------|-----------|----------|------|
| 1800 | 00001800-0000-1000-8000-00805F9B34FB | Generic Access | 通用访问服务，包含设备名称和外观 |
| 1801 | 00001801-0000-1000-8000-00805F9B34FB | Generic Attribute | 通用属性服务 |
| 180A | 0000180A-0000-1000-8000-00805F9B34FB | Device Information | 设备信息服务，包含厂商、型号等 |
| 180F | 0000180F-0000-1000-8000-00805F9B34FB | Battery Service | 电池服务 |
| 1812 | 00001812-0000-1000-8000-00805F9B34FB | HID Service | 人机接口设备服务 |
| 1813 | 00001813-0000-1000-8000-00805F9B34FB | Scan Parameters | 扫描参数服务 |
| 1819 | 00001819-0000-1000-8000-00805F9B34FB | Location and Navigation | 位置和导航服务 |

### 3.2 JavaScript 定义

```javascript
// 标准蓝牙服务 UUID 映射
export const BLE_SERVICES = {
    '1800': '通用访问',
    '1801': '通用属性',
    '180A': '设备信息',
    '180F': '电池服务',
    '1812': '人机接口设备',
    '1813': '扫描参数',
    '1819': '位置和导航'
}

// 获取服务名称
export function getServiceName(uuid) {
    const shortUUID = getShortUUID(uuid)
    return BLE_SERVICES[shortUUID] || '未知服务'
}
```

---

## 4. 标准特征值 UUID 定义

### 4.1 通用特征值

| UUID (16位) | 完整 UUID | 特征值名称 | 属性 | 说明 |
|-------------|-----------|------------|------|------|
| 2A00 | 00002A00-0000-1000-8000-00805F9B34FB | Device Name | Read | 设备名称 |
| 2A01 | 00002A01-0000-1000-8000-00805F9B34FB | Appearance | Read | 外观 |
| 2A02 | 00002A02-0000-1000-8000-00805F9B34FB | Peripheral Privacy Flag | Read | 外围隐私标志 |
| 2A03 | 00002A03-0000-1000-8000-00805F9B34FB | Reconnection Address | Write | 重连地址 |
| 2A04 | 00002A04-0000-1000-8000-00805F9B34FB | Peripheral Preferred Connection Parameters | Read | 首选连接参数 |
| 2A05 | 00002A05-0000-1000-8000-00805F9B34FB | Service Changed | Indicate | 服务更改 |
| 2A19 | 00002A19-0000-1000-8000-00805F9B34FB | Battery Level | Read,Notify | 电池电量 |
| 2A23 | 00002A23-0000-1000-8000-00805F9B34FB | System ID | Read | 系统 ID |
| 2A24 | 00002A24-0000-1000-8000-00805F9B34FB | Model Number String | Read | 型号 |
| 2A25 | 00002A25-0000-1000-8000-00805F9B34FB | Serial Number String | Read | 序列号 |
| 2A26 | 00002A26-0000-1000-8000-00805F9B34FB | Firmware Revision String | Read | 固件版本 |
| 2A27 | 00002A27-0000-1000-8000-00805F9B34FB | Hardware Revision String | Read | 硬件版本 |
| 2A28 | 00002A28-0000-1000-8000-00805F9B34FB | Software Revision String | Read | 软件版本 |
| 2A29 | 00002A29-0000-1000-8000-00805F9B34FB | Manufacturer Name String | Read | 制造商名称 |

### 4.2 JavaScript 定义

```javascript
// 标准蓝牙特征值 UUID 映射
export const BLE_CHARACTERISTICS = {
    '2A00': '设备名称',
    '2A01': '外观',
    '2A02': '外围隐私标志',
    '2A03': '重连地址',
    '2A04': '外围首选连接参数',
    '2A05': '服务更改',
    '2A19': '电池电量',
    '2A23': '系统ID',
    '2A24': '型号',
    '2A25': '序列号',
    '2A26': '固件版本',
    '2A27': '硬件版本',
    '2A28': '软件版本',
    '2A29': '制造商名称'
}

// 获取特征值名称
export function getCharacteristicName(uuid) {
    const shortUUID = getShortUUID(uuid)
    return BLE_CHARACTERISTICS[shortUUID] || '未知特征值'
}
```

---

## 5. Smart BLE 自定义协议

### 5.1 ESP32 灯控服务

#### 服务定义
```
服务 UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
服务名称: 智能蓝牙服务
```

#### 特征值定义

##### 控制特征值 (Write Characteristic)
```
UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8
属性: Read, Write, Notify
说明: LED 控制和数据响应
```

**命令格式**：

| 命令 | HEX 格式 | 文本格式 | 效果 |
|------|----------|----------|------|
| 开灯（常亮） | `FF 01` | `开灯` | LED 常亮 |
| 关灯 | `FF 00` | `关灯` | LED 关闭 |
| 快闪 | `FF 02` | - | LED 200ms 闪烁 |
| 慢闪 | `FF 03` | - | LED 1000ms 闪烁 |

**响应格式**：
```json
{
    "type": "write_response",
    "command": "FF01",
    "led_state": "on",
    "blink_pattern": 1,
    "mode": "常亮"
}
```

##### 通知特征值 (Notify Characteristic)
```
UUID: beb5483e-36e1-4688-b7f5-ea07361b26a9
属性: Read, Write, Notify
说明: 系统信息推送和状态更新
```

**连接通知**：
```json
{
    "type": "connection",
    "status": "connected"
}
```

**断开通知**：
```json
{
    "type": "connection",
    "status": "disconnected"
}
```

**定期状态推送**（每 5 秒）：
```json
{
    "type": "status",
    "led_state": true,
    "uptime": 3605000
}
```

**读取返回数据**：
```json
{
    "type": "device_status",
    "led_state": "on",
    "blink_pattern": 1,
    "uptime": 3600,
    "device_name": "BLEToolkit-Server",
    "firmware_version": "1.0.0"
}
```

### 5.2 权限演示服务

#### 服务定义
```
服务 UUID: 4fafc201-1fb5-459e-8fcc-c5c9c331914c
服务名称: 权限演示服务
```

#### 特征值定义（7种权限组合）

| UUID | 后缀 | 属性 | 说明 |
|------|------|------|------|
| beb5483e-36e1-4688-b7f5-ea07361b26b0 | ReadOnly | Read | 只读特征值 |
| beb5483e-36e1-4688-b7f5-ea07361b26b1 | WriteOnly | Write | 只写特征值 |
| beb5483e-36e1-4688-b7f5-ea07361b26b2 | NotifyOnly | Notify | 只通知特征值 |
| beb5483e-36e1-4688-b7f5-ea07361b26b3 | ReadWrite | Read, Write | 读写特征值 |
| beb5483e-36e1-4688-b7f5-ea07361b26b4 | ReadNotify | Read, Notify | 读和通知特征值 |
| beb5483e-36e1-4688-b7f5-ea07361b26b5 | WriteNotify | Write, Notify | 写和通知特征值 |
| beb5483e-36e1-4688-b7f5-ea07361b26b6 | All | Read, Write, Notify | 读写和通知特征值 |

---

## 6. UUID 工具函数

### 6.1 UUID 格式化

```javascript
/**
 * 格式化 UUID（去除破折号，转大写）
 * @param {string} uuid - 原始 UUID
 * @returns {string} 格式化后的 UUID
 */
export function formatUUID(uuid) {
    return uuid.replace(/-/g, '').toUpperCase()
}

/**
 * 获取短 UUID
 * 如果是标准 UUID 则返回后 4 位，否则返回完整 UUID
 * @param {string} uuid - 原始 UUID
 * @returns {string} 短 UUID
 */
export function getShortUUID(uuid) {
    const formattedUUID = formatUUID(uuid)
    // 标准蓝牙 UUID: 0000xxxx-0000-1000-8000-00805F9B34FB
    if (formattedUUID.length === 32 &&
        formattedUUID.startsWith('0000') &&
        formattedUUID.endsWith('00001000800000805F9B34FB')) {
        return formattedUUID.substring(4, 8)
    }
    return formattedUUID
}

/**
 * 检查是否为标准 UUID
 * @param {string} uuid - UUID 字符串
 * @returns {boolean}
 */
export function isStandardUUID(uuid) {
    const shortUUID = getShortUUID(uuid)
    return shortUUID.length === 4
}
```

### 6.2 UUID 验证

```javascript
/**
 * 验证 UUID 格式
 * @param {string} uuid - UUID 字符串
 * @returns {boolean}
 */
export function isValidUUID(uuid) {
    // 完整 128 位 UUID 格式
    const fullPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    // 短 UUID 格式（4 或 8 位）
    const shortPattern = /^[0-9a-fA-F]{4,8}$/

    return fullPattern.test(uuid) || shortPattern.test(uuid)
}
```

---

## 7. 数据格式规范

### 7.1 数据编码格式

#### UTF-8 文本
- 适用场景：可读文本数据
- 编码方式：UTF-8
- 传输方式：ArrayBuffer

```javascript
// UTF-8 编码
function stringToBuffer(str) {
    const encoder = new TextEncoder()
    return encoder.encode(str).buffer
}

// UTF-8 解码
function bufferToString(buffer) {
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(buffer)
}
```

#### HEX 格式
- 适用场景：二进制数据、控制命令
- 格式：16 进制字符串
- 转换规则：每 2 个字符转换为 1 字节

```javascript
// HEX 转 ArrayBuffer
function hexToBuffer(hex) {
    const cleanHex = hex.replace(/\s/g, '')
    const buffer = new ArrayBuffer(cleanHex.length / 2)
    const view = new Uint8Array(buffer)

    for (let i = 0; i < cleanHex.length; i += 2) {
        view[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
    }
    return buffer
}

// ArrayBuffer 转 HEX
function bufferToHex(buffer) {
    const bytes = new Uint8Array(buffer)
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ')
}
```

### 7.2 数据格式检测

```javascript
/**
 * 检测数据格式
 * @param {string} data - 输入数据
 * @returns {string} 'hex' | 'utf8'
 */
function detectDataFormat(data) {
    // 检查是否为有效的 HEX 字符串
    const hexPattern = /^[0-9A-Fa-f]+$/
    if (hexPattern.test(data) && data.length % 2 === 0) {
        return 'hex'
    }
    return 'utf8'
}
```

---

## 8. BLE 数据包结构

### 8.1 广播数据包结构

```
┌─────────────────────────────────────────────────┐
│                  广播数据包                      │
├─────────────────────────────────────────────────┤
│  Length │ Type │ Data                            │
│  1 byte │ 1 byte │ Length-1 bytes               │
├─────────────────────────────────────────────────┤
│  AD Flags                                         │
│  AD Complete Local Name                          │
│  AD 16-bit Service UUIDs (Complete/Incomplete)   │
│  AD Manufacturer Specific Data                   │
│  AD Service Data (16/32/128-bit)                 │
└─────────────────────────────────────────────────┘
```

### 8.2 常见 AD Type

| Type | 值 | 说明 |
|------|-----|------|
| Flags | 0x01 | 广播标志 |
| Incomplete UUID 16 | 0x02 | 不完整的 16 位 UUID 列表 |
| Complete UUID 16 | 0x03 | 完整的 16 位 UUID 列表 |
| Incomplete UUID 32 | 0x04 | 不完整的 32 位 UUID 列表 |
| Complete UUID 32 | 0x05 | 完整的 32 位 UUID 列表 |
| Incomplete UUID 128 | 0x06 | 不完整的 128 位 UUID 列表 |
| Complete UUID 128 | 0x07 | 完整的 128 位 UUID 列表 |
| Short Local Name | 0x08 | 短设备名 |
| Complete Local Name | 0x09 | 完整设备名 |
| Manufacturer Data | 0xFF | 厂商自定义数据 |

---

## 9. 连接参数

### 9.1 连接参数定义

| 参数 | 范围 | 说明 |
|------|------|------|
| minInterval | 6-3200 (7.5ms - 4s) | 最小连接间隔 |
| maxInterval | 6-3200 (7.5ms - 4s) | 最大连接间隔 |
| latency | 0-499 | 从设备延迟 |
| timeout | 10-3200 (100ms - 32s) | 连接超时 |

### 9.2 推荐参数

```javascript
// 低功耗场景
const lowPowerParams = {
    minInterval: 400,  // 500ms
    maxInterval: 800,  // 1000ms
    latency: 4,        // 允许跳过 4 个连接事件
    timeout: 400       // 4s
}

// 低延迟场景
const lowLatencyParams = {
    minInterval: 6,    // 7.5ms
    maxInterval: 6,    // 7.5ms
    latency: 0,
    timeout: 100       // 1s
}

// 平衡场景
const balancedParams = {
    minInterval: 24,   // 30ms
    maxInterval: 40,   // 50ms
    latency: 0,
    timeout: 200       // 2s
}
```

---

## 10. ESP32 固件协议

### 10.1 固件信息

```cpp
#define DEVICE_NAME "BLEToolkit-Server"
#define FIRMWARE_VERSION "1.0.0"

// 主服务
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID_WRITE "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHARACTERISTIC_UUID_NOTIFY "beb5483e-36e1-4688-b7f5-ea07361b26a9"

// 权限演示服务
#define SERVICE_UUID_PERMISSIONS "4fafc201-1fb5-459e-8fcc-c5c9c331914c"
```

### 10.2 LED 控制代码

```cpp
// 闪烁模式定义
#define LED_OFF     0  // 关闭
#define LED_ON      1  // 常亮
#define LED_FAST    2  // 快闪 (200ms)
#define LED_SLOW    3  // 慢闪 (1000ms)

// 命令处理
if (cmd == 0xFF) {
    switch (param) {
        case 0x00: blinkPattern = LED_OFF; break;
        case 0x01: blinkPattern = LED_ON; break;
        case 0x02: blinkPattern = LED_FAST; break;
        case 0x03: blinkPattern = LED_SLOW; break;
    }
}
```

### 10.3 响应格式

```cpp
// 写入响应
StaticJsonDocument<200> doc;
doc["type"] = "write_response";
doc["command"] = hexStr;
doc["led_state"] = digitalRead(LED_PIN) ? "on" : "off";
doc["blink_pattern"] = blinkPattern;
doc["mode"] = "常亮";
serializeJson(doc, jsonString);
pCharacteristic->setValue(jsonString.c_str());
pCharacteristic->notify();
```

---

## 11. 常见 BLE 设备协议示例

### 11.1 心率带 (Heart Rate Monitor)

```
服务 UUID: 180D (Heart Rate)
特征值 UUID: 2A37 (Heart Rate Measurement)

数据格式:
- Byte 0: Flags
  - Bit 0: Heart Rate Value Format (0=8bit, 1=16bit)
  - Bit 1-2: Sensor Contact Status
  - Bit 3: Energy Expended Status
  - Bit 4: RR-Interval Status
- Byte 1 (或 1-2): Heart Rate Value
```

### 11.2 速度/踏频传感器

```
服务 UUID: 1816 (CSC - Cycling Speed and Cadence)
特征值 UUID: 2A5B (CSC Measurement)

数据格式:
- Byte 0: Flags
  - Bit 0: Wheel Revolution Data Present
  - Bit 1: Crank Revolution Data Present
- Wheel Data (if flag set):
  - Byte 1-4: Cumulative Wheel Revolutions
  - Byte 5-6: Last Wheel Event Time
- Crank Data (if flag set):
  - Byte X-X+3: Cumulative Crank Revolutions
  - Byte X+4-X+5: Last Crank Event Time
```

---

## 12. 附录

### 12.1 相关文档
- [功能规格文档](./01-functional-specs.md)
- [数据流图文档](./02-data-flow.md)
- [UI 流程文档](./04-ui-flows.md)
- [平台差异说明](./05-platform-differences.md)

### 12.2 参考资源
- [Bluetooth SIG Assigned Numbers](https://www.bluetooth.com/specifications/assigned-numbers/)
- [GATT 规范](https://www.bluetooth.com/specifications/gatt/)
- [NimBLE-Arduino 文档](https://github.com/h2zero/NimBLE-Arduino)
