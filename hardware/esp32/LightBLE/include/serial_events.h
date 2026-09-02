#pragma once

#include <Arduino.h>

void emitSerialJson(const char* json);
void emitBootInfo();
void emitSerialEvent(const char* type, const char* status = nullptr);
void emitBleEvent(const char* event);
