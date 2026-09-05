# TP-G0 审核摘要（用户审核入口）

```yaml
status: APPROVED
document_version: 1.1
owner: Smart BLE Product Owner
last_reviewed: 2026-09-01
approved_by: user
supersedes: []
```

> TP-G0-R1 修订版（12 项目标规范修正已合入；统计由 `scripts/target-docs/inspect-target-docs.mjs` 单源生成）。

> 本文件浓缩 `docs/target-product/**` 全部目标文档与 `contracts/target/**` 机器契约，供用户一次性审阅。
> **本摘要已获用户批准；TP-G1 启动时先统一投影目标文档/机器契约审批元数据，再建立测试规范与脚本。**

---

## 1. 产品范围

**Smart BLE = 开源的跨平台 BLE 调试、学习与硬件联动工具。首版主线：UniApp Android App + 微信小程序（BLE Toolkit+）。**

固定包含 13 项：Android App、微信小程序、H5 降级、iOS 目标定义（NOT_RELEASED）、LightBLE fixture_peripheral、fixture_observer、Smart HID 第一方 Profile、10 个 App 页面、公开落地页 WEB-001、HTML 交互原型、四端证据体系、VERSION/Release Metadata/下载/SHA/二维码/已知限制、开源开发者文档与 Profile 扩展指南。

非目标（REFERENCE/Not Now，不得与主线并列宣传）：Flutter、原生 Android/iOS/macOS、Tauri/Electron/Avalonia、Windows/Linux placeholder、云端/账号/会员/支付/License、第三个第一方 Profile。

成功标准：新开发者 30 分钟完成"新电脑构建→烧写 ESP32→安装→扫描→连接→写入→Notify"闭环；所有 Must 达最低证据等级（BLE 能力 E5、公开产物 E6）；落地页零假下载/假二维码/无证据声明。

## 2. Must 功能总表（81 FEAT 分 15 组）

| 组 | 数量 | 代表功能 |
|---|---|---|
| SYS | 4 | 平台识别、四 Tab 导航、生命周期、版本 SSOT |
| PERM | 5 | 蓝牙权限、微信能力驱动最小权限（DEC-003）、永久拒绝恢复、蓝牙开关引导、不支持降级 |
| SCAN | 7 | 扫描启停超时（10 秒）、generation、去重/RSSI、显示名解析链、上限筛选、N/M 双数、HID 历史紧凑入口（只读） |
| AD | 3 | 广播字段解析、缺失三态、复制 |
| CONN | 6 | attempt 去重、服务发现、空服务重试、主动断开、有限重连、耗尽恢复 |
| GATT | 7 | 属性约束、Read、TEXT/HEX 写、写队列、MTU 分包、Characteristic Subscription（DEC-017）、tuple 隔离 |
| SESSION | 4 | 应用级 Registry（含 subscription_count）、跨页复用、多设备（Should 扩展 3 台）、stale 清理 |
| LOG | 4 | 按设备日志、容量清空、导出、脱敏+关联 ID |
| PERI | 5 | 能力检查、Payload 编辑（名称能力驱动 DEC-004）、31/32 预算、Owner 与连接保护、生命周期释放 |
| OTA | 8 | 包校验（DEC-016）、文件校验、start/ready、DATA、commit/success、abort、版本回读、失败恢复（V1 整事务重试） |
| HID-PROV | 6 | 强/弱匹配、二次身份、表单、QR、分帧+waiter、八类错误恢复 |
| HID-HIST | 6 | 存储 TTL、列表快照、移除（PAGE-004 唯一宿主）、自动诊断、owned/borrowed、重配移交 |
| PRODUCT | 4 | 关于页真实信息、版本历史、分享、隐私/安全/License |
| WEB | 8 | Hero、闭环能力卡、平台表、截图原型、ESP32 双卡、快速开始（5 分钟+30 分钟双计时）、下载/QR/SHA/证据、SEO/无障碍 |
| DOC | 4 | 5 分钟 Quick Start/30 分钟 Clean Machine、ESP32 从零、Profile 扩展、贡献/Release |

优先级：Must 81、Should 0、Could 0（详见 `03` 第 17 节；TARGET-AMEND-001 投影校正）。

## 3. 11 个界面摘要

