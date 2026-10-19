# 多实现线一致性矩阵（CROSS_IMPLEMENTATION_PARITY_MATRIX）

- 状态：**记分卡已于 2026-09-07 依据 FEATURE_MAP/PRD §8 重建**（修复编号错位，见 §0）；每个 Gate 完成后回填
- 实现线：U-WX（微信小程序）/ U-AND（UniApp Android）/ F-AND/F-MAC（Flutter）/ N-MAC（AppKit）/ N-IOS（SwiftUI）/ K-AND（Kotlin Compose）/ W-WIN（Windows 桌面六壳：E-WIN Electron · T-WIN Tauri · V-WIN Avalonia · F-WIN Flutter · Q-WIN PySide6+bleak · G-WIN Wails+Go）
- 判定规则：同功能同验收 ID 同预期；差异必须能追溯到 `10_platform` / `08_development` 的规范来源，否则视为缺陷
- Windows 硬件基线：Flutter Android + ESP32 V1 零配对与 T2–T7/第二手机已完成；扫描 F001–F005 真机 PASS。详见 `WINDOWS_MOBILE_V1_MASTER_MATRIX.md` 与 `verification/windows-mobile-v1/20260905-1726-1b793ca/`
- **2026-09-27 Windows 线回填（Mac 总门禁义务）**：消费 `verification/windows-plan-v1/FINAL-REPORT.md` §3/§4（2026-09-21 基线）+ 9/22~9/27 增量轮（F004 五壳/AIR-GQT/AAND 三轮/COUNTRY-FIX/HUB-TOKENS），新增 K-AND 与 W-WIN 两列（§3）、平台差异 10 行（§2）、环境/契约登记（§4.3）、六壳明细（§6）。判定纪律不变：只登记在册证据，不预填 PASS。

## 0. 2026-09-07 编号错位修复记录（TEST_MATRIX_DEFECT）

旧记分卡存在 F 编号与 FEATURE_MAP/PRD §5 不一致的错位（分类 TEST_MATRIX_DEFECT），已按下表重建。**F 编号唯一事实源 = [FEATURE_MAP.md](../02_product/FEATURE_MAP.md) + [PRD.md](../02_product/PRD.md) §5；验收 R 编号事实源 = PRD §8（注意 R 与 F 不是一一对应，如 F016→R21、F018→R14、F026→R28）。**

已修复的错位示例（旧 → 新）：

| 旧行（错） | 错因 | 正确口径 |
|---|---|---|
| F002 节流合并 | 节流属于 F001 扫描会话 | F002 = 扫描权限前置 |
| F005 双入口 | 双入口是 F018 Profile 识别的入口结构 | F005 = 显示名智能解析 |
| F014–F016 合并"外围广播" | 三个独立功能 | F014 微信广播 / F015 App 广播 / F016 31 字节预算 |
| F017 通信日志 | 通信日志是 F011 | F017 = 观察侧证据匹配 |
| F018–F024 合并"Smart HID" | 七个功能且含已移除项 | 逐行拆开；F023 已移除不复刻 |
| F026 关于/日志脱敏 | "关于页"不是 F026 载体 | F026 = 日志脱敏（横切）；关于页 = P009 页面职责 |
| F028 零持久化 | 零持久化来自存储策略决策，非 F028 | F028 = 小程序推广跳转；零持久化见 §1 |
| 旧 §1 引用「31B 预算 F015 / 写队列 F010 / Notify F011 / 零持久化 F028」 | 编号漂移 | F016 / F009 / F010 / 存储策略 |

## 1. 不得因实现线不同而不同的行为（硬一致项）

| 项 | 规范来源 | 当前结论 |
|---|---|---|
| 扫描时长 5 秒 | F001 / R01 | 待 Gate M2 回填 |
| deviceId 去重 / 节流 1s / RSSI 排序 / 上限 100 | F001 / R01 | 待 Gate M2 回填 |
| 扫描权限前置（微信授权引导） | F002 / R02 | 待 Gate M2 回填 |
| 显示名「未命名 BLE · ID后四位」多级 fallback | F005 / R05 | 待 Gate M2 回填（F-AND 现状「未知设备」已知偏差） |
| 连接超时 10 秒 | DEC-013 / F006 | 待 Gate M3 回填（F-AND 现状 30s 已知偏差） |
| 8 态连接状态机 | F006 / STATE_MODEL | 待 Gate M3 回填 |
| 重连 3 次 / backoff 1s·3s·5s | F012 / R12 | 待 Gate M3 回填（F-AND 现状 2/4/6s 已知偏差） |
| 写队列：同设备串行、跨设备并行、深度 16、单写 5s | F009 | 待 Gate M3 回填 |
| Notify 三元组隔离 / 防抖去重 | F010 / R10 | 待 Gate M3 回填 |
| 通信日志六色/清空/导出 | F011 / R11 | 待 Gate M3 回填 |
| Profile 识别 STRONG/WEAK 与双入口 | F018 / R14 | 待 Gate M5 回填 |
| 配网错误恢复 8 类唯一动作 | F022 / R18 / PROVISIONING_V1 | 待 Gate M5 回填 |
| 31B 广播预算与超限阻止 | F016 / R21 | 待 Gate M6 回填 |
| 日志脱敏口径 | F026 / R28 | 待 Gate M7 回填 |
| 零本地持久化（冷启动为空） | 08_development/STORAGE_POLICY + PRD 变更记录 2026-09-02/03 | 待 Gate M1 回填 |
| OTA = BLOCKED P-03 口径 | F025 / R25 / P-03 | 待 Gate M8 回填 |

