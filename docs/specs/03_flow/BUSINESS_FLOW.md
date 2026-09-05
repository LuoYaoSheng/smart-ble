# BUSINESS_FLOW —— 业务流程（正常 / 异常 / 边界）

> SOP v2.0 Phase 4 产出 · 2026-09-02
> 事实源：REVERSE_ANALYSIS §2.3（关键机制）/ §4（页面行为）/ §6（流程图）/ §7（数据模型）；PRD §7。流程图版本见 PRD §7 与 USER_FLOW，本文件按「正常/异常/边界」三维度条目化，供测试用例与架构恢复引用。

## 1. 扫描业务

**正常**：点开始→权限前置通过→openBluetoothAdapter（失败指数退避重试 3 次）→发现扫描（allowDuplicatesKey:true）→1s 节流合并→normalize+显示名解析链→RSSI 降序、上限 100→5s 自动停→toast「扫描完成 · 发现 N 台」。

**异常**：蓝牙未开（errCode 10001）→「请先打开系统蓝牙」引导；授权拒绝→scanError 带 reason（bluetooth_permission_denied 等）+横幅去设置；扫描启动失败→横幅+重试按钮；onHide/onUnload→自动停扫（stop reason page_hide/page_unload）。

**边界**：无名设备走显示名 fallback 链至「未命名 BLE·ID后四位」；同 deviceId 去重（留最新）；结果超 100 截断；筛选三种空/不匹配文案区分。

## 2. GATT 连接与读写业务

**正常**：prepareConnect（等扫描收尾）→暂存路由上下文→navigateTo 详情→适配器初始化→连接（优先复用未死会话）→GATT 发现（期望服务重试 3×400ms）→服务树渲染→读（3s 超时，HEX+TEXT 双格式日志）/写（TEXT/HEX 校验→写队列→toast+日志）/监听（防抖去重开关）。

**异常**：连接超时 10s→自动重试 3 次（退避 n×2s）→手动重试；服务发现失败→error 态+重试；服务列表空→empty 态；读/写/监听失败→errMsg 中文归一（微信 errCode 10000-10013 映射）；路由参数无效→modal+返回。

**边界**：写队列同设备串行/跨设备并行/单写超时 5s/队列深度 16；被动断线时该设备写队列 abort（PENDING→CANCELLED）；主动断开置 2s marker 区分被动断线（决定是否重连）。

## 3. 断线与重连业务

**正常**：连接 READY 进入已连接列表；用户主动断开→永不重连、列表移除。

**异常**：被动断线（REMOTE_LOST/TIMEOUT/ERROR）→自动重连 3 次（backoff 1s/3s/5s）→成功回 READY；耗尽→会话 FAILED，详情页可手动重试 3 次；「全部断开」Promise.allSettled，部分失败 modal 列失败设备清单。

**边界**：会话所有权——owner 可断开，borrow 引用只能 release（canDisconnect→release_only）；OTA 进行中接管所有权（WORKFLOW:'ota-manager'）并**禁自动重连**；同 deviceId 并发连接去重。

## 4. Smart HID 配网业务

**正常**：进向导→自动连接→订阅 INFO/STATUS→读 DeviceInfo→verifyDeviceInfo（product==='smart-hid'+协议版本+deviceId 正则 ^HID-[A-Z0-9]{8}$）→填表（SSID≤32/密码≤64 可空/Hub 地址 host[:port] 默认端口 17892）→扫码（shid://pair，token 仅内存 TTL 5 分钟）→candidate JSON→framed-v1 分帧（帧头 3B、单块封顶 128B=MTU-3-3、组装上限 1024B、帧数上限 64，写帧间隔 30ms）→加密顺序写 INPUT→provisionAndWait 60s 轮询 STATUS→state/step 双映射驱动四行进度→ready→四行全绿→会话内存快照→redirectTo 设备详情。

**异常**（8 种设备侧错误码 → 恢复动作）：

