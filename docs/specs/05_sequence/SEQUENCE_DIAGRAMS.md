# SEQUENCE_DIAGRAMS —— 时序图正典

> SOP v2.0 Phase 6 产出 · 2026-09-02
> 事实源：REVERSE_ANALYSIS §2.3（机制参数）/ §4（页面行为）/ §4.6.1（OTA）/ §8.4（协议契约）。参与方约定：**用户 / UI / 编排(composable) / 服务(services) / 运行时(ble-runtime) / 平台API(uni·wx·plus·插件) / 设备**。本产品无登录/支付/网络同步，v2.0 清单中的「蓝牙通信/OTA/连接」对应下列 8 图。

## 1. 扫描会话（F001/F002）

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as PAGE001
    participant CO as use-ble-scan
    participant RT as ble-runtime
    participant WX as 平台API

    U->>UI: 点「开始扫描」
    UI->>CO: toggle()
    CO->>RT: requestBleScanPermission()
    RT-->>CO: 授权通过
    CO->>RT: store.startScan(5000,'home-scan')
    RT->>WX: openBluetoothAdapter()（失败指数退避重试×3）
    RT->>WX: startBluetoothDevicesDiscovery(allowDuplicatesKey:true)
    loop 5 秒内
        WX-->>RT: onBluetoothDeviceFound(设备)
        RT->>RT: 1s 节流合并/normalize/显示名解析/Profile 匹配
    end
    RT-->>CO: 结果流（RSSI 降序·上限100·去重）
    CO-->>UI: 列表渲染
    Note over RT: 5s 超时自动停
    UI-->>U: toast「扫描完成 · 发现 N 台」
```

异常：授权拒绝→scanError(reason)→错误横幅+去设置；蓝牙未开(10001)→引导弹窗。

## 2. GATT 连接与服务发现（F006）

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as PAGE006
    participant CO as use-device-session
    participant RT as ble-runtime
    participant WX as 平台API
    participant D as 设备

    U->>UI: 点「连接」（带路由上下文）
    UI->>CO: openFromRoute(deviceId,…)
    CO->>RT: initBluetoothAdapter()
    CO->>RT: connectDevice()（优先复用未死会话）
    RT->>WX: createBLEConnection(deviceId)
    WX-->>D: 建链
    D-->>WX: connected
    Note over RT: 超时 10s → 自动重试×3（退避 n×2s）→ 手动重试
    RT->>WX: setBLEMTU(247)
    loop 每服务（期望服务重试 3×400ms）
        RT->>WX: getBLEDeviceServices / getBLEDeviceCharacteristics
        WX-->>RT: services / characteristics
    end
    RT-->>CO: 会话 READY（8 态机）
    CO-->>UI: 服务树渲染（UUID 中文名/未知占位）
```

## 3. 特征读 / 写 / 监听（F008/F009/F010）

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as PAGE006
    participant CO as use-device-session
    participant RT as ble-runtime
    participant WX as 平台API
    participant D as 设备

    U->>UI: 点「读取」
    CO->>RT: readValue(char)（临时 valueListener，3s 超时）
    RT->>WX: readBLECharacteristicValue
    D-->>WX: 值
    WX-->>RT: 回调
    RT-->>UI: 日志「接收」HEX+TEXT

    U->>UI: 写入弹窗（TEXT/HEX）→ 确认
    CO->>CO: encodeWritePayload（非法 HEX 拦截）
    CO->>RT: writeBleValue → 写队列（同设备串行/超时5s/深16）
    RT->>WX: writeBLECharacteristicValue
    D-->>WX: ACK
    RT-->>UI: toast「写入成功」+ 日志「写入」

    U->>UI: 点「开始监听」（防抖去重）
    CO->>RT: notifyController.toggle(true)
    RT->>WX: notifyBLECharacteristicValueChange(true)
    loop 设备推送
        D-->>WX: notify 值
        WX-->>RT: onBLECharacteristicValueChange
        RT-->>UI: 日志「接收」HEX+TEXT
    end
