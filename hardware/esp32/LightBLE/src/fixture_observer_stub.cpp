#include <Arduino.h>
#include <ArduinoJson.h>
#include "firmware_build_info.h"

static void emitSerialJson(const char* json) {
    Serial.println(json);
}

void setup() {
    Serial.begin(115200);
    delay(100);

    StaticJsonDocument<256> doc;
    doc["type"] = "boot";
    doc["firmware_name"] = FW_FIRMWARE_NAME;
    doc["firmware_version"] = FW_VERSION;
    doc["git_sha"] = FW_GIT_SHA;
    doc["fixture_role"] = "observer";
    doc["status"] = "build_scaffold";
    String out;
    serializeJson(doc, out);
    emitSerialJson(out.c_str());
}

void loop() {
    delay(1000);
}
