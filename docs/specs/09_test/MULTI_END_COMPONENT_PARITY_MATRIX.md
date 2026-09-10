# 多端组件一致性矩阵（MULTI_END_COMPONENT_PARITY_MATRIX）

- 创建：2026-09-07 · Multi-end Parity Gate
- 验收对象：U-WX / U-AND / F-AND
- 事实源：PAGE_SPEC 各页「页面结构/组件列表/按钮列表」+ `prototype/v1-new` + `prototype/platform/{wechat,app}` + 07_design_system/COMPONENT.md
- 判定值：`PASS / FAIL / NOT_AUDITED / ALLOWED_PLATFORM_DIFFERENCE(须引规范来源)`
- 规则：组件=页面区块级构成（区块顺序、控件清单、主次按钮、弹窗、空态、错误横幅）。逐页逐组件回填，不预填 PASS。

## P001 扫描首页

> 2026-09-10 UI-CONV 回填口径：`PASS·struct` = 组件结构/文案/图标位静态对齐（UI-G2 迁移或 PARITY-G1 修复轮），证据=构建+静态锁+测试；运行态行为与六态视觉另行判定（STATE/VISUAL 矩阵）。U-WX 判定基于 code-verified（同 U-AND 码）。

| 组件/区块（PAGE_SPEC 顺序） | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 自绘导航栏（蓝牙状态三态） | custom 导航+状态点+三态文案 | PASS·struct（G0 改挂+G2 安全区/胶囊避让） | 同 U-WX | PASS·struct（G1 真机三态词逐字实证 uand-01/07） | UI-G2 §1/§2；UI_G1 #1 |
| 扫描工具条（状态标签/计数/启停主按钮） | 开始⇄停止 danger 切换 | PASS·struct | 同 U-WX | PASS（G1 真机三态实证） | UI_G1 #3/9；page-flow 静态锁 |
| 错误横幅（error-banner 内嵌） | 含 error.code + 重试 | PASS·struct（hex→var 收敛+本轮 LEGACY 清零） | 同 U-WX | PASS·struct | 审计 §13.2；G1 #10（scan_failed 路径真机像素实证；10001 modal 文案偏差 E1/E2 登记） |
| 附近设备面板（筛选 + 列表） | 筛选折叠文字链 | PASS·struct | 同 U-WX | PASS·struct | 审计 §13.2（sec-t 平铺+计数 chip） |
| filter-panel（RSSI×4 预设/滑杆/前缀/隐藏无名/重置） | 实时投影无确认按钮 | PASS·struct（G0 hex→var） | 同 U-WX | PASS（G1 真机四档+滑杆过滤实测） | UI_G1 #4；F 侧存量实现=同规格（G2 §5-1 登记待迁 ui/design） |
| device-card 扫描态（显示名/徽章/deviceId/RSSI 信号条/按钮组） | SHID 卡双按钮（连接+配置） | PASS·struct | 同 U-WX | PASS（G1 真机 8 卡+SHID 双入口逐字/像素实证） | UI_G1 #5-7；审计 §13.2 |
| empty-state（两种空文案） | 无结果 vs 筛选不匹配 | PASS·struct（AppEmpty 改挂） | 同 U-WX | PASS（G1 真机 A/B 双态逐字实证） | UI_G1 #8 |
| advertisement-dialog 广播数据弹窗 | 字段缺失如实标注+复制 | PASS·struct | 同 U-WX | PASS·struct（深色 ad-sec 像素实证） | 审计 §13.2（U 重写底部弹层/F ad-sec）；G1 §3 截图 |
| ~~已配置 Smart HID 面板~~ | 【已移除 2026-09-02，不得存在】 | PASS（已删+构建产物 0 引用） | 同 U-WX | PASS（无此组件） | PARITY-G1/审计 §12；F023 零持久化门禁持续锁定 |

