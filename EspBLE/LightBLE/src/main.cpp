#include <Arduino.h>
#include <NimBLEDevice.h>
#include <NimBLEServer.h>
#include <NimBLEUtils.h>
#include <ArduinoJson.h>

// BLE 服务和特征 UUID
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID_WRITE "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // 有应答写入
#define CHARACTERISTIC_UUID_NOTIFY "beb5483e-36e1-4688-b7f5-ea07361b26a9" // 无应答写入和监听

// 服务和特征值名称
#define SERVICE_NAME        "智能蓝牙服务"
#define CHARACTERISTIC_WRITE_NAME "控制特征值"
#define CHARACTERISTIC_NOTIFY_NAME "通知特征值"

// LED引脚定义
#define LED_PIN 2

// 全局变量
NimBLEServer* pServer = nullptr;
NimBLECharacteristic* pCharacteristicWrite = nullptr;  // 有应答写入特征
NimBLECharacteristic* pCharacteristicNotify = nullptr; // 无应答写入和监听特征
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

// 有应答写入特征回调
class WriteCharacteristicCallbacks: public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string value = pCharacteristic->getValue();
        if (value.length() > 0) {
            // 解析JSON命令
            StaticJsonDocument<200> doc;
            DeserializationError error = deserializeJson(doc, value.c_str());
            
            if (!error) {
                const char* command = doc["command"];
                if (command) {
                    if (strcmp(command, "led_toggle") == 0) {
                        ledState = !ledState;
                        digitalWrite(LED_PIN, ledState);
                        
                        // 发送LED状态更新
                        StaticJsonDocument<200> response;
                        response["type"] = "led";
                        response["state"] = ledState;
                        String jsonString;
                        serializeJson(response, jsonString);
                        pCharacteristic->setValue(jsonString.c_str());
                        pCharacteristic->notify();
                    }
                    else if (strcmp(command, "get_status") == 0) {
                        // 发送设备状态
                        StaticJsonDocument<200> response;
                        response["type"] = "status";
                        response["led_state"] = ledState;
                        response["uptime"] = millis();
                        String jsonString;
                        serializeJson(response, jsonString);
                        pCharacteristic->setValue(jsonString.c_str());
                        pCharacteristic->notify();
                    }
                    else if (strcmp(command, "test_write_type") == 0) {
                        // 测试写入类型
                        const char* writeType = doc["write_type"];
                        if (writeType) {
                            if (strcmp(writeType, "write") == 0) {
                                // 有应答写入 - 快闪
                                blinkPattern = 2;
                                lastBlinkTime = millis();
                            }
                            else if (strcmp(writeType, "write_no_response") == 0) {
                                // 无应答写入 - 慢闪
                                blinkPattern = 3;
                                lastBlinkTime = millis();
                            }
                        }
                    }
                }
            }
        }
    }
};

// 无应答写入和监听特征回调
class NotifyCharacteristicCallbacks: public NimBLECharacteristicCallbacks {
    void onWrite(NimBLECharacteristic* pCharacteristic) {
        std::string value = pCharacteristic->getValue();
        if (value.length() > 0) {
            // 处理接收到的数据
            Serial.println("Received Notify: ");
            for (int i = 0; i < value.length(); i++) {
                Serial.print(value[i]);
            }
            Serial.println();
        }
    }
};

void setup() {
    Serial.begin(115200);
    Serial.println("Starting BLE Server...");

    // 初始化LED
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    // 初始化 BLE
    NimBLEDevice::init("ESP32-BLE-Server");
    pServer = NimBLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());
    
    // 创建 BLE 服务
    NimBLEService* pService = pServer->createService(SERVICE_UUID);

    // 创建有应答写入特征
    pCharacteristicWrite = pService->createCharacteristic(
        CHARACTERISTIC_UUID_WRITE,
        NIMBLE_PROPERTY::READ |
        NIMBLE_PROPERTY::WRITE |
        NIMBLE_PROPERTY::NOTIFY
    );
    pCharacteristicWrite->setCallbacks(new WriteCharacteristicCallbacks());
    pCharacteristicWrite->setValue("Write Characteristic");
    
    // 添加特征值描述符（名称）
    NimBLEDescriptor* pWriteDesc = pCharacteristicWrite->createDescriptor(
        "2901",  // 标准描述符UUID
        NIMBLE_PROPERTY::READ
    );
    pWriteDesc->setValue(CHARACTERISTIC_WRITE_NAME);
    
    pCharacteristicWrite->notify();

    // 创建无应答写入和监听特征
    pCharacteristicNotify = pService->createCharacteristic(
        CHARACTERISTIC_UUID_NOTIFY,
        NIMBLE_PROPERTY::READ |
        NIMBLE_PROPERTY::WRITE |
        NIMBLE_PROPERTY::NOTIFY
    );
    pCharacteristicNotify->setCallbacks(new NotifyCharacteristicCallbacks());
    pCharacteristicNotify->setValue("Notify Characteristic");
    
    // 添加特征值描述符（名称）
    NimBLEDescriptor* pNotifyDesc = pCharacteristicNotify->createDescriptor(
        "2901",  // 标准描述符UUID
        NIMBLE_PROPERTY::READ
    );
    pNotifyDesc->setValue(CHARACTERISTIC_NOTIFY_NAME);
    
    pCharacteristicNotify->notify();

    // 启动服务和广播
    pService->start();
    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
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