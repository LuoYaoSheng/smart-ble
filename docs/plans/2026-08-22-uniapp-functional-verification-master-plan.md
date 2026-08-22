# UniApp Functional and Logic Verification Master Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task with review checkpoints.

**Goal:** Prove, correct, and document every UniApp page action and BLE/Smart HID behavior without regressing the previously validated core flows.

**Architecture:** The runnable prototype defines user-visible interaction intent, but it is not a behavioral oracle. Real protocol contracts and device behavior define hardware truth; BLE Runtime and pure services own platform behavior; Store/composables own observable application state; pages own only routing and presentation. Every behavior must have a traceable chain from prototype action to code, automated evidence, compiled-page evidence, and real-device evidence where hardware is involved.

**Tech Stack:** Vue 3 `<script setup>`, uni-app, Pinia, WeChat Mini Program APIs, Smart BLE Runtime, Smart HID V1 contract, Node.js unit tests, HBuilderX 5.24, `uni-automator`, WeChat Developer Tools, Android/iOS real devices.

---

## 1. Non-Negotiable Rules

1. Do not change UI and BLE lifecycle logic in the same batch.
2. Do not treat the prototype, current implementation, or HEAD as automatically correct.
3. Do not use a simulator result as proof of real Bluetooth, GATT, OTA, QR-camera, or peripheral broadcasting behavior.
4. Do not continue to a lower-risk batch while a P0 batch is red or unresolved.
5. Do not silently choose between conflicting behavior sources. Record the conflict in the decision log and stop that row.
6. Do not add broad refactors to make tests convenient. Introduce the smallest pure seam around the behavior under test.
7. Do not alter Smart HID UUIDs, framing, candidate fields, QR token rules, error codes, or firmware contract while validating UI behavior.
8. Never log, persist, route, screenshot, or expose Wi-Fi passwords, pairing tokens, MQTT credentials, or private device payloads.
9. Preserve unrelated user changes in the dirty worktree. No reset, checkout, amend, or bulk cleanup.
10. A claim of completion requires evidence for every row in the functional map.

## 2. Source-of-Truth Order

When sources disagree, use this order and record the decision:

1. **Canonical protocol and hardware behavior**
   - Smart HID contract in the sibling `Smart-HID-Workspace`
   - `core/protocols/smart-hid-contract.lock.json`
   - device firmware behavior and real-device observation
2. **Platform API contract**
   - WeChat Mini Program and uni-app official Bluetooth/automation documentation
3. **Existing tested Runtime/core behavior**
   - `apps/uniapp/services/ble-runtime/`
   - `core/ble-core/`
   - passing protocol and Runtime tests
4. **Explicitly documented verified user behavior**
   - `docs/plans/2026-08-22-uniapp-regression-guardrails.md`
   - `docs/plans/2026-08-22-uniapp-connected-session-sequence.md`
   - prior real-device notes entered during this plan
5. **Runnable prototype interaction intent**
   - `docs/prototypes/unified-device-discovery.html`
   - `docs/prototypes/README.md`
6. **Current implementation and HEAD history**
   - current worktree
   - HEAD `8fc4bc9`

HEAD is a regression reference, not an unquestionable oracle. For example, HEAD closes a generic device session on detail-page unload, while the current dedicated Connected Tab requires session lifetime to outlive the page.

## 3. Responsibility Model

```text
Runnable prototype
  defines labels, states, actions, ordering, and recovery affordances
        |
pages/*.vue
  defines route parsing, layout, dialogs, and event wiring only
        |
composables/*
  defines page lifecycle and user-task orchestration
        |
store/*
  defines observable scan/connection/Profile state
        |
services/ble-runtime/* and services/wx-peripheral-mode.js
  exclusively own global WeChat BLE callbacks and adapter/session primitives
        |
services/smart-hid/* and provisioning/*
  define Smart HID identity, QR, candidate, status, and recovery semantics
        |
WeChat APIs / real device / firmware
  provide final hardware evidence
```

