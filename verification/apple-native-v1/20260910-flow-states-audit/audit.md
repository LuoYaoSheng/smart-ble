# Apple native P002/P003/P005 state audit

```yaml
date: 2026-09-10
scope: P002 provisioning + P003 session snapshot + P005 diagnostics
reference: canonical App/Desktop high-fi HTML
result: PASS_KEY_FLOW_STATES_WITH_DOCUMENTED_RUNTIME_DIFFERENCES
```

## Audit scope

- HTML references were captured from both `platform/app/high-fi` and `platform/desktop/high-fi` in this run.
- iOS evidence was captured from deterministic simulator launch states.
- macOS evidence combines deterministic state captures with real packaged-window captures for P002 success and P003 normal/missing-field states.
- Two AppKit `cacheDisplay` P003 frames that misplaced layer-backed tiles were rejected and retained under `rejected/`; the accepted evidence uses `*-window.jpg` captures.

## Steps and health

| Step | State | iOS | macOS | Evidence |
|---|---|---|---|---|
| 1 | P002 identity verification failure remains on step 1 | PASS | PASS | `comparison/ios-p002.jpg`, `comparison/macos-p002.jpg` |
| 2 | P002 provisioning success / READY | PASS | PASS | same comparison files |
| 3 | P002 `wifi_failed` recovery to form | PASS | PASS | same comparison files |
| 4 | P003 normal in-memory session snapshot | PASS | PASS | `comparison/ios-p003.jpg`, `comparison/macos-p003.jpg` |
| 5 | P003 missing fields render `—` and protocol notice | PASS | PASS | same comparison files |
| 6 | P003 missing record + return notice | PASS_WITH_OS_ALERT | PASS | same comparison files |
| 7 | P005 live diagnostics / all healthy | PASS | PASS | `comparison/ios-p005.jpg`, `comparison/macos-p005.jpg` |
| 8 | P005 offline / tests not yet run | PASS | PASS | same comparison files |
| 9 | P005 connection failure + detailed error entry | PASS | PASS | same comparison files |

## Functional corrections

- iOS P002 identity failures now stay in the connection phase and expose `重新连接` plus `返回设备列表`; they no longer fall through to the status phase.
- P003 missing records now show the canonical recovery notice. iOS uses the system alert; macOS uses the product modal from the desktop shell.
- P003 missing values use `—`, and the protocol-not-recorded notice is visible without stretching the card.
- P005 offline/connection-failed states keep all five rows pending because the checks never ran; a failed connection is not presented as a completed BLE diagnostic.
- macOS success and secondary action rows now follow the HTML full-width/paired-button geometry.

## Runtime differences

- macOS P002 preview uses a real scan result to satisfy the native `CBPeripheral` boundary, so the device name/identifier differs from the HTML fixture while hierarchy and state remain equivalent.
- Native Swift uses protocol version `1.0`; one HTML fixture labels the same protocol `V1`.
- The native `wifi_failed` mapping leaves downstream rows pending. The timed HTML fixture can momentarily show an already-advanced downstream row; native behavior follows the shared Smart HID protocol state map.

## Accessibility and evidence limits

- The iOS UI suite reaches each state through launch arguments and asserts the recovery actions, empty-state alert, status labels, and detailed-error entry.
- Screenshots do not prove complete VoiceOver rotor order, Dynamic Type at accessibility sizes, or macOS full-keyboard focus order.

## Verification

- iOS SwiftPM unit tests: 12/12 PASS.
- iOS flow-state UI tests: 3/3 PASS; combined iOS UI suite: 5/5 PASS.
- macOS CoreUnit: 62/62 PASS; PageSmoke: 17/17 PASS. UIS-12 covers every P002/P003/P005 variant in this audit.
- Shared Swift Smart HID vectors: 9/9 PASS.
- Release Metadata drift check: PASS.