## P002 配网向导

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 三步骤条（常驻） | 连接→填写→状态 | PASS·struct（provision-stepper；本轮当前步纯色化=正典 C6） | 同 U-WX | PASS·struct | UI-G2 §1 P002；UI-CONV 2026-09-10 |
| connect 阶段面板（设备卡/loading/错误+重连） | 身份验证失败→断开报错 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| configure 阶段表单（SSID≤32/密码≤64/Hub 地址 mono） | placeholder 192.168.1.8:17892 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 扫码大动作卡（badge 必需→已获取） | shid://pair 解析回填 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 隐私声明常驻行 | 「只用于本次下发，不写入日志或本地存储」 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 下发配置主按钮（canSubmit 联动） | SSID+Hub+token 齐才可点 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| status 阶段四行进度（Wi-Fi/Hub/MQTT/USB Ready） | 各行 pending/active/done/fail/warn | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 恢复按钮（form/pairing/diagnostics/retry 四动作） | 文案随错误变 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 取消等待 / 查看设备（redirectTo） | 60s 等待可取消 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 离开确认弹窗（配网进行中物理返回拦截） | 「离开将取消本次配置等待」 | PASS·struct（subnav 返回与系统返回同口径 confirmLeaveIfNeeded） | 同 U-WX | PASS·struct（AppSubnav @back + PopScope/_confirmLeave） | UI-G2 §1 P002/F-AND 改动 |

## P003 设备详情

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 设备身份卡（名称/协议 chip/Device ID mono/固件） | 缺失字段「—」，协议缺「协议未记录」 | PASS·struct | 同 U-WX | PASS·struct（G1 补页+G2 AppChip/AppListRow） | UI-G2 §1 P003 |
| 最近配置卡（lastWifi/lastHub 内存快照） | 仅两快照字段 | PASS·struct | 同 U-WX | PASS·struct | UI-G2 §1 P003 |
| 操作区（重新配置主 + 运行诊断/高级 BLE 调试次） | 三出口 | PASS·struct | 同 U-WX | PASS·struct（AppButton×3 refresh/pulse/set） | UI-G2 §1 P003 |
| 记录不存在 modal→强制返回 | 无设备上下文 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## P005 诊断

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 当前状态行（六值） | 尚未检测/已连接可检测/检测中/完成/未连接/失败 | PASS·struct | 同 U-WX | PASS·struct（G1 补页；G2 AppBadge 六值词表） | UI-G2 §1 P005 |
| 五项诊断行列表（BLE/Wi-Fi/Hub/控制连接/Ready） | 行五态+可展开明细 | PASS·struct（AppStatusIcon 五态，文本字形退役） | 同 U-WX | PASS·struct（AppStatusIcon 枚举五态+生命周期修复） | UI-G2 §1 P005/F-AND 改动 |
| 操作区四按钮（重新检测/显隐错误码/返回详情/重新配网） | 离线→modal「连接并检测」 | PASS·struct（modal 文案对齐正典） | 同 U-WX | PASS·struct | UI-G2 §1 P005 |
| 错误详情块（code+message，等宽） | 显隐切换 | PASS·struct（折叠入错误块 ghost sm） | 同 U-WX | PASS·struct | UI-G2 §1 P005 |
| 重新配网 READY 确认弹窗 | 「已进入配网模式」确认文案 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## P006 GATT 工作台

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 设备面板（头部+操作行） | 状态点灰⇄绿 | PASS·struct | 同 U-WX | PASS·struct（devhead：标题/设备名/ID 下沉+OTA/连接 chip 右槽） | UI-G2 §1 P006 |
| 连接⇄断开主按钮（连接中禁用） | 主动断开不触发重连 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 固件更新按钮（danger，仅 OTA 服务） | 4fafc201-…-914d 检测 | PASS·struct | 同 U-WX | PASS·struct（右槽 OTA 入口） | UI-G2 §1 P006 |
| 清空日志 / 导出日志 | 空日志 toast「暂无日志」 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 服务树（折叠/UUID 中文名/全部展开收起） | 未知「服务 N/特征值 N」 | PASS·struct（ServicePanel 接管旧 service-panel） | 同 U-WX | PASS·struct | UI-G2 §1 P006/§2 |
| 特征行三按钮（读取/写入/监听，按 properties） | 监听⇄停止防抖 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 服务面板五态（idle/connecting/ready/empty/error+重试） | — | PASS·struct（ServicePanel 五态正典） | 同 U-WX | PASS·struct | UI-G2 §1 P006 |
| log-panel 日志面板（六色 chip dock） | sys/err/read/write/recv/ok | PASS·struct（LogPanel dock 接管） | 同 U-WX | PASS·struct | UI-G2 §1 P006/§2 |
| write-dialog（TEXT/HEX 单选+输入+确认取消） | 空/非法拦截 | PASS·struct（事件签名带 serviceId/charId） | 同 U-WX | PASS·struct | UI-G2 §1 P006 |
| ota-dialog（选文件/进度/取消） | 成功 2s 自动关闭 | PASS·struct（本轮 success 色收敛 --c-success-deep） | 同 U-WX | PASS·struct | UI-CONV 2026-09-10 |

