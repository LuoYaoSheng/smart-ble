# UniApp Functional Evidence Map

Date initialized: 2026-08-22 (Asia/Shanghai)
Status: verification in progress
Plan: `../plans/2026-08-22-uniapp-functional-verification-master-plan.md`

## Current Release Decision

**NOT READY FOR RELEASE.** The candidate has passed E0–E3 and the recorded stable-library E4 smoke/automation scope. Required E5 evidence and several hardware-dependent E4 paths are absent, multiple P0 rows remain `unproven`, D5 location policy is open, and D6 has no approved OTA hardware/firmware. Do not describe this state as functionally complete.

## Candidate Baseline

| Item | Captured value |
|---|---|
| Git HEAD | `8fc4bc935eb40cf11c31f6fc3f51579d5556da17` |
| Branch | `main` |
| Worktree | dirty; candidate contains uncommitted UI, session, permission, broadcast, prototype, and test changes |
| HBuilderX | `5.24.2026081301` |
| WeChat Developer Tools product version | `2.02.2608040` |
| WeChat Developer Tools Electron bundle version | `36.6.0` |
| Mini Program AppID | `wxf6c58b1dcac4c82d` |
| App version | `1.0.4` (`versionCode: 100`) |
| Compiled `project.config.json` base library | `2.30.2` |
| Previously observed DevTools runtime | grey/pre-release `3.17.1`; not acceptable as sole release evidence |
| Lazy loading | `requiredComponents` |
| Existing Node test files | 12 |
| Prototype coverage | 9 pages/surfaces plus shared dialogs |

## Dirty Candidate Inventory

This list is evidence only. Do not reset or discard these files.

### Modified application files

- `apps/uniapp/README.md`
- `apps/uniapp/components/common/app-navbar.vue`
- `apps/uniapp/components/device-card/device-card.vue`
- `apps/uniapp/components/ota-dialog/ota-dialog.vue`
- `apps/uniapp/components/scan/advertisement-dialog.vue`
- `apps/uniapp/components/scan/scan-summary.vue`
- `apps/uniapp/components/service-panel/service-panel.vue`
- `apps/uniapp/components/write-dialog/write-dialog.vue`
- `apps/uniapp/composables/use-ble-scan.js`
- `apps/uniapp/main.js`
- `apps/uniapp/package.json`
- `apps/uniapp/pages.json`
- `apps/uniapp/pages/about/index.vue`
- `apps/uniapp/pages/broadcast/index.vue`
- `apps/uniapp/pages/device/detail.vue`
- `apps/uniapp/pages/hid/add.vue`
- `apps/uniapp/pages/hid/detail.vue`
- `apps/uniapp/pages/hid/diagnostics.vue`
- `apps/uniapp/pages/index/index.vue`
- `apps/uniapp/store/ble.js`
- `apps/uniapp/styles/design-system.css`

### Modified documentation and tests

- `docs/plans/2026-08-21-smart-ble-interaction-sync-spec.md`
- `docs/plans/2026-08-21-smart-ble-page-wireframes.md`
- `docs/prototypes/README.md`
- `docs/prototypes/unified-device-discovery.html`
- `tests/unit/ble-runtime.test.mjs`
- `tests/unit/scan-session.test.mjs`

### Untracked candidate files/directories

- `apps/uniapp/pages/connected/`
- `apps/uniapp/services/scan-permission.js`
- `apps/uniapp/services/wx-peripheral-mode.js`
- `docs/plans/2026-08-22-uniapp-connected-session-sequence.md`
- `docs/plans/2026-08-22-uniapp-functional-verification-master-plan.md`
- `docs/plans/2026-08-22-uniapp-regression-guardrails.md`
- `docs/prototypes/2026-08-22-all-pages-audit.md`
- `output/`
- `tests/unit/scan-permission.test.mjs`
- `tests/unit/uniapp-ui-contract.test.mjs`
- `tests/unit/wx-peripheral-mode.test.mjs`

## Status Definitions

- `unproven`: behavior has not completed its required evidence levels.
- `proved`: all required automated and real-device evidence exists and matches expected behavior.
- `failed`: evidence contradicts the expected behavior.
- `blocked`: external requirement is unavailable and the exact missing evidence is recorded.

Existing tests and screenshots below are only candidate evidence until their exact assertions are audited. Every row starts as `unproven`.

## Functional Evidence Matrix

