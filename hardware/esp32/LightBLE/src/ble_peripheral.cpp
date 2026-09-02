#include "ble_peripheral.h"

#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include <NimBLEServer.h>
#include <NimBLEAdvertising.h>

#include "device_info.h"
#include "fixture_config.h"
#include "ota_server.h"
#include "permissions_demo.h"
#include "serial_events.h"
#include "test_control.h"

static NimBLEServer* pServer = nullptr;
static NimBLECharacteristic* pCharacteristicControl = nullptr;
static NimBLECharacteristic* pCharacteristicStatusNotify = nullptr;
static NimBLECharacteristic* pCharacteristicOtaControl = nullptr;
static NimBLECharacteristic* pCharacteristicOtaData = nullptr;
static NimBLECharacteristic* pCharacteristicOtaStatus = nullptr;

static bool deviceConnected = false;
static bool oldDeviceConnected = false;

class ServerCallbacks : public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* server) override {
        (void)server;
        deviceConnected = true;
        emitBleEvent("connected");
        emitSerialEvent("conn", "connected");
        emitSerialEvent("adv", "connectable");
        emitSerialEvent("disc", "service_ready");
        emitSerialEvent("led", "idle");
        emitSerialEvent("notify", "enabled");
        emitSerialEvent("err", "none");
        emitSerialEvent("obs", "peripheral");
        if (pCharacteristicStatusNotify) {
            StaticJsonDocument<200> doc;
            doc["type"] = "connection";
            doc["status"] = "connected";
            String jsonString;
            serializeJson(doc, jsonString);
            pCharacteristicStatusNotify->setValue(jsonString.c_str());
            pCharacteristicStatusNotify->notify();
        }
    }

    void onDisconnect(NimBLEServer* server) override {
        (void)server;
        deviceConnected = false;
        emitBleEvent("disconnected");
        emitSerialEvent("conn", "disconnected");
        otaServerInstance().onDisconnect();
        if (pCharacteristicStatusNotify) {
            StaticJsonDocument<200> doc;
            doc["type"] = "connection";
            doc["status"] = "disconnected";
            String jsonString;
            serializeJson(doc, jsonString);
            pCharacteristicStatusNotify->setValue(jsonString.c_str());
            pCharacteristicStatusNotify->notify();
        }
    }
};

// Control characteristic: Read/Write/Notify — Device Info on read, LED/Test on write
class ControlCharacteristicCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pCharacteristic) override {
        String info = buildDeviceInfoJson();
        pCharacteristic->setValue(info.c_str());
    }

    void onWrite(NimBLECharacteristic* pCharacteristic) override {
        std::string value = pCharacteristic->getValue();
        String responseJson;
        if (!testControlHandleWrite(value, pServer, responseJson)) return;
        pCharacteristic->setValue(responseJson.c_str());
        pCharacteristic->notify();
        if (pCharacteristicStatusNotify) {
            pCharacteristicStatusNotify->setValue(responseJson.c_str());
            pCharacteristicStatusNotify->notify();
        }
    }
};

// Status/Notify characteristic: Write + Notify only (PROTO-001)
class StatusNotifyCharacteristicCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic) override {
        std::string value = pCharacteristic->getValue();
        String responseJson;
        if (!testControlHandleWrite(value, pServer, responseJson)) return;
        pCharacteristic->setValue(responseJson.c_str());
        pCharacteristic->notify();
    }

    void onSubscribe(NimBLECharacteristic* pCharacteristic, ble_gap_conn_desc* desc, uint16_t subValue) override {
        (void)desc;
        (void)subValue;
        pCharacteristic->setValue("开始监听系统状态");
        pCharacteristic->notify();
        emitSerialEvent("notify", "subscribed");
    }
};

