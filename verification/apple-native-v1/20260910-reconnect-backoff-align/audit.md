# F012 重连退避契约对齐（N-IOS）· 2026-09-10

## 结论

iOS BLEManager 被动断线自动重连的退避 `nextAttempt * 2`（2s/4s/6s）与冻结契约不一致，本次对齐为
**1s/3s/5s ×3**（API_SPEC C-8 / SM §2），并加常量断言单测钉住。macOS 端 `reconnectBackoffs=[1.0,3.0,5.0]`
本来就对齐，无需改动。回归全绿：iOS 单测 24/24、UI 套件 12/12。

## 正典依据（五处冻结文档一致）

- `docs/specs/08_development/API_SPEC.md` C-8：重连 **1s/3s/5s，最多 3 次**；耗尽→FAILED→手动重试 ×3（SM §2 · BR-08）
- `docs/specs/08_development/RUNTIME_ARCHITECTURE.md` §137/§174：重连 backoff 1s/3s/5s（初始化退避才是 1s/2s/4s）
- `docs/specs/08_development/FEATURE_IMPLEMENTATION_MATRIX.md` §246：ble-runtime —— 重连 3×（1s/3s/5s）backoff
- `docs/specs/01_reverse/REVERSE_ANALYSIS.md` §131/§534：ble-runtime 重连 3 次上限 backoff 1s/3s/5s，USER_REQUEST 永不重连
- uniapp 原工程源码 `apps/uniapp/services/ble-runtime/reconnect-policy.js:9`：`BACKOFF_MS = Object.freeze([1000, 3000, 5000])`

## 偏差来源（为什么 iOS 会是 2/4/6）

- uniapp 原工程存在**两层重连**：ble-runtime 服务层（1/3/5，上述冻结契约的出处）+ 页面 composable
  `apps/uniapp/composables/use-device-session.js:134`（`count*2000` = 2/4/6，挂在 onDisconnect 上）。
- Flutter 线移植时取了页面层常数：`lib/core/ble/ble_manager.dart:306` `Duration(seconds: nextAttempt * 2)`，
  已被登记为**已知偏差 FEAT-F-005**（见下）。
- iOS BLEManager 是从 Flutter 移植的（原注释自述 "aligned with Flutter"），`nextAttempt * 2` 与 Flutter
  逐字同源，等于把 FEAT-F-005 一并带了过来——Phase 3 复盘记录的「退避常数 2/4/6 vs 1/3/5 分歧」即此。

### FEAT-F-005 在册记录（Flutter 线，待 M3 修，本次不触碰该工程）

- `docs/specs/09_test/CROSS_IMPLEMENTATION_PARITY_MATRIX.md` §3 门控行 + 记分行（"backoff 2/4/6s ≠ 1/3/5s（M3 修）"）
- `docs/specs/09_test/WINDOWS_MOBILE_V1_TEST_MATRIX.md` MOB-DISC-001（"Flutter 现状 2/4/6s 为偏差 FEAT-F-005"）
- `docs/specs/06_review/FLUTTER_PRODUCT_GAP_AUDIT.md` #9（CONFIRMED，含源码定位）
- `docs/specs/08_development/FLUTTER_REUSE_MATRIX.md` §45（重构指引已写明 backoff 2/4/6→1/3/5）

## 改动

| 文件 | 改动 |
| --- | --- |
| `apps/ios/Sources/Manager/BLEManager.swift` | T06 区新增 `static let reconnectBackoffSchedule: [TimeInterval] = [1.0, 3.0, 5.0]`；`attemptReconnect` 的 `delay = Double(nextAttempt * 2)` → `delay = Self.reconnectBackoffSchedule[nextAttempt - 1]`（guard `attempts < maxReconnectAttempts(3)` 保证下标安全）；注释改为契约引用 |
| `apps/ios/Tests/SmartBLETests/NativePageContractTests.swift` | 新增 `testReconnectBackoffScheduleMatchesFrozenContract`：断言 schedule == [1.0, 3.0, 5.0]，防止再漂移 |

机制语义不变：最多 3 次、用户主动断开永不重连（`userInitiatedDisconnects`）、逐次调度 Timer。
仅常数对齐；无新文件（不需要 xcodegen regenerate）。

## 验证

- iOS 单测（SmartBLETests，含新契约断言）：**24/24 PASS，0 failures**（`ios-unit.log`）
- iOS UI 全量套件（SmartBLEUITests）：**12/12 PASS**（`ios-ui-suite.log`）
- macOS 不涉及本次改动，不重跑（其 1/3/5 由 UIS-18 退避日志断言在案）

诚实口径：iOS 侧 F012 仍是**测试层验证**（模拟器）；真无线电重连实证在 macOS（Phase2/UIS-18）。
iOS 真机重连环未被本次重跑，历史 Phase 2 证据里的退避时序为旧常数，机制结论不受影响。

## 复现命令

```bash
cd apps/ios
xcodebuild test -project SmartBLE.xcodeproj -scheme SmartBLEiOS \
  -destination 'platform=iOS Simulator,id=807B4008-57AB-4056-851F-98F8D7274086' \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/SmartBLE-fntgpymnayxuohcocafobrwjxnhp \
  -only-testing:SmartBLETests        # 24/24
xcodebuild test … -only-testing:SmartBLEUITests   # 12/12
```
