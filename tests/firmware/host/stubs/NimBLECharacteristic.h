#pragma once
#include <string>
#include <vector>
#include <mutex>
#include <atomic>
class NimBLECharacteristic;
inline thread_local bool inBleCallback = false;
class NimBLECharacteristicCallbacks {
public:
    virtual ~NimBLECharacteristicCallbacks() = default;
    virtual void onRead(NimBLECharacteristic*) {}
    virtual void onWrite(NimBLECharacteristic*) {}
};
class NimBLECharacteristic {
    std::mutex mutex;
    std::string value;
public:
    NimBLECharacteristicCallbacks* callbacks = nullptr;
    std::vector<std::string> notifications;
    void setCallbacks(NimBLECharacteristicCallbacks* cb) { callbacks = cb; }
    void setValue(const uint8_t* bytes, size_t count) { std::lock_guard<std::mutex> lock(mutex); value.assign(reinterpret_cast<const char*>(bytes), count); }
    template<size_t N> void setValue(const char (&text)[N]) { setValue(reinterpret_cast<const uint8_t*>(text), N - 1); }
    std::string getValue() { std::lock_guard<std::mutex> lock(mutex); return value; }
    void notify() { notifications.push_back(getValue()); }
    void write(const std::string& bytes) {
        setValue(reinterpret_cast<const uint8_t*>(bytes.data()), bytes.size());
        inBleCallback = true;
        callbacks->onWrite(this);
        inBleCallback = false;
    }
};