```

## 4. 被动断线与自动重连（F012）

```mermaid
sequenceDiagram
    participant D as 设备
    participant WX as 平台API
    participant RT as ble-runtime
    participant UI as UI

    D-->>WX: 断电/超出范围
    WX-->>RT: onBLEConnectionStateChange(connected=false)
    RT->>RT: 主动断开？→ 2s marker 区分；REMOTE_LOST → 被动
    RT->>RT: 该设备写队列 abort（PENDING→CANCELLED）
    RT->>RT: reconnect=SCHEDULED（backoff 1s/3s/5s，上限3次）
    loop 每次到点
        RT->>WX: createBLEConnection 重试
        alt 成功
            WX-->>RT: connected → 会话回 READY
            RT-->>UI: 恢复（详情页/已连接列表）
        else 失败
            RT->>RT: 下一次 backoff
        end
    end
    Note over RT: 3 次耗尽 → EXHAUSTED → 会话 FAILED
    RT-->>UI: FAILED（详情页可手动重试×3）
```

## 5. Smart HID 配网全流程（F019–F022，核心图）

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as PAGE002 向导
    participant CO as use-smart-hid-provisioning
    participant SH as smart-hid 门面/工作流
    participant RT as ble-runtime
    participant WX as 平台API
    participant D as Smart HID(ESP32-S3)

    Note over D: 未配网态广播配网服务 9f1d1001-…-1c04
    U->>UI: SHID 卡「配置 Smart HID」
    UI->>CO: initialize(deviceId)
    CO->>SH: smartHidService.connect()
    SH->>RT: 复用/新建会话
    RT->>WX: createBLEConnection
    SH->>WX: 订阅 INFO(1002)/STATUS(1004)
    SH->>WX: 读 Device Info（INFO 特征）
    D-->>SH: product/protocol/deviceId
    SH->>SH: verifyDeviceInfo（product=smart-hid+协议版本+^HID-[A-Z0-9]{8}$）
    alt 验证失败
        SH->>RT: 断开 → UI 错误态「重新连接/返回」
    end
    SH-->>UI: phase=configure
    U->>UI: 填 SSID/密码/Hub 地址
    U->>UI: 点「扫描 ControlHub 配对码」
    UI->>WX: uni.scanCode
    WX-->>CO: shid://pair?token=&host=&port=
    CO->>CO: parsePairingQrPayload（重复参数拒绝）→ 回填地址
    Note over CO: token 仅内存 · TTL 5 分钟
    U->>UI: 「下发配置」
    CO->>SH: candidate JSON {v,wifi_ssid,wifi_password,hub_host,hub_port,token}
    SH->>SH: framed-v1 分帧 [seq][total][len][payload]（单块≤128B，帧数≤64）
    loop 每帧（间隔 30ms）
        SH->>WX: 明文写 INPUT(1003)
        WX->>D: INPUT 分帧明文 write
        Note over WX,D: V1 简化不发起 SMP/系统配对；旧加密固件错误立即失败并提示重烧
    end
    SH->>SH: provisionAndWait（60s 超时）
    loop STATUS 推送
        D-->>WX: notify state/step（connecting_wifi→pairing→mqtt_connecting→ready）
        WX-->>SH: 状态
        SH-->>UI: 四行进度推进（wifi/hub/conn/usb）
    end
    alt state=ready
        SH-->>UI: 四行全绿 →「查看设备」redirectTo PAGE003
    else error 码（8 种）
        SH-->>UI: 中文提示 + 恢复动作（form/pairing/diagnostics/retry）
    else 60s 超时
        UI-->>U: 取消等待 / 离开确认
    end
```

