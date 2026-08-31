# Smart BLE 全面产品交付 Gate 看板

> 事实源：`docs/plans/2026-08-31-uniapp-esp32-full-product-delivery-plan.md`
> 基线：`docs/verification/full-delivery-baseline.md`
> 当前阶段：G0～G2 已完成文档审核，**等待用户审阅后才进入 G3**
> 规则：没有真实证据不得将状态改为 PASS；需要用户确认的 Gate 不得自动越过。

## 总看板

| Gate | 名称 | 当前状态 | 核心产物 | 进入条件 | 退出条件 |
|---|---|---|---|---|---|
| G0 | 基线冻结与任务地图 | PASS | `full-delivery-baseline.md` | 当前仓库可读 | 基线和风险完整、无业务修改 |
| G1 | 10 页 + WEB-001 产品审核 | PASS | `docs/product-review/**` 11 份 | G0 PASS | 用户看到所有界面结论（待用户确认） |
| G2 | Runtime/Web 链路与矩阵 | PASS | runtime audit、OP matrix、claim/link matrix | G1 审核资料完整 | 所有操作有真实链路或 Blocker |
| G3 | 契约、版本和公开状态冻结 | BLOCKED_BY_G1_G2 | 契约门、VERSION、release metadata | **用户批准 G1/G2** | 正典、版本和公开状态唯一 |
| G4 | App 与落地页原型 | BLOCKED_BY_G3 | 10 页原型、落地页 IA 原型、E2E | G3 PASS | 用户批准 App/WEB 原型 |
| G5 | ESP32 Peripheral/Observer | BLOCKED_BY_G4 | fixture contract、固件、test、SHA | G4 PASS | 两模式自动化和干净构建通过 |
| G6 | UniApp 通用 BLE 实现 | BLOCKED_BY_G4_G5 | PAGE-001/006/007/008/009/010 E1-E4 | 原型与夹具批准 | 通用 BLE 自动化和构建全绿 |
| G7 | 开发机 Android/微信 E5 | BLOCKED_BY_G6 | 页面/OP 真机证据 | G5/G6 PASS | 通用 Must E5、无 P0/P1 |
| G8 | Smart HID Profile E5 | BLOCKED_BY_G7 | PAGE-002～005、配网和 USB HID 证据 | 通用 Runtime E5 | Smart HID 发布范围明确 |
| G9 | 另一台电脑复现 | BLOCKED_BY_G7_G8 | BUILD_ONLY/HARDWARE_E5/RELEASE_VERIFY | 固定 commit 与 SHA | 独立验证达到目标 |
| G10 | 落地页与文档终稿 | BLOCKED_BY_EVIDENCE | VitePress 终稿、截图、下载、证据 | 公开状态有 E5/E6 | 所有声明和入口可信 |
| G11 | RC 与正式 Release | BLOCKED_BY_G9_G10 | artifacts、manifest、SHA、tag | 所有发布门通过 | RC 经 RELEASE_VERIFY |
| G12 | 发布后烟测 | BLOCKED_BY_RELEASE | 下载、安装、二维码、文档烟测 | 正式发布 | 无公开阻断问题 |

说明：G0/G1/G2 的 PASS 仅表示 **文档门禁完成**。没有任何 BLE 能力因此变成产品 PASS 或 VERIFIED。

## 产品界面审核

| ID | 名称 | 目的 | 内容 | 操作 | 状态 | 数据来源 | 链路 | 硬件/外部依赖 | 结论 |
|---|---|---|---|---|---|---|---|---|---|
| PAGE-001 | 扫描 | APPROVED 必要性 | NEEDS_CHANGE | UNPROVEN | UNPROVEN | 广播+Store+历史 | E0/E1 | LightBLE Peripheral | NEEDS_CHANGE |
| PAGE-002 | Smart HID 配网 | APPROVED 必要性 | NEEDS_CHANGE | UNPROVEN | UNPROVEN | Info/QR/Status | E0/E1 | Smart HID（E5 后置） | NEEDS_CHANGE |
| PAGE-003 | Smart HID 详情 | APPROVED 必要性 | NEEDS_CHANGE | UNPROVEN | N/A 实时 | 本地历史 | E0 | Smart HID / history | NEEDS_CHANGE |
| PAGE-004 | Smart HID 历史 | APPROVED 必要性 | NEEDS_CHANGE | UNPROVEN | N/A BLE | 本地历史 | E0 | Local history | NEEDS_CHANGE |
| PAGE-005 | Smart HID 诊断 | APPROVED 必要性 | NEEDS_CHANGE | UNPROVEN | UNPROVEN | Info/Status | E0/E1 | Smart HID | NEEDS_CHANGE |
| PAGE-006 | 通用设备详情 | APPROVED 必要性 | NEEDS_CHANGE | UNPROVEN | UNPROVEN | GATT+logger | E0/E1 | Peripheral fixture | NEEDS_CHANGE |
| PAGE-007 | 已连接 | APPROVED 必要性 | NEEDS_CHANGE | UNPROVEN | UNPROVEN | Store session | E0/E1 | Two BLE devices | NEEDS_CHANGE |
| PAGE-008 | 广播 | APPROVED 必要性 | NEEDS_CHANGE | UNPROVEN | UNPROVEN | 本地 payload | E0/E1 | Observer **缺失** | NEEDS_CHANGE |
| PAGE-009 | 关于 | APPROVED 必要性 | NEEDS_CHANGE | UNPROVEN | N/A BLE | 静态+运行时版本 | E0 | Links/share | NEEDS_CHANGE |
| PAGE-010 | 版本记录 | APPROVED 必要性 | NEEDS_CHANGE | UNPROVEN | N/A | 硬编码数组 | E0 | VERSION 未统一 | NEEDS_CHANGE |
| WEB-001 | 公开落地页 | APPROVED 必要性 | NEEDS_CHANGE | FAIL 声明 | N/A | 手工 md | E3 build | Downloads/QR/GitHub | NEEDS_CHANGE |