| 错误码 | 中文提示要点 | 恢复动作 |
|---|---|---|
| invalid_payload | 下发数据无效 | form（回表单） |
| wifi_failed | 设备侧 Wi-Fi 连接失败 | form（SSID/密码保留） |
| controlhub_unreachable | 设备连不上 ControlHub | diagnostics / retry |
| pairing_invalid | 配对码无效 | pairing（重扫码） |
| pairing_expired | 配对码过期 | pairing |
| pairing_used | 配对码已被使用 | pairing |
| mqtt_invalid | MQTT 配置无效 | form / diagnostics |
| storage_failed | 设备侧存储失败 | retry |

另有：身份验证失败（断开报错）；扫码取消/权限/失败分类提示；旧加密固件写入失败立即提示重烧 V1 简化固件；60s 超时→取消等待；配网中物理返回→确认弹窗。

**边界**：READY 设备关闭蓝牙广播——重新配网需设备进配网/恢复模式（各重配入口均带确认提示）；token/Wi-Fi 密码仅内存、不进日志不落盘（SENSITIVE_PROFILE_KEYS 黑名单）；配网会话互斥（session.provisioning 标志）。

**已移除业务**（2026-09-02）：known_devices 本地落档、90 天 TTL、上限 20 条、进入首页 prune——随 F023 一并移除，新开发不实现（零本地存储）。

## 5. 广播业务

**正常**：进页检查支持（微信：peripheral 模式+createBLEPeripheralServer；App：插件 isSupported；Web：不支持）→填参数→31 字节预算实时核算（AD 结构 2+len、厂商块 2+2+len）→开始广播（微信 server.startAdvertising(powerLevel) / 插件 options 含模式/功率/可连接）→状态徽章「广播中」→停止/离页自动停（微信释放外围模式）。

**异常**：微信有活动连接→报错先断开；开发者工具→提示真机；Android 蓝牙未开→Intent 引导；权限缺失（ACCESS_FINE_LOCATION，SDK≥31 加 BLUETOOTH_ADVERTISE/CONNECT）→逐项请求+去设置；启动失败→FAILED 徽章+错误日志；UUID 4/8/36 位 hex 校验失败→黄条。

**边界**：超 31 字节→PAYLOAD_TOO_LARGE 红字阻止启动（**不静默截断**）；广播中禁改 payload（OWNER_BUSY，单 owner 状态机）；平台双路径统一经 createBroadcastAdapter 注入，页面不直调平台 API。

## 6. OTA 业务

**正常**：检测到 OTA 服务（4fafc201-…-914d）→「固件更新」→选 .bin（微信 chooseMessageFile 限 .bin）→包校验（manifest 白名单 6 字段+SemVer+sha256 实测；无 manifest 跳过）→接管会话+禁重连→MTU 247→订阅 STATUS→CTRL 写 {op:'start',target,size,chunk_size:180,sha256}→等 ready 30s→DATA 按 MTU-3 分包 writeNoResponse（块间隔 20ms）→{op:'commit'} 等 success 30s→重连回读 firmware_version 比对→一致→成功 2s 自动关。

**异常**：六种包错误码（校验失败终止，不发起传输）；五种运行错误码；VERIFYING 版本不一致→OTA_VERSION_MISMATCH；任意时刻取消→{op:'abort'}→CANCELLED。

**边界**：chunk 180B/20ms；OTA 窗口期禁自动重连（避免干扰传输）；ota-dialog 非受控组件。

## 7. 日志与脱敏业务（横切）

**正常**：任何日志→敏感键脱敏（token/password/secret…→'***'，保护键白名单不脱敏）→logger 容量管理（全局 500/单设备 200/LRU 40 设备）→UI 六色呈现→导出 formatDeviceLogExport 复制。

**边界**：空日志导出→toast「暂无日志」；Wi-Fi 密码与配对 token 全链路不可出现在日志/存储（2026-09-02 后零本地持久化，仅内存态）。
