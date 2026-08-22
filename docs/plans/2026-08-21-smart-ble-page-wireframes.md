# SmartBLE Page Wireframes

Date: 2026-08-21
Related:
- `2026-08-21-smart-ble-visual-system-design.md`
- `2026-08-21-smart-ble-interaction-sync-spec.md`

## Purpose

This document is the page-level wireframe reference for SmartBLE cross-platform UI work. It exists so that future UI edits do not start from implementation fragments. The intended sequence is:

1. Brand / product design direction
2. Page wireframes
3. Interaction spec
4. UI implementation

## Shared Information Architecture

SmartBLE should present the same product story across surfaces:

1. Discover devices
2. Filter and inspect candidates
3. Connect and debug
4. Broadcast / peripheral mode
5. Learn what the product is and where to get other builds

Across platforms, the top-level structure should remain:

- `Scan`
- `Connected`
- `Broadcast`
- `About`

## Wireframe Rules

- Use the miniapp as the clearest reference for compact mobile information density.
- Use landing page and desktop as the widest storytelling surfaces.
- Use Flutter / native mobile as the polished long-term runtime references.
- Keep labels and tab order aligned unless a platform has a hard constraint.
- Mobile utility pages prioritize task information over decorative hero areas. The first viewport should expose the primary controls or data whenever possible.
- Do not use a full card to repeat the page title, an idle state, or generic platform capability copy.
- Status belongs beside the section it affects. Platform-specific constraints belong beside the affected field or action.
- A large hero is justified only when it carries unique product content, onboarding, or a real result that cannot fit inline.

## 1. Public Landing Page

Surface:
- `docs/index.md`

### Intent

This page is not only a docs homepage. It is the main public product landing and download hub.

### Wireframe

```text
+--------------------------------------------------------------+
| Header: Smart BLE | Docs | GitHub | Releases | Download CTA  |
+--------------------------------------------------------------+
| HERO                                                       |
|  [Product key visual]                                      |
|  Smart BLE                                                 |
|  Cross-platform BLE control system                         |
|  [Quick Start] [Download All] [Architecture]               |
+--------------------------------------------------------------+
| VALUE STRIP                                                |
|  Protocol Core | Cross-platform Runtime | Hardware Link    |
+--------------------------------------------------------------+
| PLATFORM GRID                                              |
|  Flutter | Tauri | Android | iOS | UniApp | Hardware       |
+--------------------------------------------------------------+
| CORE CAPABILITIES                                          |
|  Scan | Connect | Read/Write | Notify | Broadcast | OTA    |
+--------------------------------------------------------------+
| DOWNLOAD HUB                                               |
|  Android | Windows | macOS | Source                        |
+--------------------------------------------------------------+
| LEARNING PATH / DOCS ENTRY                                 |
|  Start Here | BLE Basics | Advanced Broadcast | Hardware   |
+--------------------------------------------------------------+
```

### Required states

- default desktop layout
- mobile stacked layout
- dark/light adaptation through existing theme system

## 2. Miniapp Top Level

Surface:
- `apps/uniapp/pages/`

### Intent

This is the smallest complete SmartBLE runtime. It should be the mobile “control deck” reference.

### Global shell wireframe

```text
+--------------------------------------------------+
| Custom navbar                                    |
| Product name | BLE status                        |
+--------------------------------------------------+
| Page hero / summary card                         |
+--------------------------------------------------+
| Main page content                                |
+--------------------------------------------------+
| Tab bar: Scan | Connected | Broadcast | About    |
+--------------------------------------------------+
```

## 2.1 Miniapp Scan Page

```text
+--------------------------------------------------+
| Navbar                                           |
+--------------------------------------------------+
| Compact scan control + result count              |
+--------------------------------------------------+
| Result panel                                     |
|  - ordinary BLE card => generic detail/debug     |
|  - Profile card => badge + two direct actions    |
|  - filter is a secondary/collapsible action      |
+--------------------------------------------------+
| Modal: advertisement raw data                    |
+--------------------------------------------------+
```

### Required states

- bluetooth off
- idle before scan
- scanning
- scan results
- filtered empty

The primary Scan button must remain visible without scrolling in every required state.

## 2.2 Miniapp Connected Page

```text
+--------------------------------------------------+
| Navbar                                           |
+--------------------------------------------------+
| Multi-device summary (only when count > 1)       |
|  count | bulk disconnect                         |
+--------------------------------------------------+
| Connected device list                            |
|  - open existing session                         |
|  - disconnect from card action                   |
|  - empty state tells user to connect from Scan   |
+--------------------------------------------------+
```

## 2.3 Profile-enhanced Device Card and Detail

```text
+--------------------------------------------------+
| Device card                                      |
|  name | id | RSSI | Profile badge/confidence    |
|  tap card => Advertisement data                  |
|  [Connect] [Profile task name, when matched]     |
+--------------------------------------------------+
| Device detail                                    |
|  Compact identity + protocol + firmware          |
|  No separate decorative hero                     |
|  Generic BLE capability section                  |
|  Profile capability section (when matched)       |
+--------------------------------------------------+
```

There is no dedicated HID tab. Smart HID wizard/detail/diagnostics remain secondary routes entered from a matched device.

## 2.4 Miniapp Smart HID Wizard

```text
+--------------------------------------------------+
| Steps: Connect | Configure | Status               |
+--------------------------------------------------+
| Connect                                          |
|  auto-connect selected Profile device            |
+--------------------------------------------------+
| Configure                                        |
|  Wi-Fi SSID | password | ControlHub address      |
|  [Scan ControlHub QR] [Submit configuration]     |
+--------------------------------------------------+
| Status                                           |
|  Wi-Fi | Pairing | MQTT | Ready                  |
|  recovery action or View device                  |
+--------------------------------------------------+
```

