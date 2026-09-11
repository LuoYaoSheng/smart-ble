# Windows Mobile V1 总功能矩阵（WINDOWS_MOBILE_V1_MASTER_MATRIX）

- 状态：初版 2026-09-05（run-id `20260905-1726-1b793ca`，基线 commit `1b793ca`）
- 事实源：`docs/specs/02_product/FEATURE_MAP.md`（F001–F030 官方编号/优先级/名称）+
  PRD.md §4/§5；执行任务书（2026-09-05 用户全量测试指令）
- 三实现线：U-WX（apps/uniapp→微信小程序·Android 微信真机）/ U-AND（apps/uniapp→Android App 真机）/
  F-AND（apps/flutter→Android App 真机）
- **2026-09-07 扩展**：用户指令「Windows 能做的线全部纳入并对齐」→ 新增 A-AND（Android 原生）/E-WIN（Electron 桌面）/
  T-WIN（Tauri 桌面）/V-WIN（Avalonia 原型）及 NOT_APPLICABLE 一次性裁决，见 §4；新线结果同样回填 §1「最终结论」列（线前缀区分）
- 状态词：`PASS / PASS_WITH_LIMITATION / FAIL / BLOCKED_HARDWARE / BLOCKED_FIXTURE /
  BLOCKED_HOST / BLOCKED_TOOLCHAIN / NOT_RUN / NOT_APPLICABLE / NOT_CONFIGURED`
- 铁律：**所有行初始 NOT_RUN，未真实执行不得改 PASS**；F025 三线固定 BLOCKED（P-03）

## 1. 主表（状态列 = 验证状态，初始 NOT_RUN）