> **Apple 线现值（2026-09-10 回填）**：扫描 5s 会话 / deviceId 去重·节流·RSSI 排序 / 连接超时 10s /
> 重连 3 次 backoff 1s·3s·5s / 写队列深 16·单写 5s（CU-50/51）/ 零持久化——N-MAC 与 N-IOS 均与正典
> 一致（N-MAC 另有 Phase 2 真无线电重连全环实证）；OTA 维持 P-03 BLOCKED，协议帧已按冻结契约对齐
> （R-1/R-2，见 `06_review/OTA_CONTRACT_R1_R2_DECISION.md` 与共享核心 OtaContract 13 例测试）。

> **Windows 线现值（2026-09-27 回填，W-WIN=六壳/K-AND=Kotlin）**：扫描/连接枚举/读（INFO 130B）/Notify
> 订阅退订六壳真机全通（FINAL-REPORT §6 bleak 11 台 + Q-WIN app 级 12/12）；带响应写 E/T 四写四中
> （20260911 W3）+ 20260918 写探针矩阵；重连 E/T retry 探针全绿（T-WIN DEF-001 死句柄已修）；K-AND
> 扫描/GATT/广播/日志脱敏/版本元数据真机矩阵在册（`WINDOWS_MOBILE_V1_MASTER_MATRIX.md` §1 A-AND 列）。
> 硬一致常数（扫描 5s/超时 10s/重连 1·3·5s×3/写队列深 16）在 Windows 线未逐项独立取证，以共享契约层
> （E/T ota-contract+smart-hid 契约测试 95/95）与 U-WX 同源前端为口径，不单独记 PASS。
> Windows 特有守则（连接前停扫/未配对仅 9f1d/0xFF 厂商块广播/系统缓存）见 §2。

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
| WinRT 桌面广播仅厂商块 0xFF 可发 | FINAL-REPORT §4-1 + 20260921-XDEV-BROADCAST | LocalName/ServiceUuids 一律 `Start()` 拒绝；空口无名/UUID=平台事实非缺陷。N4 已按案 B 裁决：广播 Tab 恒显+未就绪徽章（afe4fd3） |
| ADV 帧与 SCAN_RSP 双事件名字处理 | FINAL-REPORT §4-2（VWIN-DEF-011） | 同 RSSI 去重时名字只在非空覆盖，否则显示空名 |
| 未配对会话 GATT 枚举仅 9f1d 一服务 | FINAL-REPORT §4-3 | tinygo（G-WIN）与 bleak（Q-WIN）双栈复现；配对窗口回验挂硬件窗口 |
| 未配对态 STATUS 订阅零推送 | FINAL-REPORT §4-4 | 按订阅态断言口径（订阅/退订 UI 与回调注册实证） |
| Windows BLE 系统缓存影响 OTA 重启回读 | FINAL-REPORT §4-5 | OTA 验收要求设备侧独立证据（串口/BLE 直读双特征），不以重扫 UI 读数为准 |
| INPUT 特征设备锁（SHID-FW-LOCK-001） | FINAL-REPORT §4-6 + 20260921-P3-HARDWARE | ~44B 无效载荷后 INPUT 写持久回 ATT 0x0D（三栈同败）；断电重启恢复写能力已证（P3 铁证）。Q-WIN/F-WIN 代码级护栏；测试禁写 INPUT 特征 |
| 连接前停扫守则（Windows 桌面通用） | FINAL-REPORT §4-8（20260921-FWIN-GATT-WALK） | 扫描进行中连接 ⇒ 服务枚举 0（FBP winrt 实证）；停扫后重连即恢复。正典口径：连接动作先停扫 |
| F-WIN P002 扫码降级=粘贴/手输单路径 | FINAL-REPORT §3 注⁴ | mobile_scanner 无 Windows 实现，正典降级登记非缺陷 |
| 安装器形态差异（T MSI 需提权/E 便携双层进程/六产物未签名） | FINAL-REPORT §4-7 + 20260921-P4-PACKAGING | 未签名产物一律只标 Preview；签名凭据不入库 |
| SHID 广播双帧交替（UUID 在 ADV 帧无名/名称在 Extended 帧） | 20260924 增量轮（d99b290/4097c19） | 跨帧合并为正典实现口径（E 主进程 mergeAdvertisement + V dotnet 双修，单测在案） |

## 3. 功能×实现线记分卡（2026-09-07 重建；每 Gate 更新）

> F 编号/名称逐字对齐 FEATURE_MAP §1；验收 R 编号对齐 PRD §8。F017/F029 在 PRD §8 无专属 R 条目，如实标注。页面映射依据 FEATURE_MAP §3。

