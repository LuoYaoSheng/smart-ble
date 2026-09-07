# Windows Mobile V1 总功能矩阵（WINDOWS_MOBILE_V1_MASTER_MATRIX）

- 状态：初版 2026-09-05（run-id `20260905-1726-1b793ca`，基线 commit `1b793ca`）
- 事实源：`docs/specs/02_product/FEATURE_MAP.md`（F001–F030 官方编号/优先级/名称）+
  PRD.md §4/§5；执行任务书（2026-09-05 用户全量测试指令）
- 三实现线：U-WX（apps/uniapp→微信小程序·Android 微信真机）/ U-AND（apps/uniapp→Android App 真机）/
  F-AND（apps/flutter→Android App 真机）
- 状态词：`PASS / PASS_WITH_LIMITATION / FAIL / BLOCKED_HARDWARE / BLOCKED_FIXTURE /
  BLOCKED_HOST / BLOCKED_TOOLCHAIN / NOT_RUN / NOT_APPLICABLE / NOT_CONFIGURED`
- 铁律：**所有行初始 NOT_RUN，未真实执行不得改 PASS**；F025 三线固定 BLOCKED（P-03）

## 1. 主表（状态列 = 验证状态，初始 NOT_RUN）

| ID | 功能（PRD 名） | P | 业务域 | 页面 | U-WX | U-AND | F-AND | 自动化 | 真机 | ESP32 角色 | 正常路径 | 异常路径 | 最终结论 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F001 | BLE 扫描 | P0 | 扫描 | P001 | REQ | REQ | REQ | E1/E2 | E5 | Peripheral | F-AND PASS | NOT_RUN | F-AND PASS；U-AND BLOCKED_HOST；U-WX BLOCKED_TOOLCHAIN |
| F002 | 扫描权限前置 | P0 | 扫描 | P001 | REQ | REQ | REQ | E2 | E5 | 不需要 | F-AND PASS(预授路径) | NOT_RUN | 同上（U-AND 弹窗链实测：定位+附近设备双弹窗） |
| F003 | 扫描筛选 | P0 | 扫描 | P001 | REQ | REQ | REQ | E1/E2 | E5 | 可选 | F-AND PASS | NOT_RUN | F-AND PASS（含 WIN-FAND-001/002 两修复） |
| F004 | 广播数据查看 | P0 | 扫描 | P001 | REQ | REQ | REQ | E2 | E5 | Peripheral | F-AND PASS | NOT_RUN | F-AND PASS；U-AND 驱动脚本就绪待解锁续跑 |
| F005 | 显示名智能解析 | P1 | 扫描 | P001 | REQ | REQ | REQ | E1/E2 | E5 | Peripheral | F-AND 具名 PASS；未命名链=已知偏差 FEAT-F-003 | NOT_RUN | F-AND 部分通过（具名路径 E5）；R05 全链未实现登记 |
| F006 | GATT 连接 | P0 | GATT | P006 | REQ | REQ | REQ | E2 | E5 | Peripheral | F-AND PASS | NOT_RUN | F-AND PASS（连接→服务发现→已连接，E5 真机） |
| F007 | 服务树浏览 | P0 | GATT | P006 | REQ | REQ | REQ | E2 | E5 | Peripheral | F-AND PASS | NOT_RUN | F-AND PASS；服务命名修复 WIN-FAND-003 后 GAP/GATT 具名、仅 914d 标 OTA |
| F008 | 特征读取 | P0 | GATT | P006 | REQ | REQ | REQ | E2 | E5 | Peripheral(Read) | F-AND PASS | NOT_RUN | F-AND PASS（控制=system_info JSON、权限 b0=read_only JSON）；固件 WIN-ESP32-002 修复后 |
| F009 | 特征写入 | P0 | GATT | P006 | REQ | REQ | REQ | E2 | E5 | Peripheral(LED FF00–FF03) | F-AND PASS | NOT_RUN | F-AND PASS（HEX FF01/FF00 + UTF-8 开灯，write_response led_state/command 回显） |
| F010 | Notify 监听 | P0 | GATT | P006 | REQ | REQ | REQ | E2 | E5 | Peripheral(Notify) | F-AND PASS | NOT_RUN | F-AND PASS（欢迎推送/5s 周期 device_status/开关往返）；WIN-FAND-004 修复后 |
| F011 | 通信日志 | P0 | GATT | P006/P008 | REQ | REQ | REQ | E1/E2 | E5 | 不需要 | F-AND PASS | NOT_RUN | F-AND PASS（清空→面板隐藏、读重建、导出剪贴板回执） |
| F012 | 断线自动重连 | P0 | GATT | P006/P007 | REQ | REQ | REQ | E2 | E5 | Peripheral(断电/重启) | F-AND PASS | NOT_RUN | F-AND PASS（固件 fault 注入拆链→重连中→2s 自动重连；串口交叉验证）；WIN-FAND-005/006 修复后；重连后首读 8s 无响应=观察项；UI 为状态 chip 非「重新连接」横幅=形态差异 |
| F013 | 多设备会话管理 | P1 | 多设备 | P007 | REQ | REQ | REQ | E2 | E5 | 严格 E5 需第二外设 | NOT_RUN | NOT_RUN | NOT_RUN |
| F014 | 微信 peripheral 广播 | P1 | 广播 | P008 | REQ | N/A | N/A | E2 | E5 | Observer | NOT_RUN | NOT_RUN | NOT_RUN |
| F015 | App 原生插件广播 | P1 | 广播 | P008 | N/A | REQ | REQ | E2 | E5 | Observer | NOT_RUN | NOT_RUN | NOT_RUN |
| F016 | 31 字节负载预算 | P1 | 广播 | P008 | REQ | REQ | REQ | E1/E2 | E5 | Observer(合法包) | NOT_RUN | NOT_RUN | NOT_RUN |
| F017 | 观察侧证据匹配 | P2 | 广播 | 无独立页 | REQ | REQ | REQ | E1 | E5 | Observer(JSON) | NOT_RUN | NOT_RUN | NOT_RUN |
| F018 | Profile 设备识别 | P0 | Profile | P001/P007 | REQ | REQ | REQ | E1/E2 | E5 | Peripheral/SHID | NOT_RUN | NOT_RUN | NOT_RUN |
| F019 | 配网向导 | P0 | Smart HID | P002 | REQ | REQ | REQ | E2 | E5 | 真实 Smart HID | NOT_RUN | NOT_RUN | NOT_RUN |
| F020 | 配对码扫码 | P0 | Smart HID | P002 | REQ | REQ | REQ | E2 | E5 | 真实 ControlHub | NOT_RUN | NOT_RUN | NOT_RUN |
| F021 | 分帧明文写入+状态跟踪 | P0 | Smart HID | P002 | REQ | REQ | REQ | E2 | E5 | 真实 Smart HID | NOT_RUN | NOT_RUN | NOT_RUN |
| F022 | 配网错误恢复 | P0 | Smart HID | P002/P005 | REQ | REQ | REQ | E2 | E5 | 真实 Smart HID+Hub | NOT_RUN | NOT_RUN | NOT_RUN |
| F023 | ~~设备历史~~（删除红线） | P0 | Smart HID | P004 应不存在 | 禁止 | 禁止 | 禁止 | E1/E2 | E5 | 不需要 | NOT_RUN | NOT_RUN | NOT_RUN |
| F024 | 实时诊断（五项） | P1 | Smart HID | P005 | REQ | REQ | REQ | E2 | E5 | 真实 Smart HID+Hub | NOT_RUN | NOT_RUN | NOT_RUN |
| F025 | 固件升级 OTA | P1 | OTA | P006 子流程 | BLOCKED | BLOCKED | BLOCKED | E2 | 仅契约/UI | 不需要 | NOT_RUN | NOT_RUN | BLOCKED(P-03) |
| F026 | 日志脱敏 | P0 | 横切 | 横切 | REQ | REQ | REQ | E1/E2 | E5 | 不需要 | NOT_RUN | NOT_RUN | NOT_RUN |
| F027 | 版本元数据展示 | P2 | 系统 | P009/P010 | REQ | REQ | REQ | E2 | E5 | 不需要 | NOT_RUN | NOT_RUN | NOT_RUN |
| F028 | 小程序推广跳转 | P2 | 系统 | P009 | REQ | REQ | REQ | E2 | E5 | 不需要 | NOT_RUN | NOT_RUN | NOT_RUN |
| F029 | 分享 | P2 | 系统 | 页面级/P009 | REQ | REQ | REQ | E2 | E5 | 不需要 | NOT_RUN | NOT_RUN | NOT_RUN |
| F030 | 国际化（禁止新增） | P2 | 系统 | 无页面 | 禁止新增 | 禁止新增 | 禁止新增 | E1 | 不适用 | 不需要 | NOT_RUN | NOT_RUN | NOT_RUN |

