#include "smart_ble_protocol.h"
#include <stdio.h>

void SmartBle_Protocol_Init(void) {
    // Register the 4FAFC201... UUID with the STM32WB BLE Stack
    // (This is a mock abstraction. The actual HW init happens in CubeMX code)
    printf("SmartBLE Protocol Init: Registered OTA Service.\n");
}

void SmartBle_Protocol_HandleWrite(uint8_t* data, uint16_t length) {
    if (length == 0) return;
    
    if (data[0] == OTA_CMD_START) {
        printf("SmartBLE: Received OTA START.\n");
    } else if (data[0] == OTA_CMD_END) {
        printf("SmartBLE: Received OTA END.\n");
    }
}
