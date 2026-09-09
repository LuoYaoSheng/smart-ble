# Apple native UI correction audit · round 2

```yaml
started: 2026-09-09
completed: 2026-09-10
scope: P001 key states + P009/P010 + iOS landscape
reference: canonical App/Desktop high-fi HTML
result: PASS_KEY_STATES_WITH_DOCUMENTED_PLATFORM_DIFFERENCES
```

## Audit scope

- iOS reference: `docs/specs/prototype/platform/app/high-fi/`
- macOS reference: `docs/specs/prototype/platform/desktop/high-fi/`
- Native implementation: SwiftUI iOS and AppKit macOS.
- Current-run references, native captures, and assembled comparisons are stored in this folder. Previous audit screenshots were not reused as evidence for this round.

## Steps and health

| Step | State | iOS | macOS | Evidence |
|---|---|---|---|---|
| 1 | P001 default/empty | PASS | PASS | `html-*/01-*`, `native-*/01-*` |
| 2 | P001 filter expanded | PASS | PASS | `comparison/ios-p001-states.jpg`, `comparison/macos-p001-states.jpg` |
| 3 | P001 filter has no matches | PASS | PASS | same comparison files |
| 4 | P001 scan failure + retry | PASS | PASS | same comparison files |
| 5 | P001 Bluetooth off | PASS_WITH_OS_PRESENTATION | Existing iOS evidence only | HTML product modal vs native iOS system alert is an intentional OS-owned difference. |
| 6 | P001 unsupported platform | PASS | PASS | `html-app/08-*`, `native-ios/08-*`, `native-macos/07-*` |
| 7 | P009 About hierarchy | PASS_WITH_RUNTIME_DATA | PASS_WITH_RUNTIME_DATA | `comparison/ios-p009-p010.jpg`, `comparison/macos-p009-p010.jpg` |
| 8 | P010 version hierarchy | PASS_WITH_RUNTIME_DATA | PASS_WITH_RUNTIME_DATA | same comparison files |
| 9 | iOS landscape reflow | PASS_REFLOW | N/A | `native-ios/05-p001-filter-landscape.jpg` |

## Visible corrections

- Replaced the remaining iOS legacy filter panel with the canonical four presets, threshold slider, prefix field, unnamed-device switch, and reset action.
- Added a real scan failure state and retry action instead of logging the failure without product feedback.
- Added the native Bluetooth-off alert path and deterministic preview states for repeatable evidence.
- Replaced approximate empty-state symbols with the canonical HTML illustration assets on macOS; fixed duplicated tab labels and full-width device actions.
- Corrected P009 brand icon, separated application metadata from platform status, restored the macOS host-OS row, and projected iOS as `PREVIEW` from Release Metadata.
- Corrected P010 version/status chip layout while preserving live Release Metadata and limitation text instead of copying stale mock facts.

## Accessibility findings and limits

- iOS accessibility output exposes the scan actions, four filter presets, slider value in dBm, prefix field hint, unnamed-device switch, reset action, device actions, and all four tabs with the connected count.
- macOS tab buttons now have explicit accessibility labels after removing the duplicate visible NSButton title.
- Screenshot and AX inspection do not prove complete VoiceOver reading order, Switch Control, full keyboard traversal, Dynamic Type at accessibility sizes, or contrast ratios. Those remain a separate device/accessibility gate.

## Documented differences

- iOS uses the system alert for Bluetooth-off recovery; HTML renders a product-layer modal.
- Native pages show the real host/device and generated Release Metadata. HTML uses review-fixture values such as `iPhone 15 Pro`, `f2c2feb`, and an already-registered preview tag.
- The native error copy does not claim three automatic retries because that retry behavior is not implemented for scan startup.

## Remaining gate

This round closes the previously named P001 filter/error/permission/rotation gaps and the P009/P010 structural gaps. Full Apple visual acceptance still requires matched P002/P003/P005 success and error captures plus VoiceOver/Dynamic Type/keyboard checks and physical-iPhone signing validation.

## Verification

- iOS SwiftPM XCTest: 12/12 PASS.
- iOS Simulator Xcode XCTest: 12/12 PASS.
- macOS CoreUnit: 62/62 PASS.
- macOS PageSmoke: 17/17 PASS, 0 skipped.
- Shared Swift Smart HID vectors: 9/9 PASS.
- Release Metadata generation/check and version consistency: PASS.
