package com.smartble.core.profile

import com.smartble.core.model.BleDevice

/*
 * Smart HID 扫描匹配与页面路由（MAC-005）。
 *
 * 镜像 uniapp services/provisioning/profile-navigation.js + smart-hid/profile.js
 * 的 matchAdvertisement / routes 语义：
 * - STRONG：广播 Service UUID 含配网服务；
 * - WEAK：设备名以 SHID- 前缀开头（页面显示「疑似」芯片，经 Device Info 二次确认）；
 * - NONE：不匹配，走通用 GATT。
 *
 * 路由规则（profile-navigation.js 同源）：
 * - 扫描卡 Profile 主操作 = 配网（有 provision 路由），标准「连接」保留为第二入口；
 * - 已连接 Tab 按 Profile 分流：Smart HID → HID 详情页，其余 → 通用 GATT 详情；
 * - 失败恢复动作（recovery: form/pairing/diagnostics/retry）映射到页面动作。
 */

/** 扫描匹配级别（对齐 PROFILE_MATCH：NONE < WEAK < STRONG） */
enum class HidMatchLevel { NONE, WEAK, STRONG }

object SmartHidMatcher {

    fun matchAdvertisement(name: String?, serviceUuids: List<String>?): HidMatchLevel {
        val advertised = serviceUuids.orEmpty().map { it.lowercase() }
        if (advertised.contains(SmartHidProtocol.SERVICE_UUID)) return HidMatchLevel.STRONG
        val deviceName = name.orEmpty()
        return if (deviceName.uppercase().startsWith(SmartHidProtocol.NAME_PREFIX)) {
            HidMatchLevel.WEAK
        } else {
            HidMatchLevel.NONE
        }
    }

    fun matchDevice(device: BleDevice): HidMatchLevel =
        matchAdvertisement(device.name, device.scanRecord?.serviceUuids)

    fun isSmartHid(device: BleDevice): Boolean = matchDevice(device) != HidMatchLevel.NONE
}

/**
 * Smart HID 页面路由与分流（纯函数，单测锁定）。
 *
 * 路由形态沿用 MainActivity 既有 `{deviceId}/{deviceName}` 路径参数。
 */
object HidRoutes {

    const val PROVISION_PATTERN = "hid_provision/{deviceId}/{deviceName}"
    const val DETAIL_PATTERN = "hid_detail/{deviceId}/{deviceName}"
    const val DIAGNOSTICS_PATTERN = "hid_diagnostics/{deviceId}/{deviceName}"
    const val GENERIC_DETAIL_PATTERN = "device_detail/{deviceId}/{deviceName}"

    fun provision(deviceId: String, deviceName: String): String =
        "hid_provision/$deviceId/$deviceName"

    fun detail(deviceId: String, deviceName: String): String =
        "hid_detail/$deviceId/$deviceName"

    fun diagnostics(deviceId: String, deviceName: String): String =
        "hid_diagnostics/$deviceId/$deviceName"

    fun genericDetail(deviceId: String, deviceName: String): String =
        "device_detail/$deviceId/$deviceName"

    /** 扫描卡整卡点击：Smart HID → 配网（Profile 主操作）；其余 → 通用 GATT 详情。 */
    fun scanCardOpen(device: BleDevice): String =
        if (SmartHidMatcher.isSmartHid(device)) {
            provision(device.deviceId, device.displayName)
        } else {
            genericDetail(device.deviceId, device.displayName)
        }

    /** 已连接 Tab 分流：Smart HID → HID 详情；其余 → 通用 GATT 详情。 */
    fun connectedOpen(device: BleDevice): String =
        if (SmartHidMatcher.isSmartHid(device)) {
            detail(device.deviceId, device.displayName)
        } else {
            genericDetail(device.deviceId, device.displayName)
        }
}

/**
 * 配网失败恢复动作 → 页面导航（P002 契约：错误码恢复动作）。
 * 与 SmartHidProtocol.recoveryAction 的 form/pairing/diagnostics/retry 四值对应。
 */
enum class HidRecoveryNav { BACK_TO_FORM, FOCUS_PAIRING, OPEN_DIAGNOSTICS, RETRY_SUBMIT, RECONNECT }

object HidRecovery {

    fun navFor(recovery: String?): HidRecoveryNav = when (recovery) {
        "form" -> HidRecoveryNav.BACK_TO_FORM
        "pairing" -> HidRecoveryNav.FOCUS_PAIRING
        "diagnostics" -> HidRecoveryNav.OPEN_DIAGNOSTICS
        "retry" -> HidRecoveryNav.RETRY_SUBMIT
        "reconnect" -> HidRecoveryNav.RECONNECT
        else -> HidRecoveryNav.BACK_TO_FORM
    }
}
