# 三实现线一致性矩阵（CROSS_IMPLEMENTATION_PARITY_MATRIX）

- 状态：初版（Phase B 首轮，2026-09-04）；每个 Gate 完成后回填
- 实现线：U-WX（微信小程序）/ U-AND（UniApp Android）/ F-AND（Flutter Android）
- 判定规则：同功能同验收 ID 同预期；差异必须能追溯到 `10_platform` / `08_development` 的规范来源，否则视为缺陷

## 1. 不得因实现线不同而不同的行为（硬一致项）

| 项 | 规范来源 | 当前结论 |
|---|---|---|
| 扫描时长 5 秒 | 产品规范 F001 | 待 Gate M2 回填 |
| deviceId 去重 / 节流 1s / RSSI 排序 / 上限 100 | F001–F002 | 待 Gate M2 回填 |
| 显示名「未命名 BLE · ID后四位」 | R05 | 待 Gate M2 回填（F-AND 现状「未知设备」已知偏差） |
| 连接超时 10 秒 | DEC-013 | 待 Gate M3 回填（F-AND 现状 30s 已知偏差） |
| 8 态连接状态机 | 状态模型 | 待 Gate M3 回填 |
| 重连 3 次 / backoff 1s·3s·5s | F012 | 待 Gate M3 回填（F-AND 现状 2/4/6s 已知偏差） |
| 写队列：同设备串行、跨设备并行、深度 16、单写 5s | F010 | 待 Gate M3 回填 |
| Notify 三元组隔离 | F011 | 待 Gate M3 回填 |
| Profile 双入口（连接 / 配置 Smart HID） | F018 | 待 Gate M5 回填 |
| 配网错误恢复 8 类唯一动作 | PROVISIONING_V1 | 待 Gate M5 回填 |
| 31B 广播预算与超限阻止 | F015 | 待 Gate M6 回填 |
| 日志脱敏口径 | F026 | 待 Gate M7 回填 |
| 零本地持久化（冷启动为空） | F028/存储策略 | 待 Gate M1 回填 |
| OTA = BLOCKED P-03 口径 | F025/P-03 | 待 Gate M8 回填 |

## 2. 允许的平台差异（须注明规范来源）

| 差异 | 规范来源 | 说明 |
|---|---|---|
| 权限弹窗形态与时机 | 10_platform/PERMISSION | 系统弹窗 UI 不同、申请链等价 |
| 分享方式 | 10_platform | U-WX 微信卡片；App 线系统分享 |
| 外链方式 | 10_platform | U-WX 受限；App 线系统浏览器 |
| 广播插件/API | 10_platform | wx.createBLEPeripheralServer / LysBlePeripheral / flutter_ble_peripheral |
| 微信开发者工具限制 | 10_platform | 工具内 unsupported 属预期（C1 supported_limited） |
| Android 系统设置入口 | 10_platform | 永久拒绝引导路径 |
| 控件原生外观轻微差异 | 07_design_system | 信息层级/文案/间距/颜色语义仍须对齐 |

## 3. 功能×实现线记分卡（每 Gate 更新）

| 功能 | 验收 | 页面 | U-WX | U-AND | F-AND | 实际差异 | 合理 | 证据 |
|---|---|---|---|---|---|---|---|---|
| F001 扫描会话 | R01 | P001 | — | — | — | — | — | — |
| F002 节流合并 | R01 | P001 | — | — | — | — | — | — |
| F003 筛选 | R02 | P001 | — | — | — | — | — | — |
| F004 广播详情 | R03 | P001 | — | — | — | — | — | — |
| F005 双入口 | R04 | P001 | — | — | — | — | — | — |
| F006 连接 | R05 | P006 | — | — | — | — | — | — |
| F007 服务发现 | R06 | P006 | — | — | — | — | — | — |
| F008 Read | R07 | P006 | — | — | — | — | — | — |
| F009 Write | R08 | P006 | — | — | — | — | — | — |
| F010 写队列 | R08 | P006 | — | — | — | — | — | — |
| F011 Notify | R09 | P006 | — | — | — | — | — | — |
| F012 断开重连 | R10 | P006/P007 | — | — | — | — | — | — |
| F013 多设备 | R11 | P007 | — | — | — | — | — | — |
| F014–F016 外围广播 | R12 | P008 | — | — | — | — | — | — |
| F017 通信日志 | R13 | P006 | — | — | — | — | — | — |
| F018–F024 Smart HID | R14–R20 | P002/P003/P005 | — | — | — | — | — | — |
| F025 OTA（BLOCKED） | R21 | P006 | — | — | — | — | — | — |
| F026 关于/日志脱敏 | R22 | P009 | — | — | — | — | — | — |
| F027 版本记录 | R23 | P010 | — | — | — | — | — | — |
| F028 零持久化 | R24 | 全局 | — | — | — | — | — | — |
| F029 推广承接 | R25 | P009 | — | — | — | — | — | — |
| F030 不做国际化 | R26 | 全局 | — | — | — | — | — | — |

记分值：`PASS / FAIL / BLOCKED(+原因) / NOT_RUN`；F-AND 在 Gate M1 前大量为 NOT_RUN 属预期（页面/功能尚未对齐），不得记 PASS。

## 4. 已登记的跨线偏差（Flutter 侧，来自 FLUTTER_PRODUCT_GAP_AUDIT）

- FEAT-F-001 README 平台宣称与 Runner 事实不符（M7 修）
- FEAT-F-002 Tab2 文案「连接」≠「已连接」（M1 修）
- FEAT-F-003 「未知设备」≠「未命名 BLE · ID后四位」（M2 修）
- FEAT-F-004 connect 30s ≠ 10s（M3 修）
- FEAT-F-005 backoff 2/4/6s ≠ 1/3/5s（M3 修）
- FEAT-F-006 PageView 横滑为规范外导航（M1 修）
- FEAT-F-007 i18n 产品化违背 F030（M1/M7 收缩）
- FEAT-F-008 shared_preferences 死依赖违背零持久化（M1 删）
- FEAT-F-009 BleManager Stream + Riverpod 双状态源（M4 重构）
- FEAT-F-010 Widget 直连 flutter_blue_plus（M3/M4 隔离）
- FEAT-F-011 写队列缺深度 16 / 单写 5s / 跨设备并行（M3 补）
- FEAT-F-012 OTA 现实现与 BLOCKED P-03 口径冲突（M8 改造）
