# 当前页面实现盘点（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: be493664f40cc23efd4418ab4df5f8cdba44cb398786586fd9d5ed5373c07074
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

- **PAGE-001** impl=UNASSESSED verify=AUTOMATED_FAIL static=UNASSESSED e4=BLOCKED_BY_TOOLCHAIN task=RUNTIME-FILTER-001 bp=命中项匹配关键词
- **PAGE-002** impl=UNASSESSED verify=AUTOMATED_FAIL static=UNASSESSED e4=BLOCKED_BY_TOOLCHAIN task=RUNTIME-LOG-REDACTION-001 bp=[TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：a
- **PAGE-003** impl=UNASSESSED verify=BLOCKED_BY_TOOLCHAIN static=UNASSESSED e4=BLOCKED_BY_TOOLCHAIN task=ENV-PLAYWRIGHT-001 bp=BLK-TOOL-PLAYWRIGHT: @playwright/test 未安装
- **PAGE-004** impl=IMPLEMENTED_UNTESTED verify=AUTOMATED_PASS static=CONFIRMED_IMPLEMENTED e4=BLOCKED_BY_TOOLCHAIN task=ENV-PLAYWRIGHT-001 bp=BLK-TOOL-PLAYWRIGHT: @playwright/test 未安装
- **PAGE-005** impl=UNASSESSED verify=BLOCKED_BY_TOOLCHAIN static=UNASSESSED e4=BLOCKED_BY_TOOLCHAIN task=ENV-PLAYWRIGHT-001 bp=BLK-TOOL-PLAYWRIGHT: @playwright/test 未安装
- **PAGE-006** impl=UNASSESSED verify=AUTOMATED_FAIL static=UNASSESSED e4=BLOCKED_BY_TOOLCHAIN task=RUNTIME-GATT-CODEC-001 bp=[TEST-U-010 REQ-026 FEAT-028] 第一断点: 目标接口 validateHexInput/pa
- **PAGE-007** impl=UNASSESSED verify=AUTOMATED_FAIL static=UNASSESSED e4=BLOCKED_BY_TOOLCHAIN task=RUNTIME-SESSION-001 bp=[REQ-053/PAGE-007 排除规则] 第一断点: Registry 无配网会话分类/排除接口——PAGE-00
- **PAGE-008** impl=CONFIRMED_PARTIAL verify=AUTOMATED_PASS static=CONFIRMED_PARTIAL e4=BLOCKED_BY_TOOLCHAIN task=PAGE-BROADCAST-001 bp=广播页内联；Owner/composable 未接入
- **PAGE-009** impl=UNASSESSED verify=AUTOMATED_FAIL static=UNASSESSED e4=BLOCKED_BY_TOOLCHAIN task=VERSION-METADATA-001 bp=[TEST-U-002 REQ-004/056 FEAT-004/066 PAGE-009/010 WEB-001 S-
- **PAGE-010** impl=CONFIRMED_PARTIAL verify=BLOCKED_BY_TOOLCHAIN static=CONFIRMED_PARTIAL e4=BLOCKED_BY_TOOLCHAIN task=PAGE-VERSION-001 bp=pages/about/version.vue 硬编码 versionHistory
- **WEB-001** impl=CONFIRMED_PARTIAL verify=AUTOMATED_FAIL static=CONFIRMED_PARTIAL e4=BLOCKED_BY_TOOLCHAIN task=RUNTIME-LOG-REDACTION-001 bp=[TEST-U-013 REQ-036/050 FEAT-040 SEC-0xx 15号] 第一断点: 目标模块缺失：a

## PAGE-008 静态事实

- path: `apps/uniapp/pages/broadcast/index.vue`
- symbol: 页面内联 advertising / 平台 API 调用
- line_hint: 无 `useBroadcastSession` / `use-broadcast-session` import
- Target: PAGE-008, FEAT-041..045, FLOW-008
- static_implementation: CONFIRMED_PARTIAL

## PAGE-010 静态事实

- path: `apps/uniapp/pages/about/version.vue`
- symbol: versionHistory / 硬编码版本文案
- Target: PAGE-010, FEAT-004/066
- static_implementation: CONFIRMED_PARTIAL（若硬编码命中）

## STATE / OP

- 契约总量：STATE **67** / OP **92**（`tests/target/pages/page-behavior.manifest.json`）
- E4：全部受 `BLK-TOOL-PLAYWRIGHT` + `BLK-TEST-PAGE-DRIVER` 阻断
- 多数 State/OP 的 static_implementation = **UNASSESSED**（未做控件级静态确认，禁止默认 PARTIAL）
- `blocked_cases=229` ≠ 产品缺陷数

## WEB-001

- path: `docs/index.md`
- 观察：含 `releases/latest` 下载枢纽链接（landing_fake_download=true）
- Target: WEB-001, CLAIM-*, FEAT-070/075
