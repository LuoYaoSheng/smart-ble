#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

String buildDeviceInfoJson();
void fillDeviceInfoDocument(JsonDocument& doc);
