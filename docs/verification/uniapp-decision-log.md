# UniApp Functional Decision Log

Date initialized: 2026-08-22
Status: D1-D4 selected with release validation pending; D5-D6 open
Plan: `../plans/2026-08-22-uniapp-functional-verification-master-plan.md`

Do not implement behavior covered by an open decision. Each decision must be resolved with protocol/platform evidence, automated tests, real-device implications, and rollback notes.

## D1: Generic Session Lifetime Across Detail Pages

**Status:** selected; E4/E5 release validation pending
**Risk:** P0
**Affected:** F06–F13

**Context:** HEAD closes the BLE session in `pages/device/detail.vue:onUnload`. The current candidate introduces a dedicated Connected Tab and keeps Runtime sessions after the detail page is unloaded.

**Options:**

1. Session is page-owned and closes on unload.
2. Session is application-owned and survives page unload until explicit/passive disconnect.
3. Session survives only when the user explicitly pins/keeps it.

**Selected option:** 2. Session is application-owned and survives page unload until explicit/passive disconnect.

**Rationale:** The approved separate Connected Tab is a functional session surface. Closing on detail unload would leave either an empty tab or a misleading connected badge with no operable read/write/Notify session. Page instances therefore own only UI listeners, Notify presentation subscriptions, and retry timers; Runtime plus the Store registry own the connection.

**Protocol/platform evidence:** Runtime exposes explicit session close and passive disconnect callbacks. DCloud documents that closing the Bluetooth adapter disconnects all established connections, so ordinary detail-page unload must not close the shared adapter. Source: <https://uniapp.dcloud.net.cn/api/system/bluetooth.html>

**Automated evidence:** `connected-session-registry.test.mjs` covers bind, same-session reuse, replacement, active/passive invalidation, stale-session guards, and callback unsubscription. `ble-runtime.test.mjs` covers active/passive invalidation, reuse, one in-flight connection per device, and retry after a rejected connection.

**Real-device evidence:** pending Android/iOS cross-Tab read/write/Notify and resource/battery observation. F07 remains `unproven` until this is complete.

**Rejected alternatives:** Option 1 contradicts the Connected Tab requirement. Option 3 adds a pin/keep concept that is absent from the approved prototype and would require a new interaction decision.

**Migration impact:** detail unload removes page-local callbacks and timers but does not close the Runtime session. Explicit disconnect, passive disconnect, Broadcast-mode handoff, or app-level teardown remain responsible for releasing the connection.

**Rollback:** restore page-owned close on unload, remove the Connected Tab as a live-session surface, and revert the Store registry binding. Do not retain a connected badge without a Runtime session.

**Required before release promotion:** Android/iOS cross-Tab read/write/Notify and resource/battery consideration.

## D2: Smart HID Session and Recovery Ownership

**Status:** selected; E4/E5 release validation pending
**Risk:** P0
**Affected:** F16–F21

**Context:** Smart HID uses a singleton verified Profile session, while generic BLE uses Runtime sessions. Recovery mapping is duplicated between `use-smart-hid-provisioning.js` and `services/smart-hid/workflow.js` and currently uses different action names.

**Options:**

1. Smart HID exclusively owns its verified session and disconnects at workflow end.
2. Smart HID reuses a generic Runtime session with a Profile capability layer.
3. Share only Runtime connection primitives while keeping Smart HID subscription/workflow ownership separate.

**Selected option:** 3. Share Runtime connection/GATT primitives while keeping Smart HID identity, Info/Status subscriptions, waiter lifecycle, provisioning workflow, and recovery ownership separate.

**Rationale:** A second Bluetooth callback/session implementation would reintroduce cross-device callback collisions. Treating Smart HID as only a generic session would lose mandatory Device Info verification and protocol state semantics. The selected split preserves one BLE transport owner while keeping Profile behavior explicit.

**Session rule:** Smart HID may reuse a Runtime session only after the expected service requirement and Device Info verification pass. Smart HID disconnect closes that Runtime session; any generic registry binding observes the same disconnect callback and becomes inactive rather than retaining a stale badge.

**Protocol evidence:** `docs/smart-hid/BLE_PROVISIONING_PROTOCOL.md` defines BLE as discovery/provisioning/status transport and requires one candidate containing Wi-Fi, hub address, and one-time token. The canonical contract lock remains unchanged.

**Automated evidence:** protocol framing, Profile matching, Device Info verification, transport callback routing, QR/form validation, recovery mapping, and waiter orchestration are required under Task 6. Real firmware evidence remains pending.

**Real-device evidence:** pending strong/weak discovery, wrong-device rejection, fast terminal status, timeout/disconnect, and successful/error provisioning on approved Smart HID firmware.

**Rejected alternatives:** Option 1 gives Smart HID a competing session owner. Option 2 collapses Profile verification and workflow state into generic BLE and makes diagnostics/recovery ambiguous.

**Migration impact:** duplicated recovery mapping moves to `workflow.js`; the composable becomes presentation/orchestration only. Runtime UUID routing and canonical candidate/framing remain unchanged.

**Rollback:** restore the prior composable mapping and service-local waiter array without changing Runtime or protocol constants. This rollback is safe only if duplicate mappings are kept synchronized manually.

**Required before release promotion:** historical diagnostics behavior and real-device provisioning/error matrix.

