# E13 · P002 Smart HID 配网三方时序（真机/真网络/真 ControlHub）

> 事实源：`smart-hid-workspace/protocols/ble/PROVISIONING_V1.md`（canon）+
> `smart-hid-firmware/components/ble_provision/ble_provision.c`（GATT/SMP 行为）+
> `smart-hid-controlhub/docs/openapi.yaml`（HTTP 契约）。
> 本文是执行 T1–T7 前的三方配合基线，描述已逐条与上述源码核对。

## 图 A · 主成功链路（T1）

参与方：WEB=ControlHub Web 管理台（Windows 192.168.21.77 浏览器）、
APP=手机 BLE Toolkit+（P002 向导）、DEV=ESP32-S3 真固件、HUB=ControlHub 服务
（HTTP :17890 / 配对 :17892 / 内嵌 MQTT :17891）。

```mermaid
sequenceDiagram
    autonumber
    participant WEB as Web 管理台
    participant HUB as ControlHub
    participant APP as 手机 App P002
    participant DEV as ESP32-S3
    participant U as 用户/自动化

    WEB->>HUB: POST /api/v1/pairing/sessions (Bearer chk_…)
    HUB-->>WEB: session token + qr_payload（shid://pair?token&host&port，5min 有效）
    WEB->>WEB: 面板渲染 QR + 倒计时，轮询 GET /pairing/sessions/{token}

    U->>APP: 开始扫描（ADV 128bit Service UUID 过滤）
    APP->>DEV: BLE Connect（命中 SHID-XXXXXXXX 卡片 → 「Smart HID 配网」）
    DEV->>APP: ble_gap_security_initiate → 系统配对弹窗（Just Works，NoInputNoOutput）
    U->>APP: 点「配对」→ bonding → 链路加密（ENC_CHANGE status=0）
    APP->>DEV: requestMtu(247) + discoverServices + 订阅 1002/1004 notify
    APP->>DEV: 读 Device Info(1002)
    DEV-->>APP: {product:smart-hid, protocol:1.0, device_id:HID-…, firmware, state, provisioned:false}
    APP->>APP: 身份验证（verifySmartHidDeviceInfo）→ 进入填写配置

    U->>APP: 填 SSID/密码；扫 ControlHub 屏显 QR（或粘贴 shid://pair）
    APP->>APP: token + host:port 回填（仅内存，不落盘不写日志）
    U->>APP: 点「下发配置」
    APP->>DEV: createBond（已配对则快速返回）→ 分帧写 1003 [seq][total][len][payload]×N
    DEV->>DEV: 组装（≤1024B）→ candidate → NVS pending（成功才 promote）
    DEV-->>APP: notify step=received
    DEV->>DEV: 连 Wi-Fi（HJWY）
    DEV-->>APP: step=connecting_wifi → wifi_connected
    DEV->>HUB: POST :17892 /api/v1/pairing/device {device_id, token}
    HUB->>HUB: session pending→consumed（CAS）· 生成 MQTT 凭据 · 设备入表
    HUB-->>DEV: 200 {mqtt_host, mqtt_credentials}
    DEV-->>APP: step=pairing → pairing_success
    DEV->>DEV: 凭据持久化（pending.complete=1）→ promote active
    WEB->>HUB: 轮询命中 → 面板显示「配对成功」
    DEV->>HUB: MQTT CONNECT :17891（pairing 响应的 mqtt_host 是唯一来源）
    DEV-->>APP: step=mqtt_connecting → state=ready / provisioned=true
    DEV->>DEV: READY 即停 BLE 广播（canon §7）
    APP-->>U: 4 行全 ✓ → 「配置成功 · 设备 READY」→ 查看设备（重读 INFO）
    WEB->>HUB: GET /api/v1/devices → 设备条目 + MQTT online
```

## 图 B · 错误路径分叉（T2/T3/T4/T5）

全部沿图 A 同一条主干，按**分叉点**区分；App 侧行失败映射与恢复按钮
（`provisionErrorRow` / `provisionRecoveryAction`，与 canon §6 错误表逐条对齐）：

```mermaid
sequenceDiagram
    autonumber
    participant APP as App P002
    participant DEV as ESP32-S3
    participant HUB as ControlHub

    APP->>DEV: 分帧写 candidate（下图分叉点 ①）
    DEV-->>APP: error=invalid_payload（JSON/字段非法）→ 行:Wi-Fi → 返回表单修改
    DEV->>DEV: 连 Wi-Fi（分叉点 ②：T2 错密码）
    DEV-->>APP: error=wifi_failed → 行:Wi-Fi ✕ → 返回表单修改
    DEV->>HUB: POST :17892（分叉点 ③）
    alt 网络不可达 / 5xx
        DEV-->>APP: error=controlhub_unreachable → 行:Hub ✕ → 重新扫描配对码
    else token 不存在(404)
        DEV-->>APP: error=pairing_invalid（T3 伪 token）→ 行:Hub ✕ → 重新扫描配对码
    else token 过期(410) / 已消费(409)
        DEV-->>APP: error=pairing_expired / pairing_used → 行:Hub ✕ → 重新扫描配对码
    end
    DEV->>HUB: MQTT CONNECT :17891（分叉点 ④：T4 防火墙阻断）
    DEV-->>APP: error=mqtt_invalid → 行:MQTT ✕ → 运行诊断（重读两特征）
    DEV->>DEV: NVS 写失败（分叉点 ⑤）
    DEV-->>APP: error=storage_failed → 行:USB ✕ → 重新下发
```

