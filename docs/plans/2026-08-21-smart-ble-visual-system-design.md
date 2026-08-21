# SmartBLE Cross-Platform Visual System Design

Date: 2026-08-21
Scope:
- `docs/` VitePress landing page and download hub
- `apps/uniapp/`
- `apps/desktop/tauri/`
- `apps/desktop/electron/`
- `apps/flutter/`
- `apps/android/`
- `apps/ios/`
- `core/assets-generator/`

Companion docs:
- `2026-08-21-smart-ble-page-wireframes.md`
- `2026-08-21-smart-ble-interaction-sync-spec.md`

## Goal

Give SmartBLE one recognizable cross-platform visual system instead of letting each surface drift toward a different personality. The product should feel like one family across landing page, miniapp, desktop, Flutter, and native implementations: technical, trustworthy, and fast, while still friendly enough for users who are not low-level BLE engineers.

## Current Situation

### Naming and product hierarchy

The repository already explains three names clearly:
- `Smart BLE` = project family / main public name
- `BLE Toolkit+` = current WeChat miniapp display name
- `LightBLE` = historical naming line

The problem is not naming itself, but that visual expression still makes these feel more disconnected than they should.

### Surface inventory

1. Public landing and docs
Files:
- `README.md`
- `docs/index.md`
- `docs/.vitepress/theme/`

Role:
- first impression
- architecture trust
- download conversion

Current issue:
- the docs homepage is content-rich, but still reads more like a documentation home than a premium product landing page

2. Miniapp / uniapp
Files:
- `apps/uniapp/pages/`
- `apps/uniapp/components/`
- `apps/uniapp/static/`

Role:
- lowest-friction mobile entry
- strongest public lightweight runtime

Current issue:
- structure is now stronger, but it needs to become the cleanest visual reference for the SmartBLE brand

3. Desktop
Files:
- `apps/desktop/electron/public/`
- `apps/desktop/tauri/src/`

Role:
- longer-session workbench
- power-user tool surface

Current issue:
- useful but still closer to “tool shell” than “branded control console”

4. Flutter mobile
Files:
- `apps/flutter/lib/`
- `apps/flutter/assets/`

Role:
- cross-platform mobile mainline

Current issue:
- not yet visually aligned with the refreshed miniapp brand layer

5. Native Android / iOS
Files:
- `apps/android/app/src/main/`
- `apps/ios/Sources/`

Role:
- native trust layer
- platform-specific polish and authority

Current issue:
- icon and top-level branding can be unified through shared generation, but page-level visual alignment is still future work

## Main Problems

1. Different entry points communicate slightly different products.
2. The miniapp needed stronger branded imagery.
3. The landing page still uses generic docs-home patterns and emoji-heavy feature framing.
4. Empty states across runtimes read more like placeholders than product moments.
5. Tiny assets such as tab icons should remain deterministic; AI is not the right tool for every size class.

## Alternatives Considered

### Option A: Replace everything with AI images

Pros:
- fast visual overhaul
- strong novelty

Cons:
- tiny icons become muddy
- high inconsistency risk across surfaces
- weakens the engineering-tool feel

### Option B: Hybrid system (recommended)

Use AI generation for medium and large expressive assets, while keeping micro-icons geometric and deterministic.

Pros:
- best balance of identity and usability
- large surfaces gain atmosphere and memorability
- small controls stay crisp and scannable

Cons:
- requires two asset strategies instead of one

### Option C: Stay fully vector/manual

Pros:
- maximum consistency
- easier to maintain long term

Cons:
- slower differentiation
- harder to add emotional warmth to public-facing entry points

## Recommended Direction

Choose Option B.

### Visual positioning

SmartBLE should feel like:
- a portable BLE field console
- an electric-blue device lab
- a product family, not a pile of platform demos
- a calm control deck for scanning, connecting, broadcasting, and inspecting device state

### Tone

Industrial + refined.

Not playful-toy-like, not enterprise-boring, not cyberpunk-chaotic. The emotional target is:

“professional, precise, and quietly impressive.”

### Signature memory

The one thing a user should remember:

“SmartBLE looks like a clean electric control deck built around a glowing Bluetooth core.”

## Brand Language

### Color

Primary palette:
- electric blue
- cyan glow
- mist white
- steel slate accents

Support palette:
- mint for connected/success
- amber for warning
- coral-red only for failures and destructive actions

### Shape language

- rounded technical panels
- orbital rings
- radar arcs
- linked nodes
- layered console discs
- soft glass-like light planes

### Illustration language

