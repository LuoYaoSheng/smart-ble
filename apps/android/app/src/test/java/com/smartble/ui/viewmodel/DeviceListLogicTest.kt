package com.smartble.ui.viewmodel

import com.smartble.core.model.BleDevice
import com.smartble.core.model.ConnectionState
import org.junit.Assert.assertEquals
import org.junit.Test

class DeviceListLogicTest {

    private val devices = listOf(
        BleDevice(id = "1", name = "Sensor-A", rssi = -45, state = ConnectionState.Disconnected),
        BleDevice(id = "2", name = "Sensor-B", rssi = -72, state = ConnectionState.Connected),
        BleDevice(id = "3", name = null, rssi = -60, state = ConnectionState.Disconnected),
        BleDevice(id = "4", name = "Beacon-X", rssi = -88, state = ConnectionState.Disconnected),
    )

    @Test
    fun `filterDevices keeps all devices when threshold disabled`() {
        val result = filterDevices(devices, -100, "", hideUnnamed = false)
        assertEquals(4, result.size)
    }

    @Test
    fun `filterDevices applies rssi threshold`() {
        val result = filterDevices(devices, -70, "", hideUnnamed = false)
        assertEquals(listOf("1", "3"), result.map { it.id })
    }

    @Test
    fun `filterDevices applies case insensitive name prefix`() {
        val result = filterDevices(devices, -100, "sensor", hideUnnamed = false)
        assertEquals(listOf("1", "2"), result.map { it.id })
    }

    @Test
    fun `filterDevices hides unnamed devices`() {
        val result = filterDevices(devices, -100, "", hideUnnamed = true)
        assertEquals(listOf("1", "2", "4"), result.map { it.id })
    }
}
