# 当前 ESP32 实现盘点（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 533f6380d58101d7514b159f5f99ab44cb537c34731a2d354416d91c7b7fe64c
```

对照：`contracts/target/ble-fixture-target.json` ↔ `hardware/esp32/LightBLE/src/main.cpp`

## Build

- platformio.ini envs: `esp32dev`
- 目标 modes: fixture_peripheral / fixture_observer
- upload_port: `COM3`
- status: CONFIRMED_PARTIAL
- first_breakpoint: 仅 env:esp32dev 且 upload_port=COM3
- task: ESP32-BUILD-001

## 名称

- DEVICE_NAME macro: `BLEToolkit-Server`
- NimBLEDevice::init: `ESP32-BLE-Server`
- Observer 名存在: false
- 宏与 init 不一致: true

## Services / Characteristics

### SVC-01 (`4fafc201-1fb5-459e-8fcc-c5c9c331914b`)

- Control `beb5483e-36e1-4688-b7f5-ea07361b26a8` props=read,write,notify present_in_firmware=true
- StatusNotify `beb5483e-36e1-4688-b7f5-ea07361b26a9` props=write,notify present_in_firmware=true

### SVC-02 (`4fafc201-1fb5-459e-8fcc-c5c9c331914c`)

- READ_ONLY `beb5483e-36e1-4688-b7f5-ea07361b26b0` props=read present_in_firmware=true
- WRITE_ONLY `beb5483e-36e1-4688-b7f5-ea07361b26b1` props=write present_in_firmware=true
- NOTIFY_ONLY `beb5483e-36e1-4688-b7f5-ea07361b26b2` props=notify present_in_firmware=true
- READ_WRITE `beb5483e-36e1-4688-b7f5-ea07361b26b3` props=read,write present_in_firmware=true
- READ_NOTIFY `beb5483e-36e1-4688-b7f5-ea07361b26b4` props=read,notify present_in_firmware=true
- WRITE_NOTIFY `beb5483e-36e1-4688-b7f5-ea07361b26b5` props=write,notify present_in_firmware=true
- ALL `beb5483e-36e1-4688-b7f5-ea07361b26b6` props=read,write,notify present_in_firmware=true

### SVC-03 (`4fafc201-1fb5-459e-8fcc-c5c9c331914d`)

- OTA Control `beb5483e-36e1-4688-b7f5-ea07361b26c0` props=read,write present_in_firmware=true
- OTA Data `beb5483e-36e1-4688-b7f5-ea07361b26c1` props=write_no_response present_in_firmware=true
- OTA Status `beb5483e-36e1-4688-b7f5-ea07361b26c2` props=read,notify present_in_firmware=true


## LED

- FF00 present=false effect=state=off
- FF01 present=false effect=state=on
- FF02 present=false effect=200ms 快闪
- FF03 present=false effect=1000ms 慢闪

## OTA 固件字段

- 当前字段风格: action
- 目标字段: op
- 客户端写 CTRL: false
- 客户端包校验: false

## Fault Injection

- delayed_response: CONFIRMED_MISSING
- disconnect_on_write: CONFIRMED_MISSING
- reject_write: CONFIRMED_MISSING
- notify_burst: CONFIRMED_MISSING
- ota_wrong_size: CONFIRMED_MISSING
- ota_fail_commit: CONFIRMED_MISSING
- ota_no_success: CONFIRMED_MISSING

## Observer

- present: false
- severity 分类: **P1**（无公开危害证据时不标 P0）
- task: ESP32-OBSERVER-001

## Artifact

- manifest_present: false
- status: CONFIRMED_MISSING

## PROTO 映射

仅使用 PROTO-001..011；UUID 仅作为 protocol_member / implementation_ref，不是 target_id。
