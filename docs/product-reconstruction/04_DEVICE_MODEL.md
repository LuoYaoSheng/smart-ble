# DEVICE MODEL

所有BLE设备统一模型：

```text
Device
 ├─ id
 ├─ name
 ├─ address
 ├─ RSSI
 ├─ advertisement
 ├─ services
 ├─ characteristics
 ├─ capabilities
 ├─ profiles
 └─ connectionState
```

## Device原则

任何设备首先是BLE Device。

Profile只是能力扩展。

生命周期：

Scan → Identify → Connect → Discover → Operate

## Capability

基础能力：

- scan
- advertise
- connect
- gatt
- notify
- write
- ota

Profile能力：

- Smart HID
- Bike VCU
- 其他未来设备
