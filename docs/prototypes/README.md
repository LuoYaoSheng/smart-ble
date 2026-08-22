# Smart BLE HTML Prototype Coverage

`unified-device-discovery.html` is the interactive cross-platform behavior reference. It must preserve the content and core actions of every reachable UniApp page before runtime implementations are synchronized.

Current layout baseline: 2026-08-22. The prototype follows the information-density rules in `../plans/2026-08-21-smart-ble-page-wireframes.md`.

| Prototype screen/state | UniApp source | Covered interactions |
|---|---|---|
| Device scan | `pages/index/index.vue` | scan, advertisement dialog, connect, Profile action |
| Connected devices | `pages/connected/index.vue` | open device, disconnect, bulk disconnect |
| Generic device session | `pages/device/detail.vue` | services, read, write dialog, Notify, logs, OTA dialog, disconnect |
| Smart HID provisioning | `pages/hid/add.vue` | auto-connect, one-page Wi-Fi/ControlHub form, QR token, provision status |
| Smart HID detail | `pages/hid/detail.vue` | reconfigure, diagnostics, advanced BLE session |
| Smart HID diagnostics | `pages/hid/diagnostics.vue` | refresh, state list, advanced error detail |
| Broadcast | `pages/broadcast/index.vue` | capability, payload fields, size, start/stop, logs |
| About | `pages/about/index.vue` | full content blocks, links, sibling apps |
| Version history | `pages/about/version.vue` | all seven versions and back navigation |
| Dialogs | shared components | advertisement, write, OTA |

## Non-loss rule

- Layout may adapt to the HTML viewport.
- Existing information blocks, actions, error states, and page transitions may not be omitted for convenience.
- A prototype change must update this matrix when a page or flow is added, removed, or merged.
- Runtime code is synchronized only after the affected prototype paths pass browser interaction checks.

## Current density baseline

- TabBar is `Scan / Connected / Broadcast / About`; Connected is not an inner Scan segment.
- Broadcast starts with the settings card. Platform and state are inline; there is no OFF/LIVE hero or repeated status strip.
- Smart HID detail starts with device identity and configuration data; there is no decorative hero.
- Diagnostics starts with diagnostic states after the page header.
- About keeps its compact brand card because product identity and sibling-app discovery are the page content.

## Browser verification

Validated at a 390 × 844 viewport:

- scan start state and 5-second auto completion
- separate Connected empty state
- broadcast size validation, support check, start, stop, state chip, and logs
- Smart HID provisioning through QR, progress, completion, and device detail
- Smart HID diagnostic refresh and advanced error detail
- all four top-level tabs
- browser console: zero script errors and zero warning-level entries; one Chromium verbose advisory for the standalone prototype password field

Full screenshot audit: `2026-08-22-all-pages-audit.md`.

Functional verification is tracked separately from visual/prototype verification:

- evidence map: `../verification/uniapp-functional-map.md`
- open decisions: `../verification/uniapp-decision-log.md`
- master plan: `../plans/2026-08-22-uniapp-functional-verification-master-plan.md`
- Smart HID sequence: `../plans/2026-08-22-uniapp-smart-hid-sequence.md`
- real-device checklist: `../verification/uniapp-real-device-checklist.md`

The runnable prototype being correct does not mark BLE/Smart HID runtime rows as proved.
