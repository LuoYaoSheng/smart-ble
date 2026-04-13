#ifndef SMART_BLE_PROTOCOL_H
#define SMART_BLE_PROTOCOL_H

#include <stdint.h>

/**
 * SmartBLE Cross-Platform Alignment Protcol
 * These UUIDs must exactly match the frontend constants defined in:
 * - apps/flutter/lib/core/models/ble_uuids.dart
 * - core/ble-core/desktop-shared/BleUtils.js
 */

// Custom SmartBLE OTA Service
#define SMART_BLE_SERVICE_OTA "4fafc201-1fb5-459e-8fcc-c5c9c331914d"

// OTA Characteristics
#define SMART_BLE_CHAR_OTA_CONTROL "beb5483e-36e1-4688-b7f5-ea07361b26c0"
#define SMART_BLE_CHAR_OTA_DATA    "beb5483e-36e1-4688-b7f5-ea07361b26c1"
#define SMART_BLE_CHAR_OTA_STATUS  "beb5483e-36e1-4688-b7f5-ea07361b26c2"

// Control Commands (HEX)
#define OTA_CMD_START 0x01
#define OTA_CMD_END   0x02
#define OTA_CMD_ABORT 0x03

void SmartBle_Protocol_Init(void);
void SmartBle_Protocol_HandleWrite(uint8_t* data, uint16_t length);

#endif // SMART_BLE_PROTOCOL_H
