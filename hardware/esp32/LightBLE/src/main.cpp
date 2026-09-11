#include <Arduino.h>
#include <esp_ota_ops.h>

#include "ble_peripheral.h"
#include "serial_events.h"

void setup() {
    Serial.begin(115200);
    emitBootInfo();
    // DEV-014d：W5 真机实证——OTA 后的新镜像若不在首次启动时 confirm，
    // bootloader 在下一次复位会自动回滚旧分区（boot 帧版本回落 1.0.0），
    // 升级结果随重启丢失。幂等调用：无 pending 回滚时为空操作。
    esp_ota_mark_app_valid_cancel_rollback();
    Serial.println("Starting BLE Peripheral Fixture...");
    blePeripheralBegin();
    Serial.println("BLE Peripheral Fixture is ready!");
}

void loop() {
    blePeripheralLoop();
    delay(10);
}