| ID | 功能（PRD 名） | P | 业务域 | 页面 | U-WX | U-AND | F-AND | 自动化 | 真机 | ESP32 角色 | 正常路径 | 异常路径 | 最终结论 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F001 | BLE 扫描 | P0 | 扫描 | P001 | REQ | REQ | REQ | E1/E2 | E5 | Peripheral | F-AND PASS | NOT_RUN | F-AND PASS；U-AND PASS（13/13，uand-p001-e5 v5 真机）；A-AND PASS（13/13，a-and-p001-e5 v5 真机）；U-WX BLOCKED_TOOLCHAIN |
| F002 | 扫描权限前置 | P0 | 扫描 | P001 | REQ | REQ | REQ | E2 | E5 | 不需要 | F-AND PASS(预授路径) | NOT_RUN | 同上（U-AND 弹窗链实测：定位+附近设备双弹窗；A-AND 预授路径=五权限 pm grant） |
| F003 | 扫描筛选 | P0 | 扫描 | P001 | REQ | REQ | REQ | E1/E2 | E5 | 可选 | F-AND PASS | NOT_RUN | F-AND PASS（含 WIN-FAND-001/002）；U-AND PASS（面板展开+完整表单：信号强度/名称前缀/重置过滤）；A-AND PASS（content-desc 展开箭头→信号强度预设+全部+名称前缀） |
| F004 | 广播数据查看 | P0 | 扫描 | P001 | REQ | REQ | REQ | E2 | E5 | Peripheral | F-AND PASS | NOT_RUN | F-AND PASS；U-AND PASS（广播详情含 RSSI 历史/厂商数据）；A-AND PASS（广播数据/发射功率/MAC；WIN-AAND-001 INT_MIN dBm 在册） |
| F005 | 显示名智能解析 | P1 | 扫描 | P001 | REQ | REQ | REQ | E1/E2 | E5 | Peripheral | F-AND 具名 PASS；未命名链=已知偏差 FEAT-F-003 | NOT_RUN | F-AND/U-AND 具名路径均 PASS（BLEToolkit-Server 卡片）；A-AND 具名 PASS、未命名渲染「未知设备」+MAC；R05 全链未实现登记 |
| F006 | GATT 连接 | P0 | GATT | P006 | REQ | REQ | REQ | E2 | E5 | Peripheral | F-AND PASS | NOT_RUN | F-AND PASS（连接→服务发现→已连接，E5 真机）；A-AND PASS（E5 真机 v16/v17：连接+发现 5 服务+已连接徽标全绿）；**E-WIN PASS + T-WIN PASS（2026-09-11 W3：扫描命中→连接→5 服务，CDP 真链路；证据 20260911-win-b3/w3-gatt-*）** |
| F007 | 服务树浏览 | P0 | GATT | P006 | REQ | REQ | REQ | E2 | E5 | Peripheral | F-AND PASS | NOT_RUN | F-AND PASS；服务命名修复 WIN-FAND-003 后 GAP/GATT 具名、仅 914d 标 OTA；A-AND PASS_WITH_LIMITATION（5 卡身份+计数+OTA 具名+主卡两行签名全验证；WIN-AAND-002 不具名/003 视口挤压/007 通信期列表重置在册）；**E-WIN PASS + T-WIN PASS（W3：1800/1801/914b/c/d 五服务特征 2/1/2/7/3=15 双线同构）** |
| F008 | 特征读取 | P0 | GATT | P006 | REQ | REQ | REQ | E2 | E5 | Peripheral(Read) | F-AND PASS | NOT_RUN | F-AND PASS（控制=system_info JSON、权限 b0=read_only JSON）；固件 WIN-ESP32-002 修复后；A-AND PASS_WITH_LIMITATION（26a8+b0 读 logcat status=0+UI 日志；读值不进 UI=WIN-AAND-004）；**E-WIN PASS + T-WIN PASS（W3：26a8 system_info JSON + 26b0 read_only JSON（hex→utf8 含 firmware_version/read_only））** |
| F009 | 特征写入 | P0 | GATT | P006 | REQ | REQ | REQ | E2 | E5 | Peripheral(LED FF00–FF03) | F-AND PASS | NOT_RUN | F-AND PASS（HEX FF01/FF00 + UTF-8 开灯，write_response led_state/command 回显）；A-AND PASS_WITH_LIMITATION（TEXT+HEX 三写：写入成功+logcat status=0×3+串口 Write event/LED 实变；回显 UI 断=WIN-AAND-006/008）；**E-WIN PASS + T-WIN PASS（W3：HEX FF01/FF00 + UTF-8 开灯/关灯 四写四中，write_response 回显 led_state 翻转+串口 led on/on/off/off 逐条对应；E-WIN 主进程写路径缺陷已修=format 语义+withoutResponse 错位）** |
| F010 | Notify 监听 | P0 | GATT | P006 | REQ | REQ | REQ | E2 | E5 | Peripheral(Notify) | F-AND PASS | NOT_RUN | F-AND PASS（欢迎推送/5s 周期 device_status/开关往返）；WIN-FAND-004 修复后；A-AND PASS_WITH_LIMITATION（订阅/停止往返+26a9 周期到达 logcat 计数实证；载荷 UI 断=WIN-AAND-006/008）；**E-WIN PASS + T-WIN PASS（W3：26a8+26a9 双订阅（真按钮）+26a8 回显渲染+26a9 周期 device_status+退订后 8s 净停；E-WIN noble subscribe 签名缺陷已修）** |
| F011 | 通信日志 | P0 | GATT | P006/P008 | REQ | REQ | REQ | E1/E2 | E5 | 不需要 | F-AND PASS | NOT_RUN | F-AND PASS（清空→面板隐藏、读重建、导出剪贴板回执）；A-AND PASS（清空→隐藏+滚动区 570px 实测→重建→系统分享面板导出全绿）；**E-WIN PASS + T-WIN PASS（W3：清空→0 条→读取重建；LogPanel dock 常驻=与移动端清空即隐藏的形态差异记录在案）** |
| F012 | 断线自动重连 | P0 | GATT | P006/P007 | REQ | REQ | REQ | E2 | E5 | Peripheral(断电/重启) | F-AND PASS | NOT_RUN | F-AND PASS（固件 fault 注入拆链→重连中→2s 自动重连；串口交叉验证）；WIN-FAND-005/006 修复后；重连后首读 8s 无响应=观察项；UI 为状态 chip 非「重新连接」横幅=形态差异；A-AND PASS（fault 拆链→scheduling 1/3→attempt 1/3→重连+重发现×2→用户断开无新 attempt 全链真机；WIN-AAND-005 日志形态在册）；**E-WIN PASS + T-WIN PASS（W3：fault 注入断链→1/3 重连→服务恢复→用户断开无新重连，串口 connected/disconnected/re-connected 三段交叉；T-WIN btleplug 重连 Device not found 已修=未命中 6s 重扫重建 WinRT 缓存）** |
| F013 | 多设备会话管理 | P1 | 多设备 | P007 | REQ | REQ | REQ | E2 | E5 | 严格 E5 需第二外设 | U-AND PASS_WITH_LIMITATION | NOT_RUN | U-AND PASS_WITH_LIMITATION（双手机夹具：E5 中央 + ESP32 + 华为 A-AND 广播者；列表 N=2/单断→N=1/重连→N=2/全断→空态真机；部分失败清单弹窗未触发；WIN-UAND-001 在册）；F-AND/A-AND 待复用夹具跑 |
| F014 | 微信 peripheral 广播 | P1 | 广播 | P008 | REQ | N/A | N/A | E2 | E5 | Observer | NOT_RUN | NOT_RUN | U-WX BLOCKED_TOOLCHAIN（开发者工具扫码登录，沿用）；U-AND/F-AND/A-AND 依矩阵 N/A（微信专属）|
| F015 | App 原生插件广播 | P1 | 广播 | P008 | N/A | REQ | REQ | E2 | E5 | Observer | NOT_RUN | NOT_RUN | F-AND PASS（p008 集成测试 30s 全过：FF 非法长度/空 UUID 拦截+广播中 15s+停止；观察侧 15 条 fff0 交叉）；A-AND PASS（F015 等价并入 9/9：启停 UI+logcat+观察侧净停）；U-AND PASS_WITH_LIMITATION（降级路径 9/9 实证；正路径=自定义基座需 HBuilderX 云打包登录=BLOCKED_TOOLCHAIN）|
| F016 | 31 字节负载预算 | P1 | 广播 | P008 | REQ | REQ | REQ | E1/E2 | E5 | Observer(合法包) | NOT_RUN | NOT_RUN | F-AND PASS（46/31 红显+按钮禁用+25/31 恢复）；U-AND PASS（预算算术 7→11→23→34/超限红显+toast 拦截+冷重启恢复 7，9/9）；U-WX BLOCKED_TOOLCHAIN；A-AND NOT_APPLICABLE（广播页无负载编辑器）|
| F017 | 观察侧证据匹配 | P2 | 广播 | 无独立页 | REQ | REQ | REQ | E1 | E5 | Observer(JSON) | NOT_RUN | NOT_RUN | A-AND PASS（fixture_observer_s3 串口 JSON：services=fff0+name=「耀生 的 S21」23 条 10s 窗口+停止后净停）；F-AND PASS（15 条 fff0 全名匹配，mfg=0100424c45=ID 0x0001+ASCII BLE 逐字节交叉）；U-AND BLOCKED_TOOLCHAIN（随 F015 正路径）|
| F018 | Profile 设备识别 | P0 | Profile | P001/P007 | REQ | REQ | REQ | E1/E2 | E5 | Peripheral/SHID | NOT_RUN | NOT_RUN | F-AND PASS（HEAD 复跑 p002 三场景 `shidConfigureBtn` 命中+p001 负向断言）；U-AND PASS（run2/run3 双轮真机：`Smart HID · 强匹配` 徽章+`配置 Smart HID`/`连接` 双入口截图）；A-AND NOT_RUN（PARITY-001）；U-WX BLOCKED_TOOLCHAIN |
| F019 | 配网向导 | P0 | Smart HID | P002 | REQ | REQ | REQ | E2 | E5 | 真实 Smart HID | NOT_RUN | NOT_RUN | F-AND PASS（HEAD 复跑 leave/cancel_wait/wifi_fail：connect→configure 相位 1 次连接即达+U-01 双态弹窗）；U-AND FAIL（WIN-UAND-003b 读特征 10007→连接失败态 5/5，向导不可达 configure）；A-AND NOT_RUN（PARITY-001）；U-WX BLOCKED_TOOLCHAIN |
| F020 | 配对码扫码 | P0 | Smart HID | P002 | REQ | REQ | REQ | E2 | E5 | 真实 ControlHub | NOT_RUN | NOT_RUN | F-AND PASS（qrPaste 粘贴路径三场景全过：「已获取」回填）；T1 相机路径引用 E14；U-AND NOT_RUN（被 003b 阻在前置连接；相册路径 QR 已备未达）；A-AND NOT_RUN（PARITY-001）；U-WX BLOCKED_TOOLCHAIN |
| F021 | 分帧明文写入+状态跟踪 | P0 | Smart HID | P002 | REQ | REQ | REQ | E2 | E5 | 真实 Smart HID | NOT_RUN | NOT_RUN | F-AND PASS（设备串口逐场景：`candidate: ssid=… token=**redacted**`→`received`→`connecting_wifi`，STATUS 轮询跟踪在案；E14 引用 T1 success 全链）；U-AND NOT_RUN（003b）；A-AND NOT_RUN（PARITY-001）；U-WX BLOCKED_TOOLCHAIN |
| F022 | 配网错误恢复 | P0 | Smart HID | P002/P005 | REQ | REQ | REQ | E2 | E5 | 真实 Smart HID+Hub | NOT_RUN | NOT_RUN | F-AND PASS（HEAD 复跑：伪 SSID→`wifi_failed` 终态+「返回表单修改」+cancel→`timeout`+「重新下发」；pairing/mqtt 分流引用 E14 T3/T4 真机）；U-AND NOT_RUN（003b）；A-AND NOT_RUN（PARITY-001）；U-WX BLOCKED_TOOLCHAIN |
| F023 | ~~设备历史~~（删除红线） | P0 | Smart HID | P004 应不存在 | 禁止 | 禁止 | 禁止 | E1/E2 | E5 | 不需要 | NOT_RUN | NOT_RUN | 三线 PASS（静态检查：U-AND 9 路由/F-AND 9 页面/A-AND 4 Tab 均无历史页/路由/持久化；known-devices.js 与 hid_session_store.dart 内存化+2026-09-02 移除决策注释在案） |
| F024 | 实时诊断（五项） | P1 | Smart HID | P005 | REQ | REQ | REQ | E2 | E5 | 真实 Smart HID+Hub | NOT_RUN | NOT_RUN | F-AND PASS_WITH_LIMITATION（E14 T4 真机诊断面板重读 INFO/STATUS@3638f66 + HEAD 代码复核 `HidDiagnosticsPage(fromWizard)` 五行映射；独立页真机复跑需 mqtt_invalid=真凭据，本轮未达）；U-AND NOT_RUN（003b：诊断依赖读特征）；A-AND NOT_RUN（PARITY-001）；U-WX BLOCKED_TOOLCHAIN |
| F025 | 固件升级 OTA | P1 | OTA | P006 子流程 | BLOCKED | BLOCKED | BLOCKED | E2 | 仅契约/UI | 不需要 | NOT_RUN | NOT_RUN | BLOCKED(P-03)（移动三线维持；**桌面 E3 实刷证据已产出 2026-09-11 W5**：E-WIN 1.0.0→1.0.2 全链 PASS_WITH_OBS=UI 11/12 + 串口 `ota success 570480/570480`→复位→boot@1.0.2；T-WIN 1.0.2→1.0.3 + 取消分支 PASS_WITH_OBS=UI 14/15 + noble 直读 firmware_version 1.0.3；观察项=OTA 复位后重连 UI 读 26a8 不回调（noble-winrt/btleplug 已知行为，版本证据由串口 boot 帧/直读承担）；writeNoResponse 字节腐败等 5 缺陷修复账本见 20260911-win-b3/w5-ota-SUMMARY.md；F025 解除与否仍归正典裁决，不因证据自动解除） |
| F026 | 日志脱敏 | P0 | 横切 | 横切 | REQ | REQ | REQ | E1/E2 | E5 | 不需要 | 三线 E1 PASS（2026-09-10：F-AND/A-AND 新增 Logger 漏斗脱敏 + 同向量单测 13/12 例；U-AND 沿用 logging-target 集成测试） | E1 PASS（边界向量：hex 转储不误伤/非法 JSON 原样/保护键白名单） | E1 三线 PASS（F-AND log_redaction_test.dart 13 例、A-AND LogRedactionTest 12 例、U-AND logging-target.test.mjs 既有）；E5 真机 logcat 抽查留硬件窗口 |
| F027 | 版本元数据展示 | P2 | 系统 | P009/P010 | REQ | REQ | REQ | E2 | E5 | 不需要 | 三线 E1 PASS（2026-09-10：生成管线 1→6 产物含 F-AND Dart/A-AND Kotlin 锁定镜像；P009 三态+P010 整页投影接线，手写版本事实清零） | E1 PASS（空元数据→dev.unknown 不编造/release 注入→VERIFIED 历史/注入不污染全局） | E1 三线 PASS（F-AND version_metadata_test.dart 14 例、A-AND VersionMetadataTest 14 例 XML 实证、U-AND version-*-target.test.mjs 既有）；A-AND 假「Release tag 已登记」行与两线错误预览空态已修；E2/E5 真机 P009/P010 抽查留硬件窗口 |
| F028 | 小程序推广跳转 | P2 | 系统 | P009 | — | — | — | — | — | **已移除（2026-09-10）** | REMOVED | REMOVED | REMOVED |
| F029 | 分享 | P2 | 系统 | 页面级/P009 | REQ | REQ | REQ | E2 | E5 | 不需要 | NOT_RUN | NOT_RUN | NOT_RUN |
| F030 | 国际化（禁止新增） | P2 | 系统 | 无页面 | 禁止新增 | 禁止新增 | 禁止新增 | E1 | 不适用 | 不需要 | E1 PASS（2026-09-10：E-WIN/T-WIN i18n 机器+uniapp 孤儿字典移除清零；check-f030-no-i18n.mjs 静态守卫入 verify-uniapp 第 14 门禁，注入 4 类违规自检全检出） | NOT_RUN | E1 PASS（全实现线静态守卫：i18n 机器/语言切换入口/Android localeConfig/locale 资产 300 文件全净；F-AND l10n=PRD「就绪未接线」白名单、Global delegates=FLUTTER-G1-004 框架基建在册；F030 未被误实现） |

