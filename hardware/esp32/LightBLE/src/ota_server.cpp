#include "ota_server.h"

#include <ArduinoJson.h>
#include <Update.h>
#include <Preferences.h>
#include <mbedtls/sha256.h>
#include "ble_value_util.h"

static const char* kOtaNvsNamespace = "smart_ble";
static const char* kOtaNvsVersionKey = "fw_version";
static const char* kBuildFirmwareVersion = FIRMWARE_VERSION;

static OtaServer gOtaServer;

// 前置声明：sha 助手定义在本文件后段，loop()/loopCommit()（DEV-014 移入
// loop 上下文的 flash 操作）先于其定义使用。
static void sha256Begin();
static void sha256Update(const uint8_t* data, size_t len);
static String sha256FinalizeHex();
static void sha256Reset();

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
    bleSetValue(_status, json);
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

    _target = String(target);
    _targetVersion = String(targetVersion);
    _expectedSha256 = String(sha256);
    _expectedSha256.toLowerCase();
    _expectedSize = size;
    _receivedSize = 0;
    _lastProgressMs = millis();

    // DEV-014：Update.begin 的同步擦除（数十~数百扇区，秒级）不得在 NimBLE
    // 回调里执行（真机证据：链路监督超时 + 设备复位）。排队到 loop()，
    // ready 通知在分区真正备好后从 loop 上下文发出。
    _beginPending = true;
    _staging.clear();
    setState(OTA_STARTING);
    return true;
}

// DEV-014：原 handleCommit（flash 校验 + Update.end + NVS）已整体移入
// loopCommit()，由 loop() 在 _commitPending 置位后调用——回调里做 flash
// 操作会在真机上复位设备（E5 phase-7 实证，见 ota_server.h DEV-014 注记）。

void OtaServer::handleAbort() {
    // DEV-014：Update.abort 触及 flash — 排队到 loop；状态与通知立即返回。
    _abortPending = true;
    setState(OTA_ABORTED);
    notifyStatus("aborted");
    resetSession(false);
}

void OtaServer::onDisconnect() {
    if (_state == OTA_RECEIVING || _state == OTA_STARTING || _state == OTA_READY || _state == OTA_COMMITTING) {
        if (_faults.disconnectNext) {
            _faults.disconnectNext = false;
        }
        // DEV-014：Update.abort 延迟到 loop；回调只复位状态
        _abortPending = true;
        resetSession(false);
        setState(OTA_FAILED);
        notifyStatus("error", "OTA_ERR_STATE", "disconnect");
    }
}

void OtaServer::loop() {
    if (_restartPending && millis() >= _restartAt) {
        ESP.restart();
    }

    // DEV-014：全部 flash 操作集中在此（loop/arduino 任务上下文，BLE 主机
    // 独立任务不受阻塞）。
    if (_abortPending) {
        _abortPending = false;
        _staging.clear();
        Update.abort();
    }

    if (_beginPending) {
        _beginPending = false;
        if (!Update.begin(_expectedSize)) {
            resetSession(false);
            setState(OTA_FAILED);
            notifyStatus("error", "OTA_ERR_SPACE", "update_begin_failed");
        } else {
            setState(OTA_READY);
            notifyStatus("ready");
            setState(OTA_RECEIVING);
        }
    }

    if (_state == OTA_RECEIVING && !_staging.empty() && !_commitPending) {
        // DEV-014c：单次 loop 只落盘一个批次（4KB）。整环 32KB 一次写入的
        // flash 编程临界区（~350ms）会压过中断看门狗默认阈值（300ms），
        // 高速率传输（实测 5.8KB/s 于 87% 处）触发 TG0WDT 复位；分批后
        // 每次临界区 ~50ms，剩余数据留在环里由后续 loop 迭代消化
        //（BLE 到包速率远低于排水能力，环不会积压）。
        size_t len = _staging.size() > kOtaDrainBatch ? kOtaDrainBatch : _staging.size();
        size_t written = Update.write(_staging.data(), len);
        if (written != len) {
            _staging.clear();
            Update.abort();
            resetSession(false);
            setState(OTA_FAILED);
            notifyStatus("error", "OTA_ERR_FLASH", "chunk_write_failed");
        } else {
            sha256Update(_staging.data(), len);
            _receivedSize += written;
            _staging.erase(_staging.begin(), _staging.begin() + written);
            if (millis() - _lastProgressMs >= 250 || _receivedSize == _expectedSize) {
                _lastProgressMs = millis();
                notifyStatus("progress", nullptr, nullptr, true);
                emitSerialEvent("receiving");
            }
        }
    }

    if (_commitPending && _staging.empty()) {
        _commitPending = false;
        loopCommit();
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

// DEV-014：commit 链（hash 比对 + 故障相位 + Update.end + NVS + success）
// 在 loop() 上下文执行；由 handleCtrlWrite 置 _commitPending 后调用。
void OtaServer::loopCommit() {
    auto fail = [this](const char* code, const char* detail) {
        resetSession(true);
        setState(OTA_FAILED);
        notifyStatus("error", code, detail);
    };

    String actualSha = sha256FinalizeHex();
    if (_faults.wrongHash) {
        _faults.wrongHash = false;
        actualSha = "ff";
    }
    if (actualSha.length() == 64 && _expectedSha256.length() == 64 && actualSha != _expectedSha256) {
        fail("OTA_HASH_MISMATCH", "sha256_mismatch");
        return;
    }

    if (_faults.timeoutNext) {
        _faults.timeoutNext = false;
        fail("OTA_ERR_STATE", "fault_timeout");
        return;
    }

    if (_faults.commitFail) {
        _faults.commitFail = false;
        fail("OTA_ERR_FLASH", "fault_commit_fail");
        return;
    }

    if (_receivedSize != _expectedSize) {
        fail("OTA_SIZE_MISMATCH", "size_mismatch");
        return;
    }

    if (!Update.end(true)) {
        // Update.end 校验镜像结构（magic/segment/checksum/app_desc）——
        // 合成负载在此被拒（真机实证 update_end_failed），不切启动分区。
        fail("OTA_ERR_FLASH", "update_end_failed");
        return;
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
    bleSetValue(characteristic, json);
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
        if (_state != OTA_RECEIVING && _state != OTA_READY) {
            notifyStatus("error", "OTA_ERR_STATE", "ota_not_started");
            return;
        }
        // DEV-014：hash 比对 + Update.end + NVS 全部在 loopCommit（loop 上下文）
        setState(OTA_COMMITTING);
        _commitPending = true;
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

    if (_receivedSize + _staging.size() + len > _expectedSize) {
        _abortPending = true;
        resetSession(false);
        setState(OTA_FAILED);
        notifyStatus("error", "OTA_ERR_SIZE", "overflow");
        sha256Reset();
        return;
    }

    // DEV-014：分片只进 RAM 暂存环（32KB），flash 写入在 loop() 统一执行。
    // BLE 到包速率（~4-8KB/s）远低于 flash 写入速率，环不会成为瓶颈。
    if (_staging.size() + len > kOtaStagingCap) {
        _abortPending = true;
        resetSession(false);
        setState(OTA_FAILED);
        notifyStatus("error", "OTA_ERR_STATE", "staging_overflow");
        sha256Reset();
        return;
    }
    _staging.insert(_staging.end(), bytes, bytes + len);
}