## 2. 每项明细（用户入口 / 规范来源 / 证据 / 缺陷 / Git SHA）

> 逐项回填；证据目录 `verification/windows-mobile-v1/20260905-1726-1b793ca/`。
> Git SHA = 验证时 HEAD（未填 = 未验证）。

| ID | 用户入口 | 规范来源 | 证据 | 缺陷 | Git SHA |
|---|---|---|---|---|---|
| F001 | P001「开始扫描」按钮；进页生命周期 | FEATURE_MAP§1·PRD§4·任务书§13 | run 20260905-1726-1b793ca/flutter-android/f001-f005-scan-v6-app.log（F-AND E5：5s 会话/自动停/手动停/首启空态全断言过） | — | 见本域提交 |
| F002 | 首次扫描触发权限链；蓝牙未开引导 | PERMISSION(10_platform)·任务书§13 | 同上（wrapper 预授路径）+ uniapp-android 驱动（U-AND 实测定位+蓝牙双弹窗） | — | 见本域提交 |
| F003 | 扫描卡片上方筛选区 | PRD·PAGE_SPEC P001 | 同上 v6（面板/正向前缀/反向空态/重置全过） | WIN-FAND-001/002（已修复） | 见本域提交 |
| F004 | 扫描卡片「广播」入口 → F004 广播详情 sheet | PAGE_SPEC P001 | 同上 v6（设备ID/名称/RSSI/UUIDs/AD 逐段/厂商数据/复制/关闭） | — | 见本域提交 |
| F005 | 扫描卡片显示名渲染 | R05·PAGE_SPEC P001 | 同上 v6（具名路径）；未命名链 R05 未实现=FEAT-F-003 在册 | FEAT-F-003（在册） | 见本域提交 |
| F006 | P001 卡片「连接」/ Profile「连接」 | DEC-013·PAGE_SPEC P006 | v12 exit=0：连接→发现 5 服务→「已连接」chip | — | 见本域提交 |
| F007 | P006 服务树折叠/展开 | PAGE_SPEC P006 | v12：GAP/GATT 具名、OTA=1、未知=2；主服务 2 特征（读+写+通知/写+通知）、权限 7 特征展开断言 | WIN-FAND-003（已修复） | 见本域提交 |
| F008 | P006 特征「读」 | PAGE_SPEC P006 | v12：控制 26a8=system_info JSON、权限 b0=read_only JSON（UTF-8） | WIN-ESP32-002（已修复重烧） | 见本域提交 |
| F009 | P006 特征写入（TEXT/HEX） | PAGE_SPEC P006 | v12：FF01/FF00/「开灯」三写全过 + write_response 回显（led_state/command） | WIN-ESP32-002（已修复重烧） | 见本域提交 |
| F010 | P006 特征 Notify 开关 | PAGE_SPEC P006 | v12：26a9 订阅即收「开始监听系统状态」+5s 周期 device_status+停止往返 | WIN-FAND-004（已修复） | 见本域提交 |
| F011 | P006/P008 日志区（清空/复制/导出） | PAGE_SPEC P006/P008 | v12：清空→面板隐藏→读重建→导出「已复制到剪贴板」回执 | — | 见本域提交 |
| F012 | 断开后横幅「重新连接」 | F012·SEQUENCE | v12：fault/disconnect 外设拆链（串口实证）→「重连中...」→2s 重连成功；用户主动断开不触发重连。UI 为状态 chip 非「重新连接」横幅（形态差异）；重连后首读 8s 无响应（观察项，后续 b0 读正常） | WIN-ESP32-002(disconnect(0) rc=7)、WIN-FAND-005/006（均已修复） | 见本域提交 |
| F013 | P007 已连接列表（单断/全断） | PAGE_SPEC P007 | — | — | — |
| F014 | P008 微信广播开关（wx API） | C1 supported_limited·10_platform | — | — | — |
| F015 | P008 App 广播表单+开关（插件） | 10_platform·任务书§16 | — | — | — |
| F016 | P008 负载编辑器预算条 | F016·10_platform | — | — | — |
| F017 | 无页面（服务层+Observer 交叉核对） | F017·任务书§16 | — | — | — |
| F018 | P001 扫描卡片 SHID 徽章+双入口 | PROFILE 注册表 | — | — | — |
| F019 | P001「配置 Smart HID」→ P002 向导 | PROVISIONING_V1 | — | — | — |
| F020 | P002 扫码面板（相机/粘贴） | PROVISIONING_V1·F020 | — | — | — |
| F021 | P002「下发配置」（framed-v1 分帧） | PROVISIONING_V1 §写入 | — | — | — |
| F022 | P002 错误终态四分流恢复 | ERROR_CODE·PAGE_SPEC | — | — | — |
| F023 | 无入口（验证不存在：页面/路由/存储/文案） | 变更记录 2026-09-02 | — | — | — |
| F024 | P003「诊断」/P005 直接进入 | PAGE_SPEC P005 | — | — | — |
| F025 | P006 内 OTA 入口（BLOCKED 展示） | P-03 决议 | — | — | — |
| F026 | 全局日志管线 | F026·任务书§19 | — | — | — |
| F027 | P009 关于/P010 版本记录 | Release Metadata | — | — | — |
| F028 | P009 推广区 | 10_platform | — | — | — |
| F029 | 页面分享入口/右上角 | 10_platform | — | — | — |
| F030 | 无入口（验证不存在语言切换） | F030 决议 | — | — | — |

## 3. 已知先行事实（回填时不得重复劳动，但状态仍按本轮实测）

- E14（`verification/windows-mobile-v1/20260904-win-b1/e14-macos-return/`）已在 F-AND 真机
  完整闭环 F019/F020/F021/F022 的 E5 十场景（U-01/T1–T7/双机），含两缺陷修复与六在册缺陷。
  本矩阵仍需按本轮代码 HEAD 重跑或引用该证据链复核后回填（引用时注明 E14 run-id）。
- F023/F030 属删除红线，验证方式为「全仓 + 三实现线产物内不得出现对应能力」的静态与冷启动检查。
