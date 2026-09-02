#include "observer_scanner.h"

#include <NimBLEDevice.h>
#include <NimBLEScan.h>
#include <NimBLEAdvertisedDevice.h>

#include "fixture_config.h"
#include "observer_events.h"
#include "observer_parser.h"

// Default stable scan parameters (units of 0.625ms)
static const uint16_t kScanInterval = 160; // 100ms
static const uint16_t kScanWindow = 80;    // 50ms
static const uint32_t kScanDurationSec = 0; // continuous
static const unsigned long kScanRestartMs = 3000;

static NimBLEScan* s_scan = nullptr;
static bool s_running = false;
static bool s_faultTimeout = false;
static bool s_faultError = false;
static unsigned long s_scanStartedAt = 0;
static unsigned long s_lastRestartAt = 0;

class ObserverAdvertisedCallbacks : public NimBLEAdvertisedDeviceCallbacks {
    void onResult(NimBLEAdvertisedDevice* advertisedDevice) override {
        if (!advertisedDevice) return;

        String address = advertisedDevice->getAddress().toString().c_str();
        int rssi = advertisedDevice->getRSSI();
        ParsedAdvertisement parsed;

        // Prefer raw payload parse when available
        uint8_t* payloadPtr = advertisedDevice->getPayload();
        size_t payloadLen = advertisedDevice->getPayloadLength();
        if (payloadPtr && payloadLen > 0) {
            parsed = parseAdvertisementPayload(payloadPtr, payloadLen);
        }

        if (parsed.name.isEmpty() && advertisedDevice->haveName()) {
            parsed.name = advertisedDevice->getName().c_str();
            parsed.hasCompleteName = true;
        }

        if (advertisedDevice->haveManufacturerData() && parsed.manufacturerHex.isEmpty()) {
            std::string mfg = advertisedDevice->getManufacturerData();
            parsed.manufacturerHex = bytesToHex(
                reinterpret_cast<const uint8_t*>(mfg.data()),
                mfg.size()
            );
        }

        if (advertisedDevice->getServiceUUIDCount() > 0) {
            for (int i = 0; i < advertisedDevice->getServiceUUIDCount(); i++) {
                String uuid = advertisedDevice->getServiceUUID(i).toString().c_str();
                bool exists = false;
                for (const auto& svc : parsed.services) {
                    if (svc.equalsIgnoreCase(uuid)) {
                        exists = true;
                        break;
                    }
                }
                if (!exists) parsed.services.push_back(uuid);
            }
        }

        bool fixtureMatch = computeFixtureMatch(parsed);
        bool otaMatch = matchesOtaService(parsed.services);
        observerEmitAdvertisement(address.c_str(), rssi, parsed, fixtureMatch, otaMatch);
    }
};

void observerFaultSetScanTimeout(bool enabled) {
    s_faultTimeout = enabled;
}

void observerFaultSetScanError(bool enabled) {
    s_faultError = enabled;
}

bool observerScannerIsRunning() {
    return s_running;
}

void observerScannerStop() {
    if (s_scan && s_running) {
        s_scan->stop();
        s_running = false;
        observerEmitScanEvent("stopped");
    }
}

static bool startScanInternal() {
    if (s_faultError) {
        observerEmitError("SCAN_ERROR", "fault injection: scan error");
        return false;
    }

    if (!s_scan) {
        observerEmitError("SCAN_ERROR", "scan not initialized");
        return false;
    }

    bool ok = s_scan->start(kScanDurationSec, nullptr, false);
    if (!ok) {
        observerEmitError("SCAN_ERROR", "failed to start NimBLE scan");
        s_running = false;
        return false;
    }

    s_running = true;
    s_scanStartedAt = millis();
    observerEmitScanEvent("started");
    return true;
}

void observerScannerBegin() {
    // Self-identify as Observer; do not expose Peripheral GATT services
    NimBLEDevice::init(DEVICE_OBSERVER_NAME);
    NimBLEDevice::setPower(ESP_PWR_LVL_P9);

    s_scan = NimBLEDevice::getScan();
    s_scan->setAdvertisedDeviceCallbacks(new ObserverAdvertisedCallbacks(), true);
    s_scan->setActiveScan(true);
    s_scan->setInterval(kScanInterval);
    s_scan->setWindow(kScanWindow);
    s_scan->setMaxResults(0);

    startScanInternal();
}

void observerScannerLoop() {
    if (s_faultTimeout && s_running && (millis() - s_scanStartedAt > 5000)) {
        observerScannerStop();
        observerEmitError("SCAN_TIMEOUT", "fault injection: scan timeout");
        s_faultTimeout = false;
        return;
    }

    // Keep continuous scan alive if the stack stops unexpectedly
    if (!s_running && (millis() - s_lastRestartAt > kScanRestartMs)) {
        s_lastRestartAt = millis();
        startScanInternal();
    }
}
