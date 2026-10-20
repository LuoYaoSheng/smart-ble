# Local BLE OTA firmware

This example upgrades a **LightBLE peripheral** from a local ESP application
image. It does not provide a firmware backend, authenticate an arbitrary firmware
publisher, or implement OTA for the scan-only observer.

The product protocol and client procedure are documented in
[local OTA upgrade](../../../docs/ota-local-upgrade.md).

## Build and package

From the repository root:

```sh
pio run -d hardware/esp32/LightBLE -e fixture_peripheral -e fixture_peripheral_s3
pio run -d hardware/esp32/LightBLE -e fixture_peripheral_ota -e fixture_peripheral_s3_ota
```

The first pair builds baseline `1.0.0`; the second pair builds test target `1.0.1`.
Classic ESP32 reports hardware `esp32-wroom-32`, chip ID `0`; ESP32-S3 reports
`esp32-s3`, chip ID `9`. Both use target `lightble-peripheral`. Use only an
application `firmware.bin`, with its matching six-field JSON manifest, for BLE
OTA. A bootloader, partition image, or merged flash image is not an OTA payload.

`../scripts/build-info.py` generates a header and build metadata inside each
environment's own `.pio/build/<environment>/` directory, so multi-environment
builds do not share mutable source headers. It writes `FIRMWARE_VERSION` into the linked ELF's fixed
`esp_app_desc.version` and `project_name` slots before esptool generates image checksum and SHA256.
This is needed because the Arduino framework archive embeds its SDK version in
that descriptor. The build fails if the unique descriptor cannot be located or
the resulting image chip/version differs from the environment. It does not alter
the installed SDK. INFO and serial boot metadata report the actual build version;
an OTA request never overwrites the active version in NVS.

## Transaction implementation

NimBLE callbacks copy CTRL/DATA packets into a bounded FIFO (16 packets, at most
512 bytes each). The Arduino loop exclusively owns session state, image hashes,
staging bytes and all `Update` calls. Reads use a separate synchronized snapshot.
FIFO overflow or disconnect invalidates pending packets and aborts the session.

The device sends `ready` after `Update.begin` succeeds; input received while
starting is rejected. START must identify the matching hardware and peripheral
target, a positive integer image size, a chunk size of 1–512, the image's actual
version (at most 31 bytes), and a 64-character SHA256. The first application
header/descriptor is checked against chip, peripheral project name and requested version before writing.
Accepted DATA is staged and drained in at most 4 KiB flash batches. A queued
commit stops further DATA but continues draining already accepted bytes.

Commit requires the exact declared length, a complete validated image descriptor,
and a matching full SHA256. Only then may `Update.end(false)` validate/finalize the
image and select the boot partition. Errors, abort, inactivity for 30 seconds, and
disconnect call `Update.abort` in the loop. A new START resets previous pending
begin/commit, hash and staging state. Success is kept visible during the 1.5 second
reboot delay. Clients must reconnect and verify INFO's real firmware version;
receiving `success` alone does not prove the new image booted.

Startup confirms the new partition only after BLE initialization returns. This
limited startup check does **not** prove complete device health or a complete
rollback/power-loss acceptance matrix. Those require real hardware evidence.

## Host regression

```sh
python3 scripts/ota/test-firmware-host.py
OTA_HOST_SANITIZER=undefined python3 scripts/ota/test-firmware-host.py
OTA_HOST_TEST_BUILT_IMAGES=1 python3 scripts/ota/test-firmware-host.py
```

Requires C++17, OpenSSL development headers/libcrypto, and ArduinoJson installed by
PlatformIO in `fixture_peripheral`. The harness compiles the production
`src/ota_server.cpp` twice (ESP32 and ESP32-S3). Only Arduino, NimBLE, FreeRTOS and
Update hardware I/O are stubbed; SHA256 is computed by OpenSSL. Tests cover normal
commit, staged drain, malformed start, target/hardware/image-version mismatches,
size/hash failures, abort/restart, timeout, disconnect, queue overflow, flash
errors, callback flash prohibition and concurrent producer/consumer scheduling.
They are software checks, not evidence of real BLE transfer, physical flash,
reboot survival or rollback.