App 侧独立于设备的两条失败路径（不经 DEV/HUB）：

- **timeout**：submit 后 60s 未见到终态（含「取消等待」主动触发）→ 行:MQTT ✕ → 重新下发。
- **connection_lost**：GATT 断开回调（T5：esptool 复位芯片注入）→
  填写页出现「已断开」横幅 + 重新连接；下发页报 `connection_lost` → 重新连接设备。

## 图 C · 已配网识别与重配（T6/T7）

```mermaid
sequenceDiagram
    autonumber
    participant WEB as Web 管理台
    participant HUB as ControlHub
    participant DEV as ESP32-S3
    participant APP as 手机 App

    Note over WEB,HUB: 已配网识别（三层）
    WEB->>HUB: GET /api/v1/devices（配对时入表，MQTT online 即在线）
    APP->>DEV: 读 Device Info → provisioned:true / state:ready
    Note over APP: 手机侧已知设备列表 = uni-app P003（Flutter 线如实标注未开放）

    Note over WEB,DEV: 重配路 A（主动）：管理台删除设备
    WEB->>HUB: DELETE /api/v1/devices/{id}（吊销 MQTT 凭据）
    DEV->>HUB: MQTT 持续失败/被拒
    DEV->>DEV: state=RECOVERY → BLE 重新广播 → 手机可从 P001 卡片再进 P002

    Note over DEV: 重配路 B（被动）：环境变化
    DEV->>DEV: active 连不上（Wi-Fi 改密/hub 迁移）→ RECOVERY → 重新广播

    Note over DEV: 安全模型：candidate 先 NVS pending，pairing 成功才 promote
    Note over DEV: 失败的重配尝试绝不破坏旧 active；READY 即停广播，删除/RECOVERY 才重新可见
```

## 图 D · E13 自动化驱动架构（本文档的执行方式）

uiautomator 对「Samsung + Flutter」组合无语义树（冻结），像素驱动已放弃；
系统弹窗（配对/权限）uiautomator **可见**。因此采用两层分工：

```mermaid
sequenceDiagram
    autonumber
    participant PC as Windows PC
    participant DAEMON as 弹窗守护(e13-pairing-daemon.py)
    participant IT as integration_test(设备上)
    participant SYS as 系统弹窗

    PC->>PC: pm grant 预授权（BLE×2/定位/相机）+ 唤醒解锁
    PC->>PC: curl POST pairing/sessions → qr_payload（token 输出掩码）
    PC->>DAEMON: 启动（dumpsys window 检测焦点 + uiautomator dump 定位按钮）
    PC->>IT: flutter test -d R5CR1284Y7H --dart-define P002_SCENARIO=… QR=…
    IT->>IT: ValueKey 语义驱动 App 内 UI（ssidField/pwdField/qrCard/qrParseBtn/submitBtn）
    IT-->>SYS: BLE Connect 触发系统配对弹窗
    DAEMON->>SYS: 检测「配对」→ 点按 → bonding 完成
    IT->>IT: 状态轮询（pumpUntil，禁止 pumpAndSettle——spinner 永不 settle）
    PC->>PC: 判定三路：① logcat P002: 标记 ② ControlHub API/面板 ③ 空口 ADV（BleAdvDump）
```

场景注入手段（全部真实生效，非模拟）：

| 注入 | 手段 | 场景 |
|---|---|---|
| 错密码 | dart-define 传入错误密码 | T2 |
| 伪 token | dart-define 传入 32hex 伪造串（Hub 404） | T3 |
| MQTT 阻断 | Windows 防火墙入站阻断 TCP 17891（需管理员，失败则 BLOCKED） | T4 |
| 设备断连 | `esptool --port COM13 run` 复位芯片（logcat 标记联动） | T5 |
| token 失效 | 等待 5min 过期或先消费一次 | 备用 |

## 据此推导的执行顺序（关键：READY 即停广播）

T1 成功会让设备停广播、后续场景扫不到设备，因此**失败类场景在前、成功链路在后**：

U-01 离开确认（一次性凭据）→ T2 错密码 → T3 伪 token → T4 MQTT 阻断+诊断 →
T5 取消等待+断连注入 → **T1 成功**（真 Wi-Fi+真 pairing+真 MQTT）→ T6 设备表核验 →
T7 删除设备 → RECOVERY 重新广播（空口）→ 再配成功 → Xiaomi 快乐路径（再删再配）→ 复原。
