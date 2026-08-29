# UniApp WeChat Real-Device Verification Checklist

Date initialized: 2026-08-22
Status: not executed
Candidate map: `uniapp-functional-map.md`

No item is checked by default. A screenshot without the relevant device/API outcome is not a pass.

## Environment Record

Record once per run:

| Field | Value |
|---|---|
| Git commit/candidate hash | |
| Dirty candidate archive/hash | |
| HBuilderX | |
| WeChat Developer Tools | |
| Stable base library | |
| WeChat version | |
| Phone model | |
| OS/version | |
| BLE test devices + firmware | |
| Second scanner/observer | |
| Tester/date | |

Developer Tools must use a stable selected base library. The previously observed grey/pre-release `3.17.1` is not release evidence.

## E4 Developer Tools

- [ ] Clean HBuilderX compile reports no errors.
- [ ] Generated project opens with the recorded stable base library.
- [ ] Four TabBar entries are visible: 扫描、已连接、广播、关于.
- [ ] All primary/secondary button labels are readable in generated WXML and simulator UI.
- [ ] Scan idle, scanning, completed, permission error, and retry states are visible.
- [ ] Connected empty/list states, Broadcast fields, About cards, and seven Version entries render.
- [ ] Runtime console has zero application errors. Tool-only warnings are copied and classified separately.
- [ ] If UniAutomator is installed, its exact command/output and screenshots are attached. Otherwise record the missing extension blocker.

## Android BLE

### Permission and scan

- [ ] Fresh install, Bluetooth off: 开始扫描 shows an actionable Bluetooth message and no discovery starts.
- [ ] Bluetooth permission denied: system authorization entry opens and the result remains denied until settings return.
- [ ] Location behavior is recorded without assuming D5: OS/WeChat prompt, scan API result, privacy declaration, and whether discovery works without location.
- [ ] First 5-second scan starts, shows 停止扫描, receives results, and auto-stops.
- [ ] Second scan is independent and receives its own result/error.
- [ ] Manual stop ends discovery.
- [ ] Switching Tab/hiding during adapter open or scanning leaves no active discovery.
- [ ] Duplicate advertisements update RSSI without duplicate device rows; connected state remains intact.

### Generic connection and GATT

- [ ] Tapping Connect stops discovery before connection.
- [ ] One device produces one platform connection attempt.
- [ ] Service discovery success/error is visible.
- [ ] Read success, timeout, and disconnect are visible; a late value after timeout is ignored.
- [ ] UTF-8 and HEX writes each send exactly once; invalid HEX sends nothing.
- [ ] Notify enable/value/disable and repeated toggles work.
- [ ] Leave detail, open 已连接, reopen the same device, then read/write/Notify without a duplicate connection.
- [ ] Explicit disconnect clears Scan + Connected state and does not auto-reconnect.
- [ ] Device power-off clears the session; reconnect is bounded only while the owning detail page is active.

## iOS BLE

Repeat every Android permission/scan/connection/GATT item and attach separate evidence. Record platform differences rather than copying Android outcomes.

## Smart HID

Use approved Smart HID firmware matching the canonical contract lock.

- [ ] Strong Service UUID match enters the Profile flow.
- [ ] Weak name-prefix match requires Device Info confirmation.
- [ ] Wrong product/protocol/device ID is rejected and disconnected.
- [ ] Invalid QR shows an explanation; camera cancel leaves no token.
- [ ] Valid QR prefills an editable host/port; token is absent from route, logs, screenshots, and persistent storage.
- [ ] A terminal Status arriving immediately after the first write is received because the waiter existed first.
- [ ] Success reaches ready and records only non-sensitive metadata.
- [ ] Each stable firmware error maps to the expected action: form, pairing, diagnostics, or retry.
- [ ] Timeout and BLE disconnect clear waiters and show recovery.
- [ ] Diagnostics borrows an active provisioning connection without closing it on back.
- [ ] Historical diagnostics clearly shows offline, reconnecting, live, or failure; no stale result is labelled live.
- [ ] 高级 BLE 调试 opens the selected device and completes a real GATT operation.

## Broadcast

- [ ] Entering Broadcast with an active central session refuses mode handoff and does not disconnect it.
- [ ] With no active session, peripheral adapter and server create successfully.
- [ ] Default fields show `21 / 31` and start without hidden truncation.
- [ ] A second scanner observes name `SmartBLE`, service `FFE0`, manufacturer ID `0001`, and UTF-8 data `BLE`.
- [ ] 31-byte payload starts; 32-byte payload is blocked before the API call.
- [ ] Start/stop/repeated support check/leave/re-enter all work.
- [ ] Hide/unload closes the server and releases peripheral adapter ownership; Scan can reopen central mode.

## About and Version

- [ ] 萌喵圈 opens AppID `wxe0ed0e6727a0a5cd`, or the exact failure modal is shown.
- [ ] 宝宝点滴 opens AppID `wx1bb2d5c6821a7883`, or the exact failure modal is shown.
- [ ] Website/feedback copy fallback and share entry are visible.
- [ ] Version History opens at the top, shows seven entries, and shares as BLE Toolkit+.

## OTA Safety Boundary

Do not perform real OTA until D6 records an approved recoverable device, known-good firmware hash/version, recovery procedure, and power-loss policy. Fake transfer tests are not permission to flash hardware.

### OTA confirm wait (Phase 1)

- [ ] Transfer complete alone is **not** shown as success.
- [ ] Firmware that emits JSON `{ "status": "success" }` reaches success UI only after that message.
- [ ] Firmware without status: UI times out / fails honestly (no false success).
- [ ] Cancel mid-transfer stops waiters and leaves a recoverable session (or clear disconnect).

## Phase 1–5 regression addenda

### Scan / knownDevices (Phase 1 + 3)

- [ ] Configured Smart HID appears in Scan history with 查看 / 移除; token and Wi-Fi password never appear.
- [ ] Re-entry from history opens detail/diagnostics without stale “live” when offline.
- [ ] knownDevices: same ID keeps latest; entries older than 90 days pruned; list capped at 20.

### Provision / leave (Phase 2)

- [ ] Invalid QR explains failure; camera cancel leaves no token.
- [ ] During provision wait, 取消等待 clears waiter without leaving orphaned BLE session.
- [ ] Back / leave during wait shows confirm; confirm cancels wait and navigates safely.

### Device detail / Connected (Phase 2 + 4 + 5)

- [ ] Service panel always shows connecting / empty / error / retry (never blank when connected).
- [ ] Manual retry re-runs discovery without duplicate connect storms.
- [ ] Compact device URL (no full device JSON in query); ads restored via stash when needed.
- [ ] Connected empty state shows 去扫描 and navigates to Scan.
- [ ] Disconnect-all lists any failure items; successes clear from list.

### Broadcast (Phase 1 + 5)

- [ ] Start blocked by validation shows visible error (not silent fail).
- [ ] Shared LogPanel clear works; hide/show still releases peripheral ownership.

### Logs / memory (Phase 3)

- [ ] Extended GATT/notify session does not unbounded-grow logs (caps: 200/device, 40 devices, 500 global).

## Result Record

For each failure record:

```text
Evidence ID:
Functional row:
Device/OS/WeChat/base library:
Precondition:
Steps:
Expected:
Actual:
Console/API error:
Screenshot/video/log:
Reproducibility:
Owner:
Decision/rollback impact:
```
