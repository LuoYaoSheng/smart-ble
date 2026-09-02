#include "observer_events.h"

#include <ArduinoJson.h>
#include "firmware_build_info.h"
#include "fixture_config.h"

void observerEmitJson(const char* json) {
    Serial.println(json);
}

void observerEmitBoot() {
    StaticJsonDocument<256> doc;
    doc["type"] = "boot";
    doc["firmware_name"] = FW_FIRMWARE_NAME;
    doc["firmware_version"] = FW_VERSION;
    doc["git_sha"] = FW_GIT_SHA;
    doc["fixture_role"] = FIXTURE_ROLE_OBSERVER;
    doc["name"] = DEVICE_OBSERVER_NAME;
    String out;
    serializeJson(doc, out);
    observerEmitJson(out.c_str());
}

void observerEmitScanEvent(const char* event) {
    StaticJsonDocument<128> doc;
    doc["type"] = "scan";
    doc["event"] = event;
    doc["timestamp"] = millis();
    String out;
    serializeJson(doc, out);
    observerEmitJson(out.c_str());
}

void observerEmitError(const char* code, const char* message) {
    StaticJsonDocument<192> doc;
    doc["type"] = "error";
    doc["code"] = code;
    doc["message"] = message;
    doc["timestamp"] = millis();
    String out;
    serializeJson(doc, out);
    observerEmitJson(out.c_str());
}

void observerEmitAdvertisement(
    const char* address,
    int rssi,
    const ParsedAdvertisement& parsed,
    bool fixtureMatch,
    bool otaMatch
) {
    StaticJsonDocument<768> doc;
    unsigned long now = millis();

    // Task schema
    doc["type"] = "advertisement";
    doc["address"] = address;
    doc["name"] = parsed.name;
    doc["rssi"] = rssi;
    JsonArray services = doc.createNestedArray("services");
    for (const auto& svc : parsed.services) {
        services.add(svc);
    }
    doc["manufacturer"] = parsed.manufacturerHex;
    doc["timestamp"] = now;

    // Contract-compatible Observer fields (PROTO-009)
    doc["t"] = "obs";
    doc["ts"] = now;
    JsonArray uuids = doc.createNestedArray("uuids");
    for (const auto& svc : parsed.services) {
        uuids.add(svc);
    }
    doc["mfg"] = parsed.manufacturerHex;
    doc["svc_data"] = parsed.serviceDataHex;
    doc["raw"] = parsed.rawHex;
    doc["last_seen"] = now;

    doc["fixture_match"] = fixtureMatch;
    doc["ota_service_match"] = otaMatch;

    String out;
    serializeJson(doc, out);
    observerEmitJson(out.c_str());
}