Key lifecycle rules:

- `page lifecycle != BLE connection lifecycle`
- `scan session lifecycle != adapter lifetime`
- `generic BLE session != Smart HID business workflow`
- `central mode != peripheral mode`
- `simulator capability != real-device capability`

## 4. Evidence Levels

| Level | Evidence | What it can prove | What it cannot prove |
|---|---|---|---|
| E0 | Static contract checks | routes, labels, native buttons, assets, forbidden patterns | runtime behavior |
| E1 | Pure unit tests | parsing, state machines, payload budgets, recovery mapping | page wiring, hardware |
| E2 | Fake-platform integration | API order, callback ownership, session cleanup, state sync | actual OS/WeChat BLE behavior |
| E3 | Compiled Mini Program inspection | generated WXML/WXSS/JS and page presence | hardware success |
| E4 | `uni-automator` in WeChat DevTools | navigation, visible states, tap wiring, screenshots | reliable real BLE/permissions |
| E5 | Real-device matrix | permissions, scan, connection, GATT, OTA, peripheral mode | other untested device/OS combinations |

No row is “complete” when it requires E5 and only E0–E4 exist.

## 5. Functional Map and Current Gaps

| Area | Prototype action/state | Runtime path | Existing evidence | Missing or conflicting evidence | Risk |
|---|---|---|---|---|---|
| Scan permission | Start scan, denied/off guidance | `index.vue` → `use-ble-scan.js` → `scan-permission.js` | `scan-permission.test.mjs` | fresh-install Android/iOS permission prompts; whether location scope remains required | P0 |
| Scan control | Start, manual stop, 5-second stop, retry | `use-ble-scan.js` → `ble store` → `scan-session.js` | `scan-session.test.mjs` | Store/composable integration; Tab hide; two real rounds | P0 |
| Scan results | dedupe, RSSI refresh, filtering, max 100 | `store/ble.js` + `filter-panel.vue` | advertisement and UI contract tests | pure merge/filter test; real repeated advertisements | P1 |
| Advertisement dialog | open card, distinguish absent/empty/data, copy | `advertisement.js` → dialog | `advertisement.test.mjs`; prototype audit | compiled Mini Program copy and real payload comparison | P1 |
| Generic connect | stop scan, open detail, discover services | `prepareConnect` → detail → `ble-runtime.connectDevice` | Runtime tests | page/Store wiring and real connection | P0 |
| Connected session | leave detail, reopen, disconnect, passive drop | Store runtime-session binding + detail/Connected Tab | Runtime reuse/disconnect tests; sequence doc | Store registry integration test; real cross-Tab read/write after reopen | P0 |
| GATT read/write/Notify | read, write dialog, subscribe/unsubscribe | detail → Runtime primitives | routing/read timeout/transport tests | write success/failure, Notify cleanup, page unload, real GATT | P0 |
| Logs | clear, export, per-device persistence | logger + detail/log panel | prototype and static UI evidence | session-reopen log continuity; clipboard on Mini Program | P1 |
| OTA | select, cancel, start, progress, completion | detail → `ota-dialog.vue` → OTA utility | UI contract only | transfer unit test, cancellation, wrong firmware, safe real-device test | P1 |
| Profile match | strong/weak/no match and actions | Profile registry + card | profile tests | compiled weak-match copy and real identity confirmation | P1 |
| Smart HID connect | selected device auto-connect and Device Info verify | `use-smart-hid-provisioning.js` → Smart HID service | profile/transport/protocol tests | page orchestration and real device | P0 |
| Smart HID QR | invalid, valid, expired/used token | composable → QR parser → Store memory | provisioning tests | camera/scanner cancellation; invalid UI; secret handling audit | P0 |
| Smart HID provision | candidate write, waiter, progress, ready/error | composable → service → transport | framing/provisioning tests | recovery branch test; disconnect/timeout race; real firmware | P0 |
| Smart HID recovery | form/pairing/diagnostics/retry | duplicated mapping in composable and `workflow.js` | partial workflow/profile tests | mappings currently diverge and must become one source | P0 |
| HID detail | reconfigure, diagnostics, advanced BLE | `pages/hid/detail.vue` | prototype audit | **Conflict:** Advanced BLE prototype opens selected device; runtime switches to Scan Tab | P1 |
| HID diagnostics | diagnose, reconnect, details | diagnostics page → Smart HID singleton service | service status mapping | historical-device reconnect and generic-session interaction | P1 |
| Broadcast payload | valid/invalid UUID, 31-byte budget, manufacturer data | broadcast page inline calculations | UI contract only | pure payload tests; **default is currently 37/31 and invalid** | P1 |
| Adapter mode handoff | Scan ↔ Broadcast, active connection protection | `wx-peripheral-mode.js` | controller tests | page/server integration and real device | P0 |
| Broadcast lifecycle | support, server create, start/stop, hide/re-enter | broadcast page + WeChat peripheral server | DevTools visual evidence | fake server callbacks; real WeChat device capability | P0 |
| About and sibling apps | content, images, jumps, fallback | product config + About page | asset gate, UI contract, prototype audit | compiled jump failure/success on device | P2 |
| Version history | route, scroll top, seven versions | version page | prototype audit | Mini Program route/scroll screenshot | P2 |

