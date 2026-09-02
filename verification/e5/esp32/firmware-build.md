# ESP32 Fixture Build Evidence（no upload）

| Field | Value |
|---|---|
| **TASK** | E5-ENV-UNIFIED-001 |
| **Project** | `hardware/esp32/LightBLE` |
| **Git SHA** | `f2c2feb` |
| **PlatformIO** | 6.1.18 |
| **Board** | esp32dev |
| **Upload** | **NOT EXECUTED** |

## Commands

```bash
export PATH="$HOME/.platformio/penv/bin:$PATH"
cd hardware/esp32/LightBLE
pio run -e fixture_peripheral -e fixture_observer
```

## Binaries（local only — not committed）

| Env | Path | SHA256 | Size |
|---|---|---|---|
| fixture_peripheral | `.pio/build/fixture_peripheral/firmware.bin` | `c72b9cf2de8b96fb7fcb0bd7173fb18e1f2a89edd2f838365316e34eed4da36b` | 674960 |
| fixture_observer | `.pio/build/fixture_observer/firmware.bin` | `3301110c90bb478b3b71990af441e0bd09cd6ee796b98b40ac64d563378efc5d` | 639328 |

## Serial

| Field | Value |
|---|---|
| serial_available | **false** |
| Status | **BLOCKED_BY_HARDWARE** |

## Conclusion

Firmware **build** READY；ESP32 **board/serial** BLOCKED → shared E5 cannot run.