| ID | 界面 | 一句话目标 | 关键状态/约束 |
|---|---|---|---|
| PAGE-001 扫描 | 发现与识别入口 | 权限/蓝牙/平台状态+扫描+筛选+广播详情+Profile 动作 | 5 个独立错误/空态；N 与 M 同时显示；显示名解析链 |
| PAGE-002 HID 配网 | 单页配网向导 | 连接→身份→表单→QR→下发→四步进度→READY | 八类错误唯一恢复；token/密码内存边界；READY 释放连接 |
| PAGE-003 HID 详情 | 历史快照枢纽 | 快照展示+重配/诊断/高级 BLE 三动作 | 醒目"历史≠在线"；缺失字段隐藏 |
| PAGE-004 HID 历史 | 历史唯一完整列表 | 查看/移除/去详情 | 90 天 TTL 说明；无在线绿点 |
| PAGE-005 HID 诊断 | 五项实时诊断 | 进入自动一次+手动重试 | Pending≠OK；owned/borrowed 离页行为 |
| PAGE-006 设备详情 | GATT 调试工作台 | 服务树+读写订阅+日志+OTA | 15 操作；OTA 成功=版本一致（STATE-OTA-10） |
| PAGE-007 已连接 | 活动会话管理 | 打开复用/单断/全断 | 排除配网会话；统一断开入口；禁"稳定"文案 |
| PAGE-008 广播 | 手机 Peripheral | 字段+31/32 预算+启停 | 12 状态；Owner 与活动连接保护；Observer 为正式证据 |
| PAGE-009 关于 | 产品诚实面 | 版本/平台状态/公开入口 | 五词状态；推广区仅微信页底折叠 |
| PAGE-010 版本记录 | 版本 SSOT UI | 首项=运行版本，四类条目 | Release Metadata 投影，非手写数组 |
| WEB-001 落地页 | 公开可信入口 | 14 区块：定位→证据→下载/NOT_RELEASED | 全字段 Metadata 驱动；无假下载假二维码 |

## 4. 14 条主流程摘要

1. FLOW-001 首次启动与权限（含永久拒绝/H5 降级）
2. FLOW-002 两轮扫描（generation 隔离迟到事件）
3. FLOW-003 广播详情（看广播不连接）
4. FLOW-004 连接与服务发现（含被动断开 3 次重连）
5. FLOW-005 Read/Write/Notify（含队列/MTU/隔离）
6. FLOW-006 跨页 Session（Registry 复用）
7. FLOW-007 多设备（同 UUID 隔离，断 A 留 B）
8. FLOW-008 手机 Peripheral（Observer 证据闭环）
9. FLOW-009 OTA 完整事务（10 步+版本回读+abort）
10. FLOW-010 Smart HID 首次配网（waiter 先注册+八类错误）
11. FLOW-011 Smart HID 历史/诊断/重配
12. FLOW-012 关于/分享/反馈
13. FLOW-013 落地页体验/下载/ESP32
14. FLOW-014 Release 后新安装与首次联调（30 分钟标准验收流）

每条含主/替代/错误/取消/清理路径 + 流程图 + 时序图 + 测试映射 + 证据 ID（`06`）。

## 5. 平台矩阵（摘要）

Android App 与微信为正式入口（微信 5 项 Adapted：权限/文件/Peripheral/并行上限/后台不承诺）；H5 永远 UNSUPPORTED（禁真实 BLE API）；iOS NOT_RELEASED（DEC-005）；其他客户端 REFERENCE 不入公开面。28 项能力逐项结论见 `08`/`contracts/target/platform-target.json`。

## 6. Runtime 目标架构

分层：Page→Composable→Store/Workflow→Domain Service→BLE Runtime/Adapter→平台 API。冻结六机制：Central Runtime 全局回调唯一所有者（页面禁止直注册）、Scan Generation、Connection Attempt 去重、应用级 Session Registry、Notify tuple 路由、OTA 独立事务机、Smart HID Workflow 分层（通用层零 import，可整体移除）。资源释放矩阵覆盖 13 类资源×6 种终局（`10`）。

## 7. ESP32 与 OTA

