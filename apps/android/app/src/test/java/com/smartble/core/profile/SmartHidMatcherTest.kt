package com.smartble.core.profile

import org.junit.Assert.assertEquals
import org.junit.Test

/*
 * MAC-005：Smart HID 扫描匹配 / 页面路由 / 恢复动作映射（P002/P003/P005 契约锁定）。
 * 口径与 uniapp profile-navigation.js + smart-hid/profile.js 同源。
 */

class SmartHidMatcherTest {

    // ---------- 匹配 ----------

    @Test
    fun `strong match when advertisement carries provisioning service uuid`() {
        val level = SmartHidMatcher.matchAdvertisement(
            name = null,
            serviceUuids = listOf("9F1D1001-E73B-4C8F-9D2A-6F0B5E8A1C04"),
        )
        assertEquals(HidMatchLevel.STRONG, level)
    }

    @Test
    fun `weak match when name starts with SHID prefix`() {
        assertEquals(HidMatchLevel.WEAK, SmartHidMatcher.matchAdvertisement("SHID-AB12", null))
        assertEquals(HidMatchLevel.WEAK, SmartHidMatcher.matchAdvertisement("shid-x", emptyList()))
    }

    @Test
    fun `none match otherwise`() {
        assertEquals(HidMatchLevel.NONE, SmartHidMatcher.matchAdvertisement("BLEToolkit-Server", null))
        assertEquals(HidMatchLevel.NONE, SmartHidMatcher.matchAdvertisement(null, listOf("ffe0")))
        assertEquals(HidMatchLevel.NONE, SmartHidMatcher.matchAdvertisement("MySHID-after", null))
    }

    // ---------- 路由 ----------

    @Test
    fun `scan card opens provision for smart hid and generic detail otherwise`() {
        val hid = device(name = "SHID-AB12", id = "H:1")
        val generic = device(name = "BLEToolkit-Server", id = "G:1")
        assertEquals("hid_provision/H:1/SHID-AB12", HidRoutes.scanCardOpen(hid))
        assertEquals("device_detail/G:1/BLEToolkit-Server", HidRoutes.scanCardOpen(generic))
    }

    @Test
    fun `connected tab routes smart hid to hid detail`() {
        val hid = device(name = "SHID-CD34", id = "H:2", serviceUuid = SmartHidProtocol.SERVICE_UUID)
        val generic = device(name = "JY-201", id = "G:2")
        assertEquals("hid_detail/H:2/SHID-CD34", HidRoutes.connectedOpen(hid))
        assertEquals("device_detail/G:2/JY-201", HidRoutes.connectedOpen(generic))
    }

    @Test
    fun `route builders use canonical patterns`() {
        assertEquals("hid_provision/{deviceId}/{deviceName}", HidRoutes.PROVISION_PATTERN)
        assertEquals("hid_detail/{deviceId}/{deviceName}", HidRoutes.DETAIL_PATTERN)
        assertEquals("hid_diagnostics/{deviceId}/{deviceName}", HidRoutes.DIAGNOSTICS_PATTERN)
        assertEquals("hid_diagnostics/D:1/n", HidRoutes.diagnostics("D:1", "n"))
    }

    // ---------- 恢复动作 ----------

    @Test
    fun `recovery codes map to page actions`() {
        assertEquals(HidRecoveryNav.BACK_TO_FORM, HidRecovery.navFor("form"))
        assertEquals(HidRecoveryNav.FOCUS_PAIRING, HidRecovery.navFor("pairing"))
        assertEquals(HidRecoveryNav.OPEN_DIAGNOSTICS, HidRecovery.navFor("diagnostics"))
        assertEquals(HidRecoveryNav.RETRY_SUBMIT, HidRecovery.navFor("retry"))
        assertEquals(HidRecoveryNav.RECONNECT, HidRecovery.navFor("reconnect"))
        // 未知值兜底回表单，不崩溃
        assertEquals(HidRecoveryNav.BACK_TO_FORM, HidRecovery.navFor(null))
        assertEquals(HidRecoveryNav.BACK_TO_FORM, HidRecovery.navFor("surprise"))
    }

    @Test
    fun `protocol recovery vocabulary matches recovery nav domain`() {
        // 锁定 SmartHidProtocol.recoveryAction 产出值域与 HidRecovery 消费域一致
        val codes = listOf(
            "invalid_payload", "wifi_failed", "controlhub_unreachable",
            "pairing_invalid", "pairing_expired", "pairing_used",
            "mqtt_invalid", "storage_failed",
        )
        codes.forEach { code ->
            val recovery = SmartHidProtocol.recoveryAction(code)
            assert(recovery in setOf("form", "pairing", "diagnostics", "retry")) {
                "code $code 产出未知恢复动作 $recovery"
            }
        }
    }

    private fun device(name: String?, id: String, serviceUuid: String? = null) =
        com.smartble.core.model.BleDevice(
            deviceId = id,
            name = name,
            rssi = -55,
            scanRecord = com.smartble.core.model.ScanRecord(
                serviceUuids = serviceUuid?.let { listOf(it) },
            ),
        )
}
