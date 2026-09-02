#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <NimBLECharacteristic.h>
#include <functional>

#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "1.0.0"
#endif

// Target OTA service / characteristics (exact UUID match — no prefix logic)
#define OTA_SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914d"
#define OTA_CHAR_CTRL_UUID "beb5483e-36e1-4688-b7f5-ea07361b26c0"
#define OTA_CHAR_DATA_UUID "beb5483e-36e1-4688-b7f5-ea07361b26c1"
#define OTA_CHAR_STATUS_UUID "beb5483e-36e1-4688-b7f5-ea07361b26c2"

#define OTA_TARGET_PERIPHERAL "lightble-peripheral"
#define OTA_TARGET_OBSERVER "lightble-observer"

enum OtaState : uint8_t {
    OTA_IDLE = 0,
    OTA_STARTING,
    OTA_READY,
    OTA_RECEIVING,
    OTA_COMMITTING,
    OTA_SUCCESS,
    OTA_FAILED,
    OTA_ABORTED,
};

struct OtaFaultFlags {
    bool wrongSize = false;
    bool wrongHash = false;
    bool commitFail = false;
    bool abortNext = false;
    bool timeoutNext = false;
    bool disconnectNext = false;
};

class OtaServer {
public:
    using SerialEventFn = std::function<void(const char* json)>;

    void begin(
        NimBLECharacteristic* ctrl,
        NimBLECharacteristic* data,
        NimBLECharacteristic* status,
        SerialEventFn serialEvent = nullptr
    );

    OtaState state() const { return _state; }
    size_t expectedSize() const { return _expectedSize; }
    size_t receivedSize() const { return _receivedSize; }
    const String& targetVersion() const { return _targetVersion; }
    const String& expectedSha256() const { return _expectedSha256; }

    OtaFaultFlags& faults() { return _faults; }

    void onDisconnect();
    void loop();

    String activeFirmwareVersion() const;

private:
    NimBLECharacteristic* _ctrl = nullptr;
    NimBLECharacteristic* _data = nullptr;
    NimBLECharacteristic* _status = nullptr;
    SerialEventFn _serialEvent;

    OtaState _state = OTA_IDLE;
    OtaFaultFlags _faults;
    size_t _expectedSize = 0;
    size_t _receivedSize = 0;
    size_t _chunkSize = 180;
    String _target;
    String _targetVersion;
    String _expectedSha256;
    unsigned long _lastProgressMs = 0;
    bool _restartPending = false;
    unsigned long _restartAt = 0;

    void resetSession(bool abortUpdate);
    void setState(OtaState next);
    void emitSerialEvent(const char* stateName);
    void notifyStatus(
        const char* status,
        const char* code = nullptr,
        const char* detail = nullptr,
        bool includeProgress = false,
        bool rebooting = false
    );

    void handleCtrlRead(NimBLECharacteristic* characteristic);
    void handleCtrlWrite(NimBLECharacteristic* characteristic);
    void handleDataWrite(NimBLECharacteristic* characteristic);

    bool validateSha256Hex(const char* sha) const;
    bool handleStart(const JsonDocument& doc, String& errorCode, String& errorDetail);
    bool handleCommit(String& errorCode, String& errorDetail);
    void handleAbort();

    class CtrlCallbacks;
    class DataCallbacks;
    CtrlCallbacks* _ctrlCallbacks = nullptr;
    DataCallbacks* _dataCallbacks = nullptr;
};

OtaServer& otaServerInstance();