## 6. Known Decisions That Must Not Be Guessed

Create `docs/verification/uniapp-decision-log.md` and resolve these before implementation reaches the affected row:

1. Should generic BLE sessions persist when leaving detail? Current architecture says yes; HEAD says no.
2. Should Smart HID diagnostics reuse a generic Runtime session or keep its own verified Profile session?
3. Should “高级 BLE 调试” open the selected device detail or return to Scan? Prototype and runtime currently disagree.
4. What is the valid default broadcast payload for each platform? Current WeChat default exceeds 31 bytes.
5. Is `scope.userLocation` still required for the supported WeChat/Android matrix, or only a legacy fallback?
6. Which devices and firmware images are approved for OTA validation?

Each decision record must include context, options, chosen behavior, rejected alternatives, tests, and rollback impact.

## 7. Batch Gates

### P0 Gate

Must pass before any P1 functional correction:

- permission/off/denied states
- two serialized scan rounds and manual/page-hide stop
- connect after scan stop
- session reuse and both disconnect paths
- GATT callback ownership and cleanup
- Smart HID candidate/status/recovery core
- central/peripheral adapter ownership

### P1 Gate

Must pass before P2 polish:

- advertisement detail and copy
- filtering/result integrity
- logs and clipboard behavior
- OTA safe flow
- HID detail/diagnostics route decisions
- broadcast payload and server lifecycle

### P2 Gate

- About links and sibling app jumps
- Version History
- asset, copy, layout, and accessibility checks

## 8. Implementation Tasks

### Task 0: Freeze the Candidate and Create the Evidence Map

**Files:**
- Create: `docs/verification/uniapp-functional-map.md`
- Create: `docs/verification/uniapp-decision-log.md`
- Modify: `docs/prototypes/README.md`

**Steps:**

1. Record HEAD, dirty-file list, HBuilderX version, WeChat Developer Tools version, appid, base library, and current test commands.
2. Copy the table in Section 5 into the functional map and add columns: `expected`, `actual`, `E0`, `E1`, `E2`, `E3`, `E4`, `E5`, `status`, `evidence link`.
3. Mark every row `unproven` initially. Existing tests may be linked but must be checked for exact coverage before changing status.
4. Add the six decisions in Section 6 with status `open`.
5. Do not change application code in this task.

**Verify:**

```bash
git diff --check
rg -n "unproven|open" docs/verification/uniapp-*.md
```

**Expected:** every functional row and decision is explicit; no production file changed.

**Stop condition:** any reachable page/action from `docs/prototypes/README.md` is absent from the map.

### Task 1: Create One Repeatable Regression Entry Point