| 功能 | 名称（FEATURE_MAP 口径） | 验收（PRD §8） | 页面 | U-WX | U-AND | F-AND | N-MAC | N-IOS | K-AND | W-WIN | 合理 | 证据 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F001 | BLE 扫描（5s 会话/节流合并/自动停） | R01 | P001 | — | — | — | PASS·真无线电（Phase2）| PASS（测试+真机后台链路 4c19a58） | PASS（a-and-p001-e5 13/13 真机；20260927 release 包装机回归绿） | PASS（六壳真机：bleak 11 台/CDP 首扫 8-11 台） | — | — |
| F002 | 扫描权限前置（微信授权引导） | R02 | P001 | — | — | — | N/A（系统权限·10_platform）| N/A（同左） | PASS（五权限预授链真机实测） | N/A（桌面无移动权限链·10_platform） | — | — |
| F003 | 扫描筛选（RSSI/前缀/隐藏无名） | R03 | P001 | — | — | — | PASS（UIS-04）| PASS（UI 测试筛选态） | PASS（面板+信号强度预设+名称前缀真机） | —（E/T/G 前端与 uniapp 同源；未单列取证） | — | — |
| F004 | 广播数据查看（原始数据弹窗/复制） | R04 | P001 | — | — | — | PASS（UIS-05 复制→剪贴板+toast+关闭）| PASS（UI 测试：详情两段/缺失标注/复制 toast+剪贴板探针） | PASS（20260924 R2 模态正典：ModalBottomSheet 四路径关闭+字节级 v4/v5 回归+AdvertisementParser 真值解析 12/12） | PASS（五壳 F004 轮 afa5b3f：E/T/G AD 逐段重建+Q AdvDialog+V 原始段+整包 hex） | — | apple-native-v1/20260910-advdata-observer；windows-plan-v1/20260924-AAND-ADVPOPUP、20260924-WIN-F004 |
| F005 | 显示名智能解析（多级 fallback） | R05 | P001 | — | — | — | PASS（UIS-03 found=6 含未命名 fallback）| PASS（测试） | 部分（具名 PASS；未命名「未知设备」+MAC=偏差在册） | 部分（名字只在非空覆盖=VWIN-DEF-011 修复实证；未命名 fallback 链未单列） | — | — |
| F006 | GATT 连接（8 态/发现/MTU） | R06 | P006 | — | — | — | PASS·真无线电（Phase2）| PASS（测试；真机收发 4c19a58） | PASS（E5 真机 v16/v17：连接+服务发现+已连接徽标） | PASS（六壳连接+枚举；连接前停扫守则 §2） | — | — |
| F007 | 服务树浏览（折叠/UUID 中文名） | R07 | P006 | — | — | — | PASS（UIS-06 服务树）| PASS（P006 测试） | PASS_WITH_LIMITATION（5 卡+OTA 具名；WIN-AAND-002/003/007 在册） | PASS（六壳枚举；未配对仅 9f1d 一服务=平台事实 §2） | — | — |
| F008 | 特征读取（HEX+TEXT，3s 超时） | R08 | P006 | — | — | — | BLOCKED（待 ESP32 烧录；midea 无 read）| NOT_RUN（真机读未验） | PASS_WITH_LIMITATION（读 logcat status=0；读值不进 UI=WIN-AAND-004） | PASS（INFO 130B JSON 六壳同构真机） | — | — |
| F009 | 特征写入（TEXT/HEX，写队列串行） | R09 | P006 | — | — | — | BLOCKED（写字节级·Phase2）| NOT_RUN | PASS_WITH_LIMITATION（TEXT+HEX 三写 LED 实变+串口交叉；回显 UI 断=WIN-AAND-006/008） | PASS（E/T 四写四中 20260911 W3+20260918 写探针矩阵；INPUT 特征=设备锁护栏 §2） | — | — |
| F010 | Notify 监听（防抖去重） | R10 | P006 | — | — | — | BLOCKED（Notify 字节级·Phase2）| NOT_RUN | PASS_WITH_LIMITATION（订阅往返+周期到达 logcat 实证；载荷 UI 断） | PASS（Q/F 订阅退订语义断言；未配对 0 推送=平台事实 §2） | — | — |
| F011 | 通信日志（六色/清空/导出） | R11 | P006 | — | — | — | PASS（UIS-06 日志）| PASS（测试） | PASS（清空/重建/系统分享导出真机） | PASS（E/T 清空→0 条→读取重建 W3；LogPanel dock 常驻=形态差异在册） | — | — |
| F012 | 断线自动重连（3 次 backoff） | R12 | P006/P007 | 已修（契约级：被动断线 runtime 独占 1/3/5×3·connect 重试 n×2s=§7；双层竞争 U-REC-001 销案·单测 6/6+构建绿） | 同 U-WX（共码基） | — | PASS·真无线电重连全环（Phase2/UIS-18·1s/3s/5s 契约）| PASS（契约 C-8 1s/3s/5s×3 常量断言·单测 24+UI 12 全绿；原 2/4/6 为 FEAT-F-005 同源偏差已修） | PASS（fault 拆链→1/3 重连→用户断开无新 attempt 真机全链） | PASS（E/T retry 探针全绿；T-WIN 重连死句柄 DEF-001 已修） | — | apple-native-v1/20260910-reconnect-backoff-align + uniapp-v1/20260910-reconnect-ownership-split |
| F013 | 多设备会话管理（批量断开） | R13 | P007 | — | — | — | PASS（M1 多设备·UIS-18 n=2）| PASS（P007 测试） | NOT_RUN（待双外设夹具） | —（未单列） | — | — |
| F014 | 微信外围广播 | R22 + R24 | P008 | — | — | — | N/A（微信线）| N/A（微信线） | N/A（微信专属） | N/A（微信线） | — | — |
| F015 | App 外围广播（LysBlePeripheral） | R23 + R24 | P008 | — | — | — | PASS（广播启动·Phase2/UIS-09）| PASS（实现；真机广播 NOT_RUN） | PASS（F015 等价 9/9：启停 UI+观察侧 fff0 交叉+净停） | PASS（六壳三路径：V=WinRT 原生/E=WinRT 边车/G·Q·T=air 门控/F=插件门控；空口字节级证据齐；仅厂商块 0xFF=平台事实 §2） | — | — |
| F016 | 31 字节负载预算（不静默截断） | R21 | P008 | — | — | — | PASS（UIS-08 31B blocked=true）| PASS（实现） | NOT_APPLICABLE（广播页无负载编辑器·在册） | —（未单列） | — | — |
| F017 | 观察侧证据匹配（服务层就绪） | 无专属 R（PRD §8 未覆盖，服务层验收） | 无页面消费 | — | — | — | PASS（SmartHidCore 移植 32/32） | PASS（同左·共享 Core） | PASS（fixture_observer_s3 串口 JSON 23 条+净停） | —（观察侧由移动端/平板承担：AIR-GQT 联想平板收包 G34/Q29/T31） | — | apple-native-v1/20260910-advdata-observer |
| F018 | Profile 设备识别（UUID STRONG/前缀 WEAK） | R14 | P001 | — | — | — | PASS（UIS-15/16 双入口）| PASS（STRONG/WEAK 测试） | 部分（SHID STRONG 三段解析实证 20260924；P001 双入口/弱匹配未单列） | —（SHID 具名恒居首在 Q 走查在册；双入口未单列） | — | — |
| F019 | Smart HID 配网向导（三阶段/断线续填/离开确认） | R15 | P002 | — | — | — | PASS 协议层（UIS-07/12）；E2E BLOCKED（无夹具）| PASS 协议层（测试）；E2E BLOCKED | 部分（P002 页在；华为 E2E 六连修后 BLE 链至 wifi 分支；终局被并行会话偷刷固件中断 20260927） | PASS_WITH_OBS（E-WIN：BLE 配网链全通+hub 配对会话消费+FW-LOCK 清除铁证；WiFi 终态受环境=观察项非缺陷） | — | windows-plan-v1/20260921-P3-HARDWARE/win007-evidence.md、20260927-ANDROID-E2E |
| F020 | ControlHub 配对码扫码（shid://pair） | R16 | P002 | — | — | — | PASS（粘贴兜底）；实景扫码 NOT_RUN | PASS（粘贴）；实景 NOT_RUN | 部分（手输/粘贴路径+token 满 32 掩码在案；实景扫码未单列） | PASS（E/T/V 相机+Q/G 粘贴；F=粘贴降级正典 §2；E-WIN 粘贴兜底真机实证） | — | — |
| F021 | 分帧明文写入 + 状态机跟踪（60s） | R17 | P002 | — | — | — | PASS 协议层（CU 62 断言）；E2E BLOCKED | PASS_E2（canonical frames 测试） | 部分（candidate 下发+STATUS 推进实证；60s 跟踪/终态未达） | PASS（E-WIN candidate 下发 STATUS 七步推进至 ControlHub 配对+hub 17892 交换完成） | — | — |
| F022 | 配网错误恢复（8 错误码→动作） | R18 | P002 | — | — | — | PASS（8 错误码映射·CU）| PASS_E2（共享 Core 测试） | 部分（wifi_failed(201) 错误路径真机取证；恢复链未走完） | 部分（wifi_failed 天然取证；pairing_expired/mqtt_invalid 设备侧未达=环境受阻） | — | — |
| F023 | ~~设备历史~~【已移除 2026-09-02，不得复刻】 | R19（已作废） | ~~P004~~ | 不适用 | 不适用 | 不适用 | 不适用（零持久化反向守卫） | 不适用（同左） | 不适用（静态检查 PASS：4 Tab 无历史页/持久化） | 不适用（同左·六壳共享前端无历史页） | 见 §4.2 登记项 UNIAPP-G1-001 | — |
| F024 | Smart HID 诊断（五项链路） | R20 | P005 | — | — | — | PASS（UIS-12 四行+真实 STATUS 轮询）| PASS（五行诊断测试）；真机 BLOCKED | NOT_RUN（P005 屏在；走查未单列） | —（F 壳 O-3/O-4 观察项已修 85fe060；五项诊断未单列） | — | — |
| F025 | OTA 固件升级（端到端 BLOCKED） | R25 | P006 子流程 | — | — | — | BLOCKED（P-03；R-1/R-2 契约已对齐·CU-56..66；UIS-18-OTA 对未烧录旧固件如实 FAIL）| BLOCKED（同口径；start 帧已契约对齐） | BLOCKED（P-03 同口径；未跑） | E2E 证据两轮在册：20260911 W5（E/T 真刷+串口 boot 帧）+20260921 P3（E/T LightBLE fixture 556KB 版本迁移+设备侧 BLE 版本回读）；**P-03 口径解除待正典裁决，不因证据自动解除** | — | windows-mobile-v1/20260911-win-b3/w5-ota-SUMMARY.md、windows-plan-v1/20260921-P3-HARDWARE/ota/win008-evidence.md |
| F026 | 日志脱敏（敏感键→***） | R28 | 横切（P006 日志等） | — | — | — | PASS（日志脱敏）| PASS（测试） | PASS（LogRedactionTest 12 例 E1；真机 logcat 抽查留窗口） | —（未单列；hub-token-matrix 脱敏取证在案） | — | — |
| F027 | 版本元数据展示（Release Metadata 投影） | R26 | P009/P010 | — | — | — | PASS（UIS-10/11 Release Metadata 投影）| PASS（生成资源+解码测试） | PASS（VersionMetadataTest 14 例 E1；真机 P009/P010 抽查未跑） | PASS（版本元数据一源多产物生成管线+E/T 共享前端投影；F=pubspec 版本口径 OBS 在册） | — | — |
| F028 | 小程序推广跳转 | R27 | P009 | — | — | — | **已移除（2026-09-10）** | **已移除（同左）** | REMOVED | 已移除（同左） | — | — |
| F029 | 分享（微信/APP/H5 分支） | 无专属 R（PAGE_SPEC §0.3 分享约定验收） | P009 + 全局 | — | — | — | PASS（系统分享）| PASS（实现） | NOT_RUN | —（未单列） | — | — |
| F030 | 国际化【不做，UI 全中文硬编码】 | R30（现状确认） | 全局 | — | — | — | PASS（全中文硬编码现状确认）| PASS（同左） | PASS（静态守卫：localeConfig/locale 资产 300 文件全净） | PASS（E-WIN/T-WIN i18n 机器清零+check-f030 静态守卫门禁） | — | — |
| （附）平台降级（Web/H5 明确不支持） | R29（非 F 编号项） | R29 | 全局 | — | — | — | N/A | N/A | N/A | N/A | — | — |

