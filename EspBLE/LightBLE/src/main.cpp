#include <Arduino.h>
#include <NimBLEDevice.h>
#include <NimBLEServer.h>
#include <NimBLEUtils.h>
#include <ArduinoJson.h>

// BLE 服务和特征 UUID
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID_WRITE "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // 有应答写入
#define CHARACTERISTIC_UUID_NOTIFY "beb5483e-36e1-4688-b7f5-ea07361b26a9" // 无应答写入和监听

// 新增服务和特征UUID
#define SERVICE_UUID_PERMISSIONS "4fafc201-1fb5-459e-8fcc-c5c9c331914c"
#define CHARACTERISTIC_UUID_READ_ONLY "beb5483e-36e1-4688-b7f5-ea07361b26b0"  // 只读
#define CHARACTERISTIC_UUID_WRITE_ONLY "beb5483e-36e1-4688-b7f5-ea07361b26b1" // 只写
#define CHARACTERISTIC_UUID_NOTIFY_ONLY "beb5483e-36e1-4688-b7f5-ea07361b26b2" // 只通知
#define CHARACTERISTIC_UUID_READ_WRITE "beb5483e-36e1-4688-b7f5-ea07361b26b3"  // 读写
#define CHARACTERISTIC_UUID_READ_NOTIFY "beb5483e-36e1-4688-b7f5-ea07361b26b4" // 读和通知
#define CHARACTERISTIC_UUID_WRITE_NOTIFY "beb5483e-36e1-4688-b7f5-ea07361b26b5" // 写和通知
#define CHARACTERISTIC_UUID_ALL "beb5483e-36e1-4688-b7f5-ea07361b26b6"  // 读写和通知

// 服务和特征值名称
#define SERVICE_NAME        "智能蓝牙服务"
#define CHARACTERISTIC_WRITE_NAME "控制特征值"
#define CHARACTERISTIC_NOTIFY_NAME "通知特征值"
#define SERVICE_NAME_PERMISSIONS "权限演示服务"
#define CHARACTERISTIC_READ_ONLY_NAME "只读特征值"
#define CHARACTERISTIC_WRITE_ONLY_NAME "只写特征值"
#define CHARACTERISTIC_NOTIFY_ONLY_NAME "只通知特征值"
#define CHARACTERISTIC_READ_WRITE_NAME "读写特征值"
#define CHARACTERISTIC_READ_NOTIFY_NAME "读和通知特征值"
#define CHARACTERISTIC_WRITE_NOTIFY_NAME "写和通知特征值"
#define CHARACTERISTIC_ALL_NAME "读写和通知特征值"

// 设备信息
#define DEVICE_NAME "ESP32-BLE-Server"
#define FIRMWARE_VERSION "1.0.0"

// LED引脚定义
#define LED_PIN 2

// 全局变量
NimBLEServer* pServer = nullptr;
NimBLECharacteristic* pCharacteristicWrite = nullptr;  // 有应答写入特征
NimBLECharacteristic* pCharacteristicNotify = nullptr; // 无应答写入和监听特征
NimBLECharacteristic* pCharacteristicReadOnly = nullptr;    // 只读特征
NimBLECharacteristic* pCharacteristicWriteOnly = nullptr;   // 只写特征
NimBLECharacteristic* pCharacteristicNotifyOnly = nullptr;  // 只通知特征
NimBLECharacteristic* pCharacteristicReadWrite = nullptr;   // 读写特征
NimBLECharacteristic* pCharacteristicReadNotify = nullptr;  // 读和通知特征
NimBLECharacteristic* pCharacteristicWriteNotify = nullptr; // 写和通知特征
NimBLECharacteristic* pCharacteristicAll = nullptr;        // 读写和通知特征
bool deviceConnected = false;
bool oldDeviceConnected = false;
bool ledState = false;
unsigned long lastBlinkTime = 0;
int blinkPattern = 0;  // 0: 关闭, 1: 常亮, 2: 快闪, 3: 慢闪

// 连接状态回调
class ServerCallbacks: public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer) {
        deviceConnected = true;
        // 发送连接成功通知
        if (pCharacteristicNotify) {
            StaticJsonDocument<200> doc;
            doc["type"] = "connection";
            doc["status"] = "connected";
            String jsonString;
            serializeJson(doc, jsonString);
            pCharacteristicNotify->setValue(jsonString.c_str());
            pCharacteristicNotify->notify();
        }
    }

    void onDisconnect(NimBLEServer* pServer) {
        deviceConnected = false;
        // 发送断开连接通知
        if (pCharacteristicNotify) {
            StaticJsonDocument<200> doc;
            doc["type"] = "connection";
            doc["status"] = "disconnected";
            String jsonString;
            serializeJson(doc, jsonString);
            pCharacteristicNotify->setValue(jsonString.c_str());
            pCharacteristicNotify->notify();
        }
    }
};

