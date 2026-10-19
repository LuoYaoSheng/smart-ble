package com.smartble.ui.hid

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/*
 * MAC-005：P002 配网表单状态（二维码/粘贴解析、可提交规则、零持久化红线）。
 * F023：clearSensitive 后密码与 token 必须为空（内存即弃），非敏感字段保留。
 */

class ProvisionFormStateTest {

    private fun validQr(): String =
        "shid://pair?host=hub.lan&token=0123456789abcdef0123456789abcdef&port=17892"

    @Test
    fun `apply pairing paste fills hub and token`() {
        val form = ProvisionFormState()
        val ok = form.applyPairingPaste(validQr())
        assertTrue(ok)
        assertEquals("hub.lan", form.hubHost)
        assertEquals("17892", form.hubPort)
        assertEquals("0123456789abcdef0123456789abcdef", form.pairingToken)
        assertNull(form.qrParseMessage)
    }

    @Test
    fun `apply pairing paste fills protocol default port when absent`() {
        val form = ProvisionFormState()
        val ok = form.applyPairingPaste("shid://pair?host=hub.example.com&token=0123456789abcdef0123456789abcdef")
        assertTrue(ok)
        // 协议默认端口 17892 由解析层带入（与 TS/Dart 镜像一致）
        assertEquals("17892", form.hubPort)
    }

    @Test
    fun `invalid paste keeps existing fields and reports message`() {
        val form = ProvisionFormState()
        form.updateHubHost("keep.lan")
        form.updateToken("0123456789abcdef0123456789abcdef")
        val ok = form.applyPairingPaste("https://not-a-pairing-link")
        assertFalse(ok)
        assertEquals("keep.lan", form.hubHost)
        assertEquals("0123456789abcdef0123456789abcdef", form.pairingToken)
        assertTrue(form.qrParseMessage!!.contains("shid://pair"))
    }

    @Test
    fun `can submit requires ssid hub and token`() {
        val form = ProvisionFormState()
        assertFalse(form.canSubmit)
        form.updateSsid("Home-2.4G")
        assertFalse(form.canSubmit)
        form.updateHubHost("hub.lan")
        assertFalse(form.canSubmit)
        form.updateToken("0123456789abcdef0123456789abcdef")
        assertTrue(form.canSubmit)
    }

    @Test
    fun `clearSensitive drops password and token but keeps retryable fields`() {
        val form = ProvisionFormState()
        form.updateSsid("Home-2.4G")
        form.updatePassword("secret-pass")
        form.updateHubHost("hub.lan")
        form.updateHubPort("17892")
        form.updateToken("0123456789abcdef0123456789abcdef")

        form.clearSensitive()

        assertEquals("", form.wifiPassword)
        assertEquals("", form.pairingToken)
        assertEquals("Home-2.4G", form.wifiSsid)
        assertEquals("hub.lan", form.hubHost)
        assertEquals("17892", form.hubPort)
    }

    @Test
    fun `masked token never leaks full value`() {
        val form = ProvisionFormState()
        form.updateToken("0123456789abcdef0123456789abcdef")
        val masked = form.maskedToken
        assertTrue(masked.startsWith("0123"))
        assertFalse(masked.contains("0123456789abcdef0123456789abcdef"))
    }

    @Test
    fun `hub port input filtered to digits`() {
        val form = ProvisionFormState()
        form.updateHubPort("17a8b92")
        assertEquals("17892", form.hubPort)
    }
}
