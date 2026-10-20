#pragma once
#include <algorithm>
#include <atomic>
#include <cctype>
#include <cstdint>
#include <cstring>
#include <cstdio>
#include <string>
class String : public std::string {
public:
    using std::string::string;
    String(const std::string& text) : std::string(text) {}
    void toLowerCase() { std::transform(begin(), end(), begin(), [](unsigned char c) { return std::tolower(c); }); }
    size_t write(uint8_t value) { push_back(value); return 1; }
    size_t write(const uint8_t* bytes, size_t count) { append(reinterpret_cast<const char*>(bytes), count); return count; }
};
inline std::atomic<unsigned long> fakeMillis{1};
inline unsigned long millis() { return fakeMillis.load(); }
struct FakeESP { bool restarted = false; void restart() { restarted = true; } };
inline FakeESP ESP;
#include <ArduinoJson.h>
inline void convertToJson(const String& value, ArduinoJson::JsonVariant output) { output.set(static_cast<const std::string&>(value)); }