**Files:**
- Create: `scripts/verify-uniapp.sh`
- Create: `scripts/check-uniapp-sfc.mjs`
- Modify: `apps/uniapp/README.md`

**Steps:**

1. Write a failing check proving the script exits non-zero when one child command fails.
2. Add all `tests/unit/*.test.mjs` in deterministic order.
3. Add `scripts/check-smart-hid-contract.mjs` and `scripts/check-uniapp-assets.mjs`.
4. Add the 24-SFC compiler parse check using HBuilderX's bundled `@vue/compiler-sfc`.
5. Add `git diff --check` as the final static gate.
6. Keep HBuilder compile and automator as separate explicit stages so a missing GUI tool is not hidden as a unit-test failure.

**Run:**

```bash
bash scripts/verify-uniapp.sh
```

**Expected:** one PASS summary; non-zero on any failed child.

**Stop condition:** the runner changes package module type or production bundling solely to silence Node warnings.

### Task 2: Prove `uni-automator` Feasibility Before Building Page Tests

**Files:**
- Create: `apps/uniapp/pages/index/index.test.js`
- Create only if required by the CLI: `apps/uniapp/jest.config.cjs`
- Modify only if required: `apps/uniapp/package.json`
- Create: `docs/verification/uniapp-automator-notes.md`

**Steps:**

1. Run the HBuilderX help command and record supported arguments.
2. Add one minimal test: relaunch Scan, assert page path, assert `开始扫描`, assert four TabBar entries.
3. Run official HBuilderX automation without adding unrelated dependencies:

```bash
/Applications/HBuilderX.app/Contents/MacOS/cli uniapp.test mp-weixin \
  --project /Users/luoyaosheng/Desktop/project/Open/smart-ble/apps/uniapp
```

4. If no test is discovered, add only the official Jest/environment configuration documented for the installed HBuilderX version.
5. Record whether automated screenshots and element taps work in the current WeChat Developer Tools.
6. Do not mock successful BLE in the page process during this spike.

**Expected:** one deterministic non-BLE page test passes.

**Stop condition:** automator setup requires changing BLE production code, installing an unreviewed plugin, or claiming simulated BLE success. Fall back to manual E4 checks and keep the row explicit.

### Task 3: Verify Permission and Scan Sessions

**Files:**
- Modify: `tests/unit/scan-permission.test.mjs`
- Modify: `tests/unit/scan-session.test.mjs`
- Create: `apps/uniapp/services/ble-runtime/device-collection.js`
- Create: `tests/unit/device-collection.test.mjs`
- Modify minimally: `apps/uniapp/store/ble.js`
- Add/modify automator: `apps/uniapp/pages/index/index.test.js`

**Steps:**

1. Add failing tests for permission status: authorized, not determined, denied, Bluetooth off, open-adapter system error, location denied, settings return.
2. Add failing scan tests: manual stop, timeout, page hide during open, duplicate start, stop failure, start failure, immediate second round.
3. Extract only the pure device merge/sort/limit function from Store and test duplicate IDs, RSSI refresh, missing RSSI, connected flag preservation, and 100-device cap.
4. Keep adapter/discovery calls inside Runtime; pages must not call scan APIs directly.
5. Automator asserts visible idle/scanning/error labels and button labels only; fake-platform tests prove API order.
6. Run two real scans on Android and iOS under Task 10 before marking complete.

**Commands:**

```bash
node tests/unit/scan-permission.test.mjs
node tests/unit/scan-session.test.mjs
node tests/unit/device-collection.test.mjs
bash scripts/verify-uniapp.sh
```

**Stop condition:** second scan has no independent result/error, or a hidden page can leave an active discovery session.

### Task 4: Verify Generic Connection and Connected-Session Ownership

**Files:**
- Modify: `tests/unit/ble-runtime.test.mjs`
- Create: `apps/uniapp/services/connected-session-registry.js`
- Create: `tests/unit/connected-session-registry.test.mjs`
- Modify minimally: `apps/uniapp/store/ble.js`
- Modify only after decision: `apps/uniapp/pages/device/detail.vue`
- Modify only after decision: `apps/uniapp/pages/connected/index.vue`
- Update: `docs/plans/2026-08-22-uniapp-connected-session-sequence.md`

