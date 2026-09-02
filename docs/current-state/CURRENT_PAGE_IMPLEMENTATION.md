# 当前页面实现盘点（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 0a33163ed724ee27d113d5f163faff955f767f775efdd4d35114f9a2a07038d4
```

## 路由事实

`apps/uniapp/pages.json` 注册路径（symbol: pages[].path）：

- pages/index/index → PAGE-001
- pages/hid/add → PAGE-003 相关（Smart HID 添加入口）
- pages/hid/detail → PAGE-004
- pages/hid/history → PAGE-005
- pages/hid/diagnostics → PAGE-005/诊断（UNASSESSED 细分）
- pages/device/detail → PAGE-002 相关设备详情
- pages/connected/index → PAGE-006/007 会话面
- pages/broadcast/index → PAGE-008
- pages/about/index → PAGE-009
- pages/about/version → PAGE-010
- WEB-001 → docs/index.md（非 UniApp 路由）

## 每页状态（来自报告）

- **PAGE-001** impl=UNASSESSED verify=EXECUTED static=UNASSESSED e4=EXECUTED task=— bp=Page Driver 已执行（Fake Runtime）；产品差距另见业务/Runtime Task
- **PAGE-002** impl=UNASSESSED verify=EXECUTED static=UNASSESSED e4=EXECUTED task=— bp=Page Driver 已执行（Fake Runtime）；产品差距另见业务/Runtime Task
- **PAGE-003** impl=UNASSESSED verify=EXECUTED static=UNASSESSED e4=EXECUTED task=— bp=Page Driver 已执行（Fake Runtime）；产品差距另见业务/Runtime Task
- **PAGE-004** impl=UNASSESSED verify=EXECUTED static=UNASSESSED e4=EXECUTED task=— bp=Page Driver 已执行（Fake Runtime）；产品差距另见业务/Runtime Task
- **PAGE-005** impl=UNASSESSED verify=EXECUTED static=UNASSESSED e4=EXECUTED task=— bp=Page Driver 已执行（Fake Runtime）；产品差距另见业务/Runtime Task
- **PAGE-006** impl=UNASSESSED verify=EXECUTED static=UNASSESSED e4=EXECUTED task=— bp=Page Driver 已执行（Fake Runtime）；产品差距另见业务/Runtime Task
- **PAGE-007** impl=UNASSESSED verify=EXECUTED static=UNASSESSED e4=EXECUTED task=— bp=Page Driver 已执行（Fake Runtime）；产品差距另见业务/Runtime Task
- **PAGE-008** impl=CONFIRMED_PARTIAL verify=EXECUTED static=CONFIRMED_PARTIAL e4=EXECUTED task=PAGE-BROADCAST-001 bp=广播页内联；Owner/composable 未接入
- **PAGE-009** impl=UNASSESSED verify=EXECUTED static=UNASSESSED e4=EXECUTED task=— bp=Page Driver 已执行（Fake Runtime）；产品差距另见业务/Runtime Task
- **PAGE-010** impl=UNASSESSED verify=EXECUTED static=UNASSESSED e4=EXECUTED task=— bp=Page Driver 已执行（Fake Runtime）；产品差距另见业务/Runtime Task
- **WEB-001** impl=UNASSESSED verify=EXECUTED static=UNASSESSED e4=EXECUTED task=— bp=Page Driver 已执行（Fake Runtime）；产品差距另见业务/Runtime Task

## PAGE-008 静态事实

- path: `apps/uniapp/pages/broadcast/index.vue`
- symbol: 页面内联 advertising / 平台 API 调用
- line_hint: 无 `useBroadcastSession` / `use-broadcast-session` import
- Target: PAGE-008, FEAT-041..045, FLOW-008
- static_implementation: CONFIRMED_PARTIAL

## PAGE-010 静态事实

- path: `apps/uniapp/pages/about/version.vue`
- symbol: getVersionPageModel（Metadata 投影）
- Target: PAGE-010, FEAT-004/066
- static_implementation: CONFIRMED_IMPLEMENTED（构建期 Metadata 投影；E4 仍受 Playwright 阻断）
- RC-PAGE-VERSION: CLOSED

## STATE / OP

- 契约总量：STATE **67** / OP **92**（`tests/target/pages/page-behavior.manifest.json`）
- E4：Page Driver 已执行（Fake Runtime）；产品差距另见业务 Task
- 多数 State/OP 的 static_implementation = **UNASSESSED**（未做控件级静态确认，禁止默认 PARTIAL）
- `blocked_cases=undefined` ≠ 产品缺陷数

## WEB-001

- path: `docs/index.md`
- 观察：无 releases/latest 假主下载；公开状态为 PREVIEW / NOT_RELEASED（landing_fake_download=false）
- Target: WEB-001, CLAIM-*, FEAT-070/075
