# UniApp Verification Evidence

This directory indexes E4 Developer Tools and E5 real-device evidence. The recorded stable-library E4 smoke and UniAutomator scope is complete; E5 real-device evidence is still absent. Automated tests, HBuilderX compile output, and HTML prototype screenshots remain lower evidence levels and do not replace E5.

## Naming

Use:

```text
YYYYMMDD-HHMM_<E4|E5>_<platform>_<functional-id>_<short-result>.<png|mp4|txt|json>
```

Examples:

```text
20260822-1700_E5_android_F02_second-scan.mp4
20260822-1715_E5_ios_F07_connected-reopen-read.mp4
20260822-1730_E5_weixin_F24-observed-advertisement.json
```

## Rules

1. Keep secrets out of evidence. Redact Wi-Fi passwords and one-time pairing tokens before saving.
2. Include the environment record from `../uniapp-real-device-checklist.md`.
3. Link every artifact from the exact row in `../uniapp-functional-map.md`.
4. A failure artifact is retained and labelled failed; do not overwrite it with a later pass.
5. Prototype screenshots under `output/playwright` are E4-design aids, not BLE runtime evidence.

## Current Status

- E4 stable-library Developer Tools: completed for the scope in `20260822_E4_mp-weixin.md`
- E4 UniAutomator: one suite/three tests passed; see `20260822-1703_E4_mp-weixin_automator-result.json`
- E5 Android: missing
- E5 iOS: missing; locally known iPhone was Offline during the 2026-08-22 check
- E5 Smart HID firmware: missing
- E5 peripheral observer: missing
