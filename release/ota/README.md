# Smart BLE OTA Firmware Package Examples

Reference packages for DEC-016 / PROTO-011 contract validation.

## Layout

```text
firmware-package/
  manifest.json
  firmware.bin
```

## Examples

| Path | Target | Hardware |
|---|---|---|
| `lightble-peripheral-example/` | `lightble-peripheral` | `esp32-wroom-32` |

Validate with:

```bash
node --test tests/target/unit/ota-package-target.test.mjs
node --test tests/target/integration/ota-package-target.test.mjs
```