**Steps:**

1. Resolve decision 1 before code.
2. Add failing registry tests for bind, same-session reuse, replacement, active disconnect, passive disconnect, remove, scan-list synchronization, and callback unsubscription.
3. Move only Map/callback ownership into the pure registry; keep Pinia state presentation in Store.
4. Extend Runtime tests for connect error cleanup and concurrent same-device connect.
5. Confirm detail unload removes page-local listeners/timers but follows the chosen session-lifetime decision.
6. Confirm Connected Tab reopening restores a usable session for read/write/Notify, not only a badge.
7. Verify manual disconnect never auto-reconnects; passive disconnect follows bounded retry only while the owning page is active.

**Stop condition:** one device can have two live Runtime sessions, callbacks leak after replacement, or leaving detail contradicts the approved decision.

### Task 5: Verify GATT Operations, Logs, and OTA

**Files:**
- Modify: `tests/unit/ble-runtime.test.mjs`
- Create: `tests/unit/device-session-operations.test.mjs`
- Create or modify: `tests/unit/ota-manager.test.mjs`
- Modify only if tests fail: `apps/uniapp/pages/device/detail.vue`
- Modify only if tests fail: `apps/uniapp/components/write-dialog/write-dialog.vue`
- Modify only if tests fail: `apps/uniapp/components/ota-dialog/ota-dialog.vue`

**Steps:**

1. Add write tests for UTF-8, HEX validation, platform rejection, disconnected session, and no duplicate log.
2. Add Notify tests for enable, value routing, disable, page cleanup, passive disconnect cleanup, and repeated toggles.
3. Add read tests for success, timeout, disconnect, and late callback after timeout.
4. Add log tests for per-device separation, clear, export-empty, and session-reopen continuity.
5. Add OTA tests for file required, progress boundaries, cancel before transfer, disconnect, transfer error, and completion.
6. Do not run real OTA until an approved device and recoverable firmware image are recorded in decision 6.

**Stop condition:** stale Notify/write callbacks can act on a dead session, or OTA can start with no validated file.

### Task 6: Verify Smart HID Identity, Provisioning, and Recovery

**Files:**
- Modify: `tests/unit/smart-hid-profile.test.mjs`
- Modify: `tests/unit/smart-hid-provision-form.test.mjs`
- Create: `tests/unit/smart-hid-workflow.test.mjs`
- Modify: `apps/uniapp/services/smart-hid/workflow.js`
- Modify minimally: `apps/uniapp/composables/use-smart-hid-provisioning.js`
- Modify only if required: `apps/uniapp/services/smart-hid/index.js`
- Modify automator: `apps/uniapp/pages/hid/add.test.js`

**Steps:**

1. Resolve decision 2 before changing session ownership.
2. Add failing tests for strong/weak match and wrong Device Info rejection.
3. Move duplicated recovery mapping from the composable to one pure function in `workflow.js`; preserve user labels as presentation mapping.
4. Test every stable error code: Wi-Fi failure, invalid payload, pairing invalid/expired/used, ControlHub unreachable, MQTT invalid, disconnect, timeout, ready.
5. Test waiter creation before write, immediate status arrival, timeout, cancel, and disconnect cleanup.
6. Test QR invalid, valid, cancelled, expired/used, address default port, editable address, and token memory-only handling.
7. Test candidate bytes/frames against the canonical lock before running UI automation.
8. Automator covers Connect → Configure → Status and visible recovery controls without embedding a secret token in screenshots.

**Stop condition:** recovery behavior is duplicated, token appears in route/log/storage, or a fast terminal status can be missed.

### Task 7: Resolve HID Detail and Diagnostics Navigation

