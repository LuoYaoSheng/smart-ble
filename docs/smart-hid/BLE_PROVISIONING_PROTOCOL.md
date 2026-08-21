# Smart HID BLE Provisioning Protocol V1

> **权威定义**：[`core/protocols/hid-provisioning-protocol.ts`](../../core/protocols/hid-provisioning-protocol.ts)（本仓库侧事实源）。
> **跨仓库正典**：Smart-HID-Workspace `protocols/ble/PROVISIONING_V1.md`（固件与小程序共同遵守；两侧同步修改）。
> 历史版本 v1.1（Protocomm endpoint / fe5a UUID / 数字错误码）已废弃，溯源见 Smart-HID-Workspace `docs/archive/03`。

## 1. 范围

BLE 只负责：设备发现 / 配网 / 状态查询。**HID 实时控制不走 BLE**（走 ControlHub HTTP → MQTT）。

## 2. 流程总览

```text
BLE Toolkit+（小程序）
  → 扫描 Provisioning Service UUID
  → 连接（Just Works 配对加密）
  → 读 Device Info
  → 扫 ControlHub 动态 Pairing QR（shid://pair?token=…&host=…&port=…）
  → 分帧写入 Provision Input（Wi-Fi + hub + token 一个 JSON）
  → 订阅 Provision Status
  → 设备：连 Wi-Fi → POST hub pairing → 拿 MQTT 凭据 → NVS commit → MQTT → READY
```

注意：配网候选是**单次写入**（Wi-Fi 凭据 + hub 地址 + 一次性 token 同一个 JSON）。
MQTT 账号密码**不经过小程序**——设备连上 Wi-Fi 后用 token 调 ControlHub 配对接口，凭据在响应里签发给设备。

## 3. GATT 结构

| 项 | UUID | 权限 |
|---|---|---|
| Provisioning Service | `9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04` | — |
| Device Info | `9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04` | read + notify |
| Provision Input | `9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04` | **write（要求加密链路）** |
| Provision Status | `9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04` | read + notify |

广播：ADV 携带 128-bit Service UUID（可据此过滤）；Scan Response 设备名 `SHID-XXXXXXXX`。

## 4. 分帧（Provision Input）

```text
帧 = [seq:u8][total:u8][len:u8][payload:len 字节]
```

- seq 从 0 递增；total = 总块数（1–64）；每块 payload ≤ 128B
- 客户端按协商 MTU 切块（MTU 23 时每块 17B 同样合法）
- 收到 seq=0 视为新传输开始（出错可从 0 整体重发）；乱序由设备丢弃报错
- 组装上限 1024B

## 5. Provision Input（组装后 JSON）

```json
{
  "v": 1,
  "wifi_ssid": "home-net",
  "wifi_password": "pass1234",
  "hub_host": "192.168.1.8",
  "hub_port": 17892,
  "token": "0123456789abcdef0123456789abcdef"
}
```

`hub_port` 可省略（默认 17892）；token 为 5 分钟一次性，设备不持久化到 active 配置。

## 6. Device Info / Provision Status

```json
{"product":"smart-hid","protocol":"1.0","device_id":"HID-ABCD1234","firmware":"1.1.0","state":"provisioning","provisioned":false}
```

```json
{"state":"connecting_wifi","step":"connecting_wifi","error":null}
{"state":"provisioning","step":"wifi_failed","error":"wifi_failed"}
```

状态机 `state`：boot / load_config / unprovisioned / provisioning / connecting_wifi / pairing / mqtt_connecting / ready / recovery / error

步骤 `step`：received / connecting_wifi / wifi_connected / pairing / pairing_success / mqtt_connecting / ready

## 7. 错误码（稳定字符串）

| 错误码 | 含义 | 客户端提示 |
|---|---|---|
| `invalid_payload` | candidate JSON/字段非法 | 检查输入 |
| `wifi_failed` | Wi-Fi 连不上 | 检查 SSID/密码 |
| `controlhub_unreachable` | pairing 端点不可达 | 检查 ControlHub 运行 / 地址可达 |
| `pairing_invalid` | HTTP 404 token 不存在 | 重新扫码 |
| `pairing_expired` | HTTP 410 token 过期 | 重新扫码 |
| `pairing_used` | HTTP 409 token 已消费 | 重新扫码 |
| `mqtt_invalid` | MQTT 连接失败 | 进入诊断 |
| `storage_failed` | NVS 写失败 / 版本未知 | 重试或联系支持 |

恢复原则：Wi-Fi 失败只退回 Wi-Fi；token 失效只重新扫码；MQTT 失败进诊断不重做 Wi-Fi；小程序切后台恢复后重连并读 Status。

## 8. 安全模型（如实声明）

- Provision Input 要求加密链路：bonding + LE Secure Connections，Just Works（IO capability = NoInputNoOutput）
- **Just Works ≠ MITM 抗性**：配对瞬间在场的攻击者理论上可介入（V1 已知取舍）
- 设备身份根（出厂 Setup Code / Secure Boot / Flash Encryption）属后续 Production Security
- 设备 READY 后停止 BLE 广播
