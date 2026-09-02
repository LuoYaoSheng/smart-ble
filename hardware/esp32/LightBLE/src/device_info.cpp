#include "device_info.h"

#include "fixture_config.h"
#include "firmware_build_info.h"
#include "ota_server.h"

void fillDeviceInfoDocument(JsonDocument& doc) {
    doc["firmware_version"] = otaServerInstance().activeFirmwareVersion();
    doc["hardware"] = DEVICE_HARDWARE;
    doc["uptime"] = millis() / 1000;
    doc["uptime_s"] = millis() / 1000;
    doc["fixture_role"] = FIXTURE_ROLE_PERIPHERAL;
    doc["name"] = DEVICE_NAME;
    doc["type"] = "system_info";
}

String buildDeviceInfoJson() {
    StaticJsonDocument<256> doc;
    fillDeviceInfoDocument(doc);
    String out;
    serializeJson(doc, out);
    return out;
}
