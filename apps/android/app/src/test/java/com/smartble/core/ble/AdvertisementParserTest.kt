package com.smartble.core.ble

import com.smartble.core.model.BleDevice
import com.smartble.core.model.ScanRecord
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/*
 * p001-advdlg 广播弹窗（20260924 手机端重建）：AD 结构真值解析 + 复制文本口径锁定。
 * 用例含空口实证帧型 07 FF 0100 + 4757494E（GWIN/QWIN/TWIN 广播模板，20260924-AIR-GQT）。
 */

class AdvertisementParserTest {

    private fun bytes(vararg v: Int) = v.map { it.toByte() }.toByteArray()

    // ---------- 逐段走读 ----------

    @Test
    fun `parses flags manufacturer and tx power segments`() {
        // 02 01 06 | 07 FF 01 00 47 57 49 4E | 02 0A 00
        val raw = bytes(0x02, 0x01, 0x06, 0x07, 0xFF, 0x01, 0x00, 0x47, 0x57, 0x49, 0x4E, 0x02, 0x0A, 0x00)
        val segs = AdvertisementParser.parse(raw)

        assertEquals(3, segs.size)
        assertEquals("Flags", segs[0].name)
        assertEquals(3, segs[0].frameLength)
        assertEquals("020106", segs[0].frameHex())

        assertEquals("厂商数据", segs[1].name)
        assertEquals(8, segs[1].frameLength)
        assertEquals("07ff01004757494e", segs[1].frameHex())
        assertEquals("厂商 ID 0x0001", segs[1].decoded)

        assertEquals("发射功率", segs[2].name)
        assertEquals("0 dBm", segs[2].decoded)
    }

    @Test
    fun `decodes local name segment`() {
        // 07 09 "device"
        val segs = AdvertisementParser.parse(bytes(0x07, 0x09, 0x64, 0x65, 0x76, 0x69, 0x63, 0x65))
        assertEquals(1, segs.size)
        assertEquals("完整本地名称", segs[0].name)
        assertEquals("device", segs[0].decoded)
    }

    @Test
    fun `decodes service data 16-bit uuid little endian`() {
        // 05 16 0F 18 01 02 → Service Data UUID 0x180F
        val segs = AdvertisementParser.parse(bytes(0x05, 0x16, 0x0F, 0x18, 0x01, 0x02))
        assertEquals("Service Data", segs[0].name)
        assertEquals(AdvertisementParser.formatUuid16(0x180F), segs[0].decoded)
        assertEquals("0000180f-0000-1000-8000-00805f9b34fb", segs[0].decoded)
    }

    @Test
    fun `stops at zero padding tail`() {
        val segs = AdvertisementParser.parse(bytes(0x02, 0x01, 0x06, 0x00, 0x00))
        assertEquals(1, segs.size)
        assertEquals("Flags", segs[0].name)
    }

    @Test
    fun `clamps truncated segment instead of reading past end`() {
        // 声明 len=6 但只剩 type + 2 字节
        val segs = AdvertisementParser.parse(bytes(0x02, 0x01, 0x06, 0x06, 0xFF, 0x01, 0x00))
        assertEquals(2, segs.size)
        assertEquals("厂商数据", segs[1].name)
        assertTrue(segs[1].truncated)
        assertEquals(4, segs[1].frameLength)
    }

    @Test
    fun `null and empty input yield no segments`() {
        assertTrue(AdvertisementParser.parse(null).isEmpty())
        assertTrue(AdvertisementParser.parse(ByteArray(0)).isEmpty())
    }

    @Test
    fun `unknown type falls back to placeholder name`() {
        val segs = AdvertisementParser.parse(bytes(0x02, 0x2B, 0x01))
        assertEquals("未知类型", segs[0].name)
    }

    // ---------- hex 工具 ----------

    @Test
    fun `hex helpers`() {
        assertEquals("0a0b0c", AdvertisementParser.hex(bytes(0x0A, 0x0B, 0x0C)))
        assertEquals("0a 0b 0c", AdvertisementParser.hexSpaced(bytes(0x0A, 0x0B, 0x0C)))
        assertEquals("0000feed-0000-1000-8000-00805f9b34fb", AdvertisementParser.formatUuid16(0xFEED))
    }

    // ---------- 厂商 ID / profileMatch 文本 ----------

    @Test
    fun `manufacturer id text formats first company id`() {
        assertEquals("0x004C", AdvertisementParser.manufacturerIdText(mapOf(0x004C to bytes(0x10))))
        assertNull(AdvertisementParser.manufacturerIdText(null))
    }

    @Test
    fun `profile match text mirrors canon wording`() {
        val weak = BleDevice("AA:BB", "SHID-00000001", -60)
        assertEquals("WEAK · smart-hid", AdvertisementParser.profileMatchText(weak))
        val none = BleDevice("AA:BB", null, -60)
        assertEquals("—", AdvertisementParser.profileMatchText(none))
    }

    // ---------- 复制文本 ----------

    @Test
    fun `copy text carries kv uuids segments and manufacturer id`() {
        val device = BleDevice(
            deviceId = "12:34:56:78:9A:BC",
            name = "SHID-00000001",
            rssi = -58,
            scanRecord = ScanRecord(
                serviceUuids = listOf("9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04"),
                manufacturerData = mapOf(0x0001 to bytes(0x47, 0x57, 0x49, 0x4E)),
                rawBytes = bytes(0x02, 0x01, 0x06, 0x07, 0xFF, 0x01, 0x00, 0x47, 0x57, 0x49, 0x4E),
            ),
        )
        val text = AdvertisementParser.buildAdvCopyText(device)
        assertTrue(text.contains("设备 ID: 12:34:56:78:9A:BC"))
        assertTrue(text.contains("名称: SHID-00000001"))
        assertTrue(text.contains("RSSI: -58 dBm"))
        assertTrue(text.contains("profileMatch: STRONG · smart-hid"))
        assertTrue(text.contains("9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04"))
        assertTrue(text.contains("FF · 厂商数据 (8 B): 07ff01004757494e"))
        assertTrue(text.contains("整包 hex (11 B): 02010607ff01004757494e"))
        assertTrue(text.contains("厂商 ID: 0x0001"))
    }

    @Test
    fun `copy text notes missing advertisement`() {
        val text = AdvertisementParser.buildAdvCopyText(BleDevice("AA", "x", -60))
        assertTrue(text.contains("本轮平台 API 未提供此字段（advertisement 不存在）"))
    }
}