记分值：`PASS / FAIL / BLOCKED(+原因) / NOT_RUN`；各线在对应 Gate 完成前为 NOT_RUN 属预期（页面/功能尚未对齐），不得记 PASS。**禁止把 F014–F016、F018–F024 再合并记分。** `—` = 未在该线单列取证（不判 PASS 也不判 FAIL）；`部分` = 有中间证据但验收主体未闭合。K-AND 详据（run-id/缺陷编号）见 `WINDOWS_MOBILE_V1_MASTER_MATRIX.md` §1；W-WIN 六壳明细见本文 §6；W-WIN OTA 证据不改变 F025 的 P-03 红线口径（解除归正典裁决）。

## 4. 已登记的跨线偏差

### 4.1 Flutter 侧（来自 FLUTTER_PRODUCT_GAP_AUDIT，历史登记）

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

### 4.2 2026-09-07 Multi-end Parity Gate 新登记（详见 `../06_review/MULTI_END_PARITY_AUDIT.md`）

| 编号 | 实现线 | 偏差 | 分类 | 严重度 | 处置 Gate |
|---|---|---|---|---|---|
| UNIAPP-G1-001 | U-WX/U-AND | P004 路由/首页「已配置 Smart HID」面板/known_devices 本地持久化残留（违反 2026-09-02 移除决策与零持久化） | UNIAPP_IMPLEMENTATION_DRIFT | P1 | **PARITY-G1 已修（2026-09-07）**：路由删/面板删/Store 转纯内存/TTL 删/服务层路由删/history.vue 删/测试重写；build:mp-weixin 产物 0 引用 |
| FLUTTER-G1-001 | F-AND | Tab2「连接」≠「已连接」 | FLUTTER_IMPLEMENTATION_DRIFT | P2 | **PARITY-G1 已修**（widget test 断言） |
| FLUTTER-G1-002 | F-AND | PageView 横滑主 Tab 为规范外导航（PAGE_SPEC §0.1 仅 switchTab/点击） | FLUTTER_IMPLEMENTATION_DRIFT | P1 | **PARITY-G1 已修**（NeverScrollableScrollPhysics + 拖动测试） |
| FLUTTER-G1-003 | F-AND | P003/P005 由 Modal sheet 冒充、P010 缺失（9 页集合不完整，无独立路由） | FLUTTER_IMPLEMENTATION_DRIFT | P1 | **PARITY-G1 已修**：三页补独立页面+入口+pushReplacement/栈感知；逐页四维对齐留 PARITY-G2+ |
| FLUTTER-G1-004 | F-AND | MaterialApp i18n 基建（en/zh）与 F030「不做」相悖 | FLUTTER_IMPLEMENTATION_DRIFT | P2 | FEAT-F-007 登记，M1/M7 收缩（G1 不扩边界） |
| MATRIX-G1-001 | 测试矩阵 | 旧记分卡 F 编号错位（见 §0） | TEST_MATRIX_DEFECT | P1 | 已于 2026-09-07 修复 |

