#include "ota_server.h"

#include <ArduinoJson.h>
#include <Update.h>
#include <Preferences.h>
#include <mbedtls/sha256.h>

static const char* kOtaNvsNamespace = "smart_ble";
static const char* kOtaNvsVersionKey = "fw_version";
static const char* kBuildFirmwareVersion = FIRMWARE_VERSION;

static OtaServer gOtaServer;

OtaServer& otaServerInstance() {
    return gOtaServer;
}

static String stateName(OtaState state) {
    switch (state) {
        case OTA_IDLE: return "idle";
        case OTA_STARTING: return "starting";
        case OTA_READY: return "ready";
        case OTA_RECEIVING: return "receiving";
        case OTA_COMMITTING: return "committing";
        case OTA_SUCCESS: return "success";
        case OTA_FAILED: return "failed";
        case OTA_ABORTED: return "aborted";
        default: return "unknown";
    }
}

class OtaServer::CtrlCallbacks : public NimBLECharacteristicCallbacks {
public:
    explicit CtrlCallbacks(OtaServer& owner) : _owner(owner) {}

    void onRead(NimBLECharacteristic* characteristic) override {
        _owner.handleCtrlRead(characteristic);
    }

    void onWrite(NimBLECharacteristic* characteristic) override {
        _owner.handleCtrlWrite(characteristic);
    }

private:
    OtaServer& _owner;
};

class OtaServer::DataCallbacks : public NimBLECharacteristicCallbacks {
public:
    explicit DataCallbacks(OtaServer& owner) : _owner(owner) {}

    void onWrite(NimBLECharacteristic* characteristic) override {
        _owner.handleDataWrite(characteristic);
    }

private:
    OtaServer& _owner;
};

String OtaServer::activeFirmwareVersion() const {
    Preferences prefs;
    if (prefs.begin(kOtaNvsNamespace, true)) {
        String stored = prefs.getString(kOtaNvsVersionKey, "");
        prefs.end();
        if (stored.length() > 0) {
            return stored;
        }
    }
    return String(kBuildFirmwareVersion);
}

void OtaServer::begin(
    NimBLECharacteristic* ctrl,
    NimBLECharacteristic* data,
    NimBLECharacteristic* status,
    SerialEventFn serialEvent
) {
    _ctrl = ctrl;
    _data = data;
    _status = status;
    _serialEvent = serialEvent;

    _ctrlCallbacks = new CtrlCallbacks(*this);
    _dataCallbacks = new DataCallbacks(*this);

    _ctrl->setCallbacks(_ctrlCallbacks);
    _data->setCallbacks(_dataCallbacks);
    _ctrl->setValue("{\"type\":\"ota\",\"status\":\"idle\"}");
    _status->setValue("{\"type\":\"ota\",\"status\":\"idle\"}");
}

void OtaServer::setState(OtaState next) {
    _state = next;
    emitSerialEvent(stateName(next).c_str());
}

void OtaServer::emitSerialEvent(const char* stateLabel) {
    if (!_serialEvent) {
        return;
    }
    StaticJsonDocument<192> doc;
    doc["type"] = "ota";
    doc["state"] = stateLabel;
    doc["received"] = _receivedSize;
    doc["total"] = _expectedSize;
    if (_targetVersion.length() > 0) {
        doc["target_version"] = _targetVersion;
    }
    String json;
    serializeJson(doc, json);
    _serialEvent(json.c_str());
}

void OtaServer::notifyStatus(
    const char* status,
    const char* code,
    const char* detail,
    bool includeProgress,
    bool rebooting
) {
    if (!_status) {
        return;
    }

    StaticJsonDocument<320> doc;
    doc["type"] = "ota";
    doc["status"] = status;
    if (code != nullptr) {
        doc["code"] = code;
    }
    if (detail != nullptr) {
        doc["detail"] = detail;
        doc["message"] = detail;
    }
    if (includeProgress) {
        doc["received"] = _receivedSize;
        doc["total"] = _expectedSize;
        doc["percent"] = _expectedSize == 0 ? 0 : (_receivedSize * 100) / _expectedSize;
    }
    if (rebooting) {
        doc["rebooting"] = true;
    }
    if (strcmp(status, "ready") == 0) {
        doc["max_chunk"] = _chunkSize;
    }

    String json;
    serializeJson(doc, json);
    _status->setValue(json.c_str());
    _status->notify();
}

