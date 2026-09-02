#include "test_control.h"

#include <ArduinoJson.h>
#include "fixture_config.h"
#include "serial_events.h"

static uint8_t s_ledPin = LED_PIN;
static int s_blinkPattern = BLINK_OFF;
static bool s_ledState = false;
static unsigned long s_lastBlinkTime = 0;
static FaultInjectionState s_faults;

FaultInjectionState& faultInjectionState() {
    return s_faults;
}

void testControlBegin(uint8_t ledPin) {
    s_ledPin = ledPin;
    pinMode(s_ledPin, OUTPUT);
    digitalWrite(s_ledPin, LOW);
    s_blinkPattern = BLINK_OFF;
}

void testControlSetBlinkPattern(int pattern) {
    s_blinkPattern = pattern;
    if (pattern == BLINK_SOLID) {
        digitalWrite(s_ledPin, HIGH);
        s_ledState = true;
    } else if (pattern == BLINK_OFF) {
        digitalWrite(s_ledPin, LOW);
        s_ledState = false;
    }
}

int testControlBlinkPattern() {
    return s_blinkPattern;
}

bool testControlLedOn() {
    return digitalRead(s_ledPin) == HIGH;
}

void testControlLoop() {
    unsigned long currentTime = millis();
    switch (s_blinkPattern) {
        case BLINK_SOLID:
            digitalWrite(s_ledPin, HIGH);
            break;
        case BLINK_FAST:
            if (currentTime - s_lastBlinkTime >= 200) {
                s_ledState = !s_ledState;
                digitalWrite(s_ledPin, s_ledState);
                s_lastBlinkTime = currentTime;
            }
            break;
        case BLINK_SLOW:
            if (currentTime - s_lastBlinkTime >= 1000) {
                s_ledState = !s_ledState;
                digitalWrite(s_ledPin, s_ledState);
                s_lastBlinkTime = currentTime;
            }
            break;
        default:
            digitalWrite(s_ledPin, LOW);
            break;
    }
}

static void applyLedValue(const String& value) {
    String v = value;
    v.toLowerCase();
    if (v == "on" || v == "led_on" || v == "开灯") {
        testControlSetBlinkPattern(BLINK_SOLID);
        emitSerialEvent("led", "on");
    } else if (v == "off" || v == "led_off" || v == "关灯") {
        testControlSetBlinkPattern(BLINK_OFF);
        emitSerialEvent("led", "off");
    } else if (v == "blink" || v == "fast" || v == "blink_fast") {
        testControlSetBlinkPattern(BLINK_FAST);
        emitSerialEvent("led", "blink_fast");
    } else if (v == "slow" || v == "blink_slow") {
        testControlSetBlinkPattern(BLINK_SLOW);
        emitSerialEvent("led", "blink_slow");
    }
}

static bool handleJsonCommand(const std::string& value, NimBLEServer* server, String& responseJson) {
    StaticJsonDocument<256> in;
    DeserializationError err = deserializeJson(in, value.c_str());
    if (err) return false;

    const char* cmd = in["cmd"] | "";
    if (strcmp(cmd, "led") == 0) {
        const char* ledValue = in["value"] | "";
        applyLedValue(String(ledValue));
    } else if (strcmp(cmd, "fault") == 0) {
        // Basic fault injection entry (ESP32-FAULT-001 expands matrix)
        const char* type = in["type"] | "";
        if (strcmp(type, "disconnect") == 0 || strcmp(type, "disconnect_on_write") == 0) {
            s_faults.disconnect_on_write = true;
            if (server) {
                emitSerialEvent("err", "disconnect_on_write");
                server->disconnect(0);
            }
        } else if (strcmp(type, "delay") == 0 || strcmp(type, "delayed_response") == 0) {
            s_faults.delayed_response = true;
            emitSerialEvent("err", "delayed_response");
        } else if (strcmp(type, "clear") == 0) {
            s_faults.delayed_response = false;
            s_faults.disconnect_on_write = false;
            emitSerialEvent("err", "none");
        }
    } else {
        return false;
    }

    StaticJsonDocument<256> out;
    out["type"] = "write_response";
    out["command"] = cmd;
    out["led_state"] = testControlLedOn() ? "on" : "off";
    out["blink_pattern"] = s_blinkPattern;
    out["fault_delayed_response"] = s_faults.delayed_response;
    out["fault_disconnect_on_write"] = s_faults.disconnect_on_write;
    serializeJson(out, responseJson);
    return true;
}

bool testControlHandleWrite(
    const std::string& value,
    NimBLEServer* server,
    String& responseJson
) {
    if (value.empty()) return false;

    if (s_faults.delayed_response) {
        delay(s_faults.delayMs);
    }
    if (s_faults.disconnect_on_write && server) {
        emitSerialEvent("err", "disconnect_on_write");
        server->disconnect(0);
        StaticJsonDocument<128> out;
        out["type"] = "write_response";
        out["status"] = "disconnected";
        serializeJson(out, responseJson);
        return true;
    }

    if (!value.empty() && value[0] == '{') {
        if (handleJsonCommand(value, server, responseJson)) return true;
    }

    if (value.length() == 2) {
        uint8_t cmd = static_cast<uint8_t>(value[0]);
        uint8_t param = static_cast<uint8_t>(value[1]);
        if (cmd == 0xFF) {
            if (param == 0x00) {
                testControlSetBlinkPattern(BLINK_OFF);
                emitSerialEvent("led", "off");
            } else if (param == 0x01) {
                testControlSetBlinkPattern(BLINK_SOLID);
                emitSerialEvent("led", "on");
            } else if (param == 0x02) {
                testControlSetBlinkPattern(BLINK_FAST);
                emitSerialEvent("led", "blink_fast");
            } else if (param == 0x03) {
                testControlSetBlinkPattern(BLINK_SLOW);
                emitSerialEvent("led", "blink_slow");
            }
            StaticJsonDocument<200> out;
            out["type"] = "write_response";
            char hexStr[8];
            snprintf(hexStr, sizeof(hexStr), "FF%02X", param);
            out["command"] = hexStr;
            out["led_state"] = testControlLedOn() ? "on" : "off";
            out["blink_pattern"] = s_blinkPattern;
            serializeJson(out, responseJson);
            return true;
        }
    }

    String text(value.c_str());
    if (text == "开灯" || text == "LED_ON" || text.equalsIgnoreCase("on")) {
        applyLedValue("on");
    } else if (text == "关灯" || text == "LED_OFF" || text.equalsIgnoreCase("off")) {
        applyLedValue("off");
    } else if (text == "BLINK" || text.equalsIgnoreCase("blink")) {
        applyLedValue("blink");
    } else {
        applyLedValue(text);
    }

    StaticJsonDocument<200> out;
    out["type"] = "write_response";
    out["command"] = text;
    out["led_state"] = testControlLedOn() ? "on" : "off";
    out["blink_pattern"] = s_blinkPattern;
    serializeJson(out, responseJson);
    return true;
}
