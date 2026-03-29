package com.smartble.core.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BleModelUtilsTest {

    @Test
    fun `shortUuid extracts 16 bit portion from full uuid`() {
        assertEquals("180F", BleUuids.SERVICE_BATTERY.shortUuid())
    }

    @Test
    fun `hexToByteArray parses spaced hex string`() {
        val bytes = "FF 00 AA".hexToByteArray()
        assertTrue(bytes.contentEquals(byteArrayOf(0xFF.toByte(), 0x00, 0xAA.toByte())))
    }

    @Test
    fun `toHexString formats uppercase spaced bytes`() {
        val text = byteArrayOf(0x01, 0x0A, 0xFF.toByte()).toHexString()
        assertEquals("01 0A FF", text)
    }

    @Test
    fun `rssiLevel maps strong and weak signals correctly`() {
        assertEquals(RssiLevel.Excellent, BleDevice("1", "A", -49).rssiLevel)
        assertEquals(RssiLevel.Good, BleDevice("2", "B", -65).rssiLevel)
        assertEquals(RssiLevel.Fair, BleDevice("3", "C", -85).rssiLevel)
        assertEquals(RssiLevel.Weak, BleDevice("4", "D", -95).rssiLevel)
    }

    @Test
    fun `ble characteristic capability flags reflect property set`() {
        val characteristic = BleCharacteristic(
            serviceUuid = BleUuids.SERVICE_OTA,
            uuid = BleUuids.CHARACTERISTIC_OTA_CONTROL,
            properties = setOf(Property.Read, Property.WriteNoResponse, Property.Notify)
        )

        assertTrue(characteristic.canRead)
        assertTrue(characteristic.canWrite)
        assertTrue(characteristic.canNotify)
        assertFalse(
            BleCharacteristic(
                serviceUuid = BleUuids.SERVICE_OTA,
                uuid = BleUuids.CHARACTERISTIC_OTA_DATA,
                properties = emptySet()
            ).canWrite
        )
    }
}
