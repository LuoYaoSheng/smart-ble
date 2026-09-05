# Native Platform Prototype Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make native iOS, native macOS, Kotlin Android, Flutter, and uni-app implement the same BLE Toolkit+ product defined by the canonical prototype, including all active pages P001/P002/P003/P005/P006/P007/P008/P009/P010 and the same observable behavior.

**Architecture:** `docs/specs/README.md` and its PAGE/FLOW/STATE documents remain the product authority. Native Apple apps share a small Swift package for Smart HID protocol, framing, status mapping, and recovery semantics; BLE APIs and UI remain platform adapters. Kotlin, Dart, and JavaScript keep idiomatic implementations but must pass the same cross-language contract vectors and page acceptance IDs.

**Tech Stack:** Swift 5.9/SwiftUI/AppKit/CoreBluetooth, Kotlin/Jetpack Compose/Android BLE, Dart/Flutter, JavaScript/Vue/uni-app, ESP-IDF, XCTest, JUnit, Flutter Test, Node tests.

---

## Non-negotiable product contract

- Active pages are P001, P002, P003, P005, P006, P007, P008, P009, and P010. P004 remains removed and must not reappear as local history.
- Every implementation uses the same page names, primary actions, empty/error states, recovery actions, and Chinese product copy unless a documented platform convention requires a presentation-only difference.
- Smart HID V1 uses INFO `1002`, INPUT `1003` plain write, STATUS `1004`, framed-v1, 60-second terminal wait, eight stable error codes, and no SMP/bonding/system pairing prompt.
- A page counts complete only when its real adapter is wired and its success/failure behavior is tested. Static mock UI alone is not completion.
- Platform differences are allowed only for permissions, scanner/camera presentation, share/open-link mechanism, window chrome, and OS-owned UI; they must be recorded in `docs/specs/10_platform/`.
- Each implementation reports `PASS / FAIL / BLOCKED / NOT_RUN`; build success cannot stand in for physical BLE acceptance.

## Delivery order

1. ✅ Windows hardware gate completed on 2026-09-05: Flutter Android + real ESP32 V1 zero-SMP, T2–T7, and a second Huawei phone passed (`28dcc3f`, `1b793ca`, `dde3b77`, `bb9d08e`; firmware fix `Smart-HID-Workspace/78bc4ef`).
2. Native iOS: add missing Smart HID and version pages on Mac, then test simulator and physical iPhone.
3. Kotlin Android: add the same missing pages, then test on the Windows Android phone and the same ESP32.
4. Flutter: split/complete partial P003/P005/P010 coverage without changing the already-working P002 contract.
5. Native macOS and uni-app: retain full page coverage and rerun conformance after shared-core extraction.

The next implementation entrypoint is Task 1, followed by Task 2 and native iOS Tasks 3–4. Windows can continue Kotlin Android Task 5 in parallel only from the same updated `refactor/uniapp-v1` baseline; no long-lived platform branch becomes a second product line.

### Task 1: Freeze reusable cross-language contract vectors

**Files:**
- Create: `core/protocols/smart-hid-v1-vectors.json`
- Create: `scripts/check-platform-parity.mjs`
- Modify: `scripts/check-smart-hid-contract.mjs`
- Test: `tests/unit/platform-parity-contract.test.mjs`

1. Add vectors for UUIDs, QR parsing, candidate JSON, MTU-to-chunk mapping, frame boundaries, INFO identity validation, state/step row mapping, and eight error-to-recovery mappings.
2. Make the checker inspect Dart, Swift, Kotlin, and JavaScript constants without treating comments as evidence.
3. Add a failing test for a deliberately mismatched vector fixture.
4. Run `node tests/unit/platform-parity-contract.test.mjs`; expected PASS after implementation.
5. Run `./scripts/verify-uniapp.sh`; expected all gates PASS.

### Task 2: Extract shared Apple Smart HID core