## 6. Smart HID 诊断（F024）

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as PAGE005
    participant SH as smart-hid 门面
    participant WX as 平台API
    participant D as Smart HID

    U->>UI: 「重新检测」
    alt 会话不在线
        UI-->>U: modal「BLE 未连接」→ 确认「连接并检测」
        UI->>SH: connect()（READY 设备已停广播→常失败）
        SH-->>UI: 失败 → modal「让设备进入配网/恢复模式」
    else 在线
        UI->>SH: diagnose()
        SH->>WX: 读设备 status（INFO/STATUS）
        D-->>SH: state/step/error
        SH-->>UI: 五项结论（BLE/Wi-Fi/ControlHub/控制连接/USB Ready）
        UI-->>U: 异常环高亮 + 错误码详情（code+message）
    end
```

## 7. OTA 固件升级（F025）

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as ota-dialog
    participant OM as OtaManager(services/ota)
    participant RT as ble-runtime
    participant WX as 平台API
    participant D as LightBLE 固件

    Note over UI: 仅当检测到 OTA 服务 4fafc201-…-914d 时入口可见
    U->>UI: 「固件更新」→ 选 .bin（wx.chooseMessageFile）
    UI->>OM: startOta(file)
    OM->>OM: 包校验（manifest 6 字段+SemVer+sha256 实测）
    alt 校验失败（六种包错误）
        OM-->>UI: 报错终止（不发起传输）
    end
    OM->>RT: 获取会话所有权（WORKFLOW:'ota-manager'）
    Note over RT: OTA 期间禁自动重连
    OM->>WX: setBLEMTU(247)·订阅 STATUS(26c2)
    OM->>WX: CTRL(26c0) 写 {op:'start',target,size,chunk_size:180,sha256}
    D-->>OM: ready（等待 30s）
    loop 分块传输（块 180B，间隔 20ms）
        OM->>WX: DATA(26c1) writeNoResponse(MTU-3 分包)
        OM-->>UI: 进度 sentBytes/totalBytes
    end
    OM->>WX: CTRL {op:'commit'}
    D-->>OM: success（等待 30s）
    OM->>RT: 重连
    OM->>WX: 读 DeviceInfo.firmware_version
    D-->>OM: 版本
    alt 一致
        OM-->>UI: 成功 → 2s 自动关闭
    else 不一致
        OM-->>UI: OTA_VERSION_MISMATCH
    end
    U->>UI: 任意时刻取消 → CTRL {op:'abort'} → CANCELLED
```

## 8. 广播启动（F014/F015，平台双路径）

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as PAGE008
    participant BS as broadcast-session(单owner)
    participant WX as wx peripheral
    participant NP as LysBlePeripheral 插件
    participant OB as 观察端

    U->>UI: 进入广播页
    alt 微信真机
        UI->>WX: openBluetoothAdapter(mode:'peripheral')
        UI->>WX: createBLEPeripheralServer()
        WX-->>UI: 「蓝牙从机模式已就绪」（有活动连接→报错先断开；开发者工具→提示真机）
    else Android App
        UI->>UI: 系统蓝牙开闭检查（Intent 引导）
        UI->>NP: 逐项请求权限（FINE_LOCATION；SDK≥31 + ADVERTISE/CONNECT）
        NP-->>UI: 权限结果（缺失→去设置）
        UI->>NP: isSupported()
    else Web
        UI-->>U: 「当前平台不支持 BLE 广播」
    end
    U->>UI: 填名称/UUID/厂商数据
    UI->>BS: buildBroadcastPayload → 31B 预算核算
    alt 超限
        BS-->>UI: PAYLOAD_TOO_LARGE 红字·阻止启动（不静默截断）
    end
    U->>UI: 「开始广播」
    UI->>BS: start()
    alt 微信
        BS->>WX: server.startAdvertising(advertiseRequest, powerLevel)
    else App
        BS->>NP: startAdvertising(options：模式/功率/可连接/含名称/UUID)
    end
    BS-->>UI: 状态徽章「广播中」（ADVERTISING）
    OB-->>OB: 扫描端/LightBLE Observer 收包验证
    U->>UI: 停止 / 离开页面
    UI->>BS: stop()（微信另释放外围模式）
    BS-->>UI: STOPPED + 操作日志
```
