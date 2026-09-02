# Unified E5 Verification

Shared real-device evidence infrastructure for:

- OTA E5
- Broadcast E5
- Smart HID E5

## Layout

```
verification/e5/
├── README.md              ← this file
├── E5_ENV_MATRIX.md       ← shared readiness matrix
├── devices.md             ← physical device registry (no fiction)
├── env/                   ← check-env snapshots
├── android/               ← APK / compile evidence (no APK binary committed)
├── esp32/                 ← fixture build evidence (no upload / no .bin commit)
├── ota/                   ← OTA E5 run slots
├── broadcast/             ← Broadcast E5 run slots
└── smart-hid/             ← Smart HID E5 run slots
```

## Commands

```bash
# Environment checker (exit 0 = READY, 2 = BLOCKED)
node scripts/e5/check-env.mjs

# Android APP compile probe (toolchain only; does not install)
bash scripts/e5/build-android-test.sh
```

## Rules

- Emulators are recorded but **emulator_not_e5** — they do **not** satisfy E5.
- Do not commit: `*.apk`, `*.bin`, video, secrets.
- Do not auto-run: OTA-E5-VERIFICATION / BROADCAST-E5 / SMART-HID-E5 / Release.
- Flash / adb install / BLE airlink require explicit user approval after READY.

## Related history

- Prior OTA E5 BLOCKED: `verification/ota-e5/20260902-0952-ota-e5/`
- Prior env review: `verification/e5-env-review/20260902-1446-e5-env/`
- Evidence index: `docs/verification/evidence/`