| ID | Area | Expected behavior | Candidate actual path/state | Owner | E0 static | E1 unit | E2 fake integration | E3 compiled | E4 DevTools/automator | E5 real device | Risk | Status | Evidence link |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F01 | Scan permission | Start checks Bluetooth; off/denied/location states are visible and actionable | `index → useBleScan → scan-permission` | permission service | lifecycle/API ownership inspected | 7 permission branches + adapter idempotency pass | fake adapter + WeChat callbacks | HBuilderX compile pass | stable 3.16.2 action/error states visible; fresh authorization absent | missing Android/iOS fresh authorization | P0 | unproven | `evidence/20260822_E4_mp-weixin.md` |
| F02 | Scan control | Start, manual stop, 5-second stop, page-hide stop, retry, independent second round | `useBleScan → Store → scan-session` | scan session controller | page hide/unload ownership inspected | 7 session branches pass | injected open/start/stop timing | HBuilderX compile pass | stable scan start/stop label, 5-second completion, Tab hide, automator pass | missing two real-device rounds | P0 | unproven | `evidence/20260822_E4_mp-weixin.md` |
| F03 | Scan result integrity | dedupe by deviceId, RSSI refresh, connected flag preserved, sort and limit 100 | Store buffer → pure `device-collection` | BLE Store | Runtime-only platform API ownership inspected | 4 collection contracts pass | Store import blocked by local Node graph | HBuilderX compile pass | one simulator device rendered | missing repeated real advertisements | P1 | unproven | `../../tests/unit/device-collection.test.mjs` |
| F04 | Filter | RSSI/prefix/no-name filters narrow UI without mutating source list | `filter-panel → device-filter → useBleScan` | pure filter + composable | source/localName behavior inspected | RSSI/name/localName/non-mutation pass | pure fixture | HBuilderX compile pass | prototype-only filter label | missing real filtered scan | P2 | unproven | `../../tests/unit/device-filter.test.mjs` |
| F05 | Advertisement snapshot | distinguish absent, empty, and value fields; copy visible payload | Runtime normalization → dialog | advertisement service/dialog | candidate UI contract | candidate `advertisement.test.mjs` | partial fixture | compiled candidate exists | HTML prototype checked | missing real payload comparison/copy | P1 | unproven | `../../tests/unit/advertisement.test.mjs` |
| F06 | Generic connect | stop scan before navigation; connect once; discover services or show explicit error | `prepareConnect → detail → Runtime.connectDevice` | Runtime + detail page | route/API ownership inspected | reuse, concurrent connect, retry, discovery error pass | fake platform call order | compiled candidate exists | no successful simulated BLE proof | missing | P0 | unproven | `../../tests/unit/ble-runtime.test.mjs` |
| F07 | Connected session persistence | leaving detail follows approved lifetime; Connected reopens usable same session | Store registry + detail/Connected page | Runtime + connected-session registry | D1 selected; page cleanup inspected | 5 registry contracts pass | replacement/stale callback simulation | compiled candidate exists | list/page observed only | missing cross-Tab GATT | P0 | unproven | `../verification/uniapp-decision-log.md#d1-generic-session-lifetime-across-detail-pages` |
| F08 | Active disconnect | explicit disconnect clears runtime/store/scan state and does not reconnect | Store `disconnectConnectedDevice` → Runtime close | registry/Runtime | explicit path inspected | active invalidation + registry sync pass | fake close callback | compiled candidate exists | prototype only | missing | P0 | unproven | `../../tests/unit/connected-session-registry.test.mjs` |
| F09 | Passive disconnect | device loss invalidates session; bounded reconnect only while appropriate | Runtime callback → registry/detail | Runtime + page orchestration | active-page guard inspected | passive invalidation + stale guard pass | fake disconnect callback | compiled candidate exists | missing | missing power-off test | P0 | unproven | `../../apps/uniapp/pages/device/detail.vue` |
| F10 | GATT read | read routes by device/service/characteristic; timeout and disconnect clean listeners | detail → Runtime.readValue | BLE Runtime | operation ownership inspected | success/timeout/disconnect/late callback pass | fake routed callbacks | SFC import parses | no BLE success proof | missing | P0 | unproven | `../../tests/unit/ble-runtime.test.mjs` |
| F11 | GATT write | HEX/UTF-8 validation, one write, visible success/error, no stale write | operation encoder → detail → Runtime.writeValue | detail/Runtime | page uses shared encoder | text/HEX/platform/dead-session pass | fake exact write count/payload | SFC import parses | prototype dialog only | missing | P0 | unproven | `../../tests/unit/device-session-operations.test.mjs` |
| F12 | Notify | enable, route values, disable, repeated toggle, disconnect/page cleanup | service panel → Notify controller → Runtime | BLE Runtime/detail | page dispose path inspected | route/disable/repeat/disconnect/dispose pass | fake callbacks and remote disable | SFC import parses | prototype only | missing | P0 | unproven | `../../tests/unit/device-session-operations.test.mjs` |
| F13 | Logs | per-device logs, clear/export, continuity across approved session reuse | logger + operation formatter/detail | logger/page | missing type import and warn alias repaired | separation/listener/clear/export pass | Node loads TypeScript logger | SFC import parses | prototype log actions checked | missing clipboard/reopen continuity | P1 | unproven | `../../tests/unit/logger.test.mjs` |
| F14 | OTA | file required; cancel/error/progress/completion safe; approved firmware only | detail → OTA dialog/manager | OTA manager | fake-only safety boundary recorded | empty/chunk/progress/cancel/error/cleanup pass | injected fake Runtime | SFC import parses | prototype initial/completion checked | missing approved device/firmware | P1 | unproven | `../../tests/unit/ota-manager.test.mjs` |
| F15 | Profile match | strong/weak/no match labels and Device Info confirmation | Profile registry/card/service | Profile service | canonical Profile inspected | strong/weak/none + product/protocol/ID pass | expected-service reuse guarded | HBuilderX compile pass | prototype cards checked | missing real identity confirmation | P1 | unproven | `../../tests/unit/smart-hid-profile.test.mjs` |
| F16 | Smart HID connect | selected device auto-connects, subscribes, and rejects wrong identity | composable → verified Smart HID service → Runtime | Smart HID workflow + Runtime | D2 selected; callback owner inspected | Profile + transport cleanup pass | one Notify enable, half-open close | HBuilderX compile pass | prototype only | missing | P0 | unproven | `../../tests/unit/provisioning-transport.test.mjs` |
| F17 | Smart HID QR | invalid/valid/cancel/expired/used; token memory-only; address editable | composable scanCode → QR parser/Store | Smart HID composable/Profile | storage paths audited | parser/form + persistence exclusion pass | no token in route/storage fixtures | HBuilderX compile pass | prototype QR gate only | missing camera and expired/used firmware status | P0 | unproven | `../../tests/unit/smart-hid-provision-form.test.mjs` |
| F18 | Smart HID provision | waiter exists before write; frames canonical; ready/error/timeout/disconnect handled | composable → transaction → service → transport | Smart HID workflow/service | canonical lock unchanged | framing + immediate/timeout/cancel/failAll pass | waiter-before-write and transport fake | HBuilderX compile pass | prototype simulation only | missing firmware | P0 | unproven | `../../tests/unit/smart-hid-workflow.test.mjs` |
| F19 | Smart HID recovery | one canonical mapping for every stable error code | composable presentation → `workflow.js` | Smart HID workflow | duplicate mapping removed | all 8 stable codes + disconnect/timeout pass | pure workflow table | HBuilderX compile pass | prototype lacks all error branches | missing | P0 | unproven | `../../tests/unit/smart-hid-workflow.test.mjs` |
| F20 | HID detail navigation | reconfigure/diagnostics/advanced BLE preserve selected device context | shared route helper → selected generic detail | HID navigation | D3 selected; sensitive route fields limited | route/context/static contract pass | prototype selected-device path | HBuilderX compile pass | browser selected-device advanced path pass | missing GATT from route | P1 | unproven | `../../tests/unit/hid-navigation.test.mjs` |
| F21 | HID diagnostics | active/historical entry reconnects or clearly fails; no stale live label | diagnostics → Smart HID session-state/service | diagnostics page + Smart HID service | stale clear and borrowed/owned cleanup inspected | source/navigation contract pass | state transitions compiled | HBuilderX compile pass | prototype states checked | missing active/historical real device | P1 | unproven | `../../tests/unit/hid-navigation.test.mjs` |
| F22 | Broadcast payload | valid UUID/manufacturer/UTF-8 byte budget; default valid or empty | shared payload helper → page/request | advertising payload helper | D4 selected; no truncation/retry inspected | 5 payload groups pass | exact 21/31 default and 31/32 boundary | HBuilderX compile pass | stable 3.16.2 default 21/31 visible; browser 32/31 pass | missing observed bytes | P1 | unproven | `evidence/20260822_E4_mp-weixin.md` |
| F23 | Adapter mode handoff | central/peripheral handoff protects active connections and releases owner | `wx-peripheral-mode.js` | mode controller | Runtime-only mode owner inspected | 8 controller groups pass | open/close/race/active/concurrent release fake | HBuilderX compile pass | DevTools limitation classified | missing real handoff | P0 | unproven | `../../tests/unit/wx-peripheral-mode.test.mjs` |
| F24 | Peripheral server lifecycle | support/create/start/stop/close/re-enter errors are visible and bounded | server controller + broadcast page | peripheral server controller | page lifecycle uses controller | 4 lifecycle groups pass | create/start/stop/close/concurrent close fake | HBuilderX compile pass | stable simulator limitation shown as information | missing advertiser scan from second device | P0 | unproven | `evidence/20260822_E4_mp-weixin.md` |
| F25 | About/sibling apps | all content/assets; correct app IDs; success/failure jump copy | product config → About | About page/config | names/AppIDs/hash locks inspected | UI + asset contracts pass | 2 locked identities | source and compiled assets pass | stable About content/cards visible | missing mini-program jump | P2 | unproven | `evidence/20260822_E4_mp-weixin.md` |
| F26 | Version history | route starts at top; seven versions visible | About → Version | Version page | product title + onShow scroll inspected | seven-version contract passes | none required | HBuilderX compile pass | browser seven entries pass | Mini Program screenshot missing | P2 | unproven | `../../tests/unit/uniapp-ui-contract.test.mjs` |
| F27 | Native button rendering | every business action has readable native button text and consistent states | pages/components + design system | UI design contract | all 24 SFCs inspected | native labeled-button contract passes | none required | HBuilderX + generated WXML pass | stable four-Tab tree + automator runtime button/screenshot pass | device spot-check missing | P1 | unproven | `evidence/20260822-1703_E4_mp-weixin_automator-result.json` |

