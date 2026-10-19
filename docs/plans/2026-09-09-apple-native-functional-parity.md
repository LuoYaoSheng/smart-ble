# Apple Native Functional Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the pure-native macOS AppKit and iOS SwiftUI implementations of BLE Toolkit+, with shared Smart HID behavior and native UI that faithfully matches the repository HTML prototypes.

**Architecture:** A local `SmartHidCore` Swift package owns protocol constants, QR/candidate parsing, framed-v1 encoding, status-row mapping, and recovery semantics without importing AppKit, SwiftUI, Combine, or CoreBluetooth. The macOS and iOS apps keep independent native CoreBluetooth adapters and native UI layers. The iOS visual target is `docs/specs/prototype/platform/app/high-fi/`; the macOS target is `docs/specs/prototype/platform/desktop/high-fi/`.

**Tech Stack:** Swift 5.9, Swift Package Manager, XCTest, AppKit, SwiftUI, Combine, CoreBluetooth, XcodeGen, Xcode/iOS Simulator.

---

## Delivery rules

- Functionality is implemented and verified before visual-polish work begins.
- Active pages are P001, P002, P003, P005, P006, P007, P008, P009, and P010. P004 must remain absent.
- The HTML prototypes are the visual and interaction source; no WebView and no alternate Apple-only product design.
- Shared Core contains no UI framework or Bluetooth framework imports.
- Smart HID V1 remains no-SMP: INFO `1002`, INPUT `1003`, STATUS `1004`, framed-v1, 60-second wait, and the canonical eight recovery mappings.
- Simulator/build success is E2/E3 evidence only. Real BLE PASS requires a physical iPhone/Mac and fixture evidence.
- Each task gets focused tests and a focused commit. Do not mix unrelated Windows-host changes into this branch.

### Task 1: Establish the Swift Smart HID contract package

**Files:**
- Create: `core/apple/SmartHidCore/Package.swift`
- Create: `core/apple/SmartHidCore/Sources/SmartHidCore/SmartHidFraming.swift`
- Create: `core/apple/SmartHidCore/Sources/SmartHidCore/SmartHidProtocol.swift`
- Create: `core/apple/SmartHidCore/Sources/SmartHidCore/SmartHidState.swift`
- Create: `core/apple/SmartHidCore/Tests/SmartHidCoreTests/SmartHidCoreTests.swift`
- Read: `core/protocols/smart-hid-v1-vectors.json`

1. Add failing XCTest cases that load the repository vector file and cover constants, QR parsing, candidate JSON, MTU/chunk sizing, frame bytes, Device Info, STATUS, row mapping, and recovery actions.
2. Run `cd core/apple/SmartHidCore && swift test`; expected initial FAIL because the module does not exist.
3. Implement only pure Foundation logic needed by the vectors.
4. Run `swift test`; expected PASS with all vector cases executed.
5. Run `node scripts/check-platform-parity.mjs`; expected PASS including Swift source inspection after the checker is extended in a later focused change if required.
6. Commit: `feat(apple): add shared Smart HID protocol core`

### Task 2: Migrate native macOS to SmartHidCore

**Files:**
- Modify: `apps/desktop/macos/SmartBLE-mac/Package.swift`
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/Core/HidProvisionManager.swift`
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/Core/CoreUnit.swift`
- Test: `core/apple/SmartHidCore/Tests/SmartHidCoreTests/SmartHidCoreTests.swift`

1. Add the local package dependency and import `SmartHidCore`.
2. Delete the duplicate `HidFraming` and `HidProtocol` definitions from the AppKit app.
3. Keep only BLE session ownership, timers, Combine bindings, and CoreBluetooth-facing orchestration in `HidProvisionManager`.
4. Update CoreUnit assertions to call the shared module and correct any behavior that conflicts with the canonical vectors.
5. Run `swift build` and `swift run SmartBLE-mac --unit-core`; expected all existing assertions PASS.
6. Run `swift run SmartBLE-mac --smoke-pages`; expected all page smoke checks PASS.
7. Commit: `refactor(macos): consume shared Smart HID core`