void OtaServer::resetSession(bool abortUpdate) {
    if (abortUpdate && _state != OTA_IDLE && _state != OTA_SUCCESS && _state != OTA_ABORTED) {
        Update.abort();
    }
    _expectedSize = 0;
    _receivedSize = 0;
    _chunkSize = 180;
    _target = "";
    _targetVersion = "";
    _expectedSha256 = "";
    _lastProgressMs = 0;
    _restartPending = false;
    _restartAt = 0;
    setState(OTA_IDLE);
}

bool OtaServer::validateSha256Hex(const char* sha) const {
    if (sha == nullptr) {
        return false;
    }
    if (strlen(sha) != 64) {
        return false;
    }
    for (size_t i = 0; i < 64; i++) {
        char c = sha[i];
        bool hex = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
        if (!hex) {
            return false;
        }
    }
    return true;
}

bool OtaServer::handleStart(const JsonDocument& doc, String& errorCode, String& errorDetail) {
    if (_faults.abortNext) {
        _faults.abortNext = false;
        errorCode = "OTA_ERR_STATE";
        errorDetail = "fault_abort";
        return false;
    }

    if (_state != OTA_IDLE && _state != OTA_FAILED && _state != OTA_ABORTED) {
        resetSession(true);
    }

    setState(OTA_STARTING);

    const char* target = doc["target"] | "";
    if (strlen(target) == 0) {
        errorCode = "OTA_ERR_STATE";
        errorDetail = "missing_target";
        return false;
    }
    if (strcmp(target, OTA_TARGET_PERIPHERAL) != 0 && strcmp(target, OTA_TARGET_OBSERVER) != 0) {
        errorCode = "OTA_ERR_STATE";
        errorDetail = "invalid_target";
        return false;
    }

    size_t size = doc["size"] | 0;
    if (size == 0) {
        errorCode = "OTA_ERR_SIZE";
        errorDetail = "invalid_size";
        return false;
    }

    _chunkSize = doc["chunk_size"] | 180;
    if (_chunkSize == 0 || _chunkSize > 512) {
        errorCode = "OTA_ERR_STATE";
        errorDetail = "invalid_chunk_size";
        return false;
    }

    const char* targetVersion = doc["target_version"] | "";
    if (strlen(targetVersion) == 0) {
        errorCode = "OTA_ERR_STATE";
        errorDetail = "missing_target_version";
        return false;
    }

    const char* sha256 = doc["sha256"] | "";
    if (!validateSha256Hex(sha256)) {
        errorCode = "OTA_ERR_CHECKSUM";
        errorDetail = "invalid_sha256";
        return false;
    }

    if (_faults.wrongSize) {
        _faults.wrongSize = false;
        errorCode = "OTA_ERR_SIZE";
        errorDetail = "fault_wrong_size";
        return false;
    }

    if (!Update.begin(size)) {
        errorCode = "OTA_ERR_SPACE";
        errorDetail = "update_begin_failed";
        return false;
    }

    _target = String(target);
    _targetVersion = String(targetVersion);
    _expectedSha256 = String(sha256);
    _expectedSha256.toLowerCase();
    _expectedSize = size;
    _receivedSize = 0;
    _lastProgressMs = millis();

    setState(OTA_READY);
    notifyStatus("ready");
    setState(OTA_RECEIVING);
    return true;
}

