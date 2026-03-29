package com.smartble.ui.screen

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DeviceDetailUiLogicTest {

    @Test
    fun `formatBytes renders byte and kilobyte units`() {
        assertEquals("0 B", formatBytes(0))
        assertEquals("512 B", formatBytes(512))
        assertEquals("1.0 KB", formatBytes(1024))
        assertEquals("1.5 KB", formatBytes(1536))
    }

    @Test
    fun `formatBytes renders megabyte units`() {
        assertEquals("1.0 MB", formatBytes(1024 * 1024))
    }

    @Test
    fun `isValidHexInput accepts spaced hex and rejects malformed input`() {
        assertTrue(isValidHexInput("FF 00 AA"))
        assertTrue(isValidHexInput("0A0B"))
        assertFalse(isValidHexInput(""))
        assertFalse(isValidHexInput("ABC"))
        assertFalse(isValidHexInput("GG"))
    }
}
