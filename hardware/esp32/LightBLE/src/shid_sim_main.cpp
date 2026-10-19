// Smart HID Provisioning Protocol Simulator（P002 配网流程真机验证刺激源）
//
// 协议事实源：core/protocols/hid-provisioning-protocol.ts（镜像自
// Smart-HID-Workspace protocols/ble/PROVISIONING_V1.md）。本固件实现：
//   · 广播：SHID-5EEDC0DE + 128bit 服务 UUID 9f1d1001（STRONG 匹配）
//   · GATT：INFO(1002, read+notify) / INPUT(1003, 明文 write，无 SMP)
//           / STATUS(1004, read+notify)
//   · INPUT 按 [seq][total][len] 分帧协议组装 candidate JSON
//   · 校验 + 场景走链（received→…→ready，每步 notify STATUS）
//
// 场景注入规则（配网页表单驱动，用于验证 F022 错误恢复矩阵）：
//   wifi_ssid=FAIL-WIFI   → wifi_failed            （Wi-Fi 行失败）
//   wifi_ssid=FAIL-HUB    → controlhub_unreachable （hub 行失败）
//   wifi_ssid=FAIL-MQTT   → mqtt_invalid           （conn 行失败）
//   wifi_ssid=FAIL-STORE  → storage_failed         （usb 行失败）
//   token 前 2 hex：ff→pairing_expired / ee→pairing_used / dd→pairing_invalid
//   wifi_ssid 前缀 SLOW   → 每步 8s 慢速走链（取消等待/断线测试）
//   其余                  → 600ms/步 快速走链至 ready
//
// 注意（如实声明）：本模拟器不真正连接 Wi-Fi/MQTT，仅按协议状态机
// 演进并经 STATUS 特征上报；串口日志对 token/password 脱敏。

#include <Arduino.h>
#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include "ble_value_util.h"

static const char* kServiceUuid = "9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04";
static const char* kInfoUuid = "9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04";
static const char* kInputUuid = "9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04";
static const char* kStatusUuid = "9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04";
static const char* kDeviceName = "SHID-5EEDC0DE";
static const char* kDeviceId = "HID-5EEDC0DE";
static const char* kFirmware = "1.2.0-sim";

static NimBLEServer* sServer = nullptr;
static NimBLECharacteristic* sInfoChar = nullptr;
static NimBLECharacteristic* sInputChar = nullptr;
static NimBLECharacteristic* sStatusChar = nullptr;

// ---- 分帧组装（与 core/ble-core provisioning/framing.js 语义一致） ----
static const size_t kMaxAssembled = 1024;
static uint8_t sAsmBuf[kMaxAssembled];
static size_t sAsmExpect = 0;
static size_t sAsmTotal = 0;
static size_t sAsmWritten = 0;
static bool sAsmActive = false;

// ---- 走链状态机 ----
static const char* const kSteps[] = {
    "received", "connecting_wifi", "wifi_connected", "pairing",
    "pairing_success", "mqtt_connecting", "ready",
};
static const int kStepCount = 7;

enum class WalkPhase { Idle, Walking, Done };
static WalkPhase sWalk = WalkPhase::Idle;
static int sStepIdx = -1;
static uint32_t sNextStepAt = 0;
static uint32_t sStepDelayMs = 600;
static String sScenarioErr = "";   // 非空 → 到注入点后转 error
static int sFailAfterIdx = -1;     // 注入点 step 下标
static bool sProvisioned = false;

static void logLine(const String& line) {
    Serial.println(String("[SHID-SIM] ") + line);
}

static void publishStatus(const char* state, const char* step,
                          const char* err) {
    // 协议侧 error 为 null 表示无错；手动拼串保证序列化为 null 而非 ""
    String json;
    if (err == nullptr) {
        json = String("{\"state\":\"") + state + "\",\"step\":\"" + step +
               "\",\"error\":null}";
    } else {
        json = String("{\"state\":\"") + state + "\",\"step\":\"" + step +
               "\",\"error\":\"" + err + "\"}";
    }
    if (sStatusChar != nullptr) {
        bleSetValue(sStatusChar, json);
        sStatusChar->notify();
    }
    logLine(String("status ") + json);
}