### 4.3 2026-09-27 Windows 线回填登记（环境/契约观察，非实现线偏差）

| 编号 | 类别 | 事项 | 处置 |
|---|---|---|---|
| WINENV-001 | 环境/固件 | HJWY 配网三层根因翻案：原「5GHz-only」误诊，实为信道 13×ESP-IDF 默认国家码 `01` 只扫 1-11（层 1，固件已修 `esp_wifi_set_country_code("CN")`，DEV 直填 3 秒拿 IP 实证）；层 2 = BLE 连接态 coex reason=210 饥饿（Windows 中央未解，Android 中央不存在、CPUP relax 生效）；层 3 = 2.4G 侧 192.168.23 段 NAT 出站隔离（EAGAIN→controlhub_unreachable 实锤） | `20260927-COUNTRY-FIX`；**注意固件代码改动不在本仓库**（本仓库只落文档+证据，实体在固件仓库侧，烧录对齐需核对版本）；K80 热点拓扑 runbook 已备（`20260927-HUB-TOKENS/README.md` §六） |
| WINCON-001 | 契约缺口 | OBS-HT-001：hub 对取消态会话消费返回 400 × 固件 `provisioning.c` default 映射 → App 显示 `controlhub_unreachable`（方向性误导）；token 生命周期其余全绿（invalid 404/expired 410@300s/used 409 + MQTT 一次性凭据 ACL/READY 翻转/命令下行幂等） | `20260927-HUB-TOKENS`；待 smart-hid 固件为 400 增加映射或 hub 改 409/410 语义；PROVISIONING_V1.md 错误表同步补 cancelled 行 |
| WINOBS-001 | 观察项 | hub 配对上报 `firmware:1.1.0` vs 设备实为 1.2.0（配对上报字段口径差） | 交 hub 侧裁决（`20260921-P3-HARDWARE/win007-evidence.md`） |
| WINOBS-002 | 时序缺陷 | EWIN-DEF-PROV-001：SHID 匹配态晚于首渲，卡片首渲无「配置」按钮 | 已修（d99b290：E 主进程 mergeAdvertisement 跨帧合并+E/T/G 渲染层粘滞，CDP 3/3+tests 95/95） |
| WINOBS-003 | 用户侧崩溃定案 | 用户报「已连接→扫描」Tab 切换崩溃 = 旧包 companion clinit 竞态 NPE（f668ac9 六连修覆盖）；新 release v1.0.0-fix6 装机 40 连击+冷启动免疫 | `20260927-HUB-TOKENS/README.md` §一 |