无 APPROVED 内容结论：全部界面 **NEEDS_CHANGE**。无 REMOVE。无整页 MERGE（仅建议扫描页历史区向 PAGE-004 收口）。

## 当前已知落地页问题

| Finding | 当前事实 | 期望处理 | 状态 |
|---|---|---|---|
| WEB-F01 | Hero 仍称“跨平台控制台与统一协议内核” | 改成 UniApp + ESP32 当前正式产品定位 | OPEN / 已写入 WEB-001 |
| WEB-F02 | Tagline 宣称覆盖 Flutter/Tauri/Android/iOS | 其他客户端降级为参考实现 | OPEN |
| WEB-F03 | 首页显示“6+ 运行入口同时维护” | 删除或改成真实状态 | OPEN |
| WEB-F04 | Flutter 标记 Mobile Mainline | UniApp Android + 微信才是首版主线 | OPEN |
| WEB-F05 | 下载 Android/Windows/macOS 均指向同一 Release | 只有真实产物才显示下载，否则 unavailable | OPEN |
| WEB-F06 | SEO/OG 宣称“大一统开发库” | 对齐当前产品、版本和证据 | OPEN |
| WEB-F07 | release workflow 构建 Flutter + Tauri | 改为首版真实产物与受控微信发布记录 | OPEN（G3+ 才改代码） |
| WEB-F08 | 缺当前版本、证据 run、已知限制 | 使用 release metadata 驱动 | OPEN |
| WEB-F09 | 缺真实 App 截图和 ESP32 两种夹具说明 | 使用 E4/E5 资产 | OPEN |
| WEB-F10 | 旧 MASTER 文档仍是主要 CTA | 产品契约、原型、ESP32、证据优先 | OPEN |

## 发布状态值

公开页面只使用：

- `VERIFIED`
- `PREVIEW`
- `BLOCKED`
- `UNSUPPORTED`
- `NOT_RELEASED`

内部 `UNPROVEN`、P0/P1 审计细节不直接展示到公开落地页。

## G0～G2 执行记录

```text
GATE: G0
STATUS: PASS（基线文档）
BASELINE: branch main, start e817d1c, worktree 仅规划文档脏
SCOPE: 冻结页面/版本/固件/网站/workflow 事实
TESTS: 见 G2
EVIDENCE LEVEL: E0
HARDWARE: NOT EXECUTED
FIRST FAILURE: 用户计划文件 trailing whitespace 使 verify-uniapp.sh git diff --check 失败（未改该文件）
OPEN DECISIONS: 无（G0 只记录）
GIT: 本轮文档提交，不 push
NEXT: G1
```

```text
GATE: G1
STATUS: PASS（11 份 A–M 审核已交付，待用户确认结论）
SCOPE: PAGE-001～010 + WEB-001
CHANGES: docs/product-review/**
EVIDENCE LEVEL: E0（产品正确性，非真机）
HARDWARE: NOT EXECUTED
OPEN DECISIONS: 见各审核 M 节与下方 TOP USER DECISIONS
NEXT: 用户审阅；不自动 G3
```

```text
GATE: G2
STATUS: PASS（链路与矩阵已填真实入口或 Blocker）
SCOPE: 18 条 App 链路 + WEB CTA
TESTS: verify-uniapp 单测+SFC 通过；脚本 exit 2 因空白检查；docs:build 0
EVIDENCE LEVEL: E1 逻辑；E3 网站构建；E5 无
HARDWARE: NOT EXECUTED
FIRST FAILURE: Observer 固件不存在 → OP-030/WEB-OP-010 BLOCKED；OTA `CHAR_CTRL` 未接线 → OP-021 BLOCKED
NEXT: 用户审阅 G1/G2
```

## Gate 汇报模板

```text
GATE:
STATUS:
BASELINE:
SCOPE:
CHANGES / OUTPUTS:
TESTS:
EVIDENCE LEVEL:
HARDWARE:
FIRST FAILURE:
OPEN DECISIONS:
GIT:
NEXT:
```