### Task 3: Wire SmartHidCore into native iOS

**Files:**
- Modify: `apps/ios/Package.swift`
- Modify: `apps/ios/project.yml`
- Regenerate: `apps/ios/SmartBLE.xcodeproj/project.pbxproj`
- Create: `apps/ios/Tests/SmartBLETests/HidProvisionManagerTests.swift`

1. Add the local package dependency to SwiftPM and XcodeGen.
2. Add an iOS test target in `project.yml` with the application as host where needed.
3. Run `xcodegen generate --spec project.yml --project .`.
4. Add a compile test that imports `SmartHidCore` from both SwiftPM and Xcode test paths.
5. Run `swift build` and an iOS Simulator `xcodebuild`; expected PASS.
6. Commit: `build(ios): wire shared Smart HID core and tests`

### Task 4: Implement the iOS Smart HID BLE adapter

**Files:**
- Create: `apps/ios/Sources/Manager/HidProvisionManager.swift`
- Modify: `apps/ios/Sources/Manager/BLEManager.swift`
- Modify: `apps/ios/Sources/Models/BLEModels.swift`
- Modify: `apps/ios/Sources/Models/BLEUuids.swift`
- Test: `apps/ios/Tests/SmartBLETests/HidProvisionManagerTests.swift`

1. Write failing tests for identity mismatch, successful verification, frame ordering, timeout, cancellation, disconnect, stale callback generation, and all eight recovery actions.
2. Add Profile STRONG matching by service UUID and WEAK matching by `SHID-` name prefix.
3. Add INFO/STATUS notification routing keyed by device ID and characteristic UUID.
4. Implement the three functional phases: connect/verify, configure/send, and wait/terminal.
5. Preserve credentials only in memory and clear them on confirmed leave/dispose.
6. Never invoke pairing/bond APIs; authorization errors surface the legacy-firmware guidance.
7. Run SwiftPM and Simulator tests; expected PASS.
8. Commit: `feat(ios): implement native Smart HID BLE workflow`

### Task 5: Implement iOS P002 functionality with HTML-aligned structure

**Files:**
- Create: `apps/ios/Sources/Views/ProvisioningView.swift`
- Modify: `apps/ios/Sources/Views/ScanView.swift`
- Modify: `apps/ios/Sources/Views/Components/DeviceCard.swift`
- Modify: `apps/ios/Sources/Views/ContentView.swift`
- Reference: `docs/specs/prototype/platform/app/high-fi/pages/p002-provision.js`
- Reference: `docs/specs/prototype/platform/app/high-fi/assets/pages.css`

1. Add a second Smart HID card action while retaining normal GATT entry.
2. Implement P002 navigation and the three product phases.
3. Match the HTML information hierarchy from the start: navbar, stepper, form cards, scan/paste action, progress rows, error banner, and terminal actions.
4. Keep styling minimal until the functional Gate; do not invent alternate copy or state presentation.
5. Add tests for entry routing, leave confirmation, QR paste fallback, submit validation, error recovery, and success redirect.
6. Run Simulator tests and build; expected PASS.
7. Commit: `feat(ios): add native Smart HID provisioning page`

### Task 6: Implement iOS P003, P005, and P010 functionality

**Files:**
- Create: `apps/ios/Sources/Views/HidDeviceDetailView.swift`
- Create: `apps/ios/Sources/Views/HidDiagnosticsView.swift`
- Create: `apps/ios/Sources/Views/VersionHistoryView.swift`
- Modify: `apps/ios/Sources/Views/ConnectedDevicesView.swift`
- Modify: `apps/ios/Sources/Views/AboutView.swift`
- Create: `apps/ios/Tests/SmartBLETests/NativePageContractTests.swift`
- Reference: `docs/specs/prototype/platform/app/high-fi/pages/p003-hid-detail.js`
- Reference: `docs/specs/prototype/platform/app/high-fi/pages/p005-diagnostics.js`
- Reference: `docs/specs/prototype/platform/app/high-fi/pages/p010-versions.js`

