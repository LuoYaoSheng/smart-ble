#ifndef BSP_H
#define BSP_H

#include <stdint.h>

typedef enum {
    LED_OFF,
    LED_ON,
    LED_BLINK_FAST,
    LED_BLINK_SLOW
} LedStatus_t;

void BSP_Init(void);
void BSP_SetLedStatus(LedStatus_t status);
void BSP_WatchdogFeed(void);
uint32_t BSP_GetSystemTick(void);

#endif // BSP_H