## 2. 每项明细（用户入口 / 规范来源 / 证据 / 缺陷 / Git SHA）

> 逐项回填；证据目录 `verification/windows-mobile-v1/20260905-1726-1b793ca/`。
> Git SHA = 验证时 HEAD（未填 = 未验证）。

| ID | 用户入口 | 规范来源 | 证据 | 缺陷 | Git SHA |
|---|---|---|---|---|---|
| F001 | P001「开始扫描」按钮；进页生命周期 | FEATURE_MAP§1·PRD§4·任务书§13 | run 20260905-1726-1b793ca/flutter-android/f001-f005-scan-v6-app.log（F-AND E5：5s 会话/自动停/手动停/首启空态全断言过）+ android-native/aand-p001-e5-results.json（A-AND E5 13/13） | — | 见本域提交 |
| F002 | 首次扫描触发权限链；蓝牙未开引导 | PERMISSION(10_platform)·任务书§13 | 同上（wrapper 预授路径）+ uniapp-android 驱动（U-AND 实测定位+蓝牙双弹窗）+ A-AND 五权限 pm grant 预授 | — | 见本域提交 |
| F003 | 扫描卡片上方筛选区 | PRD·PAGE_SPEC P001 | 同上 v6（面板/正向前缀/反向空态/重置全过）+ A-AND v5（content-desc 箭头→完整表单） | WIN-FAND-001/002（已修复） | 见本域提交 |
| F004 | 扫描卡片「广播」入口 → F004 广播详情 sheet | PAGE_SPEC P001 | 同上 v6（设备ID/名称/RSSI/UUIDs/AD 逐段/厂商数据/复制/关闭）+ A-AND v5（广播数据/发射功率/MAC/名称） | WIN-AAND-001（在册，P3：INT_MIN dBm） | 见本域提交 |
| F005 | 扫描卡片显示名渲染 | R05·PAGE_SPEC P001 | 同上 v6（具名路径）；未命名链 R05 未实现=FEAT-F-003 在册 | FEAT-F-003（在册） | 见本域提交 |
| F006 | P001 卡片「连接」/ Profile「连接」 | DEC-013·PAGE_SPEC P006 | v12 exit=0：连接→发现 5 服务→「已连接」chip；A-AND a-and-f006-f012-e5.py v16/v17（连接+发现 5 服务+徽标，E5 真机） | — | 见本域提交 |
| F007 | P006 服务树折叠/展开 | PAGE_SPEC P006 | v12：GAP/GATT 具名、OTA=1、未知=2；主服务 2 特征（读+写+通知/写+通知）、权限 7 特征展开断言；A-AND v16/v17：5 卡身份（1800·2/1801·1/c201·2/c201·7/OTA Service c201·3）+主卡两行分步签名（探针1 证明 scrollable=1446-2016、短码+特征值徽章可直读） | WIN-FAND-003（已修复）；WIN-AAND-002/003/007（在册） | 见本域提交 |
| F008 | P006 特征「读」 | PAGE_SPEC P006 | v12：控制 26a8=system_info JSON、权限 b0=read_only JSON（UTF-8）；A-AND v16/v17：26a8 读 logcat status=0 + UI 日志（b0 同判据 v9 通过；读值旁证=logcat+串口） | WIN-ESP32-002（已修复重烧）；WIN-AAND-004（在册：读值不进 UI） | 见本域提交 |
| F009 | P006 特征写入（TEXT/HEX） | PAGE_SPEC P006 | v12：FF01/FF00/「开灯」三写全过 + write_response 回显（led_state/command）；A-AND v14-v17：LED_ON/FF01/FF00 三写写入成功+logcat onCharacteristicWrite status=0×3+串口 Write event+led on/off 实变+write_response 下发（截断） | WIN-ESP32-002（已修复重烧）；WIN-AAND-006（MTU 20 字节截断）/008（通知不达 UI，均在册） | 见本域提交 |
| F010 | P006 特征 Notify 开关 | PAGE_SPEC P006 | v12：26a9 订阅即收「开始监听系统状态」+5s 周期 device_status+停止往返；A-AND v16/v17：订阅/停止 UI 往返+26a9 通知持续到达（logcat 计数 5s 节奏 11→14/16→19；栈层 89 次 onCharacteristicChanged） | WIN-FAND-004（已修复）；WIN-AAND-006/008（在册：载荷 UI 不可读） | 见本域提交 |
| F011 | P006/P008 日志区（清空/复制/导出） | PAGE_SPEC P006/P008 | v12：清空→面板隐藏→读重建→导出「已复制到剪贴板」回执；A-AND v16/v17：清空→面板隐藏（滚动区 1446-2016 实测）→重建→导出=系统分享面板（导出文本全预览） | — | 见本域提交 |
| F012 | 断开后横幅「重新连接」 | F012·SEQUENCE | v12：fault/disconnect 外设拆链（串口实证）→「重连中...」→2s 重连成功；用户主动断开不触发重连。UI 为状态 chip 非「重新连接」横幅（形态差异）；重连后首读 8s 无响应（观察项，后续 b0 读正常）；A-AND v16/v17：fault 拆链→scheduling 1/3→attempt 1/3→已连接恢复→Discovered×2→用户断开回列表无新 attempt（全链真机+串口对时序） | WIN-ESP32-002(disconnect(0) rc=7)、WIN-FAND-005/006（均已修复）；WIN-AAND-005（在册：userInitiated 日志形态） | 见本域提交 |
| F013 | P007 已连接列表（单断/全断） | PAGE_SPEC P007 | f013-dualphone/f013-summary.md：uand-f013-e5 v28 + uand-f013b 6/7（E5 中央 + ESP32 + 华为 A-AND 广播双机布景；列表 N=2/单断 N=1/重连 N=2/全断空态截图+dump 链） | WIN-UAND-001（在册，P3：RPA 轮转双条目）；部分失败清单弹窗未真机触发（限制） | 见 8d2dcd8 |
| F014 | P008 微信广播开关（wx API） | C1 supported_limited·10_platform | （U-WX 仍 BLOCKED_TOOLCHAIN：开发者工具扫码登录；无本轮新证据） | — | — |
| F015 | P008 App 广播表单+开关（插件） | 10_platform·任务书§16 | android-native/aand-f014-f017-results.json（A-AND 9/9：非法 UUID 拦截/启停 UI+logcat/净停）+ flutter-android/f014-f017-broadcast-app.log（F-AND dart 全过）+ uniapp-android/uand-f014-f017-results.json（U-AND 9/9 降级路径） | WIN-UAND-002（已修复：APP-ANDROID/APP-IOS 条件编译 token 未定义→Android 块编译丢弃；改 runtime systemInfo 分支） | 见本域提交 |
| F016 | P008 负载编辑器预算条 | F016·10_platform | 同上（F-AND 46/31→25/31；U-AND 7→11→23→34 拦截算术+toast+冷启动恢复；A-AND NOT_APPLICABLE 证据帧 aand-f016-notapplicable-page.png） | — | 见本域提交 |
| F017 | 无页面（服务层+Observer 交叉核对） | F017·任务书§16 | android-native/aand-f014-f017-observer-serial.txt（A-AND fff0 34 条+净停）+ flutter-android/f014-f017-broadcast-observer-serial.txt/-observer-analysis.txt（F-AND 15 条 mfg=0100424c45 全名匹配） | — | 见本域提交 |
| F018 | P001 扫描卡片 SHID 徽章+双入口 | PROFILE 注册表 | f018-f024/flutter-android/f019-leave-v2 等（`shidConfigureBtn` 6 轮扫描等待命中） | （PARITY-001 无入口） | f018-f024/uniapp-android/f018-01-shid-card.png + uand-f018-f024-results.json（run2/run3 双 PASS） | 见本域提交 |
| F019 | P001「配置 Smart HID」→ P002 向导 | PROVISIONING_V1 | f018-f024/flutter-android/f019-leave-v2-app.log（`configure 阶段已到达（第 1 次连接）`）+f022-cancel/wififail | （PARITY-001） | f018-f024/uniapp-android/f019-02-configure.png（连接失败态）+run2-uand-shid-device-serial.txt（连接→订阅 attr=3→拆链） | WIN-UAND-003a 已修复/003b 在册 | 见本域提交 |
| F020 | P002 扫码面板（相机/粘贴） | PROVISIONING_V1·F020 | 同上（`表单已就绪（token 已回填…扫码面板已退场）`） | （PARITY-001） | 相册路径 QR 已备（f020-pairing-qr.png+推送 DCIM），被 003b 阻未达 | — | 见本域提交 |
| F021 | P002「下发配置」（framed-v1 分帧） | PROVISIONING_V1 §写入 | f018-f024/flutter-android/*-device-serial.txt（`candidate: ssid=… token=**redacted**`→received→connecting_wifi 逐场景） | （PARITY-001） | （003b 阻塞） | — | 见本域提交 |
| F022 | P002 错误终态四分流恢复 | ERROR_CODE·PAGE_SPEC | f022-wififail-v2-app.log（`outcome=wifi_failed`+返回表单修改）+f022-cancel-v1（timeout+重新下发）；T3/T4 引用 E14 run-id 20260904-win-b1/e14-macos-return | （PARITY-001） | （003b 阻塞） | — | 见本域提交 |
| F023 | 无入口（验证不存在：页面/路由/存储/文案） | 变更记录 2026-09-02 | 三线静态检查全过（路由清单/存储 API 清零/CommandQueue.clearHistory=写队列概念非设备历史） | 同左 | 同左（业务源码零 setStorageSync；命中项=FORBIDDEN_TOKEN_SINKS 禁用清单） | — | 见本域提交 |
| F024 | P003「诊断」/P005 直接进入 | PAGE_SPEC P005 | E14 T4 真机（mqtt_invalid→运行诊断→面板重读两特征）+HEAD 路由复核（provisioning_page `_openDiagnostics` fromWizard） | （PARITY-001） | f024-11-connected-detail.png（已连接可达）+f024-12-p003.png（P003 仅配网成功后填充 hidStore，未达运行诊断；诊断读路径被 003b 阻塞） | WIN-UAND-003b（连带） | 见本域提交 |
| F025 | P006 内 OTA 入口（BLOCKED 展示） | P-03 决议 | — | — | — |
| F026 | 全局日志管线 | F026·任务书§19 | — | — | — |
| F027 | P009 关于/P010 版本记录 | Release Metadata | — | — | — |
| F028 | ~~P009 推广区~~（2026-09-10 移除） | 10_platform（差异行同日作废） | — | — | — |
| F029 | 页面分享入口/右上角 | 10_platform | — | — | — |
| F030 | 无入口（验证不存在语言切换） | F030 决议 | — | — | — |

## 3. 已知先行事实（回填时不得重复劳动，但状态仍按本轮实测）

- E14（`verification/windows-mobile-v1/20260904-win-b1/e14-macos-return/`）已在 F-AND 真机
  完整闭环 F019/F020/F021/F022 的 E5 十场景（U-01/T1–T7/双机），含两缺陷修复与六在册缺陷。
  本矩阵仍需按本轮代码 HEAD 重跑或引用该证据链复核后回填（引用时注明 E14 run-id）。
- F023/F030 属删除红线，验证方式为「全仓 + 三实现线产物内不得出现对应能力」的静态与冷启动检查。

## 4. Windows 主机全量实现线登记（2026-09-07 扩展）

> 依据：用户指令「Windows 能做的（原生/跨平台桌面/Android uniapp/Android flutter/Android 原生等）全部纳入并对齐」。
> 三路只读侦查（apps/android、apps/desktop×6、uniapp-H5/flutter-Windows）证据-backed；本节为登记与一次性裁决，各线逐项实测结果仍回填 §1 主表「最终结论」列（线前缀区分）。

### 4.1 可执行线登记

| 线 | 目标 | 层级 | BLE 后端（Windows） | 2026-09-07 状态 |
|---|---|---|---|---|
| A-AND | apps/android（Kotlin+Compose，`com.smartble`，纯 android.bluetooth 框架，780 行 BleManager 实装）真机 | Primary | Android 手机radio | **扫描+GATT+广播域已通**：F001-F005 等价 13/13（a-and-p001-e5 v5）；F006-F012 GATT 域 PASS×3+PASS_WITH_LIMITATION×4（a-and-f006-f012-e5 v16=39/46/v17=37/46，E5 真机+串口旁证；缺陷 WIN-AAND-001..008 在册，其中 006/007/008 为通知/UI 链路结构性缺陷待修）；广播域 F014-F017 已跑 9/9（a-and-f014-f017-e5：F015 等价启停+非法 UUID+观察侧 fff0 交叉+净停；F016 NOT_APPLICABLE 无负载编辑器）；Smart HID 域 F018-F024=PARITY-001 裁决 NOT_RUN |
| E-WIN | apps/desktop/electron Windows 桌面 | Secondary | `@abandonware/noble` WinRT 绑定（本机 node_modules 已编译 binding.node，曾实跑） | **F006-F012 GATT 域真实收口 PASS（2026-09-11 W3：20/20，含 write format/notify subscribe 两主进程缺陷修复）**；Smart HID 域=PARITY-002 待 W4 |
| T-WIN | apps/desktop/tauri Windows 桌面 | Primary | btleplug 0.11（WinRT；源码完整：lib.rs 1063 行 + 完整前端的 Electron 镜像） | **F006-F012 GATT 域真实收口 PASS（2026-09-11 W3：20/20，含 btleplug 断链重连重扫修复）**；Smart HID 域=PARITY-002 待 W4 |
| V-WIN | apps/desktop/avalonia 原型 | Experimental | 真 WinRT 代码（net8.0-windows10.0.19041.0 TFM 投影；原 WindowsBluetooth NuGet 为幽灵包已除名；读写通知 ViewModel 未接线） | **Build Smoke PASS**（2026-09-11 W1：dotnet build exit 0/0 错误，PARITY-006 收口；证据 verification/windows-mobile-v1/20260911-win-b3/w1-vwin-build-smoke/；维持不入功能对齐裁决） |

### 4.2 NOT_APPLICABLE / NOT_CONFIGURED 一次性裁决

| 线 | 目标 | 裁决 | 依据 |
|---|---|---|---|
| U-H5 | uniapp→浏览器 | NOT_CONFIGURED（BLE 无路径） | package.json 无 build:h5；BLE 层全走 `uni.*` 无 WebBluetooth 分支；manifest.json 无 h5 键；`scan-permission.js` 非 MP-WEIXIN 分支直接报「当前平台不支持 BLE 扫描」 |
| F-WIN | flutter→Windows 桌面 | NOT_APPLICABLE | 无 windows/ runner；flutter_blue_plus 1.36.8 平台仅 android/ios/linux/macos/web |
| D-WIN | apps/desktop/windows | NOT_APPLICABLE（占位） | 仅 README 规划，零代码 |
| D-LIN | apps/desktop/linux | NOT_APPLICABLE（占位+BlueZ） | 仅 README 规划；BlueZ 与 Windows 无关 |
| M-MAC | apps/desktop/macos 原生 | NOT_APPLICABLE（本机） | Swift/AppKit 需 macOS 13+；归另一台 macOS 主机（其 2026-09-05 仍在活跃提交） |
| I-OS | apps/ios | NOT_APPLICABLE（本机） | 需 Xcode/macOS |
| U-MP-其他 | uniapp→支付宝/百度/抖音 | NOT_CONFIGURED | manifest 配置键存在，无构建脚本与对应开发者工具 |

### 4.3 新线 × 域适配

| 域 | A-AND | E-WIN | T-WIN |
|---|---|---|---|
| F001-F005 扫描 | ✅ 真机 E5 | ✅ 主机蓝牙 | ✅ 主机蓝牙 |
| F006-F012 GATT | ✅（夹具先 esptool 复位粘性 fault） | ✅ | ✅ |
| F013 多设备 | ✅ 双手机方案候选：华为 TAS-AN00 跑 A-AND 广播=第二外设 + ESP32，三星 E5 做中央；不成立再议 ESP32 双广播实例固件或 BLOCKED_FIXTURE | ✅ 同方案 | ✅ 同方案 |
| F014-F017 广播 | ✅ 已跑 9/9（BroadcastScreen+BlePeripheralManager，F015 等价；观察侧 fixture_observer_s3 交叉） | NOT_APPLICABLE（noble 广播仅 Linux） | NOT_APPLICABLE（btleplug 仅 central） |
| F018-F024 Smart HID | ❌ 无配网页=PARITY-001 | ❌ PARITY-002 | ❌ PARITY-002 |
| F025 OTA | ✅ 2026-09-11 W5 真机实刷收口（E-WIN/T-WIN 同轮；OtaDialog DATA 改带响应写+整百分比 UI 节流，PARITY-007 已修） | E-WIN PASS_WITH_OBS（1.0.0→1.0.2，串口交叉） | T-WIN PASS_WITH_OBS（1.0.2→1.0.3 + 取消分支，noble 直读交叉） |
| F026-F030 | 逐项回填 | 逐项回填 | 逐项回填 |

### 4.4 随线登记 PARITY 缺陷（2026-09-07）

| 编号 | 线 | 描述 | 级 |
|---|---|---|---|
| PARITY-001 | A-AND | 无 Smart HID 配网页（F018-F024 全域缺位；HID 仅作 UUID 显示名） | P1 |
| PARITY-002 | E-WIN/T-WIN | 桌面前端无 Smart HID 配网入口 | P2 |
| PARITY-003 | A-AND | WriteDialog 批量/循环模式 UI-only：onConfirm 只发一次拼接载荷；CommandQueue.kt(289 行) 为死代码未被引用 | P2 |
| PARITY-004 | A-AND | manufacturerData=null（源码注「Simplified for now」）→ F004 广播详情缺厂商数据段 | P2 |
| PARITY-005 | E-WIN | electron-builder build:win 引用不存在的 assets/icon.ico → Windows 打包阻断（npm start 不受影响） | P2 | → **已收口 2026-09-11**（W2）：icon.ico 先由 Mac 侧 8e58f0e 跨端统一图标补齐，本机 build:win 冒烟 exit 0（nsis+portable 双产物，exe 内嵌图标逐像素比对同源）；GitHub 直连超时需 npmmirror 镜像变量（§4.6）；证据 20260911-win-b3/w2-ewin-buildwin |
| PARITY-006 | V-WIN | csproj 引用不存在的 app.manifest 与 Assets/icon.ico → dotnet build 直接失败 | P2 | → **已收口 2026-09-11**（W1）：补齐 manifest+图标，另修幽灵 NuGet 包（nuget.org 无 WindowsBluetooth，改 TFM 投影）/保留字 char/Avalonia 10→11 语法等 11 项隐性缺陷，dotnet build exit 0；证据 20260911-win-b3/w1-vwin-build-smoke |
| PARITY-007 | E-WIN/T-WIN | OtaDialog DATA 分块用 writeNoResponse：Windows BLE 栈下字节级腐败（570480B 尺寸守恒但 sha256 不符 → commit `OTA_HASH_MISMATCH`；同镜像同链路带响应写 commit SUCCESS，剥离实验在案） | P1 | → **已收口 2026-09-11**（W5）：双线 OtaDialog DATA 改带响应写（ATT ack 逐块确认=契约「分块 ACK」本义）+ 每块同步刷 DOM 改整百分比节流（软件渲染下 ~1s/块 → 恢复 ~28ms/块）；证据 20260911-win-b3/w5-ota-* |
| PARITY-008 | E-WIN/T-WIN | 窗口关闭无退出确认（10_platform §4 生命周期「常驻，退出确认」；原型 desktop.js dwin-quit 有会话感知文案） | P2 | → **已收口 2026-09-11**（桌面形态层轮）：双线拦截 close/CloseRequested → 应用内正典模态（会话文案对齐 dwin-quit）→「退出」回执置旗放行/「继续使用」存活；E-WIN close 事件+IPC、T-WIN Rust on_window_event+confirm_exit 命令；CDP 全链 14/14+16/16（拦截→模态→存活→退出→进程消亡）；证据 20260911-win-b3/desktop-form-gaps |
| PARITY-009 | E-WIN/T-WIN | P002 配对码仅粘贴/手输，缺 10_platform §2.4 桌面主路径「摄像头扫码」（粘贴应仅为兜底） | P2 | → **已收口 2026-09-11**（桌面形态层轮）：双线 hidOpenQrSheet 改扫码 sheet（getUserMedia 取景器+vendored jsQR@1.4.0 逐帧解码、Apache-2.0 注记）+粘贴降级为兜底 sheet；E-WIN 摄像头真实出图识别中，WebView2/wry 无 PermissionRequested 处理→getUserMedia 永久悬挂，加 5s 竞速超时降级兜底提示（迟到授权流回收）；证据 20260911-win-b3/desktop-form-gaps |

### 4.5 执行顺序（并入 §28 战役流）

A-AND 启动（构建→E5 安装→F001-F005 等价真机）→ F013 双手机方案探测 → F014-F017（reflash `fixture_observer_s3`；A-AND 广播域并入）→ F018-F024（Smart HID；A-AND/E-WIN/T-WIN 按 4.3 PARITY 裁决）→ F025-F030 → E-WIN 线（Playwright）→ T-WIN（待 Rust）→ 页面全量回归 → 多线一致性（原「三线一致性」扩容）→ 稳定性 → 参考版本 Build Smoke。

### 4.6 工具链事实（2026-09-07）

- 本机系统 JDK 24（Gradle 8.2/AGP 8.2 不支持）→ 备便携 JDK 21 `C:\Users\11066\tools\jdk-21`（用户目录，不入库）；apps/android 既往构建产物存在证明曾在他 JDK 下构建成功
- cargo/rustup 未安装 → T-WIN BLOCKED_TOOLCHAIN
- 双手机在位：R5CR1284Y7H=三星 SM-G9910/Android 15（E5）；FEC0220629005177=华为 TAS-AN00/Android 12。**F013 双手机夹具配方已固化**（f013-dualphone/f013-summary.md）：华为跑 A-AND 广播（EMUI uiautomator 变体 xpos/几何推算、按钮 (540,1683)）；Mate 30 5G 默认 GATT=5 服务与 ESP32 撞数，身份用详情页页头名判别；EMUI 空闲 GATT 回收 ~90s + RPA 轮转双条目（WIN-UAND-001）→ 不适合长会话，适合单轮验证
- ESP32 夹具现处**`fixture_peripheral_s3`**（2026-09-11 W3 开工串口 boot JSON 实证 `git_sha=835f1cf=HEAD`、
  firmware_role=peripheral；2026-09-10 二次刷回后未再变——此前所记「真 SHID 固件 v1.1.0」已过时）。W3 GATT 域即对此夹具收口；
  **W4（E5 Smart HID 真机全链）前须重刷真 SHID 固件 v1.1.0**（smart-hid-workspace 构建，erase_flash+全量烧录）；
  开串口（serial-tap）会经 DTR/RTS 脉冲复位设备——夹具状态以串口首启横幅为准（复位同时清 test_control 粘性 fault）
- Electron `node_modules` 已含编译好的 noble WinRT binding（曾实跑）；Avalonia 无 .sln、csproj 断引用（csproj 已修复=PARITY-006 收口 2026-09-11）
- electron-builder Windows 打包直连 GitHub 拉取 winCodeSign/NSIS 工具链大概率超时（2026-09-11 run1 实证）；复现需镜像变量 `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`（+`ELECTRON_MIRROR`，证据 20260911-win-b3/w2-ewin-buildwin）；rcedit 嵌图标偶发 `Unable to commit changes`（AV/文件锁抖动），builder 自带重试可过
- **W5 OTA 实刷链关键事实（2026-09-11）**：① writeNoResponse 分块在 Windows BLE 栈字节级腐败（PARITY-007 已修，剥离实验 w5-ota/firmware/withresp-isolation-leanbench-serial.txt：同镜像无响应→HASH_MISMATCH、带响应→SUCCESS+复位+boot 新版本）；② 夹具 OTA 三缺陷已修：DEV-014b `CORE_DEBUG_LEVEL=5` 每块 4 行日志（含 hex 转储）从 nimble_host 灌 UART→任务看门狗（IDLE0 饿死，16s 处 abort）→ 三环境统一降 1（JSON 串口事件走独立 print 不受影响）；DEV-014c 32KB 整环单次 `Update.write` flash 编程临界区 ~350ms 压过中断看门狗 300ms（TG0WDT，高速率 87% 处复位）→ loop 排水限 4KB/批；DEV-014d OTA 后未 `esp_ota_mark_app_valid_cancel_rollback`→下次复位 bootloader 滚回旧分区（boot 帧版本回落）→ setup() 幂等 confirm；③ Electron 本机 GPU 进程偶发崩溃循环（0xC0000409）→ 启动重试（CDP 端口探活）优于 `--disable-gpu`（软件渲染+每通知帧 toast 重绘拖垮渲染线程 ~1s/块；UI 已节流但 GPU 路径仍首选）；④ serial-tap 独占 COM12——双轮连跑须等前探针到期，否则 PermissionError 13
- **W4 阻塞登记（2026-09-11）**：E5 Smart HID 真机全链所需 ESP32-S3 SHID 板**物理不在位**（PnP 枚举仅 CH343→WROOM fixture_peripheral_s3@COM12；S3 板=E13 时 COM13 已拔）。「W4 前须重刷 SHID 固件」前提改为**须先接回 S3 板**（用户硬件窗口）；ControlHub 凭据侧不阻塞——本机 smart-hid-workspace 可源码起 hub 自铸配对码（E13 同法）
- **桌面形态层收口（2026-09-11，PARITY-008/009）**：① 用户质询「桌面端没对齐」核查——桌面相关原型正典（v1-new+desktop 高保真）自 88b9368（F028 下线，桌面已同步 a88c358）后**无新更新**（cc7a177 仅 web 平台/docs 站；Mac 后续 docs 提交零原型文件）；Mac 横评报告（20260911-h5-mock-sweep/REPORT.md §6）所记「P002/P003/P005/P010 四页缺失」**过时**——四页在两线均在（P010=2b70689、P002/P003/P005=3c2b6e8，且 3c2b6e8 注释直引 desktop 高保真页为正典）；真缺口=退出确认+扫码主路径两项，本轮双线收口。② T-WIN 驱动事实：WebView2/wry 0.14 不透传 JS window.close()（无 WindowCloseRequested 处理）→窗口关闭驱动须 Win32 `PostMessage(WM_CLOSE)`（PowerShell Add-Type，真实走 tao→CloseRequested 链）；wry 无 PermissionRequested 处理→getUserMedia 永久悬挂，前端 5s 竞速超时降级。③ vendored jsQR@1.4.0（Apache-2.0，双线字节镜像+许可全文，vendor/README 注记升级法）。④ 防御加固：hidRenderProgressCard 对 progress:null 兜底（双线）——冒烟夹具暴露渲染链异常会静默中断模态自动关闭。⑤ 观察：扫码实拍 ControlHub 屏显二维码的端到端硬件验证留后续真机窗口（本机摄像头已验出图+解码库加载，E-WIN 侧）
