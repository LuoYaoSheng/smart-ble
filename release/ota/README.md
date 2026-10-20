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

## 2026-10-20 本地真实镜像包

以上示例仅供包校验测试，不是可烧写固件。实际 ESP32/S3 应用包必须通过 `python3 scripts/ota/package-firmware.py` 生成；校验镜像芯片、project_name 角色、实际版本、checksum 和 SHA256，并拒绝覆盖已有包目录。完整流程见 [本地 BLE 升级](../../docs/ota-local-upgrade.md)。没有管理后台。
