#pragma once

#include <Arduino.h>
#include <NimBLECharacteristic.h>

// NimBLE 1.4 的 setValue 重载只有 (uint8_t*, size_t)、(vector<uint8_t>&) 和
// template<const T&>：传 const char* 会按 sizeof(指针)=4 只拷贝指针本身，
// 传 String/std::string 则拷贝对象字节（WIN-ESP32-002，真机 4 字节堆指针实证）。
// 字符串赋值统一走本辅助的显式长度重载；字符串字面量因 sizeof(char[N]) 为
// 整段数组恰好正确，可保持原样。
inline void bleSetValue(NimBLECharacteristic* ch, const String& value) {
    ch->setValue(reinterpret_cast<const uint8_t*>(value.c_str()), value.length());
}

inline void bleSetValue(NimBLECharacteristic* ch, const std::string& value) {
    ch->setValue(reinterpret_cast<const uint8_t*>(value.data()), value.size());
}