bool OtaServer::handleCommit(String& errorCode, String& errorDetail) {
    if (_state != OTA_RECEIVING && _state != OTA_READY) {
        errorCode = "OTA_ERR_STATE";
        errorDetail = "ota_not_started";
        return false;
    }

    setState(OTA_COMMITTING);

    if (_faults.timeoutNext) {
        _faults.timeoutNext = false;
        errorCode = "OTA_ERR_STATE";
        errorDetail = "fault_timeout";
        resetSession(true);
        setState(OTA_FAILED);
        return false;
    }

    if (_faults.commitFail) {
        _faults.commitFail = false;
        errorCode = "OTA_ERR_FLASH";
        errorDetail = "fault_commit_fail";
        resetSession(true);
        setState(OTA_FAILED);
        return false;
    }

    size_t expectedCommitSize = _expectedSize;
    if (_receivedSize != expectedCommitSize) {
        errorCode = "OTA_SIZE_MISMATCH";
        errorDetail = "size_mismatch";
        resetSession(true);
        setState(OTA_FAILED);
        return false;
    }

    uint8_t digest[32];
    (void)digest;
    if (!Update.end(true)) {
        errorCode = "OTA_ERR_FLASH";
        errorDetail = "update_end_failed";
        resetSession(true);
        setState(OTA_FAILED);
        return false;
    }

    // Update.end validates written size; SHA256 verified from staging buffer via Update API is unavailable.
    // Re-hash is done by reading back written partition is expensive — use Update.getSHA256 if available.
    // ESP32 Arduino Update may expose MD5; for contract compliance compute from Update written stream.
    // We tracked SHA256 during DATA writes via mbedtls context stored in callbacks file scope.

    if (_faults.wrongHash) {
        _faults.wrongHash = false;
        errorCode = "OTA_HASH_MISMATCH";
        errorDetail = "fault_wrong_hash";
        resetSession(true);
        setState(OTA_FAILED);
        return false;
    }

    Preferences prefs;
    if (prefs.begin(kOtaNvsNamespace, false)) {
        prefs.putString(kOtaNvsVersionKey, _targetVersion);
        prefs.end();
    }

    setState(OTA_SUCCESS);
    notifyStatus("success", nullptr, nullptr, true, true);
    _restartPending = true;
    _restartAt = millis() + 1500;
    setState(OTA_IDLE);
    return true;
}

void OtaServer::handleAbort() {
    resetSession(true);
    setState(OTA_ABORTED);
    notifyStatus("aborted");
    resetSession(false);
}

void OtaServer::onDisconnect() {
    if (_state == OTA_RECEIVING || _state == OTA_STARTING || _state == OTA_READY || _state == OTA_COMMITTING) {
        if (_faults.disconnectNext) {
            _faults.disconnectNext = false;
        }
        resetSession(true);
        setState(OTA_FAILED);
        notifyStatus("error", "OTA_ERR_STATE", "disconnect");
    }
}

void OtaServer::loop() {
    if (_restartPending && millis() >= _restartAt) {
        ESP.restart();
    }
}

// Incremental SHA256 for received firmware bytes
static mbedtls_sha256_context gOtaSha256;
static bool gOtaSha256Active = false;

static void sha256Begin() {
    mbedtls_sha256_init(&gOtaSha256);
    mbedtls_sha256_starts_ret(&gOtaSha256, 0);
    gOtaSha256Active = true;
}

static void sha256Update(const uint8_t* data, size_t len) {
    if (!gOtaSha256Active) {
        sha256Begin();
    }
    mbedtls_sha256_update_ret(&gOtaSha256, data, len);
}

static String sha256FinalizeHex() {
    uint8_t digest[32];
    char hex[65];
    if (!gOtaSha256Active) {
        return String("");
    }
    mbedtls_sha256_finish_ret(&gOtaSha256, digest);
    mbedtls_sha256_free(&gOtaSha256);
    gOtaSha256Active = false;
    for (int i = 0; i < 32; i++) {
        sprintf(hex + (i * 2), "%02x", digest[i]);
    }
    hex[64] = '\0';
    return String(hex);
}

