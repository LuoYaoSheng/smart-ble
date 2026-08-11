# Smart HID BLE Provisioning Protocol v1.1

> 修订重点：设备当前没有二维码。

## 1. 目标

BLE 只负责：
- 搜索 Smart HID
- 建立 BLE 连接
- 读取 Device Info
- Wi-Fi 配置
- 写入 ControlHub Pairing 信息
- 查询状态
- 诊断
- 重启 / Reset Network / Reset Hub

BLE 不负责 HID 实时控制。

## 2. 当前主流程

```text
Smart HID 进入 Provisioning Mode
→ BLE Toolkit+ 搜索附近 Smart HID
→ 根据 Smart HID Provisioning Service UUID 过滤
→ 用户选择设备
→ BLE 连接
→ 读取 Device Info / Device ID
→ 扫 ControlHub 动态 Pairing QR
→ 写入 Hub Address + Pairing Token
→ Wi-Fi Scan
→ 用户选择 Wi-Fi
→ 写 Wi-Fi Credential
→ ESP32 连接 Wi-Fi
→ Pair ControlHub
→ 获取 MQTT Credential
→ MQTT Connected
→ USB HID Ready
→ 完成
```

## 3. 设备识别

不依赖 Device QR。

BLE 广播：
- 专属 Provisioning Service UUID
- 设备名：`SHID-XXXXXX`

设备连接后通过 `hid-info/get_info` 获取：

```json
{
  "product": "smart-hid",
  "device_id": "HID-A82F94C1",
  "hardware": "S3-01",
  "firmware": "1.0.0",
  "protocol": "1.0",
  "configured": false,
  "usb_hid_ready": true
}
```

## 4. ControlHub QR

整个流程当前只保留 ControlHub 动态二维码。

逻辑载荷：

```json
{
  "v": 1,
  "hub_id": "CH-A82F1139",
  "host": "192.168.1.8",
  "pairing_port": 17892,
  "token": "temporary-token",
  "expires_at": 1786432000
}
```

Pairing Token：
- 短期
- 一次性
- 随机
- 成功后立即失效

## 5. 自定义 Endpoint

建议：
- `hid-info`
- `hub-config`
- `hid-action`

### hid-info
- get_info

### hub-config
- set

### hid-action
- get_status
- reboot
- reset_network
- reset_hub

## 6. 配置状态

```text
Wi-Fi:
unconfigured / connecting / connected / failed

Hub:
unconfigured / configured / pairing / paired / failed

Control Connection:
disconnected / connecting / connected

USB:
not_ready / ready / error
```

## 7. Security

当前不把“每设备二维码凭据”写死为 V1 前提。

开发阶段：
- 完成 BLE Provisioning 功能闭环
- Security 策略可配置

量产阶段再确定：
- 每设备 Setup Code
- 包装二维码
- 标签凭据
- 其他带外凭据方式

## 8. 错误码

```text
1001 INVALID_REQUEST
1002 UNSUPPORTED_OPERATION
1003 UNSUPPORTED_VERSION
1004 INVALID_PARAMETER
1005 INVALID_STATE

2001 DEVICE_BUSY
2002 CONFIG_WRITE_FAILED
2003 NVS_ERROR

3001 HUB_NOT_CONFIGURED
3002 HUB_UNREACHABLE
3003 PAIR_TOKEN_INVALID
3004 PAIR_TOKEN_EXPIRED
3005 PAIR_TOKEN_USED
3006 HUB_REJECTED
3007 MQTT_AUTH_FAILED
3008 MQTT_CONNECT_FAILED

4001 SECURITY_SESSION_REQUIRED
4002 AUTH_FAILED
4003 SESSION_EXPIRED
4004 PERMISSION_DENIED

5001 INTERNAL_ERROR
5002 TIMEOUT
5003 NETWORK_ERROR
```

## 9. 恢复原则

- Wi-Fi 失败：只退回 Wi-Fi
- Pair Token 过期：只重新获取 ControlHub QR
- MQTT 失败：进入诊断，不重做 Wi-Fi
- 微信切后台：恢复后重新连接并 GET STATUS