**Files:**
- Update decision log
- Modify after decision: `apps/uniapp/pages/hid/detail.vue`
- Modify after decision: `apps/uniapp/pages/hid/diagnostics.vue`
- Modify after decision: `docs/prototypes/unified-device-discovery.html`
- Add: `apps/uniapp/pages/hid/detail.test.js`
- Add: `apps/uniapp/pages/hid/diagnostics.test.js`

**Steps:**

1. Resolve decision 3 with the current device context and session ownership from Tasks 4 and 6.
2. Write a failing route test for `高级 BLE 调试` before changing the route.
3. Verify diagnostics from both an active provisioning session and a historical device record.
4. Show explicit reconnecting/failure state; never present historical data as current live status.
5. Synchronize prototype only after runtime behavior is approved.

**Stop condition:** the selected device context is lost, or historical data is labelled as live.

### Task 8: Verify Broadcast Payload and Adapter/Server Lifecycle

**Files:**
- Create: `apps/uniapp/utils/advertising-payload.js`
- Create: `tests/unit/advertising-payload.test.mjs`
- Modify: `tests/unit/wx-peripheral-mode.test.mjs`
- Modify minimally: `apps/uniapp/pages/broadcast/index.vue`
- Add: `apps/uniapp/pages/broadcast/index.test.js`

**Steps:**

1. Resolve decisions 4 and 5 before changing defaults or permission copy.
2. Extract UUID, UTF-8 byte count, manufacturer ID/data, and 31-byte budget into a pure helper.
3. Add failing tests for empty/short/128-bit UUID, multibyte device name/data, bad HEX, 31 bytes, and 32 bytes.
4. Make each platform default valid or intentionally empty; assert default budget is `<= 31`.
5. Extend controller tests for close failure, release during open, repeated support check, active generic session, and re-entry.
6. Add fake peripheral-server tests for create/start/stop/close success and failure.
7. Automator proves fields, validation, support state, button labels, and logs; real device proves peripheral advertising.

**Stop condition:** Broadcast can close an active central connection, leave peripheral mode owned after hide, or ship an invalid default.

### Task 9: Verify About, Version, Assets, and Prototype Parity

**Files:**
- Modify: `tests/unit/uniapp-ui-contract.test.mjs`
- Modify: `scripts/check-uniapp-assets.mjs`
- Add/modify automator: `apps/uniapp/pages/about/index.test.js`
- Add/modify automator: `apps/uniapp/pages/about/version.test.js`
- Update: `docs/prototypes/2026-08-22-all-pages-audit.md`

**Steps:**

1. Assert all Tab/placeholder/sibling-app assets exist in source and compiled output.
2. Assert sibling apps use the known existing icons and app IDs; Smart BLE assets remain Smart BLE-specific.
3. Automator verifies About content blocks, mini-program jump failure copy, Version History route, and scroll top.
4. Re-run the HTML prototype all-pages audit only after runtime changes are accepted.
5. Keep prototype controls and runtime controls one-to-one in `docs/prototypes/README.md`.

**Stop condition:** an asset is missing, a sibling app identity is generated/replaced, or prototype and runtime actions differ.

### Task 10: WeChat Developer Tools and Real-Device Matrix

**Files:**
- Create: `docs/verification/uniapp-real-device-checklist.md`
- Create: `docs/verification/evidence/README.md`
- Update functional map with E4/E5 evidence links

**Developer Tools matrix:**

1. Clean compile with current stable base library, not only a grey/pre-release library.
2. Run automator and capture page screenshots.
3. Confirm zero build/runtime errors; classify tool-only warnings separately.
4. Confirm generated WXML contains direct labels and all four Tab pages.

**Real-device minimum matrix:**

| Device class | Required |
|---|---|
| Android 12+ phone, current WeChat | yes |
| iPhone, current iOS and WeChat | yes |
| Android 11 or lower | if still supported by release policy |

**Real-device scenarios:**