// 有应答写入特征回调（用于控制LED常亮）
class WriteCharacteristicCallbacks: public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pCharacteristic) {
        StaticJsonDocument<200> doc;
        doc["type"] = "device_status";
        doc["led_state"] = digitalRead(LED_PIN) ? "on" : "off";
        doc["blink_pattern"] = blinkPattern;
        doc["uptime"] = millis() / 1000;
        doc["device_name"] = DEVICE_NAME;
        doc["firmware_version"] = FIRMWARE_VERSION;
        String jsonString;
        serializeJson(doc, jsonString);
        pCharacteristic->setValue(jsonString.c_str());
    }

    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string value = pCharacteristic->getValue();
        if (value.length() > 0) {
            // 检查是否为HEX格式（2字节）
            if (value.length() == 2) {
                uint8_t cmd = value[0];
                uint8_t param = value[1];
                if (cmd == 0xFF) {
                    if (param == 0x01) {
                        blinkPattern = 1;  // 常亮
                        digitalWrite(LED_PIN, HIGH);
                    } else if (param == 0x00) {
                        blinkPattern = 0;  // 关闭
                        digitalWrite(LED_PIN, LOW);
                    }
                }
            } else {
                // 文本命令
                if (value == "开灯") {
                    blinkPattern = 1;  // 常亮
                    digitalWrite(LED_PIN, HIGH);
                } else if (value == "关灯") {
                    blinkPattern = 0;  // 关闭
                    digitalWrite(LED_PIN, LOW);
                }
            }

            // 发送响应
            StaticJsonDocument<200> doc;
            doc["type"] = "write_response";
            if (value.length() == 2) {
                char hexStr[8];
                snprintf(hexStr, sizeof(hexStr), "FF%02X", value[1]);
                doc["command"] = hexStr;
            } else {
                doc["command"] = value.c_str();
            }
            doc["led_state"] = digitalRead(LED_PIN) ? "on" : "off";
            doc["blink_pattern"] = blinkPattern;
            doc["mode"] = "常亮";
            String jsonString;
            serializeJson(doc, jsonString);
            pCharacteristic->setValue(jsonString.c_str());
            pCharacteristic->notify();
        }
    }
};

// 无应答写入和监听特征回调（用于控制LED慢闪）
class NotifyCharacteristicCallbacks: public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pCharacteristic) {
        StaticJsonDocument<200> doc;
        doc["type"] = "system_info";
        doc["free_heap"] = ESP.getFreeHeap();
        doc["heap_size"] = ESP.getHeapSize();
        doc["cpu_freq"] = ESP.getCpuFreqMHz();
        doc["sdk_version"] = ESP.getSdkVersion();
        doc["cycle_count"] = ESP.getCycleCount();
        doc["flash_size"] = ESP.getFlashChipSize();
        doc["flash_speed"] = ESP.getFlashChipSpeed();
        String jsonString;
        serializeJson(doc, jsonString);
        pCharacteristic->setValue(jsonString.c_str());
    }

    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string value = pCharacteristic->getValue();
        if (value.length() > 0) {
            // 检查是否为HEX格式（2字节）
            if (value.length() == 2) {
                uint8_t cmd = value[0];
                uint8_t param = value[1];
                if (cmd == 0xFF) {
                    if (param == 0x01) {
                        blinkPattern = 3;  // 慢闪
                    } else if (param == 0x00) {
                        blinkPattern = 0;  // 关闭
                        digitalWrite(LED_PIN, LOW);
                    }
                }
            } else {
                // 文本命令
                if (value == "开灯") {
                    blinkPattern = 3;  // 慢闪
                } else if (value == "关灯") {
                    blinkPattern = 0;  // 关闭
                    digitalWrite(LED_PIN, LOW);
                }
            }

            // 发送响应
            StaticJsonDocument<200> doc;
            doc["type"] = "write_response";
            if (value.length() == 2) {
                char hexStr[8];
                snprintf(hexStr, sizeof(hexStr), "FF%02X", value[1]);
                doc["command"] = hexStr;
            } else {
                doc["command"] = value.c_str();
            }
            doc["led_state"] = digitalRead(LED_PIN) ? "on" : "off";
            doc["blink_pattern"] = blinkPattern;
            doc["mode"] = "慢闪";
            String jsonString;
            serializeJson(doc, jsonString);
            pCharacteristic->setValue(jsonString.c_str());
            pCharacteristic->notify();
        }
    }

    void onSubscribe(NimBLECharacteristic* pCharacteristic) {
        // 开始定期发送通知
        pCharacteristic->setValue("开始监听系统状态");
        pCharacteristic->notify();
    }
};