static void startAdvertisingWithMetadata() {
    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);

    NimBLEAdvertisementData scanResponse;
    scanResponse.setName(DEVICE_NAME);
    // Manufacturer data: company 0x00E0 + ASCII "LightBLE"
    std::string mfg;
    mfg.push_back(static_cast<char>(MFG_COMPANY_ID & 0xFF));
    mfg.push_back(static_cast<char>((MFG_COMPANY_ID >> 8) & 0xFF));
    mfg += MFG_PAYLOAD;
    scanResponse.setManufacturerData(mfg);
    pAdvertising->setScanResponseData(scanResponse);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);

    NimBLEDevice::startAdvertising();
    emitBleEvent("advertising");
    emitSerialEvent("adv", "started");
}

void blePeripheralBegin() {
    testControlBegin(LED_PIN);

    // Boot LED indication
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(500);
        digitalWrite(LED_PIN, LOW);
        delay(500);
    }

    // Advertised name must match DEVICE_NAME ("BLEToolkit-Server")
    NimBLEDevice::init("BLEToolkit-Server");
    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    NimBLEService* pService = pServer->createService(SERVICE_UUID);

    pCharacteristicControl = pService->createCharacteristic(
        CHARACTERISTIC_UUID_CONTROL,
        NIMBLE_PROPERTY::READ |
        NIMBLE_PROPERTY::WRITE |
        NIMBLE_PROPERTY::NOTIFY
    );
    pCharacteristicControl->setCallbacks(new ControlCharacteristicCallbacks());
    pCharacteristicControl->setValue(buildDeviceInfoJson().c_str());

    // Contract: StatusNotify = write + notify (no read)
    pCharacteristicStatusNotify = pService->createCharacteristic(
        CHARACTERISTIC_UUID_STATUS_NOTIFY,
        NIMBLE_PROPERTY::WRITE |
        NIMBLE_PROPERTY::NOTIFY
    );
    pCharacteristicStatusNotify->setCallbacks(new StatusNotifyCharacteristicCallbacks());

    pService->start();

    permissionsDemoBegin(pServer);

    NimBLEService* pServiceOta = pServer->createService(OTA_SERVICE_UUID);
    pCharacteristicOtaControl = pServiceOta->createCharacteristic(
        OTA_CHAR_CTRL_UUID,
        NIMBLE_PROPERTY::READ |
        NIMBLE_PROPERTY::WRITE
    );
    pCharacteristicOtaData = pServiceOta->createCharacteristic(
        OTA_CHAR_DATA_UUID,
        NIMBLE_PROPERTY::WRITE_NR
    );
    pCharacteristicOtaStatus = pServiceOta->createCharacteristic(
        OTA_CHAR_STATUS_UUID,
        NIMBLE_PROPERTY::READ |
        NIMBLE_PROPERTY::NOTIFY
    );
    otaServerInstance().begin(
        pCharacteristicOtaControl,
        pCharacteristicOtaData,
        pCharacteristicOtaStatus,
        emitSerialJson
    );
    pServiceOta->start();

    startAdvertisingWithMetadata();
}

void blePeripheralLoop() {
    if (!deviceConnected && oldDeviceConnected) {
        delay(500);
        startAdvertisingWithMetadata();
        oldDeviceConnected = deviceConnected;
    }
    if (deviceConnected) {
        oldDeviceConnected = deviceConnected;
    }

    testControlLoop();
    permissionsDemoTick(deviceConnected);

    if (deviceConnected && pCharacteristicStatusNotify) {
        static unsigned long lastStatusTime = 0;
        if (millis() - lastStatusTime > 5000) {
            StaticJsonDocument<200> doc;
            doc["type"] = "device_status";
            doc["led"] = testControlLedOn() ? "on" : "off";
            doc["uptime"] = millis();
            doc["fixture_role"] = FIXTURE_ROLE_PERIPHERAL;
            String jsonString;
            serializeJson(doc, jsonString);
            pCharacteristicStatusNotify->setValue(jsonString.c_str());
            pCharacteristicStatusNotify->notify();
            emitSerialEvent("notify", "device_status");
            lastStatusTime = millis();
        }
    }

    otaServerInstance().loop();
}
