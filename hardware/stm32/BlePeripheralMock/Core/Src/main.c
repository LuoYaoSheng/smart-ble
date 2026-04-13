#include "app_main.h"

// 传统 STM32CubeMX 生成的入口函数保护区域
// USER CODE BEGIN Includes
// USER CODE END Includes

int main(void) {
    // HAL_Init();
    // SystemClock_Config();
    
    // USER CODE BEGIN 2
    App_Init();
    // USER CODE END 2

    while (1) {
        // USER CODE BEGIN 3
        App_Process();
        // USER CODE END 3
    }
}