static void sha256Reset() {
    if (gOtaSha256Active) {
        mbedtls_sha256_free(&gOtaSha256);
        gOtaSha256Active = false;
    }
}

void OtaServer::handleCtrlRead(NimBLECharacteristic* characteristic) {
    StaticJsonDocument<256> doc;
    doc["type"] = "ota";
    doc["status"] = stateName(_state);
    doc["received"] = _receivedSize;
    doc["total"] = _expectedSize;
    doc["firmware_version"] = activeFirmwareVersion();
    String json;
    serializeJson(doc, json);
    characteristic->setValue(json.c_str());
}

void OtaServer::handleCtrlWrite(NimBLECharacteristic* characteristic) {
    std::string value = characteristic->getValue();
    if (value.empty()) {
        notifyStatus("error", "OTA_ERR_STATE", "empty_control_payload");
        return;
    }

    StaticJsonDocument<384> doc;
    DeserializationError error = deserializeJson(doc, value.data(), value.length());
    if (error) {
        notifyStatus("error", "OTA_ERR_STATE", "invalid_control_json");
        return;
    }

    const char* op = doc["op"];
    if (op == nullptr) {
        notifyStatus("error", "OTA_ERR_STATE", "missing_op");
        return;
    }

    String errorCode;
    String errorDetail;

    if (strcmp(op, "start") == 0) {
        sha256Reset();
        if (!handleStart(doc, errorCode, errorDetail)) {
            sha256Reset();
            resetSession(true);
            setState(OTA_FAILED);
            notifyStatus("error", errorCode.c_str(), errorDetail.c_str());
        }
        return;
    }

    if (strcmp(op, "commit") == 0) {
        String actualSha = sha256FinalizeHex();
        if (_faults.wrongHash) {
            actualSha = "ff";
        }
        if (actualSha.length() == 64 && _expectedSha256.length() == 64 && actualSha != _expectedSha256) {
            errorCode = "OTA_HASH_MISMATCH";
            errorDetail = "sha256_mismatch";
            resetSession(true);
            setState(OTA_FAILED);
            notifyStatus("error", errorCode.c_str(), errorDetail.c_str());
            return;
        }
        if (!handleCommit(errorCode, errorDetail)) {
            notifyStatus("error", errorCode.c_str(), errorDetail.c_str());
        }
        sha256Reset();
        return;
    }

    if (strcmp(op, "abort") == 0) {
        sha256Reset();
        handleAbort();
        return;
    }

    notifyStatus("error", "OTA_ERR_STATE", "unknown_op");
}

void OtaServer::handleDataWrite(NimBLECharacteristic* characteristic) {
    if (_state != OTA_RECEIVING) {
        notifyStatus("error", "OTA_ERR_STATE", "ota_not_started");
        return;
    }

    std::string value = characteristic->getValue();
    if (value.empty()) {
        notifyStatus("error", "OTA_ERR_STATE", "empty_chunk");
        return;
    }

    const uint8_t* bytes = reinterpret_cast<const uint8_t*>(value.data());
    size_t len = value.length();

    if (_receivedSize + len > _expectedSize) {
        resetSession(true);
        setState(OTA_FAILED);
        notifyStatus("error", "OTA_ERR_SIZE", "overflow");
        sha256Reset();
        return;
    }

    size_t written = Update.write(const_cast<uint8_t*>(bytes), len);
    if (written != len) {
        resetSession(true);
        setState(OTA_FAILED);
        notifyStatus("error", "OTA_ERR_FLASH", "chunk_write_failed");
        sha256Reset();
        return;
    }

    sha256Update(bytes, len);
    _receivedSize += written;

    if (millis() - _lastProgressMs >= 250 || _receivedSize == _expectedSize) {
        _lastProgressMs = millis();
        notifyStatus("progress", nullptr, nullptr, true);
        emitSerialEvent("receiving");
    }
}
