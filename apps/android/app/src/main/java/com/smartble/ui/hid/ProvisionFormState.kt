package com.smartble.ui.hid

import com.smartble.core.profile.SmartHidProtocol

/*
 * Smart HID 配网表单纯状态（MAC-005 · P002 Configure 阶段）。
 *
 * F023 零持久化红线：Wi-Fi 密码与 pairing token 只存在于本内存对象，
 * 经 [clearSensitive] 在离开页面/回收时清空；不落日志、不落存储。
 * 纯 JVM 类（无 Android 依赖），单测直接锁定行为。
 */

class ProvisionFormState {

    var wifiSsid: String = ""
        private set
    var wifiPassword: String = ""
        private set
    var hubHost: String = ""
        private set
    var hubPort: String = ""
        private set

    /** 一次性配对 token（32 位十六进制；仅内存） */
    var pairingToken: String = ""
        private set

    /** 最近一次二维码/粘贴解析结果提示（空=无） */
    var qrParseMessage: String? = null
        private set

    val canSubmit: Boolean
        get() = wifiSsid.isNotBlank() && hubHost.isNotBlank() && pairingToken.isNotBlank()

    /** token 脱敏展示（保留前 4 位；编辑态由输入框明文承担） */
    val maskedToken: String
        get() = if (pairingToken.length <= 4) pairingToken else "${pairingToken.take(4)}…（已录入）"

    fun updateSsid(value: String) { wifiSsid = value.trimEnd() }
    fun updatePassword(value: String) { wifiPassword = value }
    fun updateHubHost(value: String) { hubHost = value.trim() }
    fun updateHubPort(value: String) { hubPort = value.trim().filter { it.isDigit() }.take(5) }
    fun updateToken(value: String) { pairingToken = value.trim() }

    /**
     * ControlHub 二维码 / 手动粘贴（shid://pair?...）。
     * 解析成功回填 hub + token；失败给出可行动提示，不清空已填字段。
     */
    fun applyPairingPaste(text: String): Boolean {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) {
            qrParseMessage = "粘贴内容为空"
            return false
        }
        val payload = SmartHidProtocol.parsePairingQrPayload(trimmed)
        return if (payload != null) {
            hubHost = payload.host
            hubPort = if (payload.port in 1..65535) payload.port.toString() else ""
            pairingToken = payload.token
            qrParseMessage = null
            true
        } else {
            qrParseMessage = "配对码格式不正确（需 shid://pair 链接）"
            false
        }
    }

    /** 离开配网页/终局后调用：清空敏感字段（密码 + token），非敏感字段保留便于重试。 */
    fun clearSensitive() {
        wifiPassword = ""
        pairingToken = ""
        qrParseMessage = null
    }

    /** 全量清空（页面销毁）。 */
    fun clearAll() {
        wifiSsid = ""
        wifiPassword = ""
        hubHost = ""
        hubPort = ""
        pairingToken = ""
        qrParseMessage = null
    }
}
