package com.smartble.ui.viewmodel

import com.smartble.core.model.BleDevice

fun filterDevices(
    devices: List<BleDevice>,
    rssiThreshold: Int,
    namePrefix: String,
    hideUnnamed: Boolean
): List<BleDevice> {
    return devices.filter { device ->
        if (rssiThreshold > -100 && device.rssi < rssiThreshold) {
            return@filter false
        }

        if (hideUnnamed && (device.name.isNullOrEmpty() || device.name == "Unknown Device")) {
            return@filter false
        }

        if (namePrefix.isNotEmpty()) {
            device.name?.startsWith(namePrefix, ignoreCase = true) == true
        } else {
            true
        }
    }
}
