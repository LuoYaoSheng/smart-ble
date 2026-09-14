# MAC-002 证据：根级验证与元数据门禁恢复全绿

- Host: macOS (Node 24.12 / Xcode / JDK 17 / Flutter / Gradle 8.2 / cargo)
- Commit: 764d8e9 + 本提交

## 命令与结果（2026-09-14）

| 命令 | 结果 |
|---|---|
| `./scripts/verify-uniapp.sh` | PASS（26 unit files + 14 static gates） |
| `cd apps/flutter && flutter pub get && flutter analyze && flutter test` | analyze 0 issues；122/122 tests |
| `bash scripts/android/verify-android.sh`（ANDROID_HOME 自动兜底） | jdk=temurin-17；assembleDebug + testDebugUnitTest BUILD SUCCESSFUL |
| `make verify-apple-core` | SmartHidCore swift test 32/32 |
| `make verify-apple-ios` | xcodebuild test（iPhone 17 Pro Max 模拟器）TEST SUCCEEDED（SmartBLETests + 12 XCUITest） |
| `make verify-apple-macos` | swift build Build complete |
| `make verify-tauri` | cargo check Finished |
| `node --test tests/desktop/*.test.mjs` | 95/95 pass |
| `node scripts/generate-release-metadata.mjs --check` | PASS（9 产物零漂移） |
| `node scripts/verify-target.mjs --mode=all --format=json` | SYSTEM 408/408 · HARNESS 108/108 · CURRENT 544/544 · exit 0 |

## 修复内容

1. `scan-permission.js`：可注入平台面（`setScanPermissionPlatformForTesting`），
   消除裸 `uni` 引用在 Node 的 ReferenceError；适配器打开始终走 ble-runtime 平台缝。
   授权拒绝（auth deny/10006/10007）优先于蓝牙关闭（10001）映射。
2. 权限测试重写：unit 5 用例 + 集成 4 用例（App/H5 语义；微信授权面不再出现）。
3. 删除微信 Peripheral 测试三文件（MAC-001 路线 B 的测试面收口）。
4. `fake-runtime.mjs`：修复 `failNext('openBluetoothAdapter')` 先 delete 后取值
   导致失败载荷丢失的库级 bug。
5. `check-uniapp-assets.mjs`：编译资产门禁 mp-weixin → h5。
6. `Makefile`：`verify-apple` = Core swift test + iOS Xcode test + 原生 macOS build；
   `verify-android` 经 `scripts/android/verify-android.sh` 固定 JDK 17/21
   （java_home 版本回退坑已实测校验）。
7. release 元数据 9 产物重生成（消除 latest.json 漂移）。
8. `tests/desktop/version-metadata` 平台断言 4→3 键（Windows 写锁协调项：Mac 按
   MAC-001 正典结论机械更新，WIN-002 拉取后复核）。

## Observations

- Windows 写锁区（tests/desktop）的机械修订已按协议登记；WIN-002 应在拉取后复核。
- iOS 模拟器测试时长 ~268s（XCUITest 12 项含等待）。
