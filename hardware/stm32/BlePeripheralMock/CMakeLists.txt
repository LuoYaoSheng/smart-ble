# STM32CMake Boilerplate generated for SmartBLE
#
# NOTE: This file assumes generation by STM32CubeMX.
# Modify this file only outside the BEGIN/END user code markers.

cmake_minimum_required(VERSION 3.22)

project(SmartBleSTM32Mock C CXX ASM)

# Toolchain configuration (Assumes STM32CubeCLT is installed per team spec)
set(CMAKE_C_COMPILER arm-none-eabi-gcc)
set(CMAKE_CXX_COMPILER arm-none-eabi-g++)
set(CMAKE_ASM_COMPILER arm-none-eabi-gcc)

# Standard Team Directories
include_directories(
    Core/Inc
    App/Inc
    Bsp/Inc
    Modules/Inc
    Protocols/Inc
)

file(GLOB_RECURSE SOURCES 
    "Core/Src/*.c"
    "App/Src/*.c"
    "Bsp/Src/*.c"
    "Modules/Src/*.c"
)

# Replace with the actual STM32 component when selected via STM32CubeMX
add_definitions(-DSTM32F103xB)
add_definitions(-DUSE_HAL_DRIVER)

add_executable(${PROJECT_NAME}.elf ${SOURCES})

# Hardware linking flags
target_link_options(${PROJECT_NAME}.elf PRIVATE
    -mcpu=cortex-m3 
    -mthumb 
    -mfloat-abi=soft
    -T"STM32F103C8Tx_FLASH.ld"
    -Wl,-Map=${PROJECT_NAME}.map,--cref 
    -Wl,--gc-sections
)

# Generate HEX and BIN files
add_custom_command(TARGET ${PROJECT_NAME}.elf POST_BUILD
    COMMAND arm-none-eabi-objcopy -O ihex ${PROJECT_NAME}.elf ${PROJECT_NAME}.hex
    COMMAND arm-none-eabi-objcopy -O binary ${PROJECT_NAME}.elf ${PROJECT_NAME}.bin
)