// 只读特征回调
class ReadOnlyCallbacks: public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pCharacteristic) {
        StaticJsonDocument<200> doc;
        doc["type"] = "read_only";
        doc["value"] = "这是一个只读特征值";
        doc["timestamp"] = millis();
        String jsonString;
        serializeJson(doc, jsonString);
        pCharacteristic->setValue(jsonString.c_str());
    }
};

// 只写特征回调
class WriteOnlyCallbacks: public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string value = pCharacteristic->getValue();
        if (value.length() > 0) {
            Serial.println("Received write-only value: " + String(value.c_str()));
        }
    }
};

// 只通知特征回调
class NotifyOnlyCallbacks: public NimBLECharacteristicCallbacks {
    void onSubscribe(NimBLECharacteristic* pCharacteristic) {
        // 开始定期发送通知
        pCharacteristic->setValue("这是一个只通知特征值");
        pCharacteristic->notify();
    }
};

// 读写特征回调
class ReadWriteCallbacks: public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pCharacteristic) {
        StaticJsonDocument<200> doc;
        doc["type"] = "read_write";
        doc["value"] = "这是一个读写特征值";
        doc["timestamp"] = millis();
        String jsonString;
        serializeJson(doc, jsonString);
        pCharacteristic->setValue(jsonString.c_str());
    }

    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string value = pCharacteristic->getValue();
        if (value.length() > 0) {
            Serial.println("Received read-write value: " + String(value.c_str()));
        }
    }
};

// 读和通知特征回调
class ReadNotifyCallbacks: public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pCharacteristic) {
        StaticJsonDocument<200> doc;
        doc["type"] = "read_notify";
        doc["value"] = "这是一个读和通知特征值";
        doc["timestamp"] = millis();
        String jsonString;
        serializeJson(doc, jsonString);
        pCharacteristic->setValue(jsonString.c_str());
    }

    void onSubscribe(NimBLECharacteristic* pCharacteristic) {
        // 开始定期发送通知
        pCharacteristic->setValue("这是一个读和通知特征值");
        pCharacteristic->notify();
    }
};

// 写和通知特征回调
class WriteNotifyCallbacks: public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string value = pCharacteristic->getValue();
        if (value.length() > 0) {
            Serial.println("Received write-notify value: " + String(value.c_str()));
            // 发送通知
            pCharacteristic->setValue(value);
            pCharacteristic->notify();
        }
    }

    void onSubscribe(NimBLECharacteristic* pCharacteristic) {
        // 可以在这里添加订阅时的处理
    }
};

// 读写和通知特征回调
class AllCallbacks: public NimBLECharacteristicCallbacks {
    void onRead(NimBLECharacteristic* pCharacteristic) {
        StaticJsonDocument<200> doc;
        doc["type"] = "all";
        doc["value"] = "这是一个读写和通知特征值";
        doc["timestamp"] = millis();
        String jsonString;
        serializeJson(doc, jsonString);
        pCharacteristic->setValue(jsonString.c_str());
    }

    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string value = pCharacteristic->getValue();
        if (value.length() > 0) {
            Serial.println("Received all value: " + String(value.c_str()));
            // 发送通知
            pCharacteristic->setValue(value);
            pCharacteristic->notify();
        }
    }

    void onSubscribe(NimBLECharacteristic* pCharacteristic) {
        // 开始定期发送通知
        pCharacteristic->setValue("这是一个读写和通知特征值");
        pCharacteristic->notify();
    }
};

