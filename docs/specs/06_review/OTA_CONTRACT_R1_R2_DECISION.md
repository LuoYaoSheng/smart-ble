# OTA 契约对齐决策（R-1 / R-2）· 2026-09-10

```yaml
status: R-2 已按缺陷修复；R-1 采用方案 A（App 对齐冻结契约），如需改契约走正式正典变更
author: Mac 收尾轮（docs/plans/2026-09-10-mac-closeout-dev-plan.md Task 2/3）
evidence: CoreUnit CU-56..CU-66；固件代码 hardware/esp32/LightBLE/src/ota_server.cpp
```

## 事实链（代码级）

1. **契约正典已冻结**：`contracts/target/ota-package.schema.json` 规定 manifest 六字段——
   `format_version`、`target`（**枚举：`lightble-peripheral` | `lightble-observer`**）、`hardware`、
   `firmware_version`（SemVer）、`size`、`sha256`。
2. **固件按契约实现**：`ota_server.cpp:207-244` handleStart 校验链——`target` 空 → `missing_target`；
   非枚举 → `invalid_target`；`target_version` 空 → `missing_target_version`；sha256 非法 → `invalid_sha256`。
3. **App 侧偏离（R-1）**：macOS `OtaManager` start 帧发 `"target": manifestVersion ?? fileName ?? "unknown"`
   ——把**版本号当 target**，且**根本不带 `target_version` 字段**；manifest 解析白名单只有
   `version/size/sha256`（连契约的 `firmware_version` 键都不读，靠 legacy `version` 兜底）。
   真固件必然 `invalid_target` 拒绝。
4. **App 侧缺陷（R-2）**：固件 BLE STATUS 帧为 `{"type":"ota","status":"ready|error|success|aborted"}`；
   App 旧 `handleStatus` 在 JSON 分支按**整值精确匹配**关键词集合，`"failed"`（serial 事件态）与
   `"aborted"`（BLE abort 通知，`ota_server.cpp:280`）都不含 `error`/`fail` 整值 → 静默忽略 → 失败拖成 30s 超时。

## R-2：直接按缺陷修复（无需决策）

错误帧漏检不构成"两种合理契约"的分歧，属于实现 bug：抽出 `OtaStatusClassifier` 纯逻辑，JSON/文本
统一**子串匹配**（`ready/success/ok/error/fail/abort`），阶段门控口径不变。CU-56..62 断言固件真实帧。

## R-1：方案对比

| 方案 | 内容 | 影响 | 结论 |
|---|---|---|---|
| **A（采纳）** | App 对齐冻结契约：manifest 解析读契约六字段（`target` 枚举强校验、`firmware_version` SemVer，legacy `version` 兼容保留）；start 帧发 `op/target/target_version/size/chunk_size/sha256`；无 manifest 时不伪造枚举（省略 target/target_version，真固件会以 `missing_target` 诚实拒绝，日志注明） | 不动契约与固件；App 与 Phase 7 真固件即可互通 | **采纳**：schema 已是冻结正典、固件已按其实现，App 是三方中唯一偏离者 |
| B | 改固件放宽 target（接受版本号等自由值） | 破坏冻结契约 schema，需正典变更流程 + 固件重烧 + 三线（uniapp/flutter）同步改 | 否决：为一个偏离方重写正典，成本与方向都不合理 |

iOS 侧同轮对齐（`action`→`op`、补 `target/target_version/sha256`，见 Task 4）。

## 验证

- `swift run SmartBLE-mac --unit-core`：CU-56..66（分类器 7 例 + start 帧 4 例）全绿。
- 真固件端到端仍按 P-03 BLOCKED 口径，待 Phase 7 ESP32 烧录后转正——本决策只保证**协议帧形状一致**。
