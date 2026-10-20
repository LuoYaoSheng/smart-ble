#pragma once
#include <cassert>
#include <vector>
#include "NimBLECharacteristic.h"
struct FakeUpdate {
    bool beginFails = false, writeFails = false, endFails = false;
    bool active = false, bootSelected = false;
    unsigned beginCount = 0, endCount = 0, abortCount = 0;
    size_t expected = 0;
    std::vector<uint8_t> bytes;
    bool begin(size_t count) { assert(!inBleCallback); ++beginCount; expected = count; bytes.clear(); active = !beginFails; return active; }
    size_t write(const uint8_t* data, size_t count) { assert(!inBleCallback); if (!active || writeFails) return 0; bytes.insert(bytes.end(), data, data + count); return count; }
    bool end(bool allowPartial) { assert(!inBleCallback); assert(!allowPartial); ++endCount; if (!active || endFails || bytes.size() != expected) return false; active = false; bootSelected = true; return true; }
    void abort() { assert(!inBleCallback); active = false; ++abortCount; }
};
inline FakeUpdate Update;
