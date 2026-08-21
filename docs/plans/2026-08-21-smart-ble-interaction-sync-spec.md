# SmartBLE Interaction Sync Spec

Date: 2026-08-21
Related:
- `2026-08-21-smart-ble-visual-system-design.md`
- `2026-08-21-smart-ble-page-wireframes.md`

## Purpose

This document defines which interaction behaviors must stay synchronized across SmartBLE surfaces. It is the guardrail that should be consulted before changing UI implementation in one runtime.

## Core Principle

Visual layout can adapt per platform.

Interaction meaning should not drift.

That means:
- order may flex slightly
- components may look different
- terminology, state meaning, and task flow should stay aligned

## Shared Top-Level Navigation

Primary runtime navigation should remain:

1. `Scan`
2. `Connected`
3. `Broadcast`
4. `About`

Smart HID is not a top-level navigation item. It is a first-party Profile discovered through the shared Scan flow. A matched device gains additional actions without losing generic BLE capabilities.

## Shared Task Flows

### 1. Scan Flow

Intent:
- find nearby BLE devices

Expected steps:
1. user sees BLE status
2. user starts scan
3. user sees live results and counts
4. user filters results
5. user opens device detail or advertisement raw data
6. when a Profile matches, user can choose generic debugging or the Profile-specific workflow

Must stay aligned across runtimes:
- clear scan start / stop affordance
- BLE status visibility
- device count or equivalent feedback
- filtering as a first-class action, not hidden deep in settings
- Profile identity is visible on the device card
- generic and Profile-specific modes remain explicit choices

### 1.1 Profile-enhanced Device Flow

Intent:
- keep one discovery surface while exposing device-specific workflows

Expected steps:
1. shared scanner discovers a device
2. Profile registry classifies it as strong, weak, or no match
3. list card shows a Profile badge and match confidence
4. tapping the card opens advertisement data
5. every device has a `Connect` action; matched devices additionally expose the Profile task
6. weak matches require service and Device Info verification before being treated as confirmed

Must stay aligned:
- no Profile owns a separate global scanner
- connection and GATT remain available for Profile devices
- Profile-specific pages are secondary routes, not top-level product navigation
- device detail contains a generic section and, when matched, a Profile capability section
- do not label the common action “generic debugging”; the user-facing action is simply “Connect”
- Profile buttons use the task name declared by the Profile, not a generic label such as “special mode”

### 2. Connected Flow

Intent:
- resume active device sessions

Expected steps:
1. user sees connected device list
2. user can enter a device session
3. user can disconnect explicitly

Must stay aligned:
- connected view must not pretend to be scan results
- disconnect action must be visible
- empty state must explain how to connect first

### 3. Device Detail Flow

Intent:
- inspect services and run BLE operations

Expected steps:
1. see device identity and connection state
2. inspect services and characteristics
3. read / write / notify
4. inspect logs
5. optionally run OTA if available

Must stay aligned:
- services before low-level operations
- logs always near or below operations
- write action uses confirmation dialog or equivalent safety step
- connection status remains visible in the session

### 4. Broadcast Flow

Intent:
- configure and run BLE peripheral / advertisement mode

Expected steps:
1. see current broadcast state
2. configure payload
3. start / stop broadcast
4. inspect runtime feedback and logs

Must stay aligned:
- one obvious primary action
- support / capability state visible
- payload fields grouped, not scattered
- logs stay nearby

### 5. About Flow

Intent:
- explain the product, platform family, and external links

Expected blocks:
1. brand / version
2. environment or stack
3. capabilities
4. supported platforms
5. external links
6. sibling apps

Must stay aligned:
- About is product-facing, not a debug dump
- brand hero or icon should be prominent
- stack info can differ by platform, but section order should stay stable

## Shared State Definitions

### Bluetooth global state

Common meanings:
- `off`: system bluetooth unavailable or not enabled
- `ready`: scan/connect actions can proceed
- `initializing`: temporary bootstrapping state

Do not rename these states differently per surface in user-facing copy without reason.

### Scan state

Common meanings:
- `idle`
- `scanning`
- `results`
- `filtered_empty`

### Connection state

Common meanings:
- `disconnected`
- `connecting`
- `connected`
- `reconnecting`
- `failed`

### Broadcast state

Common meanings:
- `inactive`
- `starting`
- `active`
- `stopping`
- `unsupported`
- `error`

## Shared Component Semantics

These components can look different by runtime, but should keep the same job:

- Device Card
  - summarize one discovered or connected device
- Filter Panel
  - narrow scan result scope
- Service Panel
  - show service / characteristic hierarchy
- Log Panel
  - record actions, responses, and errors
- Write Dialog
  - collect write payload and encoding choice
- OTA Dialog
  - select firmware and track progress

## Asset Sync Rules

### Shared-source assets

These should be treated as common brand assets:
- `core/assets-generator/meta/images/master_icon.png`
- placeholder images in `core/assets-generator/meta/images/placeholders/`
- future generated hero/share sources if promoted to shared status

### Runtime-local assets

These may differ slightly by runtime:
- miniapp-specific hero crops
- platform-specific screenshots
- platform-specific onboarding illustrations

### Rule

If an asset is reused by more than one runtime, move or keep it in the shared source pipeline.

## UI Change Sync Checklist

Before merging a UI change on one surface, check:

1. Is this a shared page type or a platform-specific page?
2. Does the page wireframe doc need updating?
3. Does the interaction meaning change?
4. Does the shared asset mapping change?
5. Do sibling runtimes need a follow-up issue or doc note?

## Documentation Update Rules

### When to update only implementation

- spacing polish
- color tuning
- copy refinement with same meaning

### When to update wireframes

- page block order changes
- top-level sections added or removed
- new hero / summary / panel regions introduced

### When to update interaction spec

- state meanings change
- task flow order changes
- a shared component gains or loses responsibility

## Recommended Workflow

1. Update visual-system design if brand direction changes
2. Update page wireframes if page structure changes
3. Update interaction spec if behavior changes
4. Then update runtime implementations

This is the order SmartBLE should follow going forward so UI work remains synchronized instead of becoming runtime-by-runtime drift.
