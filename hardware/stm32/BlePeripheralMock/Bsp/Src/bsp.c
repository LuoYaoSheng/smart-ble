#include "bsp.h"
#include <stdio.h>

// 模拟系统时钟
static uint32_t simulated_tick = 0;

void BSP_Init(void) {
    printf("BSP: HardWare Initialized.\n");
}

void BSP_SetLedStatus(LedStatus_t status) {
    // 实际项目中应调用 HAL_GPIO_WritePin
    switch(status) {
        case LED_OFF: printf("BSP: LED turned OFF\n"); break;
        case LED_ON:  printf("BSP: LED turned ON\n"); break;
        case LED_BLINK_FAST: printf("BSP: LED blinking FAST\n"); break;
        case LED_BLINK_SLOW: printf("BSP: LED blinking SLOW\n"); break;
    }
}

void BSP_WatchdogFeed(void) {
    // 实际应调用 HAL_IWDG_Refresh
    simulated_tick++;
}

uint32_t BSP_GetSystemTick(void) {
    // 实际调用 HAL_GetTick()
    return simulated_tick;
}
