#ifndef BLE_SERVICE_H
#define BLE_SERVICE_H

#include <stdint.h>

typedef enum {
    BLE_DISCONNECTED,
    BLE_CONNECTED
} BleConnectionStatus_t;

void BleService_Init(void);
BleConnectionStatus_t BleService_GetStatus(void);
void BleService_NotifyData(uint8_t* payload, uint16_t len);

#endif // BLE_SERVICE_H