## P007 已连接

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 汇总卡（>1 台时，计数+全部断开） | allSettled 部分失败 modal 清单 | PASS·struct（sumcard「N 台在线·全部为内存会话」+danger sm） | 同 U-WX | PASS·struct | UI-G2 §1 P007/F-AND 改动 |
| 设备卡列表（ON 头标/meta/断开 danger） | 点卡按 profileId 分流 | PASS·struct（DeviceCard conn 变体接管） | 同 U-WX | PASS·struct（角标=连接数实时驱动） | UI-G2 §1 P007/F-AND 改动 |
| empty-state 两种空文案 | 配网会话在线 vs 常规 | PASS·struct（AppEmpty link 插图+去扫描 CTA） | 同 U-WX | PASS·struct | UI-G2 §1 P007 |

## P008 广播

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 设置卡头部（平台标签+运行徽章六值） | 广播中/失败/已停止/已就绪/未就绪/不支持 | PASS·struct（AppNavbar PERIPHERAL+平台 chip+AppBadge 三态/不支持无点） | 同 U-WX | PASS·struct（_statusBadge 改 tone 口径） | UI-G2 §1 P008/F-AND 改动 |
| 设备名称/服务 UUID 输入（校验黄条） | 4/8/36 位 hex | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 厂商 ID/厂商数据输入 | 1-4 位 hex | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| Android 专属（模式/功率 picker + 三开关） | 仅 Android 平台差异 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 字节提示（N/31 + 超限红字不静默截断） | AD 结构逐项 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 启停主按钮（广播中 danger/输入禁用） | — | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 检查支持按钮 | 平台分支探测 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 操作日志面板（card 变体+回放） | 'broadcast' 命名空间 | PASS·struct（LogPanel card+导出剪贴板） | 同 U-WX | PASS·struct | UI-G2 §1 P008 |

## P009 关于

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 品牌卡（logo/名称/运行时版本/技术栈 chips/总体状态） | 版本三态 fallback | PASS·struct（AppNavbar ABOUT+版本 mono chip+品牌渐变挂 token） | 同 U-WX | PASS·struct | UI-G2 §1 P009 |
| ~~更多小程序推广卡~~ | **已移除（2026-09-10 · F028）**——C11 编号退役，组件随原型+五线下线 | REMOVED | REMOVED | REMOVED | — |
| 应用信息卡（环境三行/特性 6 chips/平台状态） | 五词表 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 相关链接菜单（官网/版本记录/反馈/分享） | 4 项 | PASS·struct | 同 U-WX | PASS·struct（G1 补「版本记录」=4 项菜单） | UI-G2 §1 P009 |
| 页脚版权 | — | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## P010 版本记录

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 当前版本卡（版本/渠道/tag/平台状态/复制按钮） | — | PASS·struct | 同 U-WX | PASS·struct（G1 补页） | UI-G2 §1 P010 |
| 当前限制卡 | known_limitations | PASS·struct | 同 U-WX | PASS·struct | UI-G2 §1 P010 |
| 正式发布历史 / 预览记录卡 | 空态文案 | PASS·struct（AppEmpty doc×2 接管旧 empty-state） | 同 U-WX | PASS·struct（_emptyBlock→AppEmpty） | UI-G2 §1 P010/F-AND 改动 |
| 页脚声明（Release Metadata 投影） | 非手写版本事实源 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