The selected device comes from the shared home scanner. The provisioning route must not start another Smart HID scan. The QR action provides the required one-time pairing token and may prefill the editable ControlHub address.

## 2.5 Miniapp Broadcast

```text
+--------------------------------------------------+
| Broadcast settings                               |
|  title | compact state | platform tag             |
|  name (+ inline platform constraint when needed) |
|  service uuid | manufacturer id/data             |
|  mode / power / switches where supported         |
|  [start/stop] [support check]                    |
+--------------------------------------------------+
| Log panel                                        |
+--------------------------------------------------+
```

The Broadcast page must not render a separate OFF/LIVE hero, generic platform explanation card, and status strip for the same state. One compact state in the settings header is the canonical display.

## 2.6 Miniapp About

```text
+--------------------------------------------------+
| Brand card                                       |
|  logo | version | summary | compact stack info   |
+--------------------------------------------------+
| More mini programs                               |
|  native WeChat jump cards                        |
+--------------------------------------------------+
| Compact app information                          |
|  environment | features | platforms              |
+--------------------------------------------------+
| Links card                                       |
+--------------------------------------------------+
| Other apps horizontal list                       |
+--------------------------------------------------+
```

## 2.7 Miniapp Device Detail

```text
+--------------------------------------------------+
| Device summary card                              |
|  name | id | status | ota action                 |
|  clear logs | export | connect/disconnect        |
+--------------------------------------------------+
| Services panel                                   |
+--------------------------------------------------+
| Log panel                                        |
+--------------------------------------------------+
| Modal: write dialog                              |
| Modal: ota dialog                                |
+--------------------------------------------------+
```

## Miniapp Information-Density Audit

| Page | Density decision |
|---|---|
| Scan | Keep the compact scan controller because it contains the primary action, live state, counts, and errors. No additional hero. |
| Connected | Show the summary only for multiple active sessions; otherwise start with the device list or empty state. |
| Broadcast | Start with settings. State and platform are inline; no OFF/LIVE hero, platform explanation card, or repeated status strip. |
| Generic device detail | Keep the identity/action panel because it carries connection, OTA, logs, and session controls. |
| Smart HID provisioning | Keep the stepper and current phase because they communicate workflow progress; remove no operational fields or safety copy. |
| Smart HID detail | Use one compact identity card plus recent configuration; no decorative hero. |
| Smart HID diagnostics | Start directly with diagnostic states; the native page title already identifies the screen. |
| About | Keep the compact brand card because product identity, version, summary, and sibling-app discovery are the page content rather than decoration. |

## 3. Desktop Runtime

Surfaces:
- `apps/desktop/electron/public/index.html`
- `apps/desktop/tauri/src/index.html`

### Intent

Desktop should feel like the high-efficiency workbench variant of the same product.

### Wireframe

```text
+--------------------------------------------------------------+
| App header: logo | title | BLE status                        |
+--------------------------------------------------------------+
| Tab nav: Scan | Connected | Broadcast | About                |
+--------------------------------------------------------------+
| Main workspace                                               |
|  left / center content by tab                               |
|  filter + control strip                                      |
|  result grid / detail view                                   |
+--------------------------------------------------------------+
| Detail mode                                                  |
|  back | device summary | action row                         |
|  services panel                                              |
|  log panel                                                   |
+--------------------------------------------------------------+
```

### Notes

- Desktop can show more simultaneous information than mobile.
- The visual hierarchy should still mirror miniapp ordering and terminology.

## 4. Flutter Runtime

Surface:
- `apps/flutter/lib/main.dart`
- page widgets under `ui/pages/`

### Wireframe

```text
+--------------------------------------------------+
| PageView runtime                                 |
+--------------------------------------------------+
| Active page scaffold                             |
|  app bar                                         |
|  page body                                       |
+--------------------------------------------------+
| Bottom nav: Scan | Connected | Broadcast | About |
+--------------------------------------------------+
```

### Page parity goals

- Scan page should match miniapp in function order
- Connected page should match miniapp meaning
- Broadcast page should keep the same field grouping
- About page should share the same product story and hero asset

## 5. Native Apple Runtime

Surface:
- `apps/ios/Sources/Views/ContentView.swift`

### Wireframe

```text
+--------------------------------------------------+
| TabView                                          |
|  Scan | Connected | Broadcast | About            |
+--------------------------------------------------+
| Each tab keeps native Apple layout conventions   |
| but follows shared SmartBLE information order    |
+--------------------------------------------------+
```

### About page parity

The current About view is text-first. Future alignment should include:
- stronger logo treatment
- shared hero / product visual
- same feature grouping as miniapp and Flutter

## 6. Native Android Runtime

Surface:
- `apps/android/app/src/main/java/com/smartble/ui/MainActivity.kt`

### Wireframe

```text
+--------------------------------------------------+
| TopAppBar                                        |
+--------------------------------------------------+
| NavHost page body                                |
+--------------------------------------------------+
| NavigationBar: Scan | Connected | Broadcast | About |
+--------------------------------------------------+
```

### About page parity

Android should eventually use the same content blocks as:
- miniapp about
- Flutter about
- Apple about

with platform-native layout only, not different product messaging.

## Shared Empty-State Mapping

Use one meaning per asset across surfaces:

- `empty_scan`: “nothing discovered yet”
- `empty_connected`: “no active connected session”
- `empty_services`: “service tree not loaded yet”
- `empty_log`: “no interaction history yet”

These should not be repurposed for unrelated meanings on other platforms.

## Sync Requirement

If a top-level surface changes layout, the following must be checked:

1. Does the same page exist on another runtime?
2. Is the page order still aligned?
3. Do the asset references still point to the same shared brand pack?
4. Does the interaction state still match the shared spec?
