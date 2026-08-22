# UniApp Regression Guardrails

Date: 2026-08-22
Related:
- `2026-08-22-uniapp-connected-session-sequence.md`
- `2026-08-22-uniapp-smart-hid-sequence.md`
- `2026-08-21-smart-ble-interaction-sync-spec.md`
- `../verification/uniapp-functional-map.md`
- `../verification/uniapp-real-device-checklist.md`
- `../test-checklist.md`

## Purpose

This project is open source and already has validated BLE behavior.
Future UI or refactor work must not repeatedly destabilize verified flows.

This document defines the UniApp mini program behaviors that are now treated as protected.

## Protected Flows

The following flows are not optional polish items. They are release-blocking behaviors.

### 1. First-Time Scan Permission Flow

Must remain true:

- tapping `开始扫描` first attempts bluetooth readiness
- if system bluetooth is off, user sees a visible modal
- if WeChat bluetooth authorization was denied, user sees a visible modal and can open app authorization settings
- if WeChat location permission is missing, user sees a visible modal and settings guidance
- permission denial may stop scan, but may not fail silently

Primary code:

- `apps/uniapp/services/scan-permission.js`
- `apps/uniapp/composables/use-ble-scan.js`

### 2. Scan Control Flow

Must remain true:

- `开始扫描` starts discovery
- `停止扫描` stops discovery
- scan auto-stops after the configured short duration
- connecting from the scan page stops the active scan first

Primary code:

- `apps/uniapp/composables/use-ble-scan.js`
- `apps/uniapp/store/ble.js`
- `tests/unit/scan-session.test.mjs`

### 3. Scan Result Integrity

Must remain true:

- discovered devices dedupe by `deviceId`
- RSSI updates refresh the existing card instead of duplicating cards
- connected state mirrors into the scan list card state
- filtering may narrow results but must not corrupt device state

Primary code:

- `apps/uniapp/store/ble.js`
- `apps/uniapp/services/ble-runtime/device-collection.js`
- `apps/uniapp/pages/index/index.vue`

### 4. Connected Session Persistence

Must remain true:

- entering device detail creates or reuses one runtime BLE session
- leaving device detail does not automatically close the session
- reopening from `已连接` restores a usable session, not just a badge
- explicit disconnect clears the connected entry correctly
- passive disconnect updates both detail UI and connected list

Primary code:

- `apps/uniapp/store/ble.js`
- `apps/uniapp/services/connected-session-registry.js`
- `apps/uniapp/pages/device/detail.vue`
- `apps/uniapp/pages/connected/index.vue`
- `docs/plans/2026-08-22-uniapp-connected-session-sequence.md`

### 5. Generic BLE Session Operations

Must remain true:

- after connection, service list is available
- read/write/notify actions still work on a reused session
- logs remain visible after session reuse
- OTA entry remains available when OTA service exists

Primary code:

- `apps/uniapp/pages/device/detail.vue`
- `apps/uniapp/services/device-session-operations.js`
- `apps/uniapp/services/ble-runtime/index.js`

### 6. Smart HID Workflow

Must remain true:

- Runtime owns BLE callbacks; Smart HID owns verified Profile workflow only
- Device Info confirms product, protocol, and device ID before configuration
- terminal Status waiter exists before the first candidate frame is written
- all stable errors use the one recovery table in `workflow.js`
- token and Wi-Fi password never enter routes, logs, or persistent known-device metadata
- diagnostics distinguishes borrowed and page-owned connections
- `高级 BLE 调试` preserves the selected device context

Primary code:

- `apps/uniapp/services/smart-hid/`
- `apps/uniapp/services/provisioning/transport.js`
- `apps/uniapp/composables/use-smart-hid-provisioning.js`
- `docs/plans/2026-08-22-uniapp-smart-hid-sequence.md`

### 7. Button Rendering Contract

Must remain true on `mp-weixin`:

- business actions compile to native `<button>` nodes
- visible labels are direct button text, not dependent on a custom-component slot
- shared button selectors are class-only; do not use `button.some-class` inside mini-program component styles
- primary, danger, disabled, secondary, and ghost colors have concrete values and do not depend on CSS variables crossing component boundaries
- no object-form `v-bind="..."` is used in UniApp templates

Primary code:

- `apps/uniapp/styles/design-system.css`
- buttons under `apps/uniapp/pages/` and `apps/uniapp/components/`

### 8. Central / Peripheral Mode Handoff

Must remain true:

- entering Broadcast does not close an active connected-device session
- when no session is connected, an already-open central adapter may be closed and reopened in peripheral mode
- leaving Broadcast stops advertising, closes the peripheral server, and releases the adapter so Scan can reopen central mode
- concurrent hide/unload release calls share one close lifecycle; re-entry waits for release
- visible fields, byte calculation, and transmitted request are identical; no silent truncation or fallback payload
- a simulator limitation creating `BLEPeripheralServer` must not be confused with the `already opened` mode conflict

Primary code:

- `apps/uniapp/services/wx-peripheral-mode.js`
- `apps/uniapp/services/wx-peripheral-server.js`
- `apps/uniapp/utils/advertising-payload.js`
- `apps/uniapp/pages/broadcast/index.vue`
- `apps/uniapp/store/ble.js`

## Change Policy

Until real-device validation is completed again, treat these rules as mandatory:

1. Do not merge UI restructuring with behavior restructuring in the same pass unless strictly required.
2. Do not remove or rename verified user-visible actions without replacing them in the same review.
3. Do not change session ownership semantics casually.
   `page lifecycle != connection lifecycle`
4. If a change touches scan, connect, permission, or connected-session logic, update:
   - code
   - this guardrail doc if meaning changed
   - the sequence doc if lifecycle changed

## Verification Baseline

Current code-level checks that must stay green:

- `bash scripts/verify-uniapp.sh` (currently 22 unit files plus eight static gates)
- HBuilderX `launch mp-weixin --compile true`
- `node scripts/check-uniapp-assets.mjs --require-compiled` after compilation

Earlier candidate evidence observed in WeChat DevTools on 2026-08-22, which must be repeated for the current candidate with a stable base library:

- Scan primary button is visible with readable text and brand color
- tapping Scan with unavailable simulator Bluetooth shows a visible failure modal
- custom navbar avoids the WeChat capsule
- Connected empty state renders without duplicate summary text
- switching Scan -> Broadcast no longer fails with `already opened`
- Broadcast action labels exist in the rendered accessibility tree
- developer tool BLE peripheral limitation is reported as information, while real-device failures remain errors
- prior DevTools showed zero application runtime errors; this is not current E4 evidence

Real-device validation is still required for:

- first-time bluetooth permission
- first-time location permission
- scan start / stop / auto-stop
- connect from scan page
- reopen session from `已连接`
- explicit disconnect from detail page
- explicit disconnect from connected page
- read/write/Notify after reopening from Connected
- Smart HID strong/weak/wrong identity, QR, success/error recovery, and diagnostics ownership
- default Broadcast payload observed from a second scanner and leave/re-entry mode handoff
- sibling mini-program jumps and Version History on device

## Stop Condition

If a future change breaks any protected flow above, stop broad UI iteration first and restore the behavior before continuing visual work.