- **fixture_peripheral**：广播名 `BLEToolkit-Server`；主服务（Control `…26a8`/Notify `…26a9`）、权限演示服务（7 特征 `26b0..26b6`）、OTA 服务（CTRL/Data/Status `26c0..26c2`）、LED 四命令（`FF00..FF03`）、Notify 每 5s、7 种故障注入、串口 JSON。
- **fixture_observer**：扫描手机广播，串口输出 ts/name/rssi/uuids/mfg/svc_data/raw/last_seen，≥5 条/秒——手机广播的**正式证据源**（DEC-002 推荐首版必须交付）；其 `name/raw` 观测是广播名称能力驱动规则（DEC-004）的最终事实源。
- **OTA 固件包（DEC-016/PROTO-011）**：包=manifest.json+firmware.bin；开始传输前客户端六项校验（格式/target/hardware/firmware_version/size/SHA256），错误包（ERR-OTA-09..13）不得进入 BLE 事务。
- **OTA 正典顺序（第 0 步包校验 + 10 步）**：订阅 STATUS→CTRL start（含 target/sha256）→ready→DATA 分包按序→CTRL commit（设备复核 size+SHA256）→success→reboot→重连→读 firmware_version→版本一致才成功。取消=CTRL abort；V1 不支持单块重传/缺块补发/断点续传/乱序恢复——任何失败=事务 FAIL 回 idle（旧固件可运行）后从 CTRL start 重新完整发起（`12`/`07`）。

## 8. Smart HID

外部正典为 Smart-HID-Workspace PROVISIONING_V1（本仓为受锁定镜像+lock 文件）。强匹配=Service UUID `9f1d1001-…-1c04`；弱匹配=`SHID-` 前缀+连接后 Device Info 三条件二次确认。配网=表单→`shid://pair` QR（token 5 分钟一次性仅内存）→candidate 分帧（`[seq][total][len][payload]`，≤128B/帧）单次写入→STATUS waiter（60s）→四步进度→READY（释放连接、设备关广播）。八类协议错误各唯一恢复动作。ControlHub/MQTT/USB HID 完全不在本产品范围；Smart HID 不阻塞通用 BLE Gate（发布状态独立，DEC-006 推荐 PREVIEW→VERIFIED 渐进）。

## 9. Landing 与 Release

版本 SSOT=根目录 VERSION（五处一致门禁）；Release Metadata（DATA-009）是落地页/版本页/关于页唯一数据源：产物 URL+SHA256、微信码状态、逐 CLAIM 状态、已知限制、测试设备。31 条公开声明（CLAIM-001..031）全部绑定证据前提与 TEST-R 用例；无产物=NOT_RELEASED 卡（无链接）；二维码仅正式码且发布前实机扫码验证；禁用"大一统/6+ 入口"类旧定位。5 分钟 Quick Start（CLAIM-017/TEST-R-005，前置条件已满足）与 30 分钟 Clean Machine（CLAIM-031/TEST-R-011，clone→…→notify 全流程）双计时分开声明、分开验证，不得互相冒充。

## 10. Security / NFR / A11y

- 安全（SEC-001..019）：最小权限（能力驱动，不预取定位）、设备标识不出本机、二次身份确认、URL 禁敏感字段、日志/证据双段脱敏、token/密码内存边界、OTA 无签名如实声明+版本回读、OTA 固件包完整性与目标校验（DEC-016）、产物 SHA 链、外链白名单、隐私/披露渠道。残余风险如实登记（V1 明文配网高危、OTA 无签名中危）。
- NFR（24 条量化）：冷启动 ≤2s、页面切换 ≤500ms、扫描合并 1s、列表 100、连接/发现 10s、读 3s、写队列 16、OTA 各段 15/60/30/30s、waiter 60s、日志 200/设备、LCP ≤2.5s、20 轮无泄漏、双机型覆盖、固定 commit 复现。
- 无障碍：触控 ≥44px、对比度 ≥4.5:1（亮暗）、读屏 label、键盘焦点、状态三通道（图标+文字+颜色）、错误文案=发生了什么+下一步；术语与文案规范统一（禁"稳定/完整支持/待定占位"）。

## 11. 待用户确认的 DEC 清单（17 项）