void setup() {
    Serial.begin(115200);
    Serial.println("Starting BLE Server...");

    // 初始化LED
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
    
    // 启动指示：慢闪3次
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(500);  // 亮500ms
        digitalWrite(LED_PIN, LOW);
        delay(500);  // 灭500ms
    }

    // 初始化 BLE
    NimBLEDevice::init("ESP32-BLE-Server");
    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());
    
    // 创建服务1：灯控服务
    NimBLEService* pService = pServer->createService(SERVICE_UUID);

    // 创建有应答写入特征（用于控制LED常亮）
    pCharacteristicWrite = pService->createCharacteristic(
        CHARACTERISTIC_UUID_WRITE,
        NIMBLE_PROPERTY::READ |
        NIMBLE_PROPERTY::WRITE |
        NIMBLE_PROPERTY::NOTIFY
    );
    pCharacteristicWrite->setCallbacks(new WriteCharacteristicCallbacks());
    pCharacteristicWrite->setValue("Write Characteristic");
    pCharacteristicWrite->notify();

    // 创建无应答写入和监听特征（用于控制LED慢闪）
    pCharacteristicNotify = pService->createCharacteristic(
        CHARACTERISTIC_UUID_NOTIFY,
        NIMBLE_PROPERTY::READ |
        NIMBLE_PROPERTY::WRITE |
        NIMBLE_PROPERTY::NOTIFY
    );
    pCharacteristicNotify->setCallbacks(new NotifyCharacteristicCallbacks());
    pCharacteristicNotify->setValue("Notify Characteristic");
    pCharacteristicNotify->notify();

    // 启动服务1
    pService->start();

    // 创建服务2：权限演示服务
    NimBLEService* pServicePermissions = pServer->createService(SERVICE_UUID_PERMISSIONS);

    // 创建只读特征
    pCharacteristicReadOnly = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_READ_ONLY,
        NIMBLE_PROPERTY::READ
    );
    pCharacteristicReadOnly->setCallbacks(new ReadOnlyCallbacks());
    pCharacteristicReadOnly->setValue("Read Only Characteristic");

    // 创建只写特征
    pCharacteristicWriteOnly = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_WRITE_ONLY,
        NIMBLE_PROPERTY::WRITE
    );
    pCharacteristicWriteOnly->setCallbacks(new WriteOnlyCallbacks());
    pCharacteristicWriteOnly->setValue("Write Only Characteristic");

    // 创建只通知特征
    pCharacteristicNotifyOnly = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_NOTIFY_ONLY,
        NIMBLE_PROPERTY::NOTIFY
    );
    pCharacteristicNotifyOnly->setCallbacks(new NotifyOnlyCallbacks());
    pCharacteristicNotifyOnly->setValue("Notify Only Characteristic");
    pCharacteristicNotifyOnly->notify();

    // 创建读写特征
    pCharacteristicReadWrite = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_READ_WRITE,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE
    );
    pCharacteristicReadWrite->setCallbacks(new ReadWriteCallbacks());
    pCharacteristicReadWrite->setValue("Read Write Characteristic");

    // 创建读和通知特征
    pCharacteristicReadNotify = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_READ_NOTIFY,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    pCharacteristicReadNotify->setCallbacks(new ReadNotifyCallbacks());
    pCharacteristicReadNotify->setValue("Read Notify Characteristic");
    pCharacteristicReadNotify->notify();

    // 创建写和通知特征
    pCharacteristicWriteNotify = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_WRITE_NOTIFY,
        NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
    );
    pCharacteristicWriteNotify->setCallbacks(new WriteNotifyCallbacks());
    pCharacteristicWriteNotify->setValue("Write Notify Characteristic");
    pCharacteristicWriteNotify->notify();

    // 创建读写和通知特征
    pCharacteristicAll = pServicePermissions->createCharacteristic(
        CHARACTERISTIC_UUID_ALL,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
    );
    pCharacteristicAll->setCallbacks(new AllCallbacks());
    pCharacteristicAll->setValue("All Permissions Characteristic");
    pCharacteristicAll->notify();

    // 启动服务2
    pServicePermissions->start();

    // 启动广播
    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->addServiceUUID(SERVICE_UUID_PERMISSIONS);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);  // 设置最小连接间隔
    pAdvertising->setMinPreferred(0x12);  // 设置最小连接间隔
    NimBLEDevice::startAdvertising();

    Serial.println("BLE Server is ready!");
}

void loop() {
    // 处理设备连接状态
    if (!deviceConnected && oldDeviceConnected) {
        delay(500); // 给蓝牙栈处理断开连接的时间
        pServer->startAdvertising();
        Serial.println("Start advertising");
        oldDeviceConnected = deviceConnected;
    }
    if (deviceConnected) {
        oldDeviceConnected = deviceConnected;
    }

    // 处理LED闪烁模式
    unsigned long currentTime = millis();
    switch (blinkPattern) {
        case 1: // 常亮
            digitalWrite(LED_PIN, HIGH);
            break;
        case 2: // 快闪 (200ms)
            if (currentTime - lastBlinkTime >= 200) {
                ledState = !ledState;
                digitalWrite(LED_PIN, ledState);
                lastBlinkTime = currentTime;
            }
            break;
        case 3: // 慢闪 (1000ms)
            if (currentTime - lastBlinkTime >= 1000) {
                ledState = !ledState;
                digitalWrite(LED_PIN, ledState);
                lastBlinkTime = currentTime;
            }
            break;
        default: // 关闭
            digitalWrite(LED_PIN, LOW);
            break;
    }

    // 定期发送设备状态
    if (deviceConnected) {
        static unsigned long lastStatusTime = 0;
        if (millis() - lastStatusTime > 5000) { // 每5秒发送一次状态
            StaticJsonDocument<200> doc;
            doc["type"] = "status";
            doc["led_state"] = ledState;
            doc["uptime"] = millis();
            String jsonString;
            serializeJson(doc, jsonString);
            pCharacteristicNotify->setValue(jsonString.c_str());
            pCharacteristicNotify->notify();
            lastStatusTime = millis();
        }
    }

    delay(10);
}