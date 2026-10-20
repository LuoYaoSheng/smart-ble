#include <Arduino.h>
#include <esp_ota_ops.h>

#include "ble_peripheral.h"
#include "serial_events.h"

void setup() {
    Serial.begin(115200);
    emitBootInfo();
    Serial.println("Starting BLE Peripheral Fixture...");
    blePeripheralBegin();
    // Confirm only after initialization returns. This is a startup check, not
    // proof of BLE/OTA health; automatic rollback still requires real-device tests.
    esp_ota_mark_app_valid_cancel_rollback();
    Serial.println("BLE Peripheral Fixture is ready!");
}

void loop() {
    blePeripheralLoop();
    delay(10);
}
