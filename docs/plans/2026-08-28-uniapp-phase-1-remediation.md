# UniApp Phase 1 Remediation Implementation Plan

**Goal:** Remove the highest-confidence false-success and re-entry failures without inventing unimplemented firmware behavior.

**Decision:** The OTA client will never report success after byte transfer alone. It will wait for the documented JSON status notification `{ "status": "success" }`; a timeout or explicit failure leaves the operation unsuccessful. No OTA control command is added because the active ESP32 source exposes the UUIDs but does not implement the documented transaction.

## Status (2026-08-29)

| Task | Status |
|---|---|
| 1. App broadcast validator + visible errors | Done |
| 2. Surface `hidStore.knownDevices` on Scan Tab | Done |
| 3. OTA status confirmation wait + tests + dialog copy | Done |
| 4. `verify-uniapp.sh` | **PASS**（23 unit files + 8 static gates） |
