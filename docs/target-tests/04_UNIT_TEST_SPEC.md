# 04 Unit 目标测试规范（TEST-U-001..016 / E1）

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE QA / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

## 1. 范围 / 非范围

负责：纯函数/状态机/编解码/校验/错误映射的目标断言。
不负责：平台 API、射频、时序并发（→E2）。

## 2. 双层模式（关键设计）

每份测试文件两层，**先证明测试有效，再测目标实现**：

1. **参照层（故意错误实现）**：内联一个违反目标的实现，断言"测试能抓住它"→ 必须 PASS；
2. **目标层**：经 `tests/target/lib/import-target.mjs` ESM 桥导入 apps/uniapp 真实模块
   （bundler 工程 .js 源码 → data URL 递归内联 ≤3 层相对依赖；平台全局 uni/wx 可注入）。
   - 模块/接口缺失 → `NOT_IMPLEMENTED: [目标ID] 第一断点: …` FAIL（TP-G2 差距输入）
   - 接口在 → 按目标断言运行（PASS/FAIL 如实）

## 3. 文件 → 测试 ID

| 文件 | TEST ID | 目标接口 |
|---|---|---|
| platform-permission-target | U-001/003/004 | getBlePlatform、requestBleScanPermission（DEC-003 无预取导出） |
| device-name-target | U-006 | resolveDisplayName（name→localName→AD09→AD08→Profile→厂商→未命名·ID尾4） |
| advertisement-target | U-008 | normalizeAdvertisement 三态 |
| device-filter-target | U-007 | filterBleDevices（N/M 口径、空筛选=全集） |
| gatt-codec-target | U-009/010 | validateCharacteristicProperties、validateHexInput（整体拒绝） |
| write-queue-target | U-011 | chunkForMtu（≤mtu-3、尾块保留）、WriteQueue |
| session-state-target | U-005 | createScanSessionController（generation）、mergeDeviceCollection、subscription_count |
| reconnect-state-target | I-003 纯策略 | shouldReconnect（主动断开不重连、有限次） |
| broadcast-payload-target | U-014 | analyzeAdvertisingPayload（31/32、S-38 驱动字段） |
| ota-state-target | U-016 | validateOtaPackage 六项（DEC-016）、parseOtaStatusPayload |
| smart-hid-state-target | U-015 | profile.match 强/弱、八类错误恢复区分度 |
| history-retention-target | REQ-065 | 90 天 TTL、容量裁剪保新 |
| logging-redaction-target | U-013 | redact（密码+token 双遮、关联 ID 保留） |
| version-release-metadata-target | U-002 | buildVersionString（缺失→dev.unknown S-47） |
| public-status-target | U-002 | derivePublicStatus（五词表、无产物 NOT_RELEASED、VERIFIED 证据对） |

## 4. 初跑结论（TP-G1，33 用例：22 PASS / 11 FAIL）

FAIL 全部为诚实差距：display-name/log-redaction/public-status/version-metadata/write-queue/reconnect-policy 模块缺失、validateHexInput/validateOtaPackage/subscription_count 接口缺失、device-filter 无 keyword 目标接口、smart-hid/profile.js 含 TS 语法桥不可载。

## 5. 退出条件

参照层 100% PASS（测试有效性成立）；目标层 FAIL 均带 NOT_IMPLEMENTED 第一断点；未修改业务代码。
