#include <Arduino.h>

#include "observer_events.h"
#include "observer_scanner.h"

void setup() {
    Serial.begin(115200);
    delay(100);
    observerEmitBoot();
    Serial.println("Starting BLE Observer Fixture...");
    observerScannerBegin();
    Serial.println("BLE Observer Fixture is ready!");
}

void loop() {
    observerScannerLoop();
    delay(10);
}
