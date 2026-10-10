# V1 No-SMP Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every active Smart HID implementation and current specification follow the approved V1 model: plain BLE connection, no SMP/bonding prompt, and fail-fast guidance for legacy encrypted firmware.

**Architecture:** Keep the existing ControlHub pairing-token state machine unchanged; only remove Bluetooth SMP/encrypted-write behavior and wording. Historical verification evidence remains immutable, while active runtime code, fixtures, platform prototypes, and canonical/current docs are updated together.

**Tech Stack:** Dart/Flutter, JavaScript/uni-app, Swift/AppKit, C++/NimBLE, C/ESP-IDF, Markdown, Node test runners.

---

### Task 1: Lock fail-fast behavior

1. Add a fake legacy-encrypted peripheral that rejects the first write with an authentication error.
2. Assert exactly one write and immediate waiter cancellation.
3. Remove the 2-second encryption retry branch and callback.
4. Run the focused Node test, then the full uni-app verification.

### Task 2: Align executable platform surfaces

1. Change active comments/logs from encrypted Just Works to plain write.
2. Make the ESP32 simulator expose ordinary WRITE without SMP configuration.
3. Remove the Android prototype's synthetic system-pairing dialog and retry override.
4. Rebuild/test Flutter, native macOS, and the ESP32 fixture.

### Task 3: Synchronize current facts and canonical specs

1. Replace claims that INPUT requires encryption/bonding with the explicit V1 plain-text risk model.
2. Preserve product-level ControlHub pairing/token terminology and state names.
3. Run residual-text scans excluding archived/historical verification evidence.
4. Commit focused changes in each repository and push their configured remotes.