| DEC | 议题 | 推荐方案 | 需确认 |
|---|---|---|---|
| DEC-001 | OTA 首版公开策略 | 入口显示+BLOCKED/PREVIEW 徽标，证据齐升 VERIFIED | ✅ |
| DEC-002 | Observer 必须第一方固件 | 是（本仓交付 fixture_observer） | ✅ |
| DEC-003 | 微信 BLE 权限 | 能力驱动最小权限：点击扫描才申请；仅环境要求时引导定位；TP-G4 真机矩阵回填 | 复核 |
| DEC-004 | 广播名称 | 能力驱动 UI：可控（Advertising Local Name）才可编辑；否则只读展示 System Device Name | ✅ |
| DEC-005 | iOS 发布时机 | 首版 NOT_RELEASED | ✅ |
| DEC-006 | Smart HID 公开状态 | PREVIEW→VERIFIED 渐进 | ✅ |
| DEC-007 | 无正式码/APK 时落地页 | NOT_RELEASED 卡+CTA 转原型/源码 | ✅ |
| DEC-008 | 多设备上限 | 2 台 Must+3 台 Should | ✅ |
| DEC-009 | Notify 跨页保留 | 随会话保留（PAGE-007 显示 subscription_count） | ✅ |
| DEC-010 | 版本 SSOT | 根目录 VERSION 文件 | ✅ |
| DEC-011 | GitHub/Gitee 角色 | GitHub 主+Gitee 国内镜像（只读） | ✅ |
| DEC-012 | 扫描页历史入口 | 最近 1 台摘要+查看详情+全部历史（只读；管理唯一归 PAGE-004） | ✅ |
| DEC-013 | 默认扫描时长 | 10 秒（常量可调；可手动停止、可立即重扫） | 低风险 |
| DEC-014 | 详情缺失字段 | 隐藏该行 | 低风险 |
| DEC-015 | 其他小程序推广区 | 仅微信页底折叠 | ✅ |
| DEC-016 | OTA 固件包格式 | manifest+firmware.bin，六项传输前校验+commit 复核（签名验证记为后续方向） | ✅ |
| DEC-017 | Notify/Indicate 订阅语义 | 统一 Characteristic Subscription；不承诺 Indicate ACK 可观测 | ✅ |

未确认时按"默认方案"实现（`21` 第 2 节每项均已写明默认）。

## 12. 文档与 ID 完整性统计

统计由 `scripts/target-docs/inspect-target-docs.mjs` 生成并校验（单源；禁止手写约数）。

<!-- TARGET_DOCS_STATS:BEGIN 由 scripts/target-docs/inspect-target-docs.mjs 生成，勿手改 -->
| 维度 | 数量 |
|---|---|
| 目标文档（.md） | 37 |
| 机器契约（schema / data JSON） | 8 / 8 |
| Mermaid 图 | 46 |
| REQ / FEAT | 66 / 81 |
| PAGE / WEB / FLOW | 10 / 1 / 14 |
| OP（在册 92，另有废弃 1 不复用） | 92 |
| STATE（页面/全局） | 110（67/43） |
| ERR | 68 |
| DATA / PROTO / SEC / NFR | 13 / 11 / 19 / 24 |
| CLAIM / DEC / RISK / EVID | 31 / 17 / 16 / 8 |
| 计划测试（C14/U16/I10/P12/E8/A14/W10/H8/R11） | 103 |
<!-- TARGET_DOCS_STATS:END -->

覆盖率：REQ→FEAT 100%、REQ→计划测试 100%、硬件相关 REQ→E5 全覆盖、公开 REQ→CLAIM+TEST-R 全覆盖；无孤立 Must（`22`）。

## 13. 进入 TP-G1 的批准清单

用户批准本摘要后：

- [x] 用户已明确批准 TP-G0-R1 目标产品定义；TP-G1 启动时统一投影 REVIEW→APPROVED
- [x] 17 项 DEC 按 REVIEW_SUMMARY 推荐方案接受
- [x] 范围：13 项固定包含、非目标清单已确认
- [x] 页面/流程/ESP32/Smart HID/落地页目标已确认
- [x] 允许启动 TP-G1（测试规范与脚本）；TP-G1 仍不得修改业务代码

---

## 批准区

- [x] **用户已审阅并批准 TP-G0-R1 目标产品定义，同意进入 TP-G1。**
  - 批准记录：2026-09-01 当前对话中的“继续”授权
  - DEC 处理：全部接受 REVIEW_SUMMARY 推荐方案

> 当前状态：**TP-G0-R1 已获用户批准，可以进入 TP-G1；TP-G1 仍不得修改业务代码或烧写硬件。**
