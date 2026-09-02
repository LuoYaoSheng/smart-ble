#pragma once

#include <Arduino.h>
#include <NimBLEServer.h>
#include <string>

enum BlinkPattern : int {
    BLINK_OFF = 0,
    BLINK_SOLID = 1,
    BLINK_FAST = 2,
    BLINK_SLOW = 3,
};

struct FaultInjectionState {
    bool delayed_response = false;
    bool disconnect_on_write = false;
    unsigned long delayMs = 2000;
};

FaultInjectionState& faultInjectionState();

void testControlBegin(uint8_t ledPin);
void testControlLoop();
int testControlBlinkPattern();
void testControlSetBlinkPattern(int pattern);
bool testControlLedOn();

// Apply write payload (HEX FF0x, text, or JSON). Returns true if handled.
bool testControlHandleWrite(
    const std::string& value,
    NimBLEServer* server,
    String& responseJson
);