## D3: Advanced BLE Navigation

**Status:** selected; E4/E5 route validation pending
**Risk:** P1
**Affected:** F20–F21

**Context:** The prototype's `高级 BLE 调试` opens the selected device's generic session. The current runtime calls `uni.switchTab('/pages/index/index')`, losing the selected device context.

**Options:**

1. Open generic device detail for the selected device/session.
2. Return to Scan with the device highlighted and require a new selection.
3. Remove/rename the action if no usable session exists.

**Selected option:** 1. Open generic device detail for the selected device/session context.

**Rationale:** The approved prototype already routes `高级 BLE 调试` to generic detail for the selected Smart HID. Returning to Scan contradicts the action label and forces the user to rediscover context. Generic detail can reuse an eligible Runtime session or reconnect with an explicit error.

**Automated evidence:** a route helper must encode the complete selected-device context and reject missing device IDs; the HID detail route must not call `switchTab('/pages/index/index')`.

**Real-device evidence:** pending advanced route, service discovery, read/write/Notify, and back-navigation on Android/iOS.

**Rejected alternatives:** Option 2 loses context. Option 3 removes a capability present in the approved prototype without a product reason.

**Migration impact:** HID detail navigates to `/pages/device/detail?device=...`; generic detail remains the only advanced GATT UI.

**Rollback:** restore Scan navigation and relabel the action as `返回扫描` so it no longer promises selected-device debugging.

**Required before release promotion:** stable-library route automation and real-device GATT from the advanced entry.

## D4: Broadcast Default and Byte Budget

**Status:** selected; E4/E5 advertising validation pending
**Risk:** P1
**Affected:** F22–F24

**Context:** Current WeChat defaults calculate to `37 / 31` bytes, so the primary Start action is invalid before the user edits any field.

**Options:**

1. Ship a valid short default payload.
2. Ship empty optional data and require user input.
3. Keep an invalid educational example but disable Start and explain the required edit.

**Selected option:** 1. Ship a valid short default payload.

**Default:** device name `SmartBLE`, 16-bit service UUID `FFE0`, manufacturer ID `0001`, UTF-8 manufacturer data `BLE`. The shared helper, runtime page, and prototype must calculate the same total and keep it at or below 31 bytes.

**Rationale:** The primary action must be usable without forcing users to repair an intentionally invalid example. Silent runtime truncation is rejected because it makes the transmitted payload differ from the fields shown on screen.

**Automated evidence required:** empty/16-bit/32-bit/128-bit UUID, UTF-8 name/data, manufacturer ID, malformed input, exact 31-byte boundary, 32-byte rejection, and valid default.

**Real-device evidence:** pending observation from a second scanner and comparison of service/manufacturer/name bytes.

**Rejected alternatives:** Option 2 weakens first-run usability. Option 3 deliberately ships a broken primary state and contradicts the requirement that core controls remain usable.

**Migration impact:** remove page-local byte math and hidden name/data truncation; use one helper to validate and build the request.

**Rollback:** restore empty optional data rather than restoring the invalid 37/31 example.

**Required before release promotion:** exact WeChat request inspection and real advertising observation.

## D5: WeChat Location Permission Policy

**Status:** open
**Risk:** P0/privacy
**Affected:** F01–F02

**Context:** Candidate requests `scope.userLocation` after Bluetooth readiness. This may be a legacy Android/WeChat compatibility path and must not be retained or removed from memory alone.

**Options:**

1. Always request location before scanning.
2. Request only on affected Android/WeChat combinations after a scan failure indicating location restrictions.
3. Remove location permission and rely on Bluetooth authorization/platform handling.

**Current evidence:** seven fake-platform branches preserve current behavior. DCloud's Bluetooth API documentation (checked 2026-08-22) requires adapter initialization and documents adapter errors, but does not state a general location authorization precondition. That is not sufficient to override WeChat/OS-specific behavior; no current Android/iOS real-device authorization matrix exists. Source: <https://uniapp.dcloud.net.cn/api/system/bluetooth.html>

**Required before decision:** current official platform documentation, supported OS/WeChat policy, fresh authorization tests on Android/iOS, privacy declaration impact.

**Decision:** not selected.

## D6: OTA Test Hardware and Firmware

**Status:** open
**Risk:** P1/device safety
**Affected:** F14

**Context:** UI exposes firmware selection and upgrade, but the candidate has no approved recoverable device/firmware pair for destructive real transfer testing.

**Options:**

1. Validate only fake transfer until approved hardware exists.
2. Use a dedicated recoverable development device and signed/known-good image.
3. Disable OTA in release until a safe matrix exists.

**Current evidence:** injected-Runtime tests now reject empty firmware, verify 180-byte chunk boundaries and progress, stop on cancel/write failure, and clean the status Notify listener. These are non-hardware safety tests only; no approved image or recoverable-device transfer is recorded.

**Required before decision:** device owner, recovery method, known-good firmware hash/version, rollback procedure, disconnect/power-loss test policy.

**Decision:** not selected.

## Resolution Template

Use this block when resolving an entry:

```markdown
**Decision date:** YYYY-MM-DD
**Selected option:** N
**Rationale:**
**Protocol/platform evidence:**
**Automated evidence:**
**Real-device evidence:**
**Rejected alternatives:**
**Migration impact:**
**Rollback:**
```
