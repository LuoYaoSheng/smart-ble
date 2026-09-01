# 当前 Runtime 实现

```yaml
status: REVIEW
last_reviewed: 2026-09-01
```

## ble-runtime 现存模块

目录：`apps/uniapp/services/ble-runtime/`

| 文件 | 符号 | 备注 |
|---|---|---|
| `index.js` | connect/subscribe/write/read/session | 全局 callback 所有者；无 `subscription_count` 导出 |
| `errors.js` | `normalizeBleError` | 存在 |
| `device-filter.js` | `filterBleDevices` | Current：keyword 目标接口不完整（命中项匹配 FAIL） |
| `device-collection.js` | `mergeDeviceCollection` | 存在 |
| `platform.js` | `getBlePlatform` / 测试注入 | 存在 |
| `advertisement.js` | `normalizeAdvertisement` | 存在 |
| `scan-session.js` | `createScanSessionController` | 存在 |

## 目标模块缺失（Current FAIL）

| 目标路径 | 状态 | 关联 |
|---|---|---|
| `.../display-name.js` | 不存在 | TEST-U-006 / FEAT-013 |
| `.../log-redaction.js` | 不存在 | TEST-U-013 |
| `.../write-queue.js` | 不存在 | TEST-U-011 |
| `.../reconnect-policy.js` | 不存在 | FEAT-023/024 |
| `apps/uniapp/services/public-status.js` | 不存在 | 五词表 |
| `apps/uniapp/services/version-metadata.js` | 不存在 | VERSION 投影 |
| 仓库根 `VERSION` | 不存在 | REQ-004/056 |

## OTA

- 文件：`apps/uniapp/utils/ota_manager.js` → `OtaManager`
- `OTA_UUIDS.CHAR_CTRL` **已定义**，**从未写入**
- 实际流程：setMtu → subscribe STATUS → 循环写 CHAR_DATA → 等 success
- 固件 `OtaControlCallbacks` 要求 CTRL `start`/`commit`/`abort`
- 第一断点：客户端未写 CHAR_CTRL start

## 连接 / 会话

- Current FAIL：`connectDevice` 未编排服务发现（半开泄漏面）
- Current FAIL：Registry 无配网会话分类 → PAGE-007 无法排除

## 广播

- `use-broadcast-session.js` 未被 PAGE-008 引用；页面内联起停逻辑
