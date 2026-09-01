# 11 通用 BLE / GATT 协议契约

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE Product / Protocol
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：Smart BLE 作为 Central 的通用 BLE/GATT 目标语义——操作、属性约束、编码、超时、分包、错误；与 LightBLE 夹具和 Smart HID 服务相关的服务/特征定义索引。

本文不负责：夹具行为细节（`12`）；Smart HID 协议（`13`）。

---

## 2. 协议登记表

| ID | 协议 | 定义处 |
|---|---|---|
| PROTO-001 | LightBLE 主服务（灯控/设备信息） | `12` 第 4 节 |
| PROTO-002 | LightBLE 权限演示服务 | `12` 第 5 节 |
| PROTO-003 | LightBLE OTA 服务事务 | `12` 第 7 节 |
| PROTO-004 | 设备响应 JSON 载荷 | 本文第 8 节 |
| PROTO-005 | Smart HID Provisioning V1 | `13` |
| PROTO-006 | Smart HID Pairing QR URI | `13` 第 5 节 |
| PROTO-007 | Smart HID 分帧 framing | `13` 第 6 节 |
| PROTO-008 | 手机广播 payload 编码（31 字节预算） | 本文第 7 节 |
| PROTO-009 | 夹具串口 JSON 观测流 | `12` 第 10 节 |
| PROTO-010 | Release Metadata Schema | `18` 第 4 节 |

---

## 3. Central 操作语义

| 操作 | 语义 | 超时 | 错误 |
|---|---|---|---|
| openAdapter | 打开适配器（指数重试 3） | 5s | ERR-BT-02 |
| startDiscovery | 开始扫描（generation） | — | ERR-SCAN-01 |
| stopDiscovery | 停止扫描 | 3s | ERR-SCAN-02 |
| connect | 创建连接（attempt 去重） | 10s | ERR-CONN-01 |
| discoverServices | 服务/特征发现 | 10s | ERR-CONN-02/03 |
| read | 读特征值（一次性 listener） | 3s | ERR-GATT-01 |
| write(text) | UTF-8 编码写入（队列） | 5s | ERR-GATT-04 |
| write(hex) | 严格偶数+`[0-9A-Fa-f]`校验→字节 | 5s | ERR-GATT-03（校验）/04 |
| setNotify(true/false) | 订阅/退订（双断） | 5s | ERR-GATT-07 |
| setMTU | 协商 MTU | 3s | ERR-GATT-05→保守 23 |
| disconnect | 主动断开（标记不重连） | 3s | ERR-CONN-04 |

属性约束矩阵：

| 特征属性 | Read | Write | Notify 订阅 |
|---|---|---|---|
| read | 允许 | 禁用（ERR-GATT-02） | 禁用 |
| write/writeNoResponse | 禁用 | 允许 | 禁用 |
| notify | 禁用 | 禁用 | 允许 |
| indicate | 禁用 | 禁用 | 允许（确认语义） |
| 组合 | 按位与 | 按位与 | 按位与 |

## 4. 编码与显示

- 读/推送值：HEX（大写、空格分组）+ 尝试 UTF-8 文本双显示；无效 UTF-8 仅 HEX。
- 写入 TEXT：UTF-8 字节；写入 HEX：严格偶数长度与字符集，非法时**不得调用平台 API**。
- 日志记录 HEX 与（可解码时）文本。

## 5. MTU 与分包

- 连接后协商 MTU（目标 247）；协商失败或平台不支持→保守 23；
- 单次 ATT write 有效载荷 = MTU−3；超长 payload 按此拆分顺序写入（Write Queue 串行）；
- 最后一个小分包必须完整发送（边界用例）；
- Smart HID 分帧另有协议级规则（`13` 第 6 节），不与通用分包混用。

## 6. 错误与超时汇总

见 `07` 第 3.4/3.5 节（ERR-CONN/ERR-GATT 唯一登记）。超时阈值归 NFR-008/009/010（`16`）。

## 7. PROTO-008 手机广播 payload 编码

- legacy 广播上限 31 字节（含 AD 结构头）；32 字节必须阻止；
- 预算算法为单一 SSOT（同一函数供 UI 预览与启动校验）；
- 字段优先级（超预算时按序提示删减）：flags(3) → 本地名/设备名 → Service UUID → 厂商数据；
- 禁止静默截断任何用户字段；
- Android 系统接管字段（设备名等）标注"由系统决定"（DEC-004），预算按系统实际可能写入计算并说明。

## 8. PROTO-004 设备响应 JSON 载荷

LightBLE 主服务 Control 特征的 JSON 响应类型：

```json
{"type":"write_response","ok":true,"echo":"FF01"}
{"type":"device_status","led":"on","uptime_s":123}
{"type":"system_info","name":"BLEToolkit-Server","firmware_version":"1.0.0"}
{"type":"connection","connected":true}
{"type":"status","code":0,"message":"ok"}
```

规则：`type` 必填；未知 type 保留原样展示（HEX 兜底）；`code!=0` 为设备侧错误，映射到页面错误呈现；`system_info.firmware_version` 是 OTA 版本回读来源之一。

## 9. 验收条件与关联测试规划

- [x] 操作/属性/编码/超时/分包/错误全部量化；
- [x] 31 字节预算规则唯一；
- [x] 协议登记表与 `12`/`13`/`18` 交叉引用一致。

关联计划测试：`TEST-U-009..014`（编解码/属性/预算）、`TEST-I-004/005/007/008`、`TEST-C-012`（协议契约静态校验：UUID/常量与定义一致）。