static void publishInfo() {
    String json = String("{\"product\":\"smart-hid\",\"protocol\":\"1.0\","
                         "\"device_id\":\"") +
                  kDeviceId + "\",\"firmware\":\"" + kFirmware +
                  "\",\"state\":\"" +
                  (sProvisioned ? "ready" : "unprovisioned") +
                  "\",\"provisioned\":" + (sProvisioned ? "true" : "false") +
                  "}";
    if (sInfoChar != nullptr) {
        bleSetValue(sInfoChar, json);
    }
    logLine(String("info ") + json);
}

static void startWalk(uint32_t delayMs, const String& errCode, int failAfter) {
    sWalk = WalkPhase::Walking;
    sStepIdx = 0;
    sStepDelayMs = delayMs;
    sScenarioErr = errCode;
    sFailAfterIdx = failAfter;
    sProvisioned = false;
    publishInfo();
    publishStatus("provisioning", kSteps[0], nullptr);
    sNextStepAt = millis() + delayMs;
}

static void failNow(const char* errCode) {
    sWalk = WalkPhase::Done;
    sProvisioned = false;
    publishInfo();
    publishStatus("error", sStepIdx >= 0 ? kSteps[sStepIdx] : "", errCode);
    logLine(String("terminal error=") + errCode);
}

static void walkLoop() {
    if (sWalk != WalkPhase::Walking) return;
    if ((int32_t)(millis() - sNextStepAt) < 0) return;

    sStepIdx++;
    if (sStepIdx >= kStepCount) {
        sWalk = WalkPhase::Done;
        return;
    }
    // 注入点：先走完该步，再报错
    if (!sScenarioErr.isEmpty() && sStepIdx == sFailAfterIdx + 1) {
        publishStatus("provisioning", kSteps[sStepIdx], nullptr);
        logLine(String("step -> ") + kSteps[sStepIdx] + " (将注入 " +
                sScenarioErr + ")");
        delay(80);  // 让客户端先收到该步 notify
        failNow(sScenarioErr.c_str());
        return;
    }
    if (sStepIdx == kStepCount - 1) {
        sProvisioned = true;
        sWalk = WalkPhase::Done;
        publishInfo();
        publishStatus("ready", "ready", nullptr);
        logLine("terminal ready provisioned=1");
        return;
    }
    publishStatus("provisioning", kSteps[sStepIdx], nullptr);
    logLine(String("step -> ") + kSteps[sStepIdx]);
    sNextStepAt = millis() + sStepDelayMs;
}

static bool isHex32(const String& v) {
    if (v.length() != 32) return false;
    for (size_t i = 0; i < v.length(); i++) {
        char c = v[i];
        if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') ||
              (c >= 'A' && c <= 'F'))) {
            return false;
        }
    }
    return true;
}

static void handleCandidate(const uint8_t* data, size_t len) {
    StaticJsonDocument<512> doc;
    String text((const char*)data, len);
    DeserializationError err = deserializeJson(doc, text);
    if (err) {
        logLine("candidate JSON parse failed");
        failNow("invalid_payload");
        return;
    }
    const char* vOk = doc["v"] | "";
    const char* ssid = doc["wifi_ssid"] | "";
    const char* pwd = doc["wifi_password"] | "";
    const char* host = doc["hub_host"] | "";
    const char* token = doc["token"] | "";
    long port = doc["hub_port"] | 17892;
    (void)pwd;  // password 不进任何日志

    String problems;
    if (String(vOk) != "1") problems += "v ";
    if (ssid[0] == '\0' || strlen(ssid) > 32) problems += "wifi_ssid ";
    if (strlen(pwd) > 64) problems += "wifi_password ";
    if (host[0] == '\0') problems += "hub_host ";
    if (port < 1 || port > 65535) problems += "hub_port ";
    if (!isHex32(token)) problems += "token ";
    if (!problems.isEmpty()) {
        logLine("candidate invalid fields: " + problems);
        failNow("invalid_payload");
        return;
    }

    // 场景选择
    String ssidStr(ssid);
    String tokenStr(token);
    String errCode = "";
    int failAfter = -1;
    uint32_t delayMs = 600;
    if (ssidStr == "FAIL-WIFI") {
        errCode = "wifi_failed";
        failAfter = 1;
    } else if (ssidStr == "FAIL-HUB") {
        errCode = "controlhub_unreachable";
        failAfter = 3;
    } else if (ssidStr == "FAIL-MQTT") {
        errCode = "mqtt_invalid";
        failAfter = 5;
    } else if (ssidStr == "FAIL-STORE") {
        errCode = "storage_failed";
        failAfter = 5;
    } else if (tokenStr.startsWith("ff")) {
        errCode = "pairing_expired";
        failAfter = 3;
    } else if (tokenStr.startsWith("ee")) {
        errCode = "pairing_used";
        failAfter = 3;
    } else if (tokenStr.startsWith("dd")) {
        errCode = "pairing_invalid";
        failAfter = 3;
    } else if (ssidStr.startsWith("SLOW")) {
        delayMs = 8000;
    }

    logLine(String("candidate ok ssid=") + ssidStr + " hub=" + host + ":" +
            String(port) + " token=***(32hex 已脱敏) scenario=" +
            (errCode.isEmpty() ? (delayMs > 1000 ? "slow-success" : "success")
                               : errCode));
    startWalk(delayMs, errCode, failAfter);
}

class SimServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* server) override {
        (void)server;
        logLine("connected");
        if (sStatusChar != nullptr) {
            sStatusChar->notify();
        }
    }
    void onDisconnect(NimBLEServer* server) override {
        (void)server;
        logLine("disconnected");
        server->startAdvertising();
    }
};

class InputCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pChar) override {
        NimBLEAttValue value = pChar->getValue();
        const uint8_t* data = value.data();
        size_t len = value.size();
        if (len < 3) {
            logLine("short frame ignored");
            return;
        }
        uint8_t seq = data[0];
        uint8_t total = data[1];
        uint8_t plen = data[2];
        if ((size_t)(3 + plen) != len) {
            logNodeLen(len, plen);
            return;
        }
        if (seq == 0) {
            sAsmActive = true;
            sAsmTotal = total;
            sAsmExpect = 0;
            sAsmWritten = 0;
        }
        if (!sAsmActive || seq != sAsmExpect || total != sAsmTotal ||
            sAsmWritten + plen > kMaxAssembled) {
            logLine(String("frame out-of-order seq=") + seq +
                    " total=" + total + " expect=" + sAsmExpect);
            sAsmActive = false;
            return;
        }
        memcpy(sAsmBuf + sAsmWritten, data + 3, plen);
        sAsmWritten += plen;
        sAsmExpect++;
        logLine("frame seq=" + String(seq) + "/" + String(total) +
                " len=" + String(plen));
        if (sAsmExpect == sAsmTotal) {
            sAsmActive = false;
            logLine("candidate assembled " + String(sAsmWritten) + "B");
            handleCandidate(sAsmBuf, sAsmWritten);
        }
    }

    void logNodeLen(size_t len, uint8_t plen) {
        logLine("frame len mismatch: got " + String(len) +
                " header says " + String(3 + plen));
    }
};

static SimServerCallbacks sServerCb;
static InputCallbacks sInputCb;

void setup() {
    Serial.begin(115200);
    delay(100);
    logLine(String("boot service=") + kServiceUuid + " name=" + kDeviceName +
            " fw=" + kFirmware + " (SIM: 不真实连 Wi-Fi/MQTT)");

    NimBLEDevice::init(kDeviceName);
    sServer = NimBLEDevice::createServer();
    sServer->setCallbacks(&sServerCb);

    NimBLEService* service = sServer->createService(kServiceUuid);
    sInfoChar = service->createCharacteristic(
        kInfoUuid, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    sInputChar = service->createCharacteristic(
        kInputUuid,
        NIMBLE_PROPERTY::WRITE);
    sStatusChar = service->createCharacteristic(
        kStatusUuid, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
    sInputChar->setCallbacks(&sInputCb);

    publishInfo();
    publishStatus("unprovisioned", "", nullptr);

    service->start();

    NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
    adv->addServiceUUID(kServiceUuid);
    adv->setScanResponse(true);
    adv->start();
    logLine("advertising started (adv+scan-rsp)");
}

void loop() {
    walkLoop();
    delay(10);
}
