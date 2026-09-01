# 当前页面实现

```yaml
status: REVIEW
last_reviewed: 2026-09-01
```

路由登记：`apps/uniapp/pages.json`。

| Target | 路径 | 关键符号 | 调用链摘要 | 数据来源 | 当前测试 | 证据等级 | 真机运行 |
|---|---|---|---|---|---|---|---|
| PAGE-001 | `apps/uniapp/pages/index/index.vue` | `useBleScan`, DeviceCard, FilterPanel | 页→composable→Store→ScanSession→Runtime | 适配器/权限/发现事件 | TEST-P-001 定义完整；E4 BLOCKED_BY_TOOLCHAIN | E4/E5 | NOT_EXECUTED |
| PAGE-002 | `apps/uniapp/pages/hid/add.vue` | `useSmartHidProvisioning` | 配网向导 | HID store / smartHidService | 定义完整；E4 blocked | E5 | NOT_EXECUTED |
| PAGE-003 | `apps/uniapp/pages/hid/detail.vue` | `useHidStore`, hid-navigation | 历史快照展示 | DATA-006 本地 | 定义完整；E4 blocked | E4 | NOT_EXECUTED |
| PAGE-004 | `apps/uniapp/pages/hid/history.vue` | `useHidStore` | 列表/移除 | 本地历史 | 定义完整；E4 blocked | E4 | NOT_EXECUTED |
| PAGE-005 | `apps/uniapp/pages/hid/diagnostics.vue` | `smartHidService` | 诊断五项 | 实时 BLE | 定义完整；E4 blocked | E5 | NOT_EXECUTED |
| PAGE-006 | `apps/uniapp/pages/device/detail.vue` | `useDeviceSession`, OtaDialog | Runtime session + OTA UI | GATT/OTA | OTA 客户端缺 CTRL；E4 blocked | E5 | NOT_EXECUTED |
| PAGE-007 | `apps/uniapp/pages/connected/index.vue` | `useBleStore`, disconnect helpers | Registry 会话列表 | Runtime Registry | 缺配网会话排除接口（Current FAIL） | E5 | NOT_EXECUTED |
| PAGE-008 | `apps/uniapp/pages/broadcast/index.vue` | 内联 advertising；`wx-peripheral-*` | **未**使用 `useBroadcastSession` | 平台 Peripheral API | Observer 证据缺失；E4 blocked | E5 | NOT_EXECUTED |
| PAGE-009 | `apps/uniapp/pages/about/index.vue` | `config/product.js` | 关于信息 | product 配置 | version SSOT 缺失 | E6 | NOT_EXECUTED |
| PAGE-010 | `apps/uniapp/pages/about/version.vue` | 硬编码 `versionHistory` | 无 Metadata 投影 | 手写数组（首项 v1.0.5） | Current/目标不符 | E6 | NOT_EXECUTED |
| WEB-001 | `docs/index.md` | Download Hub CTA | VitePress 静态页 | 文案手写 + GitHub latest | 假主下载 FAIL | E6 | docs:build PASS |

备注：`composables/use-broadcast-session.js` 存在但页面未引用。