## 5. 全平台/语言页面覆盖审计（2026-09-09 · Apple Native 功能 Gate）

> 用户约束：开源项目应尽量让功能、页面、文案和协议在不同语言/平台间对齐。
> `✅` 表示存在对应可执行页面，`△` 表示能力被合并进其他页面或缺专属恢复流，`✕` 表示当前缺失；编译通过不等于真机验收。

| 实现线 | 语言/框架 | P001 扫描 | P002 配网 | P003 HID详情 | P005 诊断 | P006 GATT | P007 已连接 | P008 广播 | P009 关于 | P010 版本 | V1 零SMP |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| U-WX / U-AND | JavaScript + Vue/uni-app | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅（本轮 fail-fast 测试） |
| F-AND / F-MAC | Dart + Flutter | ✅ | ✅ | △ | △ | ✅ | ✅ | ✅ | ✅ | △ | ✅（59 tests） |
| N-MAC | Swift + AppKit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅（62 assertions + 17 page smoke） |
| N-IOS | Swift + SwiftUI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅（共享 SmartHidCore + SwiftPM/Xcode XCTest；E5 待签名/夹具） |
| K-AND | Kotlin + Compose | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 协议层未单列（九屏已齐：2026-09-24/27 AAND 轮补 P002 配网/广播弹窗模态化；F001-F018 真机矩阵详见 `WINDOWS_MOBILE_V1_MASTER_MATRIX.md`） |
| W-WIN（六壳 E/T/V/F/Q/G） | JS(E/T/G)·Rust(T)·C#(V)·Dart(F)·Python(Q) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅（E/T 共享 smart-hid/ota 契约测试 95/95；走查 23/23·16/16·12/12；六壳门禁与产物见 FINAL-REPORT §5/§6） |

原生 iOS 的 P002/P003/P005/P010 与 Smart HID Profile 路由已在 Apple Native 功能 Gate 补齐；**Kotlin Android 对应缺口已于 2026-09-24/27 AAND 轮闭合**（九屏齐：P002 配网/广播弹窗模态化/滚动性能收口），逐页像素级探针未跑（与 W-WIN 同口径）。W-WIN 六壳行 = 页面存在性走查口径（E/G 全页镜像+Q/V/F 各自走查），深层页像素级探针缺口见 FINAL-REPORT §7 遗留台账。N-IOS 已消费同一 UUID、framed-v1、8 错误码、60 秒状态跟踪和 V1 明文直连语义，真机 E5 因签名描述文件与夹具条件未完成，不以模拟器结果冒充。

