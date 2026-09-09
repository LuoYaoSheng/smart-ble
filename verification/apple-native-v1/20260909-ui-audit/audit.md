# Apple Native HTML Parity Audit

```yaml
date: 2026-09-09
scope: N-IOS SwiftUI + N-MAC AppKit vs canonical HTML prototypes
result: PARTIAL_AFTER_CORRECTION
mode: combined UX / visual / accessibility-risk audit
```

## Audit scope

- iOS reference: `docs/specs/prototype/platform/app/high-fi/`
- macOS reference: `docs/specs/prototype/platform/desktop/high-fi/`
- Native build: local `refactor/uniapp-v1@8e078fc`
- iOS viewport: iPhone 17 Pro Max Simulator, iOS 26.1
- macOS capture: AppKit `--snap-pages`, 740px page column

HTML references were opened and inspected in the Codex in-app browser during this audit. Native screenshots below are the accepted current-run captures. The rejected iOS launch-transition frame is retained under `rejected/` and is not audit evidence.

## Step 1 — iOS P001 scan

Health: **FAIL · systemic shell drift**

Evidence: `ios-before-p001-stable.png`

- Missing canonical `BLE TOOLKIT+ / 扫描 / 蓝牙状态` navbar hierarchy.
- Scan action is a floating system-styled capsule instead of the canonical scan toolbar row.
- Missing canonical nearby-device section header, count chip, filter text action, and radar illustration.
- Native `TabView` produces a glass/pill tab bar unlike the HTML tab bar.
- Weak grey copy and icon contrast need explicit token mapping; screenshot alone does not prove VoiceOver order.

## Step 2 — iOS P009 about

Health: **FAIL · different product page**

Evidence: `ios-before-p009.png`

- Large photographic hero, oversized brand lockup, product-positioning essay, capability list, and horizontal platform chips do not exist in the canonical HTML page.
- Canonical page starts with compact navbar and compact brand card, then promotion card, application information, four links, and footer.
- Important HTML content is missing or displaced: build projection, six capability chips, public surface status, share entry, redaction note.
- Current long scroll and large cards obscure the primary product facts.

## Step 3 — iOS P010 versions

Health: **PARTIAL / FAIL**

Evidence: `ios-before-p010.png`

- Overall card order is closer to HTML, but typography, card padding, status-chip density, and empty-state proportions remain visibly different.
- Native version presentation uses `v1.0.5 + PREVIEW`; HTML presents `1.0.5-preview + preview`.
- Native limitations are the full repository list rather than the concise page projection shown by the HTML state.
- Only the first release-history card was visible without scrolling, so the complete viewport composition does not match.

## Step 4 — macOS P001/P002

Health: **PARTIAL / FAIL**

Evidence: `macos-before/p001.png`, `macos-before/p002.png`

- Content order is broadly similar, but the accepted capture excludes the native window chrome and tab bar, so full-page parity is not proven.
- Empty illustration and action sizing differ from the desktop HTML.
- P002 guard uses a large blue warning icon and different vertical rhythm; HTML uses a compact warning operation card.

## Step 5 — macOS P003/P005/P006/P007/P008

Health: **PARTIAL / FAIL**

Evidence: `macos-before/p003.png`, `p005.png`, `p006.png`, `p007.png`, `p008.png`

- Pages expose the intended actions, but state-card heights, column widths, icon glyphs, button radii, and whitespace are not locked to the desktop HTML.
- P006 three-column behavior is only partially visible in the empty state and cannot be called aligned from this capture.
- P008 is much taller and denser than the 740×600 desktop reference viewport.

## Step 6 — macOS P009 about

Health: **FAIL · different hierarchy**

Evidence: `macos-before/p009.png`

- Native page uses a full-width blue hero and a large ecosystem matrix absent from the desktop HTML viewport.
- Canonical desktop HTML uses compact brand/promotion/application cards and keeps the bottom tab bar visible.
- Native page becomes a long report rather than the target product page.

## Step 7 — macOS P010 versions

Health: **FAIL · broken layout**

Evidence: `macos-before/p010.png`

- The version string is compressed into a vertical column, a direct Auto Layout failure.
- Current-version card has excessive height and unused gradient area.
- Native page injects long spike history and platform-specific limitations beyond the canonical page projection.
- Reading order and text reflow are visibly unsafe at the target width.

## Root causes

1. Page existence and functional reachability were incorrectly treated as visual parity.
2. iOS retained legacy platform-default `TabView`, navigation, cards, and About content.
3. macOS page implementations consumed local AppKit layouts without a screenshot-locked HTML component contract.
4. No Apple screenshot harness can inject identical P002/P003/P005 states on demand.
5. The previous Gate had no reference/native side-by-side acceptance step.

## Correction pass result

| Surface | Current result | Evidence |
|---|---|---|
| N-IOS P001 | PASS_DEFAULT_STATE | `ios-after-pass2/p001.png` |
| N-IOS P002 | PASS_DEFAULT_STATE | `ios-after-pass2/p002.png` |
| N-IOS P003 | PASS_DEFAULT_STATE | `ios-after-pass2/p003.png` |
| N-IOS P005 | PASS_DEFAULT_STATE | `ios-after-pass2/p005.png` |
| N-IOS P006 | PASS_DEFAULT_STATE | `ios-after-pass2/p006.png` |
| N-IOS P007 | PASS_DEFAULT_STATE | `ios-after-pass2/p007.png` |
| N-IOS P008 | PASS_DEFAULT_STATE | `ios-after-pass2/p008.png` |
| N-IOS P009 | PASS_DEFAULT_STATE | `ios-after-pass2/p009.png` |
| N-IOS P010 | PASS_DEFAULT_STATE | `ios-after-pass2/p010.png` |
| N-MAC P001/P002/P003/P005/P006/P007/P008 | PASS_DEFAULT_CONTENT_CAPTURE | `macos-after-pass2/` |
| N-MAC P009/P010 | PASS_DEFAULT_CONTENT_CAPTURE | `macos-after-pass2/p009.png`, `p010.png` |

The correction replaced the native iOS system TabView with the canonical shell, introduced HTML-derived tokens/components and illustrations, rebuilt P001/P007/P008/P009/P010, aligned P002/P003/P005/P006 through deterministic DEBUG states, and rebuilt the divergent macOS About/Versions pages. macOS CoreUnit remains 62/62 and PageSmoke remains 17/17.

This table is intentionally limited to default states. It is not a full visual PASS.

## Required correction order

1. Build one Apple HTML token/component contract: navbar, subnav, tab bar, card, chip, button, field, error banner, empty state, progress row.
2. Replace the iOS system shell with the canonical custom shell before touching individual pages.
3. Align P001 first on both Apple implementations and capture full-window evidence.
4. Align P009/P010 next because their current hierarchy is materially different/broken.
5. Align P006/P007/P008, then P002/P003/P005.
6. Add deterministic native preview states matching every HTML scenario.
7. Compare same viewport + same state side by side; only then change each matrix cell from FAIL to PASS.

## Evidence limits

- iOS Smart HID success/error screens cannot yet be reached in Simulator without a deterministic preview-state harness.
- Physical iPhone validation remains `BLOCKED_SIGNING` and cannot supply current native screenshots.
- Screenshots expose contrast and target-size risks but do not prove VoiceOver order, Dynamic Type, keyboard traversal, or complete WCAG compliance.
