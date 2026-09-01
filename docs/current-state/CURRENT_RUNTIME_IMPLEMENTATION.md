# 当前 Runtime 实现盘点（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: be493664f40cc23efd4418ab4df5f8cdba44cb398786586fd9d5ed5373c07074
```

## 模块树（path 事实）

目录：`apps/uniapp/services/ble-runtime/`

| 文件 | 存在 | 关联 Target | 备注 |
|---|---|---|---|
| index.js | 是 | FEAT-011/012, DEC-017 | Registry 快照；subscription_count 见 CURRENT FAIL TEST-U-005 |
| advertisement.js | 是 | FEAT-017, TEST-U-008 | CURRENT 有 PASS |
| device-filter.js | 是 | FEAT-014, TEST-U-007 | CURRENT FAIL：命中项匹配关键词 |
| device-collection.js | 是 | UNASSESSED 细项 | |
| scan-session.js | 是 | FLOW-002 | |
| platform.js | 是 | | |
| errors.js | 是 | ERR-* | |
| display-name.js | **否** | FEAT-013, TEST-U-006 | NOT_IMPLEMENTED |
| log-redaction.js | **否** | FEAT-040, TEST-U-013 | NOT_IMPLEMENTED |
| write-queue.js | **否** | FEAT-030, TEST-U-011 | NOT_IMPLEMENTED |
| reconnect-policy.js | **否** | FEAT-023/024, TEST-I-003 | NOT_IMPLEMENTED |

## OTA

- path: `apps/uniapp/utils/ota_manager.js`
- symbol: `OtaManager`
- line_hint: CHAR_CTRL / CHAR_DATA / CHAR_STATUS UUID 已定义
- 事实：结构化 CURRENT FAIL — **OtaManager 在第一个 DATA 写之前未发送 CTRL start**
- validateOtaPackage：缺失（FEAT-081 / PROTO-011 / DEC-016）
- Target: FEAT-046..052, FLOW-009, TEST-I-008

## 其他服务

- `apps/uniapp/services/public-status.js`：**缺失**（TEST-U-002）
- `apps/uniapp/services/version-metadata.js`：**缺失**（TEST-U-002 / TEST-R-001）
- 根 `VERSION`：**缺失**

## Runtime 差距记录数

报告 runtime.json records = 36
