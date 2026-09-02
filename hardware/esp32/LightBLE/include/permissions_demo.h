#pragma once

#include <NimBLEServer.h>
#include <NimBLECharacteristic.h>

void permissionsDemoBegin(NimBLEServer* server);
void permissionsDemoTick(bool connected);