**Files:**
- Create: `core/apple/SmartHidCore/Package.swift`
- Create: `core/apple/SmartHidCore/Sources/SmartHidCore/SmartHidProtocol.swift`
- Create: `core/apple/SmartHidCore/Sources/SmartHidCore/SmartHidFraming.swift`
- Create: `core/apple/SmartHidCore/Sources/SmartHidCore/SmartHidState.swift`
- Create: `core/apple/SmartHidCore/Tests/SmartHidCoreTests/SmartHidCoreTests.swift`
- Modify: `apps/desktop/macos/SmartBLE-mac/Package.swift`
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/Core/HidProvisionManager.swift`
- Modify: `apps/ios/Package.swift`
- Modify: `apps/ios/project.yml`

1. Port the already-tested pure logic from the AppKit `HidProvisionManager` into the local Swift package without CoreBluetooth or UI imports.
2. Add XCTest vectors before switching consumers.
3. Migrate AppKit to the shared package and preserve its 62 assertions and 17 page-smoke results.
4. Add the package dependency to the SwiftUI package and generated Xcode project.
5. Run `swift test` in `core/apple/SmartHidCore`; expected all tests PASS.
6. Run the native macOS unit/page smoke commands; expected no regression.

### Task 3: Implement native iOS P002 Smart HID provisioning

**Files:**
- Create: `apps/ios/Sources/Manager/HidProvisionManager.swift`
- Create: `apps/ios/Sources/Views/ProvisioningView.swift`
- Modify: `apps/ios/Sources/Manager/BLEManager.swift`
- Modify: `apps/ios/Sources/Views/ScanView.swift`
- Modify: `apps/ios/Sources/Views/Components/DeviceCard.swift`
- Modify: `apps/ios/Sources/Views/ContentView.swift`
- Test: `apps/ios/Tests/SmartBLETests/HidProvisionManagerTests.swift`

1. Add failing tests for identity mismatch, plain INPUT write, frame order, timeout, disconnect, and all eight recovery mappings.
2. Add Profile detection with UUID STRONG and `SHID-` WEAK match while preserving the normal GATT entry.
3. Add the second device-card action “配置 Smart HID”.
4. Implement P002 phases: connect/verify, Wi-Fi + ControlHub QR form, and four-row status.
5. Keep token/password in memory only and clear them on confirmed leave/dispose.
6. Never call pairing/bond APIs; authentication errors produce the legacy-firmware reflash message after one write.
7. Build for simulator and physical iPhone; verify the permission, QR fallback, failure, disconnect, and READY states against the prototype.

### Task 4: Implement native iOS P003, P005, and P010

**Files:**
- Create: `apps/ios/Sources/Views/HidDeviceDetailView.swift`
- Create: `apps/ios/Sources/Views/HidDiagnosticsView.swift`
- Create: `apps/ios/Sources/Views/VersionHistoryView.swift`
- Modify: `apps/ios/Sources/Views/ConnectedDevicesView.swift`
- Modify: `apps/ios/Sources/Views/AboutView.swift`
- Test: `apps/ios/Tests/SmartBLETests/NativePageContractTests.swift`

1. Route a Smart HID connected card to P003 and a generic card to P006.
2. Implement P003 session snapshot and the reconfigure/diagnostics/GATT actions.
3. Implement P005 five checks with owned/borrowed session cleanup and stale-generation protection.
4. Add P010 from the same release metadata used by other apps; no hard-coded fake version claims.
5. Add screenshot and accessibility checks for all nine active pages on the simulator.
6. Install and launch the signed app on the physical iPhone; run the real BLE checklist when the phone is physically unlocked.

### Task 5: Implement Kotlin Android Smart HID pages

**Files:**
- Create: `apps/android/app/src/main/java/com/smartble/core/profile/SmartHidProtocol.kt`
- Create: `apps/android/app/src/main/java/com/smartble/core/profile/HidProvisionManager.kt`
- Create: `apps/android/app/src/main/java/com/smartble/ui/screen/ProvisioningScreen.kt`
- Create: `apps/android/app/src/main/java/com/smartble/ui/screen/HidDeviceDetailScreen.kt`
- Create: `apps/android/app/src/main/java/com/smartble/ui/screen/HidDiagnosticsScreen.kt`
- Create: `apps/android/app/src/main/java/com/smartble/ui/screen/VersionHistoryScreen.kt`
- Modify: `apps/android/app/src/main/java/com/smartble/ui/MainActivity.kt`
- Modify: `apps/android/app/src/main/java/com/smartble/ui/components/DeviceCard.kt`
- Test: `apps/android/app/src/test/java/com/smartble/core/profile/SmartHidProtocolTest.kt`

1. Drive protocol/framing/state code from the shared vectors and make JUnit fail on drift.
2. Add the same Profile double entry and P002/P003/P005/P010 routes as iOS/uni-app/AppKit.
3. Keep Android permission handling as an adapter-only difference.
4. Confirm V1 no-SMP behavior with a single write and no system pairing prompt.
5. Run with Android Studio JBR 21: `./gradlew assembleDebug testDebugUnitTest`.
6. On Windows, install on the attached Android phone and execute the same ESP32 scenario matrix used by Flutter.

### Task 6: Complete Flutter partial page coverage

**Files:**
- Create or split: `apps/flutter/lib/ui/pages/hid_device_detail_page.dart`
- Create or split: `apps/flutter/lib/ui/pages/hid_diagnostics_page.dart`
- Create: `apps/flutter/lib/ui/pages/version_history_page.dart`
- Modify: `apps/flutter/lib/ui/pages/device_list_page.dart`
- Modify: `apps/flutter/lib/ui/pages/connected_devices_page.dart`
- Modify: `apps/flutter/lib/ui/pages/about_page.dart`
- Test: `apps/flutter/test/ui/page_contract_test.dart`

1. Preserve existing controllers; move only page presentation/routing needed to make P003/P005/P010 independently reachable.
2. Match prototype hierarchy, copy, empty/error states, and primary actions.
3. Add route/page widget tests and rerun `flutter analyze && flutter test`.
4. Build macOS and Android from the same commit; do not introduce platform-only product semantics.

### Task 7: Full parity and physical acceptance gate

**Files:**
- Modify: `docs/specs/09_test/CROSS_IMPLEMENTATION_PARITY_MATRIX.md`
- Modify: `verification/macos-mobile-v1/20260905-mac-a1/README.md`
- Modify: Windows E13/E14 evidence under `verification/windows-mobile-v1/20260904-win-b1/`

1. Capture all nine active pages for U-WX, U-AND, F-AND/F-MAC, N-MAC, N-IOS, and K-AND.
2. Run protocol vectors, build/unit suites, and page smoke on every implementation.
3. Run real Android + ESP32 provisioning on Windows and real iPhone + ESP32 provisioning when the iPhone is physically available.
4. Mark hardware-only items BLOCKED when fixtures are absent; never infer them from simulator results.
5. Update every matrix cell with an evidence path and close the gate only when no required page remains `✕` or unexplained `△`.
