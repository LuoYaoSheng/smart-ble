#pragma once

#include <Arduino.h>
#include "observer_parser.h"

void observerEmitJson(const char* json);
void observerEmitBoot();
void observerEmitScanEvent(const char* event);
void observerEmitError(const char* code, const char* message);
void observerEmitAdvertisement(
    const char* address,
    int rssi,
    const ParsedAdvertisement& parsed,
    bool fixtureMatch,
    bool otaMatch
);