- 2D vector-like or clean semi-flat rendering
- crisp silhouette
- low clutter
- no text baked into images
- no phone mockups
- no noisy photorealism

## Asset Strategy

### Keep manual / deterministic

These assets should stay geometric for clarity:
- tab icons
- tiny badges
- micro status indicators
- control glyphs under 48px

### Generate with ChatGPT2API

These assets should be AI-generated:
- app icon master
- reusable brand hero image (docs / desktop / native surfaces; not required on the miniapp About page)
- share card
- empty scan illustration
- empty connected illustration
- empty services illustration
- empty log illustration
- landing-page hero candidate
- desktop splash / welcome illustration candidates in a later phase

## Asset Specs

### 1. App Icon Master

Purpose:
- source for `core/assets-generator/meta/images/master_icon.png`
- feeds multi-platform icon distribution

Look:
- central Bluetooth-inspired emblem
- orbital scan rings
- electric blue focus
- readable at 48px

### 2. Product Hero

Purpose:
- serve as a reusable key visual for docs, desktop/native surfaces, and release materials

Look:
- branded scene rather than screenshot
- glowing BLE core at center
- surrounding devices, panels, and radio arcs
- should communicate “cross-platform BLE toolkit”

Recommended ratio:
- 3:2 horizontal

### 3. Share Card

Purpose:
- WeChat share thumbnail
- social preview asset

Look:
- simpler than hero
- stronger focal center
- safe crop
- recognizable even at small preview sizes

Recommended ratio:
- 5:4 or near-square social crop

### 4. Empty State Illustrations

Purpose:
- turn utility empties into product moments

Themes:
- `empty_scan`: searching / radar / discovery
- `empty_connected`: linked devices / active session handoff
- `empty_services`: GATT service tree / structured graph
- `empty_log`: telemetry / trace console / history stream

Recommended ratio:
- square

### 5. Landing Page Hero Upgrade

Purpose:
- strengthen `docs/index.md`

Look:
- fewer literal devices than the miniapp about hero
- more premium product-marketing composition
- bridges “tool” and “platform family”

Recommended ratio:
- wide desktop hero with adaptable crop

## Rollout Plan

### Phase 1: Shared brand source

- finalize icon master
- finalize hero / share / empty-state pack
- ensure the asset generator can distribute png placeholders and logo outputs safely

### Phase 2: Public-facing surfaces

- redesign `docs/index.md` hero, feature framing, and download hub
- align README public-entry messaging with the refreshed hierarchy

### Phase 3: Runtime entry alignment

- desktop welcome / empty surfaces
- Flutter about / onboarding / empty states
- native Android and iOS branding resources and top-level introduction surfaces

### Phase 4: Fine polish

- optional manual redesign of micro-icons
- motion and transition polish
- release / social export pack

## What Has Been Completed In This Pass

1. Shared design direction documented
2. Reusable ChatGPT2API generation script added
3. First-pass SmartBLE AI asset pack generated
4. Shared icon source promoted into `master_icon.png`
5. Asset generator updated so png placeholders and uniapp logo updates distribute correctly
6. Uniapp integrated with:
   - new logo
   - share card
   - branded empty-state imagery
   - a compact About header without the decorative hero, keeping mini-program promotion near the top
7. Android, Flutter, iOS, Electron and Tauri received shared brand resources and About/entry alignment

## Risks

1. AI icon can still be less crisp than a purely vector technical mark.
2. Overly decorative imagery can reduce tool credibility.
3. Generated visuals can drift into generic “tech blue” if prompt discipline weakens.
4. Landing page and runtimes can diverge again if shared assets exist but layouts do not update.
5. Multi-platform rollout can accidentally increase asset weight.

## Mitigations

1. Use the current SmartBLE mark as identity reference for generated assets.
2. Keep prompts strict about silhouette and readability.
3. Preserve manual small icons.
4. Review generated outputs before promoting shared source-of-truth assets.
5. Compress runtime PNGs before distribution.
6. Roll out by phase rather than forcing all platforms to adopt new visuals at once.

## Deliverables For This Pass

1. Cross-platform design analysis document
2. Reusable ChatGPT2API generation script
3. First-pass SmartBLE AI asset pack
4. Shared icon and placeholder distribution improvements
5. Uniapp integration for logo / share / empty-state assets, with a compact promotion-first About page

## Not In Scope For This Pass

1. Replacing tiny tab icons with AI art
2. Full page-by-page redesign of Android / iOS / Flutter / desktop runtimes in one pass
3. Full implementation rewrite of the VitePress landing page in the same pass