> 2026-09-07 更正：U-WX/U-AND 行曾记 P003/P005 `✅`——P004 路由与首页历史面板残留曝光后（§4.2 UNIAPP-G1-001），该行按页面存在性维持 `✅`，但页面集合合规性（9 页、无 P004、零持久化）在 PARITY-G1 修复前为 FAIL 口径，修复后以 PARITY-G1 回填为准。

构建基线（2026-09-05）：N-IOS 已完成真机 arm64 签名构建/安装及模拟器 build/install/launch；K-AND 已在 JBR 21 下完成 `assembleDebug + testDebugUnitTest`。这些只证明现有页面可执行，不改变上表功能缺失判定。

### 2026-09-06 用户决策：所有实现线必须按原型补齐

- N-IOS、K-AND 的 P002/P003/P005/P010 从"差距记录"升级为**必须完成的开发范围**，不是可选平台裁剪。
- Flutter 的 P003/P005/P010 `△` 必须收敛为独立可达且行为完整的页面，除非正典先通过正式决策改变页面结构。
- N-MAC 与 uni-app 当前覆盖完整，后续共享内核调整必须保持页面与功能不回退。
- 实施计划：`docs/plans/2026-09-06-native-platform-prototype-parity.md`。

### 2026-09-07 Multi-end Parity Gate 启动

- 三线（U-WX / U-AND / F-AND）统一按 `prototype/v1-new` + `prototype/platform/{wechat,app}` 验收；禁止互相抄实现。
- 页面/组件/状态/视觉四张专项矩阵见 `MULTI_END_PAGE_PARITY_MATRIX.md` / `MULTI_END_COMPONENT_PARITY_MATRIX.md` / `MULTI_END_STATE_PARITY_MATRIX.md` / `MULTI_END_VISUAL_PARITY_MATRIX.md`（初始 NOT_AUDITED，不预填 PASS）。
- 总审计报告：`../06_review/MULTI_END_PARITY_AUDIT.md`。

### 2026-09-09 Apple Native 功能 Gate

- 新增 `core/apple/SmartHidCore`，Swift 真实消费 `smart-hid-v1-vectors.json`；跨平台调度 Swift lane 9/9 PASS。
- N-MAC 已迁移到共享 Core，保持 CoreUnit 62/62、PageSmoke 17/17。
- N-IOS 已补齐 P002/P003/P005/P010、Profile STRONG/WEAK 双入口、INFO/INPUT/STATUS、framed-v1、60 秒状态跟踪、五项诊断和 Release Metadata 投影。
- iOS SwiftPM 测试 12/12、iOS Simulator 单元 XCTest 12/12、UI XCTest 5/5（TabBar 2 + flow-state 3）；物理 iPhone 可见，但本机 Xcode 无登录账号/描述文件，当前 E5=`BLOCKED_SIGNING`。
- UI 结构和文案以 `prototype/platform/{app,desktop}/high-fi` 为源。修正轮现已覆盖九页默认态、P001 筛选/错误/权限/横屏、四 Tab 选中与二级页隐藏，以及 P002/P003/P005 关键成功/错误/空态。当前为 **PARTIAL_ACCESSIBILITY_GATE**；VoiceOver、Dynamic Type、macOS 键盘遍历与物理 iPhone 签名验证未完成前不得写整体验收 PASS。证据见 `verification/apple-native-v1/20260909-ui-audit/`、`20260909-ui-audit-round2/`、`20260910-tabbar-audit/`、`20260910-flow-states-audit/`。
- 证据：`verification/apple-native-v1/20260909-mac-a2/functional-summary.md`。

### 2026-09-10 Mac 收尾轮：§3 记分卡 N-MAC/N-IOS 列回填

- 触发：Mac 收尾开发计划（`docs/plans/2026-09-10-mac-closeout-dev-plan.md`）Task 8；依据全部为在册证据，不预填 PASS。
- 证据源：Phase 2 真无线电九项（`verification/macos-mainline-v1/20260910-phase2/REPORT.md`）· mac-a2 功能 Gate ·
  CoreUnit 80 断言（含 CU-56..66 OTA 契约 / CU-67..73 对比度）· PageSmoke 18 PASS（UIS-18 真机 n=2 重连）·
  iOS 单测 20/20 + UI 11/11（无障碍五套）· 真机息屏后台 BLE（4c19a58）· Phase 4 真机签名链。
- 判定纪律：`PASS` 仅限有自动化断言或真无线电实证的行；协议层已测而 E2E 无夹具的行明确拆分
  `协议层 PASS / E2E BLOCKED`；真机未验写 `NOT_RUN`；平台差异（微信授权/微信广播/系统分享）按 §2 记 `N/A`。
- 已知 FAIL（如实保留）：UIS-18-OTA 对**未烧录旧固件**的 ESP32 真机跑 OTA，ready 超时——DEV-014 修复
  待烧录（Phase 7 解锁项），烧录后该行应转正；不以此 FAIL 回退 R-1/R-2 契约对齐（单测与 UIS-16 已证解析正确）。

## 6. Windows 六壳记分明细（2026-09-27 回填；消费 FINAL-REPORT §3/§4 + 9/22~9/27 增量轮）

