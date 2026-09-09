# Apple Native V1 · Functional Gate Summary

```yaml
date: 2026-09-09
host: macOS
branch: feature/apple-native-core
baseline: 1ec8d05e2f5598d2d45e5cd3950e79208d2a79b3
status: PASS_WITH_BLOCKED_E5
visual_status: PARTIAL_DEFAULT_STATE_PASS
```

## Scope

- N-MAC: native AppKit + CoreBluetooth
- N-IOS: native SwiftUI + CoreBluetooth
- Shared: Foundation-only `core/apple/SmartHidCore`
- Visual authorities:
  - iOS: `docs/specs/prototype/platform/app/high-fi/`
  - macOS: `docs/specs/prototype/platform/desktop/high-fi/`

## Delivered commits

| Commit | Result |
|---|---|
| `2144839` | Shared Smart HID Swift Core + canonical vector XCTest + executable Swift parity lane |
| `a678470` | AppKit migrated from duplicate protocol logic to SmartHidCore |
| `a5871da` | SwiftPM/XcodeGen native iOS package and test wiring |
| `f9bcde1` | iOS CoreBluetooth Smart HID adapter and tested workflow manager |
| `811a2ff` | P002 provisioning, native AVFoundation QR + paste fallback, HTML-aligned structure |
| `c1d6161` | P003 session snapshot, P005 live diagnostics, P010 Release Metadata projection |

## Automated evidence

| Gate | Command | Result |
|---|---|---|
| Swift contract vectors | `cd core/apple/SmartHidCore && swift test` | PASS · 9 XCTest methods / 0 failures |
| Cross-platform Swift lane | `node scripts/check-platform-parity.mjs --platform=swift` | PASS · 9/9 |
| Release metadata drift | `node scripts/generate-release-metadata.mjs --check` | PASS |
| N-MAC build | `cd apps/desktop/macos/SmartBLE-mac && swift build` | PASS |
| N-MAC CoreUnit | `swift run SmartBLE-mac --unit-core` | PASS · 62/62 |
| N-MAC PageSmoke | `swift run SmartBLE-mac --smoke-pages` | PASS · 17/17 |
| N-IOS SwiftPM | `cd apps/ios && swift test` | PASS · 12/12 |
| N-IOS Simulator XCTest | `xcodebuild -project SmartBLE.xcodeproj -scheme SmartBLETests -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max' CODE_SIGNING_ALLOWED=NO test` | PASS · 12/12 |

## N-IOS functional coverage

| Page / feature | Result | Evidence type |
|---|---|---|
| P001 / F018 Profile route | IMPLEMENTED | STRONG service UUID + WEAK `SHID-` tests |
| P002 / F019-F022 | IMPLEMENTED | Fake transport tests + real CoreBluetooth adapter compile |
| P003 | IMPLEMENTED | in-memory session snapshot; no persistence |
| P005 / F024 | IMPLEMENTED | INFO/STATUS refresh + five-row deterministic assessment |
| P010 / F027 | IMPLEMENTED | generated Release Metadata resource + decode test |
| F020 QR | IMPLEMENTED | AVFoundation QR reader + strict parser + paste fallback |
| F021 framing | PASS_E2 | canonical frames asserted in order |
| F022 recovery | PASS_E2 | canonical eight-code mapping consumed from shared Core |
| F023 removal | PASS_STATIC | no P004 route/page/store; snapshots are process memory only |

## Physical iPhone Gate

Read-only device discovery found exactly one paired, supported physical iPhone and an Apple Development identity. The signed build did not complete:

- `BLOCKED_SIGNING`: Xcode has no signed-in developer account.
- `BLOCKED_SIGNING`: no iOS App Development provisioning profile for `com.luoyaosheng.smartble.ios`.
- The subsequent install command failed because no new `.app` existed.
- A bundle launch command reached the already-installed historical app only; it is explicitly excluded from this Gate.

Unlock condition: sign in to the intended Apple Developer account in Xcode and create/download a development profile for the product bundle identifier. Then rebuild, install, launch, and run the physical Smart HID/ESP32 checklist.

## UI status

The initial 2026-09-09 screenshot audit found visible product drift. The correction passes replaced the iOS legacy shell, aligned all nine default states, rebuilt macOS P009/P010, fixed the compressed-version layout defect, and then closed P001 filter-expanded/no-match/scan-failure/Bluetooth-off/unsupported states plus iOS landscape reflow. Evidence is under `verification/apple-native-v1/20260909-ui-audit/` and `verification/apple-native-v1/20260909-ui-audit-round2/`. Overall status remains **PARTIAL** until P002/P003/P005 success/error variants and VoiceOver/Dynamic Type/keyboard traversal are captured and compared.
