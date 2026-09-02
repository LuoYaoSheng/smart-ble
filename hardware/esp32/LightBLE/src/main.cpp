#include <Arduino.h>

#include "ble_peripheral.h"
#include "serial_events.h"

void setup() {
    Serial.begin(115200);
    emitBootInfo();
    Serial.println("Starting BLE Peripheral Fixture...");
    blePeripheralBegin();
    Serial.println("BLE Peripheral Fixture is ready!");
}

void loop() {
    blePeripheralLoop();
    delay(10);
}