> W-WIN = Windows 桌面六实现壳汇总：E-WIN（Electron）/ T-WIN（Tauri）/ V-WIN（Avalonia）/ F-WIN（Flutter）/ Q-WIN（PySide6+bleak）/ G-WIN（Wails+Go）。
> 证据总库 `verification/windows-plan-v1/`；`FINAL-REPORT.md` = 2026-09-21 基线（WIN-001~017 全收口，看板 PASS 2/PASS_WITH_OBS 15/BLOCKED 0），其后增量轮以提交在案。本节只做汇总索引，不复制证据原文。

### 6.1 能力×壳矩阵（FINAL-REPORT §3 原表 + 增量轮三处升级）

图例：✔=真机证据；✔ᵐ=移动端同源代码真机证据（Windows 侧未独立取证）；⤓=正典降级（有据）。

| 能力 | E | T | V | F | Q | G | 说明 |
|---|---|---|---|---|---|---|---|
| 扫描（真机） | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | P4 CDP 首扫；P5 bleak 11 台；各立项轮 |
| 连接+服务枚举 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | 20260918-WIN-ALL；F=补证轮 1svc/3char |
| 读（INFO 身份） | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Q 130B JSON fw1.2.0；F 补证轮同构 |
| 写（带响应） | ✔ | ✔ | ✔ | ✔ᵐ | ✔¹ | ✔² | 20260911 W3 四写四中+20260918 写探针矩阵；注¹²=INPUT 设备锁护栏口径（§2） |
| Notify 订阅/退订 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Q STATUS 订阅语义断言；F 补证轮绿态 |
| 广播（外设模式） | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | **增量轮升级**：FINAL-REPORT 基线原为「仅 V ✔ 其余 ⤓」；现六壳三路径全通（见 6.2-1）；仅厂商块 0xFF=平台事实 |
| F004 广播数据弹窗 | ✔ | ✔ | ✔ | ✔ | ✔ | — | 20260924 F004 轮五壳（V=原始段+整包 hex 唯一非重建壳） |
| 扫码配对（P002） | ✔ | ✔ | ✔ | ⤓ | ✔ | ✔ | F=mobile_scanner 无 Windows 实现→粘贴单路径（正典降级） |
| 配网 E2E（P002 BLE 链） | ✔ | — | — | — | — | — | E-WIN：BLE 链全通+hub 配对消费+FW-LOCK 清除铁证（WiFi 终态受环境=OBS） |
| OTA E2E | ✔ | ✔ | — | — | — | — | 两轮：20260911 W5 真刷+串口；20260921 P3 fixture 556KB 迁移+设备侧回读 |
| 生命周期/退出确认 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | WIN-016 正典对齐（busy 模态实测） |
| 正典 UI（tokens/布局） | ✔ | ✔⁵ | ✔ | ✔ | ✔ | ✔⁵ | UIALIGN 三轮探针（81/81、92/92、28/28、21/21）；注⁵=E/G/T 前端字节级同源 |
| 安装/分发产物 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | P4 八产物+SHA256；未签名一律 Preview |

### 6.2 增量轮对 FINAL-REPORT 基线的升级（2026-09-22~24）

1. **广播六壳全通**（原基线仅 V-WIN）：F=flutter_ble_peripheral 门控翻开后双端空口实证（65024b4，手机收 06ff0100424c45）；E=WinRT PS 边车（a446608，44 包双端验证）；G/Q/T=air 门控正式发射路径（AIR-GQT `20260924-AIR-GQT`，联想平板 Android 16 收包 G34/Q29/T31，07ff0100+标签字节保真）。N4 广播 Tab 裁决=案 B 恒显+未就绪徽章（afe4fd3）。
2. **F004 广播数据弹窗五壳齐**（afa5b3f）：E/T/G AdvertisementSheet（AD 结构逐段重建）+Q AdvDialog（ScanHit.service_data 深色段）+V WinRT DataSections（原始段+整包 hex）；K-AND 手机端 R2 模态正典（331d927）。
3. **OTA 证据加固**：在 20260911 W5（E/T 真刷+串口 boot 帧证据）之上，P3-HARDWARE 补 E/T LightBLE fixture 556KB 双版本迁移+设备侧 BLE 直读版本回读（9a874c4）；SHID 固件线 OTA 未跑（测试后设备已归位出厂态）。P-03 口径维持，解除归正典裁决。

### 6.3 环境锚点与复现

- 环境：Windows 10 22H2（10.0.19045）；node 20.19.3（CDP 需 nvm 23.8）/ cargo 1.98.1 / dotnet 9.0.200 / flutter 3.38.3 / go 1.24.0 + wails 2.16.0 / python 3.13.2（bleak 3.0.2）。
- 六壳门禁与真机探针复现命令：FINAL-REPORT §8；产物哈希全量：`20260921-P4-PACKAGING/artifacts/SHA256SUMS.txt`。
- 用户裁决项现状：N4 已裁决（案 B 落地）；F/E/T/G/Q 广播升级已随增量轮实现；T MSI 提权安装冒烟已闭环（65024b4）；仅剩「六壳签名」待签名凭据（不入库）。
