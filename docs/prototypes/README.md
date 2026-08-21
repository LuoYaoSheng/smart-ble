# Smart BLE HTML Prototype Coverage

`unified-device-discovery.html` is the interactive cross-platform behavior reference. It must preserve the content and core actions of every reachable UniApp page before runtime implementations are synchronized.

| Prototype screen/state | UniApp source | Covered interactions |
|---|---|---|
| Device scan | `pages/index/index.vue` | scan, advertisement dialog, connect, Profile action |
| Connected devices | `pages/index/index.vue` | switch list, open device, disconnect |
| Generic device session | `pages/device/detail.vue` | services, read, write dialog, Notify, logs, OTA dialog, disconnect |
| Smart HID wizard W01-W06 | `pages/hid/add.vue` | prepare, identify, QR, Wi-Fi, provision progress, completion |
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
