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
    } else if (data[0] == 0x01) {
        // Toggle Command via GATT Write
        printf("SmartBLE: Received GATT Toggle CMD: %d\n", data[1]);
        // BSP_SetLedStatus((data[1] == 0) ? LED_OFF : LED_ON);
    } else if (data[0] == 0x02 && length >= 4) {
        // RGB Color Command via GATT Write 
        printf("SmartBLE: Received GATT RGB Update: R=%d, G=%d, B=%d\n", data[1], data[2], data[3]);
        // simulate PWM adjustment
    } else {
        printf("SmartBLE: Received Unknown Command [0x%02X]\n", data[0]);
    }
}
