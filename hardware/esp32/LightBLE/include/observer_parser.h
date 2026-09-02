#pragma once

#include <Arduino.h>
#include <vector>
#include <string>

struct ParsedAdvertisement {
    String name;
    std::vector<String> services;
    String manufacturerHex;
    String serviceDataHex;
    String rawHex;
    bool hasCompleteName = false;
    bool hasShortName = false;
};

String bytesToHex(const uint8_t* data, size_t len);
ParsedAdvertisement parseAdvertisementPayload(const uint8_t* data, size_t len);

bool matchesPeripheralName(const String& name);
bool matchesOtaService(const std::vector<String>& services);
bool matchesMainService(const std::vector<String>& services);
bool computeFixtureMatch(const ParsedAdvertisement& parsed);
