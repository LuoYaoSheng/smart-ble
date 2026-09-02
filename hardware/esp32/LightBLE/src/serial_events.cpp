#include "serial_events.h"

#include <ArduinoJson.h>
#include "firmware_build_info.h"
#include "fixture_config.h"

void emitSerialJson(const char* json) {
    Serial.println(json);
}

void emitBootInfo() {
    StaticJsonDocument<256> doc;
    doc["type"] = "boot";
    doc["firmware_name"] = FW_FIRMWARE_NAME;
    doc["firmware_version"] = FW_VERSION;
    doc["git_sha"] = FW_GIT_SHA;
    doc["fixture_role"] = FIXTURE_ROLE_PERIPHERAL;
    String out;
    serializeJson(doc, out);
    emitSerialJson(out.c_str());
}

void emitSerialEvent(const char* type, const char* status) {
    StaticJsonDocument<128> doc;
    doc["type"] = type;
    if (status != nullptr) {
        doc["status"] = status;
    }
    doc["ts"] = millis();
    String out;
    serializeJson(doc, out);
    emitSerialJson(out.c_str());
}

void emitBleEvent(const char* event) {
    StaticJsonDocument<128> doc;
    doc["type"] = "ble";
    doc["event"] = event;
    doc["ts"] = millis();
    String out;
    serializeJson(doc, out);
    emitSerialJson(out.c_str());
}
