# ALIGNMENT_NOTES —— 生态三件套 × 本项目 canon 对齐分析

> 2026-09-03（生态规范入库当日）。对象：本目录三份生态规范 ↔ `02_product` / `10_platform` / `prototype/`。
> 原则：**先有产品再有平台/生态**——生态全集不反向改变 v1 产品范围（29 功能）与 D1–D3 排期；冲突处**旧代码实证 + 现行 canon 优先**，矩阵冲突项标「待裁决」，不翻转已验证行为。

## 1. 平台编号映射（矩阵 §2 → 本项目）

| 矩阵编号 | 本项目对应 | 状态 |
|---|---|---|
| UNI-WX-IOS / UNI-WX-AND | 微信小程序（prototype/platform/wechat，宿主维度见其 PLATFORM_SPEC §2） | D1 首批 P1 |
| UNI-APP-AND | App·Android（prototype/platform/app） | D1 首批 P2 |
| UNI-APP-IOS | App·iOS | 现状 NOT_RELEASED（随 App 线评估，不占首批） |
| WIN / MAC / LINUX | Desktop（prototype/platform/desktop，OS 维度 mac/win/linux） | 待 D2 spike，原型先行 |
| （无 Web 行） | Web（prototype/platform/web） | **矩阵未收录**——以 10_platform §3 Web 列 + W1 实测门禁为准（C5） |
| FLUTTER-* / NATIVE-* / HARMONY | 生态其他实现线 | 本项目外，备查（C6） |

## 2. 能力矩阵冲突清单（C1–C7，逐项裁决状态）

| # | 矩阵口径 | 本项目实证/canon | 处置 |
|---|---|---|---|
| **C1** | BLE-008 广播发送：微信小程序 ❌ | **F014「微信 peripheral 广播」已实现**（PRD 现状）；旧代码 `services/wx-peripheral-server.js` 封装 `wx.createBLEPeripheralServer`（真机可用，开发者工具不可用）；10_platform §3 S4 微信=△ 能力有限 | **已裁决（2026-09-03，08-G0）：capability = supported_limited**——保留 F014；devtools unsupported；微信真机运行时探测后启用；后台广播不承诺；不允许静默降级；**真机证据待补**（裁决正文见 [08_development/PLATFORM_CAPABILITY_DECISION](../08_development/PLATFORM_CAPABILITY_DECISION.md) §1）。原型保持 △（实证行为）：微信实例可演示真机广播；评审栏矩阵卡该行标注 `❌(矩阵)≠△(实证)` 为裁决前快照，矩阵侧待其 v1.1 修订对齐 |
| **C2** | BLE-008 广播发送：iOS ❌ / macOS ❌ | iOS CoreBluetooth `CBPeripheralManager`、macOS 同源外围能力为公开技术事实【待验证】 | 登记不阻塞：iOS NOT_RELEASED；Desktop 待 D2 spike 实测后回写矩阵 |
| **C3** | 多设备连接：微信 ❌ | **F013「多设备会话管理（批量断开）」已实现**（基准全域）；10_platform §3 S6 微信=✅ | **已裁决（2026-09-03，08-G0）：capability = supported_foreground**——保留 F013；支持前台运行时多 Session；不承诺后台保持与固定最大连接数；每 Session 独立错误反馈；Session Registry 为唯一事实源；**真机证据待补**（裁决正文见 [08_development/PLATFORM_CAPABILITY_DECISION](../08_development/PLATFORM_CAPABILITY_DECISION.md) §2）。原型保持 ✅（实证行为）；评审栏矩阵卡标注为裁决前快照 |
| **C4** | 自动重连：微信 ⚠️ | F012 断线自动重连（3 次 backoff）已实现——产品口径为**前台会话内重连**；矩阵 ⚠️ 疑指后台/系统级重连 | 口径差登记，不翻转；08 阶段定义「会话内重连 vs 后台保连」两层语义 |
| **C5** | 矩阵无 Web 行 | 10_platform §2.3/§3 已有 Web 硬约束分析（无自由扫描/无广播/HTTPS） | Web 能力以 10_platform §3 + W1 实测门禁为准；建议矩阵 v1.1 补 Web 行 |
| **C6** | Flutter/Native/HarmonyOS 行 | 本项目范围外 | 生态备查；不改变 D1–D3 |
| **C7** | 长连接：微信 ❌ | 产品「后台即挂起」现状一致（onUnload 停扫即为此设计）；App 受限保连为候选不做 | **一致项**（无冲突，仅确认） |

> **裁决状态注（2026-09-03，08-G0）**：C1/C3 已裁决——裁决正文与同步落点见 [08_development/PLATFORM_CAPABILITY_DECISION](../08_development/PLATFORM_CAPABILITY_DECISION.md)（真机证据待补）；本表其余项（C2/C4/C5/C6/C7）状态不变。

一致项（无冲突，直接吸收）：BLE-001/002/003 移动+桌面全 ✅；Android 广播发送 ✅（F015 LysBlePeripheral）；Desktop 三系原生层分级（CoreBluetooth/WinRT/BlueZ）与 10_platform §2.4 一致；Linux 广播受 BlueZ/内核权限影响【待验证】两处口径一致。

## 3. 功能点清单映射（BLE-001～013 ↔ 六域 / F 编号，域级）

