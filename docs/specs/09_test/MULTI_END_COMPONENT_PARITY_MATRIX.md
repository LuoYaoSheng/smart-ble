# 多端组件一致性矩阵（MULTI_END_COMPONENT_PARITY_MATRIX）

- 创建：2026-09-07 · Multi-end Parity Gate
- 验收对象：U-WX / U-AND / F-AND
- 事实源：PAGE_SPEC 各页「页面结构/组件列表/按钮列表」+ `prototype/v1-new` + `prototype/platform/{wechat,app}` + 07_design_system/COMPONENT.md
- 判定值：`PASS / FAIL / NOT_AUDITED / ALLOWED_PLATFORM_DIFFERENCE(须引规范来源)`
- 规则：组件=页面区块级构成（区块顺序、控件清单、主次按钮、弹窗、空态、错误横幅）。逐页逐组件回填，不预填 PASS。

## P001 扫描首页

| 组件/区块（PAGE_SPEC 顺序） | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 自绘导航栏（蓝牙状态三态） | custom 导航+状态点+三态文案 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 扫描工具条（状态标签/计数/启停主按钮） | 开始⇄停止 danger 切换 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 错误横幅（error-banner 内嵌） | 含 error.code + 重试 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 附近设备面板（筛选 + 列表） | 筛选折叠文字链 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| filter-panel（RSSI×4 预设/滑杆/前缀/隐藏无名/重置） | 实时投影无确认按钮 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| device-card 扫描态（显示名/徽章/deviceId/RSSI 信号条/按钮组） | SHID 卡双按钮（连接+配置） | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| empty-state（两种空文案） | 无结果 vs 筛选不匹配 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| advertisement-dialog 广播数据弹窗 | 字段缺失如实标注+复制 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| ~~已配置 Smart HID 面板~~ | 【已移除 2026-09-02，不得存在】 | 修复中（UNIAPP-G1-001） | 修复中 | NOT_AUDITED | — |

## P002 配网向导

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 三步骤条（常驻） | 连接→填写→状态 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| connect 阶段面板（设备卡/loading/错误+重连） | 身份验证失败→断开报错 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| configure 阶段表单（SSID≤32/密码≤64/Hub 地址 mono） | placeholder 192.168.1.8:17892 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 扫码大动作卡（badge 必需→已获取） | shid://pair 解析回填 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 隐私声明常驻行 | 「只用于本次下发，不写入日志或本地存储」 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 下发配置主按钮（canSubmit 联动） | SSID+Hub+token 齐才可点 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| status 阶段四行进度（Wi-Fi/Hub/MQTT/USB Ready） | 各行 pending/active/done/fail/warn | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 恢复按钮（form/pairing/diagnostics/retry 四动作） | 文案随错误变 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 取消等待 / 查看设备（redirectTo） | 60s 等待可取消 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 离开确认弹窗（配网进行中物理返回拦截） | 「离开将取消本次配置等待」 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## P003 设备详情

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 设备身份卡（名称/协议 chip/Device ID mono/固件） | 缺失字段「—」，协议缺「协议未记录」 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
| 最近配置卡（lastWifi/lastHub 内存快照） | 仅两快照字段 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
| 操作区（重新配置主 + 运行诊断/高级 BLE 调试次） | 三出口 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
| 记录不存在 modal→强制返回 | 无设备上下文 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## P005 诊断

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 当前状态行（六值） | 尚未检测/已连接可检测/检测中/完成/未连接/失败 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
| 五项诊断行列表（BLE/Wi-Fi/Hub/控制连接/Ready） | 行五态+可展开明细 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
| 操作区四按钮（重新检测/显隐错误码/返回详情/重新配网） | 离线→modal「连接并检测」 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
| 错误详情块（code+message，等宽） | 显隐切换 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
| 重新配网 READY 确认弹窗 | 「已进入配网模式」确认文案 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## P006 GATT 工作台

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 设备面板（头部+操作行） | 状态点灰⇄绿 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 连接⇄断开主按钮（连接中禁用） | 主动断开不触发重连 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 固件更新按钮（danger，仅 OTA 服务） | 4fafc201-…-914d 检测 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 清空日志 / 导出日志 | 空日志 toast「暂无日志」 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 服务树（折叠/UUID 中文名/全部展开收起） | 未知「服务 N/特征值 N」 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 特征行三按钮（读取/写入/监听，按 properties） | 监听⇄停止防抖 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 服务面板五态（idle/connecting/ready/empty/error+重试） | — | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| log-panel 日志面板（六色 chip dock） | sys/err/read/write/recv/ok | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| write-dialog（TEXT/HEX 单选+输入+确认取消） | 空/非法拦截 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| ota-dialog（选文件/进度/取消） | 成功 2s 自动关闭 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## P007 已连接

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 汇总卡（>1 台时，计数+全部断开） | allSettled 部分失败 modal 清单 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 设备卡列表（ON 头标/meta/断开 danger） | 点卡按 profileId 分流 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| empty-state 两种空文案 | 配网会话在线 vs 常规 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## P008 广播

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 设置卡头部（平台标签+运行徽章六值） | 广播中/失败/已停止/已就绪/未就绪/不支持 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 设备名称/服务 UUID 输入（校验黄条） | 4/8/36 位 hex | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 厂商 ID/厂商数据输入 | 1-4 位 hex | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| Android 专属（模式/功率 picker + 三开关） | 仅 Android 平台差异 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 字节提示（N/31 + 超限红字不静默截断） | AD 结构逐项 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 启停主按钮（广播中 danger/输入禁用） | — | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 检查支持按钮 | 平台分支探测 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 操作日志面板（card 变体+回放） | 'broadcast' 命名空间 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## P009 关于

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 品牌卡（logo/名称/运行时版本/技术栈 chips/总体状态） | 版本三态 fallback | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 更多小程序推广卡 | 微信直跳/非微信落地页+小程序码 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 应用信息卡（环境三行/特性 6 chips/平台状态） | 五词表 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 相关链接菜单（官网/版本记录/反馈/分享） | 4 项 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |
| 页脚版权 | — | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED | — |

## P010 版本记录

| 组件/区块 | 规范要求摘要 | U-WX | U-AND | F-AND | 归因 |
|---|---|---|---|---|---|
| 当前版本卡（版本/渠道/tag/平台状态/复制按钮） | — | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
| 当前限制卡 | known_limitations | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
| 正式发布历史 / 预览记录卡 | 空态文案 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
| 页脚声明（Release Metadata 投影） | 非手写版本事实源 | NOT_AUDITED | NOT_AUDITED | NOT_AUDITED（页缺，G1 补） | — |
