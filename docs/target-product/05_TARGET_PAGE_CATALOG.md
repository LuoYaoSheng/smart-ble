# 05 目标页面目录

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE Product / UX
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：PAGE-001~010 与 WEB-001 的总表——每页的存在目的、首屏要点、关键依赖、测试与非目标；页面文档的索引。

本文不负责：每页的 24 章节完整契约（见 `pages/`、`web/`）。

---

## 2. 页面总表

| ID | 名称 | 路由 | 类型 | 存在目的（一句话） | 首屏必须可见 | 关键依赖 | 主要测试 | 非目标 |
|---|---|---|---|---|---|---|---|---|
| PAGE-001 | 扫描 | `pages/index/index` | Tab | 发现与识别附近 BLE 设备，是一切流程的起点 | 平台/蓝牙/权限状态、开始扫描、发现 N·筛选 M、设备列表或空态 | PERM/SCAN/AD 全组；Smart HID 历史紧凑入口 | TEST-P-001、TEST-A-001/005、TEST-W-001/007、TEST-E-001 | 不做设备配网本身；不重复完整历史列表 |
| PAGE-002 | Smart HID 配网 | `pages/hid/add` | 二级 | 单页完成连接→身份→表单→QR→下发→状态 | 当前阶段指示、连接状态、表单/二维码、四步进度或错误+恢复 | Smart HID Profile、ControlHub（外部）、PROTO-005/006/007 | TEST-P-002、TEST-H-001..003、TEST-W-010 | 不承担 USB HID/MQTT 控制；无正式"跳过 ControlHub"路径 |
| PAGE-003 | Smart HID 详情 | `pages/hid/detail` | 二级 | 展示历史快照并提供三个动作 | "历史快照非实时"声明、身份字段、重配/诊断/高级 BLE | DATA-006 | TEST-P-003、TEST-H-004 | 不显示在线绿点；不做实时刷新 |
| PAGE-004 | Smart HID 历史 | `pages/hid/history` | 二级 | Smart HID 历史唯一完整列表 | 空态或列表+TTL 说明 | DATA-006、FEAT-059 | TEST-P-004、TEST-H-004 | 不显示在线状态；不做搜索排序（Could 记录） |
| PAGE-005 | Smart HID 诊断 | `pages/hid/diagnostics` | 二级 | 对一台设备跑五项实时诊断 | 当前状态芯片、五项诊断结果或 Pending、读取时间 | Smart HID 固件、owned/borrowed 会话 | TEST-P-005、TEST-H-005 | 不修复设备本身；不常驻轮询 |
| PAGE-006 | 通用设备详情 | `pages/device/detail` | 二级 | 任意 GATT 设备的调试工作台 | 设备身份与连接状态、服务树或状态、操作行、日志 | CONN/GATT/LOG/OTA 全组 | TEST-P-006、TEST-A-006..011、TEST-E-002..007 | 不做设备云管理；OTA 未达标时入口 BLOCKED |
| PAGE-007 | 已连接 | `pages/connected/index` | Tab | 管理当前活动会话 | 活动会话列表或空态引导 | Session Registry | TEST-P-007、TEST-A-009、TEST-W-008/009 | 不显示扫描结果；不显示无健康指标的健康词 |
| PAGE-008 | 广播 | `pages/broadcast/index` | Tab | 手机作为 Peripheral 发出可控广播 | 平台支持状态、payload 字段、字节预算、开始/停止 | PERI 全组、Observer（证据） | TEST-P-008、TEST-A-010、TEST-W-009、TEST-E-006 | 不支持 >31 字节扩展广播（Not Now）；H5 不支持 |
| PAGE-009 | 关于 | `pages/about/index` | Tab | 产品身份、平台状态与全部公开入口 | 产品名+真实版本、平台状态、核心入口 | VERSION、`08`、`18` | TEST-P-009、TEST-A-012、TEST-W-010、TEST-R-003 | 不做账号/关于我；推广区不进首屏 |
| PAGE-010 | 版本记录 | `pages/about/version` | 二级 | 版本历史的唯一站内展示 | 当前版本标记、最近条目四类变更 | DATA-008/009 | TEST-P-010、TEST-C-006、TEST-R-002 | 不做在线更新检查 |
| WEB-001 | 落地页 | `/` | Web | 公开可信入口：定位→证据→下载/NOT_RELEASED | Hero+状态徽标、核心闭环、平台状态表 | Release Metadata（DATA-009） | TEST-R-001..010 | 不做假下载/假二维码/无证据声明 |

## 3. 页面文档索引

| ID | 文档 |
|---|---|
| PAGE-001 | [`pages/PAGE-001_SCAN.md`](pages/PAGE-001_SCAN.md) |
| PAGE-002 | [`pages/PAGE-002_HID_PROVISION.md`](pages/PAGE-002_HID_PROVISION.md) |
| PAGE-003 | [`pages/PAGE-003_HID_DETAIL.md`](pages/PAGE-003_HID_DETAIL.md) |
| PAGE-004 | [`pages/PAGE-004_HID_HISTORY.md`](pages/PAGE-004_HID_HISTORY.md) |
| PAGE-005 | [`pages/PAGE-005_HID_DIAGNOSTICS.md`](pages/PAGE-005_HID_DIAGNOSTICS.md) |
| PAGE-006 | [`pages/PAGE-006_DEVICE_DETAIL.md`](pages/PAGE-006_DEVICE_DETAIL.md) |
| PAGE-007 | [`pages/PAGE-007_CONNECTED.md`](pages/PAGE-007_CONNECTED.md) |
| PAGE-008 | [`pages/PAGE-008_BROADCAST.md`](pages/PAGE-008_BROADCAST.md) |
| PAGE-009 | [`pages/PAGE-009_ABOUT.md`](pages/PAGE-009_ABOUT.md) |
| PAGE-010 | [`pages/PAGE-010_VERSION.md`](pages/PAGE-010_VERSION.md) |
| WEB-001 | [`web/WEB-001_LANDING_PAGE.md`](web/WEB-001_LANDING_PAGE.md) |

每份页面文档必须使用 `README.md` 第 5 节 24 章节模板；不适用项写 `N/A + 原因`。

## 4. 全局页面规则（所有页面共同约束）

1. 页面标题不与导航栏文案重复占位；原生导航外观可不同但语义一致。
2. 每个异步操作至少有 idle/loading/error/success(或 complete) 四态覆盖。
3. 统一状态词汇：`idle / loading / empty / error / success / disconnected / unsupported`。
4. 离开页面时按 `10` 释放矩阵清理页面级资源；应用级资源归 Registry/Owner。
5. 无敏感数据入 URL、日志、截图与默认分享内容。
6. 所有可交互元素满足 `17` 无障碍要求（触控 ≥44px、对比度 ≥4.5:1、读屏 label）。

## 5. 验收条件与关联测试规划

- 11 个界面全部有目的、首屏、依赖、测试、非目标；
- 索引与 `pages/`、`web/` 实际文件一一对应；
- 全局规则与 `07`/`10`/`17` 一致。

关联计划测试：`TEST-C-005`（页面目录与文件一致性）、`TEST-P-012`（原型覆盖 10 页四态）。