## Existing Test Commands (Candidate)

```bash
node tests/unit/advertisement.test.mjs
node tests/unit/advertising-payload.test.mjs
node tests/unit/ble-platform.test.mjs
node tests/unit/ble-runtime.test.mjs
node tests/unit/connected-session-registry.test.mjs
node tests/unit/device-collection.test.mjs
node tests/unit/device-filter.test.mjs
node tests/unit/device-session-operations.test.mjs
node tests/unit/hid-navigation.test.mjs
node tests/unit/logger.test.mjs
node tests/unit/ota-manager.test.mjs
node tests/unit/profile-contract.test.mjs
node tests/unit/provisioning-transport.test.mjs
node tests/unit/provisioning.test.mjs
node tests/unit/scan-permission.test.mjs
node tests/unit/scan-session.test.mjs
node tests/unit/smart-hid-profile.test.mjs
node tests/unit/smart-hid-provision-form.test.mjs
node tests/unit/smart-hid-workflow.test.mjs
node tests/unit/uniapp-ui-contract.test.mjs
node tests/unit/wx-peripheral-mode.test.mjs
node tests/unit/wx-peripheral-server.test.mjs
node scripts/check-smart-hid-contract.mjs
node scripts/check-uniapp-assets.mjs
```

## Environment Gaps

