#include "permissions_demo.h"

#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include "fixture_config.h"
#include "ble_value_util.h"

static NimBLECharacteristic* pReadOnly = nullptr;
static NimBLECharacteristic* pWriteOnly = nullptr;
static NimBLECharacteristic* pNotifyOnly = nullptr;
static NimBLECharacteristic* pReadWrite = nullptr;
static NimBLECharacteristic* pReadNotify = nullptr;
static NimBLECharacteristic* pWriteNotify = nullptr;
static NimBLECharacteristic* pAll = nullptr;

class ReadOnlyCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pCharacteristic) override {
        StaticJsonDocument<200> doc;
        doc["type"] = "read_only";
        doc["value"] = "这是一个只读特征值";
        doc["timestamp"] = millis();
        String jsonString;
        serializeJson(doc, jsonString);
        bleSetValue(pCharacteristic, jsonString);
    }
};

class WriteOnlyCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic) override {
        (void)pCharacteristic;
    }
};

class NotifyOnlyCallbacks : public NimBLECharacteristicCallbacks {
    void onSubscribe(NimBLECharacteristic* pCharacteristic, ble_gap_conn_desc* desc, uint16_t subValue) override {
        (void)desc;
        (void)subValue;
        pCharacteristic->setValue("这是一个只通知特征值");
        pCharacteristic->notify();
    }
};

class ReadWriteCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pCharacteristic) override {
        StaticJsonDocument<200> doc;
        doc["type"] = "read_write";
        doc["value"] = "这是一个读写特征值";
        doc["timestamp"] = millis();
        String jsonString;
        serializeJson(doc, jsonString);
        bleSetValue(pCharacteristic, jsonString);
    }

    void onWrite(NimBLECharacteristic* pCharacteristic) override {
        (void)pCharacteristic;
    }
};

class ReadNotifyCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pCharacteristic) override {
        StaticJsonDocument<200> doc;
        doc["type"] = "read_notify";
        doc["value"] = "这是一个读和通知特征值";
        doc["timestamp"] = millis();
        String jsonString;
        serializeJson(doc, jsonString);
        bleSetValue(pCharacteristic, jsonString);
    }

    void onSubscribe(NimBLECharacteristic* pCharacteristic, ble_gap_conn_desc* desc, uint16_t subValue) override {
        (void)desc;
        (void)subValue;
        pCharacteristic->setValue("这是一个读和通知特征值");
        pCharacteristic->notify();
    }
};

class WriteNotifyCallbacks : public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic) override {
        std::string value = pCharacteristic->getValue();
        if (!value.empty()) {
            bleSetValue(pCharacteristic, value);
            pCharacteristic->notify();
        }
    }
};

class AllCallbacks : public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pCharacteristic) override {
        StaticJsonDocument<200> doc;
        doc["type"] = "all";
        doc["value"] = "这是一个读写和通知特征值";
        doc["timestamp"] = millis();
        String jsonString;
        serializeJson(doc, jsonString);
        bleSetValue(pCharacteristic, jsonString);
    }

    void onWrite(NimBLECharacteristic* pCharacteristic) override {
        std::string value = pCharacteristic->getValue();
        if (!value.empty()) {
            bleSetValue(pCharacteristic, value);
            pCharacteristic->notify();
        }
    }

    void onSubscribe(NimBLECharacteristic* pCharacteristic, ble_gap_conn_desc* desc, uint16_t subValue) override {
        (void)desc;
        (void)subValue;
        pCharacteristic->setValue("这是一个读写和通知特征值");
        pCharacteristic->notify();
    }
};

void permissionsDemoBegin(NimBLEServer* server) {
    NimBLEService* pServicePermissions = server->createService(SERVICE_UUID_PERMISSIONS);

    pReadOnly = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_READ_ONLY,
        NIMBLE_PROPERTY::READ
    );
    pReadOnly->setCallbacks(new ReadOnlyCallbacks());
    pReadOnly->setValue("Read Only Characteristic");

    pWriteOnly = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_WRITE_ONLY,
        NIMBLE_PROPERTY::WRITE
    );
    pWriteOnly->setCallbacks(new WriteOnlyCallbacks());

    pNotifyOnly = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_NOTIFY_ONLY,
        NIMBLE_PROPERTY::NOTIFY
    );
    pNotifyOnly->setCallbacks(new NotifyOnlyCallbacks());

    pReadWrite = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_READ_WRITE,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE
    );
    pReadWrite->setCallbacks(new ReadWriteCallbacks());
    pReadWrite->setValue("Read Write Characteristic");

    pReadNotify = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_READ_NOTIFY,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    pReadNotify->setCallbacks(new ReadNotifyCallbacks());
    pReadNotify->setValue("Read Notify Characteristic");

    pWriteNotify = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_WRITE_NOTIFY,
        NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
    );
    pWriteNotify->setCallbacks(new WriteNotifyCallbacks());

    pAll = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_ALL,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
    );
    pAll->setCallbacks(new AllCallbacks());
    pAll->setValue("All Permissions Characteristic");

    pServicePermissions->start();
}

void permissionsDemoTick(bool connected) {
    (void)connected;
}
