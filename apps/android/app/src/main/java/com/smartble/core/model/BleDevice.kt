package com.smartble.core.model

/**
 * BLE 设备
 */
data class BleDevice(
    val id: String,
    val name: String?,
    val rssi: Int,
    val state: ConnectionState = ConnectionState.Disconnected,
    val scanRecord: ScanRecord? = null,
) {
    val displayName: String
        get() = name ?: "未知设备"

    val rssiLevel: RssiLevel
        get() = when {
            rssi >= -50 -> RssiLevel.Excellent
            rssi >= -70 -> RssiLevel.Good
            rssi >= -90 -> RssiLevel.Fair
            else -> RssiLevel.Weak
        }
}

/**
 * 连接状态
 */
enum class ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Disconnecting,
}

/**
 * 信号强度等级
 */
enum class RssiLevel {
    Excellent,
    Good,
    Fair,
    Weak,
}

/**
 * 扫描记录
 */
data class ScanRecord(
    val serviceUuids: List<String>? = null,
    val manufacturerData: Map<Int, ByteArray>? = null,
    val serviceData: Map<String, ByteArray>? = null,
    val txPowerLevel: Int? = null,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as ScanRecord

        if (serviceUuids != other.serviceUuids) return false
        if (manufacturerData != other.manufacturerData) return false
        if (serviceData != other.serviceData) return false
        if (txPowerLevel != other.txPowerLevel) return false

        return true
    }

    override fun hashCode(): Int {
        var result = serviceUuids?.hashCode() ?: 0
        result = 31 * result + (manufacturerData?.hashCode() ?: 0)
        result = 31 * result + (serviceData?.hashCode() ?: 0)
        result = 31 * result + (txPowerLevel ?: 0)
        return result
    }
}

/**
 * 扫描结果
 */
data class ScanResult(
    val device: BleDevice,
    val timestampNanos: Long,
)
