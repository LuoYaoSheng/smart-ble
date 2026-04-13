#include "app_main.h"
#include "bsp.h"
#include "ble_service.h"
#include "smart_ble_protocol.h"

// 模拟状态机
typedef enum {
    APP_STATE_INIT,
    APP_STATE_ADVERTISING,
    APP_STATE_CONNECTED,
    APP_STATE_OTA
} AppState_t;

static AppState_t current_state = APP_STATE_INIT;

void App_Init(void) {
    BSP_Init();
    
    // 初始化蓝牙服务特征值
    BleService_Init();
    
    // 初始化 SmartBLE 自定义协议族
    SmartBle_Protocol_Init();
    
    current_state = APP_STATE_ADVERTISING;
    BSP_SetLedStatus(LED_BLINK_FAST); // 快闪代表广播中
}

void App_Process(void) {
    BSP_WatchdogFeed(); // 避免卡死
    
    // 监听底层状态
    BleConnectionStatus_t conn = BleService_GetStatus();
    
    if (conn == BLE_CONNECTED && current_state == APP_STATE_ADVERTISING) {
        current_state = APP_STATE_CONNECTED;
        BSP_SetLedStatus(LED_ON); // 常亮代表已连接
    } 
    else if (conn == BLE_DISCONNECTED && current_state == APP_STATE_CONNECTED) {
        // 重置状态
        current_state = APP_STATE_ADVERTISING;
        BSP_SetLedStatus(LED_BLINK_FAST); 
    }
    
    // 定期模拟推送 10Hz Notify 供前端框架测试 Throttler 性能
    if (current_state == APP_STATE_CONNECTED) {
        if (BSP_GetSystemTick() % 100 == 0) { // 每 100ms
            uint8_t heartbeat_data[] = { 0xFF, 0x01, 0x02 };
            BleService_NotifyData(heartbeat_data, sizeof(heartbeat_data));
        }
    }
}
