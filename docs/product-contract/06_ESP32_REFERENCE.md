# ESP32 参考硬件与固件契约

## 角色

`hardware/esp32/LightBLE` 是产品第一个完整版本的公开标准测试夹具，不只是示例代码。任何人使用一块常见 ESP32 开发板和 LED，都应能复现扫描、连接、GATT、Notify、错误处理和 OTA。

## 推荐测试硬件

| 数量 | 硬件 | 用途 |
|---:|---|---|
| 1 | ESP32 DevKit / ESP32-WROOM-32 | 主参考外设 |
| 1 | 板载 LED 或 GPIO2 LED | 开/关/闪烁的可见结果 |
| 1 | USB 数据线 | 刷写和串口日志 |
| 1 | Android 真机 | 第一正式客户端 |
| 1 | 安装微信的手机 | 微信小程序真机 |
| 可选 1 | 第二手机 / nRF Connect | 观察手机 Peripheral 广播 |
| 可选 1 | 第二块 ESP32 | 多设备连接和事件隔离 |

每次测试记录板型、芯片、Flash、固件 commit、固件版本、客户端 commit、手机和系统版本。

## 当前参考协议

### 主服务

| 项 | UUID | 属性/用途 |
|---|---|---|
| Service | `4fafc201-1fb5-459e-8fcc-c5c9c331914b` | LED 和状态 |
| Control | `beb5483e-36e1-4688-b7f5-ea07361b26a8` | Read/Write/Notify |
| Notify | `beb5483e-36e1-4688-b7f5-ea07361b26a9` | Write/Notify/系统信息 |

### 权限演示服务

Service：`4fafc201-1fb5-459e-8fcc-c5c9c331914c`

| 别名 | UUID 末尾 | 预期属性 |
|---|---|---|
| READ_ONLY | `26b0` | Read |
| WRITE_ONLY | `26b1` | Write |
| NOTIFY_ONLY | `26b2` | Notify |
| READ_WRITE | `26b3` | Read + Write |
| READ_NOTIFY | `26b4` | Read + Notify |
| WRITE_NOTIFY | `26b5` | Write + Notify |
| ALL | `26b6` | Read + Write + Notify |

### OTA 服务

| 项 | UUID | 用途 |
|---|---|---|
| Service | `4fafc201-1fb5-459e-8fcc-c5c9c331914d` | OTA |
| Control | `beb5483e-36e1-4688-b7f5-ea07361b26c0` | start/commit/abort/状态读取 |
| Data | `beb5483e-36e1-4688-b7f5-ea07361b26c1` | 固件分包 |
| Status | `beb5483e-36e1-4688-b7f5-ea07361b26c2` | ready/progress/success/error |

协议常量正典应最终只保留一份机器可读定义；当前 `core/protocols/smart-ble-protocol.ts` 与固件宏必须通过自动门禁比较。

## LED 命令

| 用例 | HEX | 文本 | 设备结果 |
|---|---|---|---|
| 关闭 | `FF 00` | `关灯` | LED 关闭，响应 state=off |
| 常亮 | `FF 01` | `开灯` | LED 常亮，响应 state=on |
| 快闪 | `FF 02` | — | 200ms 节奏 |
| 慢闪 | `FF 03` | — | 1000ms 节奏 |

固件和客户端必须对未知命令返回明确错误或不支持状态，不能返回固定“成功”。

## 固件必须提供的可观察结果

- 广播名和 Service UUID
- 连接/断开串口日志
- 当前 LED 状态和闪烁模式
- uptime、firmware_version、设备信息
- Notify 订阅和发送次数
- OTA received/total/percent、终态和重启
- 错误码，不只打印自然语言

## 故障注入模式（待实现）

通过编译参数或专用测试特征值触发：

| 模式 | 目的 |
|---|---|
| delayed_response | 验证客户端 loading、超时和取消 |
| disconnect_on_write | 验证写入中断和重连 |
| reject_write | 验证 GATT 错误展示 |
| notify_burst | 验证事件队列和日志上限 |
| ota_wrong_size | 验证 size mismatch |
| ota_fail_commit | 验证设备拒绝 commit |
| ota_no_success | 验证客户端不会把写完当成功 |

故障模式必须默认关闭，且在广播名或设备状态中可识别，避免被误当生产固件。

## 构建、刷写与串口

```bash
cd hardware/esp32/LightBLE
pio run
pio run -t upload --upload-port <PORT>
pio device monitor --port <PORT> --baud 115200
```

`platformio.ini` 目前写死 `COM3`，不符合跨电脑开源使用要求。实施阶段应移除固定端口，让命令行或本机未跟踪配置提供端口。

## 测试分层

1. **Firmware static**：UUID、命令、分区和版本一致。
2. **PlatformIO native/unit**：编解码、状态机、错误码和 OTA 边界。
3. **ESP32 on-target**：GPIO、NimBLE、Notify 和 Update API。
4. **Android integration**：UniApp Android App 完成 Core/OTA。
5. **微信 integration**：微信小程序完成允许能力。
6. **Observer test**：第二设备核对手机广播。

当前 `test/` 只有 README，因此 ESP-008 为发布缺口。

## 证据产物

每轮保存：

```text
output/verification/<date>-<commit>/
├── environment.md
├── firmware-build.txt
├── serial.log
├── android/
├── wechat/
├── ota/
└── result-matrix.md
```

截图必须同时能识别操作、设备和结果；LED 变化类用短视频或前后照片，协议类附串口/客户端日志。
