# Smart BLE Runnable Prototype All-Pages Audit

Date: 2026-08-22
Surface: `docs/prototypes/unified-device-discovery.html`
Audit type: combined UX, visual, interaction, and screenshot-based accessibility review

## Verdict

All screens and core interactions in the prototype coverage matrix are reachable and visually stable after the fixes recorded below. The 2026-08-22 follow-up smoke run completed with zero script errors and zero warning-level console entries. Chromium emitted one verbose form advisory because the standalone prototype password input is not inside an HTML `form`; it does not affect UniApp runtime evidence.

## Screen Evidence

| Step | Screen or state | Health | Evidence |
|---|---|---|---|
| 1 | Scan empty state | Healthy | `../../output/playwright/all-pages-audit/01-scan-empty.png` |
| 2 | Scan results and Profile actions | Healthy | `../../output/playwright/all-pages-audit/02-scan-results.png` |
| 3 | Advertisement data dialog | Healthy after fix | `../../output/playwright/all-pages-audit/03-advertisement-dialog.png` |
| 4 | Generic BLE device session | Healthy | `../../output/playwright/all-pages-audit/04-generic-device-session.png` |
| 5 | Write characteristic dialog | Healthy after fix | `../../output/playwright/all-pages-audit/05-write-dialog.png` |
| 6 | OTA selection and completion | Healthy | `../../output/playwright/all-pages-audit/06-ota-dialog.png`, `../../output/playwright/all-pages-audit/06b-ota-complete.png` |
| 7 | Connected-device list and empty state | Healthy after fix | `../../output/playwright/all-pages-audit/07-connected-devices.png`, `../../output/playwright/all-pages-audit/07a-connected-empty.png` |
| 8 | Smart HID provisioning form | Healthy after fix | `../../output/playwright/all-pages-audit/08-hid-provision-form.png` |
| 9 | Smart HID provisioning completion | Healthy | `../../output/playwright/all-pages-audit/09-hid-provision-complete.png` |
| 10 | Smart HID compact detail | Healthy | `../../output/playwright/all-pages-audit/10-hid-detail.png` |
| 11 | Smart HID diagnostics | Healthy | `../../output/playwright/all-pages-audit/11-hid-diagnostics.png` |
| 12 | Broadcast idle and validation state | Healthy; valid default rechecked | `../../output/playwright/all-pages-audit/12-broadcast.png`, `../../output/playwright/all-pages-audit/15-broadcast-valid-default.png` |
| 13 | Broadcast active state and logs | Healthy | `../../output/playwright/all-pages-audit/13-broadcast-active.png` |
| 14 | About full content | Healthy | `../../output/playwright/all-pages-audit/14-about.png` |
| 15 | Version history | Healthy after fix | `../../output/playwright/all-pages-audit/15-version-history.png`, `../../output/playwright/all-pages-audit/14-version-history-current.png` |

## Issues Fixed During Audit

1. Added the missing `复制数据` action to the advertisement dialog.
2. Fixed the delayed copy-button reset using an expired event object, which caused a console error after reload.
3. Reset scroll position on every Tab and secondary-screen transition so Version History and other screens always start at the top.
4. Replaced RSSI with `连接稳定` on connected-session cards to match the UniApp runtime.
5. Added consistent rounded `:focus-visible` styling for keyboard navigation.
6. Added visible, associated labels to Smart HID provisioning and write-dialog fields.
7. Added `aria-current` to the selected Tab and polite live regions for scan state, broadcast state, and runtime logs.
8. Replaced the invalid `37 / 31` broadcast example with the shared valid `SmartBLE / FFE0 / 0001 / BLE` default at `21 / 31` bytes.
9. Kept the 32-byte validation state explicit and removed hidden payload truncation from the runtime implementation.
10. Corrected Version History sharing from the stale `智能蓝牙助手` identity to `BLE Toolkit+`.

## Interaction Checks

- Scan starts, exposes `停止扫描`, and auto-completes after 5 seconds.
- Device cards open advertisement data without stealing the direct Connect/Profile actions.
- Generic session read/write/Notify controls remain available.
- Write confirmation adds the expected communication log entry.
- OTA requires a selected file and reaches the completed state.
- Smart HID QR readiness gates provisioning, then progresses through all four status rows.
- Smart HID `高级 BLE 调试` opens the selected device's generic BLE session instead of losing context at Scan.
- Connected sessions appear in the dedicated Connected Tab and can be opened or disconnected.
- Broadcast blocks oversized payloads, accepts a valid payload, starts, stops, updates status, and writes logs.
- About shows the established 萌喵圈/宝宝点滴 images; links and all seven Version History entries remain reachable.

## Evidence Limits

- Screenshot review does not prove full WCAG compliance or screen-reader behavior.
- BLE permission prompts, real scanning, device connection, GATT operations, OTA transfer, and peripheral broadcasting still require WeChat real-device testing.
- External links and mini-program jumps are represented in the HTML prototype and are not executed during this local audit.