| 生态模块 | 本项目对应 | 备注 |
|---|---|---|
| BLE-001 环境检测 | F002 权限前置 + P009 环境信息 | 引导开启蓝牙=App Intent 现状 |
| BLE-002 扫描 | F001/F003/F004/F005（S1a） | 设备收藏（BLE-002-08）不纳入（零持久化） |
| BLE-003 连接 | F006/F012/F013（S1b） | 状态枚举差异见 §5 |
| BLE-004 GATT 管理 | F007 | Descriptor 读取/服务收藏未纳入（收藏=零持久化） |
| BLE-005 读写 | F008/F009 | Write Without Response / MTU 分包 / 数据历史为生态扩展项 |
| BLE-006 Notify | F010 | CSV/JSON 导出→现版剪贴板/系统分享口径 |
| BLE-007 广播解析 | F004 + F018（识别匹配） | iBeacon/Eddystone 专解未纳入（候选） |
| BLE-008 广播发送 | F014/F015/F016（S4） | 微信行冲突见 C1 |
| BLE-009 设备管理 | **不纳入**（2026-09-02 零本地持久化决策：我的设备/别名/收藏/删除全部不做） | 会话内 Profile 状态由 F019 承载 |
| BLE-010 日志 | F011 + F026（脱敏为产品增强口径） | — |
| BLE-011 协议调试 | **未纳入现版**（模板/快速发送/循环发送 = 生态扩展候选） | 三查候选清单登记 |
| BLE-012 OTA | F025（端到端 BLOCKED，产品决策不变） | BLE.startOTA 接口位保留给 08 阶段 |
| BLE-013 Device Profile | F018 + **Profile 扩展原则**（PRODUCT_MODEL §1，2026-09-03：特殊设备=标准设备的扩展） | 矩阵 §13 registerProfile/matchProfile 与该原则同构；Smart HID = 首个内置 Profile |

优先级口径差（登记不翻转）：清单 §11 将广播发送/多设备列为 P2，产品按用户价值已实现 F014/F015/F013——**产品现状优先**；P0 基础集（检测/扫描/连接/发现/读写/Notify/日志）与现版核心完全重合 ✓。

## 4. API 统一接口映射（页面动作 ↔ BLE.*，08_development/API_SPEC 输入）

| BLE.*（规范 §3–§13） | 基准原型动作 | 现有 uniapp 对应（旧代码实证） |
|---|---|---|
| BLE.initialize / getBluetoothState | P001 环境态 / P008 check | wx.openBluetoothAdapter / uni 对应 |
| BLE.getCapabilities | P001 支持判定 / W1 门禁 | 平台条件编译（现状） |
| BLE.scan / stopScan | p001-scan / p001-stop | wx.startBluetoothDevicesDiscovery |
| BLE.connect / disconnect / getConnectionState | p001-connect / p006-disconnect | wx.createBLEConnection |
| BLE.discoverServices / discoverCharacteristics | P006 服务树 | wx.getBLEDeviceServices/Characteristics |
| BLE.read / write / enableNotify / disableNotify | P006 读写监听 | wx 读/写/notify 三件套（写队列串行=F009） |
| BLE.getAdvertisement / startAdvertise | P008（F004 观察侧 / F014·F015 发射侧） | wx.createBLEPeripheralServer / LysBlePeripheral |
| BLE.getFirmwareVersion / startOTA | P006 OTA 弹层（F025 BLOCKED） | 接口位保留 |
| BLE.log / getLogs | F011 通信日志 + F026 脱敏 | 面板内日志（无文件流，候选不做） |
| BLE.registerProfile / matchProfile | F018 识别（STRONG/WEAK） | mock 层演示；08 阶段定型 |

枚举口径差（08 阶段收口）：蓝牙状态（矩阵 unknown/poweredOff/poweredOn/unauthorized vs 基线 bt: on/off/unsupported）、连接状态（disconnected/connecting/connected/ready/error vs F006 八态）——08 API_SPEC 统一为 BLE.* 枚举并给出映射表。

## 5. 错误码分层（BLE_001～008 × STATE_MODEL §2）

- **SDK 传输层**（生态）：BLE_001 蓝牙未开启 / BLE_002 权限不足 / BLE_003 扫描失败 / BLE_004 连接失败 / BLE_005 服务不存在 / BLE_006 写入失败 / BLE_007 Notify 失败 / BLE_008 OTA 失败。
- **产品业务层**（现行契约，PRD §7 + STATE_MODEL §2）：wifi_failed / pairing_expired / controlhub_unreachable / timeout / scan_failed / identity_failed / connection_lost / OTA_HASH_MISMATCH / diagnostic_connect_failed…；平台补充态（android `bluetooth_permission_denied` 等）按 L3 登记。
- **08_development/ERROR_CODE 处置**：两层并行——业务错误码不变，BLE_001～008 作为 SDK 层码引入并给出「平台原生错误 → BLE_00x → 用户文案」三级映射。

## 6. 原型层消费记录（2026-09-03，v1.2.0）

- wechat/app/desktop 三实例评审栏注入「生态能力矩阵」卡（本目录矩阵对应行；C1/C3 冲突行显式标注；desktop 卡随 OS 切换 mac/win/linux 行随动）。
- web W4 平台对比卡补矩阵第二来源（含 C1 冲突标注与 C5 未收录说明）。
- 内核零改动（diff 校验保持字节一致）；产品逻辑/数据模型/流程不受影响（L1）。