1. The generated `project.config.json` records `2.30.2`, while Developer Tools previously overrode it with grey `3.17.1`. E4 was repeated after explicitly selecting non-grey `3.16.2`; evidence records the effective runtime version.
2. Store/composable integration cannot currently be imported directly in plain Node because Pinia/UniApp are supplied by HBuilderX and the Store imports the TypeScript logger through the bundler's extension resolution. The logger itself now has a direct Node test and no missing type import.
3. Scan composable cannot currently be imported directly in Node because `@dcloudio/uni-app` is provided by the HBuilderX build environment, not the local Node package graph.
4. Official HBuilderX automation plugin 5.2.1 is installed and the minimal suite passes three tests. HBuilderX's Finder-launched extension host still warns that Homebrew Node is absent from PATH, but execution succeeds with its bundled Node. See `uniapp-automator-notes.md`.
5. E5 evidence is absent. ADB reports no Android device, and `xctrace` reports the known iPhone as Offline; no approved Smart HID/peripheral observer hardware is connected.

## Build Evidence

HBuilderX full WeChat compile passed repeatedly on 2026-08-22, most recently at 17:13 (Asia/Shanghai):

```bash
/Applications/HBuilderX.app/Contents/MacOS/cli launch mp-weixin \
  --project /Users/luoyaosheng/Desktop/project/Open/smart-ble/apps/uniapp \
  --compile true --continue-on-error false
```

Result: Vue 3 compiler 5.24 reported `项目 uniapp 编译成功` (`ready in 3509ms`). The most recent UniAutomator run separately executed one suite with three passing tests. This promotes the candidate's global E3 build gate and the listed E4 automation scope only; it does not provide real-device E5 behavior evidence.

The repeatable runner currently passes 22 unit-test files plus eight static gates: protocol lock, package-lock consistency, source/compiled asset identity, 24-SFC parse, three UniAutomator syntax checks, and Git whitespace.

## Current Gate

Tasks 3–9 automated/static gates pass. Stable-library 3.16.2 Developer Tools smoke checks and the minimal UniAutomator suite pass. All functional rows remain `unproven` because required Android/iOS/hardware E5 evidence is absent. D5 and D6 remain open, so location-policy and real OTA release behavior are not declared correct.
