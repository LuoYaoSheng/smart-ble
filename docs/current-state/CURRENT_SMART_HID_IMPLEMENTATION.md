# 当前 Smart HID 实现

```yaml
status: REVIEW
last_reviewed: 2026-09-01
```

| 路径 | 符号 | 备注 |
|---|---|---|
| `apps/uniapp/services/smart-hid/index.js` | `smartHidService` | 会话/配网/诊断 |
| `apps/uniapp/services/smart-hid/profile.js` | profile 常量 | Current FAIL：TS/`as` 语法导致 Node 目标导入失败（TEST-U-015） |
| `apps/uniapp/services/smart-hid/workflow.js` | waiters | 存在 |
| `apps/uniapp/services/smart-hid/known-devices.js` | 历史 | 存在 |
| `apps/uniapp/composables/use-smart-hid-provisioning.js` | 配网向导 | PAGE-002 使用 |
| `apps/uniapp/store/hid.js` | HID store | 存在 |
| `docs/smart-hid/**` | 文档 | 存在 |

真机 Smart HID / ControlHub：本轮 **NOT_EXECUTED**。