1. Route connected Smart HID devices to P003 and generic devices to P006.
2. Implement P003 session snapshot and reconfigure/diagnostics/GATT actions.
3. Implement P005 five checks, owned/borrowed session cleanup, retry, error visibility, and stack-aware exits.
4. Implement P010 from release metadata; do not hard-code release claims.
5. Add route and state tests for all entry/exit paths.
6. Run SwiftPM and Simulator tests; expected PASS.
7. Commit: `feat(ios): complete native Smart HID detail diagnostics and versions`

### Task 7: Apple native functional Gate

**Files:**
- Modify: `docs/specs/09_test/CROSS_IMPLEMENTATION_PARITY_MATRIX.md`
- Create: `verification/apple-native-v1/20260909-mac-a2/functional-summary.md`

1. Run shared Core tests, macOS build/CoreUnit/PageSmoke, iOS SwiftPM build, and iOS Simulator tests.
2. Verify all nine active pages are reachable and P004 is absent.
3. Exercise real Mac BLE paths when a fixture is available.
4. Exercise iPhone BLE paths only on a physical unlocked phone; otherwise mark E5 rows BLOCKED, not PASS.
5. Record exact commands, commit, device identifiers, OS versions, first breakpoints, and evidence paths.
6. Commit: `test(apple): record native functional parity gate`

### Task 8: Match native UI to the HTML prototypes

**Files:**
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/Core/DSTokens.swift`
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/UI/Kit.swift`
- Modify: `apps/desktop/macos/SmartBLE-mac/Sources/UI/Pages/*.swift`
- Create: `apps/ios/Sources/Design/DesignTokens.swift`
- Create: `apps/ios/Sources/Views/Components/App*.swift`
- Modify: `apps/ios/Sources/Views/*.swift`
- Reference: `docs/specs/prototype/platform/desktop/high-fi/`
- Reference: `docs/specs/prototype/platform/app/high-fi/`

1. Freeze HTML-to-native token mappings for color, type, spacing, radius, shadow, status, icons, and illustration slots.
2. Capture each HTML reference state at the same viewport used for native screenshots.
3. Align pages in dependency order: global shell, P001, P006, P007, P008, P002, P003, P005, P009, P010.
4. Preserve native permission sheets, share sheets, QR scanner, window chrome, and navigation gestures as documented OS-owned differences.
5. Compare reference and native screenshots side-by-side; fix spacing, typography, sizing, borders, radii, and state copy until no unexplained visible mismatch remains.
6. Add accessibility identifiers and Dynamic Type checks without changing the HTML-derived hierarchy.
7. Commit one page at a time with `fix(apple-ui): align Pxxx with canonical HTML prototype`.

### Task 9: Final Apple handoff

**Files:**
- Modify: `docs/specs/09_test/CROSS_IMPLEMENTATION_PARITY_MATRIX.md`
- Modify: `docs/specs/09_test/MULTI_END_PAGE_PARITY_MATRIX.md`
- Modify: `docs/specs/09_test/MULTI_END_STATE_PARITY_MATRIX.md`
- Modify: `docs/specs/09_test/MULTI_END_VISUAL_PARITY_MATRIX.md`
- Create: `verification/apple-native-v1/20260909-mac-a2/README.md`

1. Run all Apple builds and tests from a clean checkout.
2. Record functional, state, accessibility, and visual evidence for N-MAC and N-IOS.
3. Mark only OS-owned presentation differences as allowed and cite the platform specification.
4. Rebase/merge onto the latest shared `refactor/uniapp-v1` after checking concurrent Windows changes.
5. Push the integrated commit to Gitee and GitHub only after both refs resolve to the same SHA.