1. Fresh install / cleared authorization.
2. Bluetooth off, Bluetooth denied, location denied, settings return.
3. Scan start, manual stop, 5-second stop, two rounds, Tab hide, filter.
4. Generic connect, service discovery, read, write, Notify on/off.
5. Leave detail, open Connected Tab, reopen same session, operate GATT.
6. Manual disconnect and passive device power-off.
7. Strong and weak Smart HID discovery and Device Info confirmation.
8. Invalid QR, valid QR, expired/used QR, Wi-Fi fail, ControlHub fail, MQTT fail, ready.
9. OTA only with approved recoverable hardware/firmware.
10. Scan → Broadcast, active connection protection, valid/invalid payload, advertise from another scanner, leave/re-enter.
11. About images, sibling mini-program jump, links, Version History.

For each scenario record device model, OS, WeChat version, base library, app build, device firmware, time, expected, actual, logs, screenshot/video, and pass/fail.

**Stop condition:** no Android+iOS evidence, or a required BLE scenario is represented only by simulator output.

### Task 11: Final Reconciliation and Release Decision

**Files:**
- Update: `docs/verification/uniapp-functional-map.md`
- Update: `docs/verification/uniapp-decision-log.md`
- Update: `docs/plans/2026-08-22-uniapp-regression-guardrails.md`
- Update: `docs/prototypes/README.md`
- Update: `apps/uniapp/README.md`

**Steps:**

1. Require every map row to be `proved`, `failed`, or `blocked`; no `assumed`/blank state.
2. Link exact automated output and real-device evidence.
3. Re-run every automated gate and clean compile.
4. Re-read the complete worktree diff for accidental UI/protocol/lifecycle changes.
5. Do not call the goal complete while any P0 row is failed/unproven.
6. Do not commit or push unless the user explicitly requests it; if requested, stage only reviewed files and never amend.

## 9. Full Verification Commands

```bash
# Pure/static regression
bash scripts/verify-uniapp.sh

# Protocol lock and assets
node scripts/check-smart-hid-contract.mjs
node scripts/check-uniapp-assets.mjs

# HBuilderX compile
/Applications/HBuilderX.app/Contents/MacOS/cli launch mp-weixin \
  --project /Users/luoyaosheng/Desktop/project/Open/smart-ble/apps/uniapp \
  --compile true --continue-on-error false

# WeChat Mini Program automation, after Task 2 succeeds
/Applications/HBuilderX.app/Contents/MacOS/cli uniapp.test mp-weixin \
  --project /Users/luoyaosheng/Desktop/project/Open/smart-ble/apps/uniapp

# Worktree integrity
git diff --check
git status --short
```

Expected final result:

- all automated suites pass
- HBuilderX and WeChat Developer Tools show zero application errors
- every P0/P1 map row has exact evidence
- Android and iOS real-device checklists pass required scenarios
- prototype and runtime actions remain one-to-one
- no protocol or secret-handling drift

## 10. Execution Order and Review Checkpoints

Execute strictly in this order:

```text
Task 0 evidence map
  → Task 1 regression runner
  → Task 2 automator spike
  → Tasks 3–4 P0 scan/session
  → Tasks 5–7 GATT/Smart HID/navigation
  → Task 8 broadcast
  → Task 9 content/assets/prototype
  → Task 10 DevTools and real devices
  → Task 11 reconciliation
```

Review checkpoint after every task:

1. show failing test before implementation
2. show smallest diff
3. show passing targeted test
4. show full regression result
5. show updated map rows
6. receive approval before starting the next P0 area

## 11. Definition of Done

The UniApp functional/logic verification is complete only when:

- all prototype actions map to one runtime action and one owner
- all protected flows have automated evidence
- all hardware-dependent flows have approved real-device evidence
- all six decisions are resolved and documented
- no P0/P1 row is unproven, failed, or ambiguous
- compiled Mini Program pages match the approved information architecture
- secrets remain absent from logs, routes, storage, screenshots, and evidence bundles
- final diff and documentation audit pass

Until then, the correct status is `verification in progress`, not `finished`.
