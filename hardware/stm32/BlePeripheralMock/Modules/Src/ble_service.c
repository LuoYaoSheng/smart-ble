#include "ble_service.h"
#include <stdio.h>
// 实际使用时包含 UART 外设头文件，如 #include "usart.h"

static BleConnectionStatus_t current_conn_state = BLE_DISCONNECTED;

void BleService_Init(void) {
    // JDY-23: 通过 UART AT 指令修改名称和开启透传模式
    // printf("AT+NAME=SmartBLE-JDY23\\r\\n");
    // 实际项目中应开启 UART 中断接收: HAL_UART_Receive_IT(&huart1, rx_buf, 1);
    printf("BLE_MODULE: JDY-23 UART Interface Initialized.\n");
}

BleConnectionStatus_t BleService_GetStatus(void) {
    // 对于透传模块，有的会有 STAT 引脚输出高低电平代表连接状态
    // return HAL_GPIO_ReadPin(JDY_STAT_PORT, JDY_STAT_PIN) ? BLE_CONNECTED : BLE_DISCONNECTED;
    return current_conn_state;
}

void BleService_NotifyData(uint8_t* payload, uint16_t len) {
    if (current_conn_state == BLE_CONNECTED) {
        // JDY-23 透传发送：直接调用 UART 外设进行串口发送
        // HAL_UART_Transmit(&huart1, payload, len, 100);
        // printf("BLE_MODULE: UART Transmitted %d bytes.\n", len); 
    }
}

// 模拟中断回调 (供外部测试调用)
void Mock_Trigger_Connection(void) {
    current_conn_state = BLE_CONNECTED;
    printf("BLE_MODULE: JDY-23 STAT PIN -> HIGH (CONNECTED).\n");
}

void Mock_Trigger_Disconnection(void) {
    current_conn_state = BLE_DISCONNECTED;
    printf("BLE_MODULE: JDY-23 STAT PIN -> LOW (DISCONNECTED).\n");
}
