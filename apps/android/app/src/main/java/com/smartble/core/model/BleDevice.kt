package com.smartble.core.model

import java.util.Arrays

/**
 * BLE 设备
 */
data class BleDevice(
    val deviceId: String,
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
    // 广播帧原始字节（Android ScanRecord.getBytes 真值，供 p001-advdlg AD 结构逐段解析）
    val rawBytes: ByteArray? = null,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as ScanRecord

        if (serviceUuids != other.serviceUuids) return false
        if (!manufacturerDataEquals(manufacturerData, other.manufacturerData)) return false
        if (!serviceDataEquals(serviceData, other.serviceData)) return false
        if (txPowerLevel != other.txPowerLevel) return false
        if (!rawBytes.contentEquals(other.rawBytes)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = serviceUuids?.hashCode() ?: 0
        result = 31 * result + (manufacturerData?.entries?.sumOf { it.key * 31 + Arrays.hashCode(it.value) } ?: 0)
        result = 31 * result + (serviceData?.entries?.sumOf { it.key.hashCode() * 31 + Arrays.hashCode(it.value) } ?: 0)
        result = 31 * result + (txPowerLevel ?: 0)
        result = 31 * result + (rawBytes?.let(Arrays::hashCode) ?: 0)
        return result
    }

    // ByteArray 载荷按内容比较（data class 默认引用相等会让逐帧刷新永远不等）
    private fun manufacturerDataEquals(a: Map<Int, ByteArray>?, b: Map<Int, ByteArray>?): Boolean {
        if (a == null || b == null) return a == b
        if (a.keys != b.keys) return false
        return a.keys.all { a[it]!!.contentEquals(b[it]!!) }
    }

    private fun serviceDataEquals(a: Map<String, ByteArray>?, b: Map<String, ByteArray>?): Boolean {
        if (a == null || b == null) return a == b
        if (a.keys != b.keys) return false
        return a.keys.all { a[it]!!.contentEquals(b[it]!!) }
    }
}

/**
 * 扫描结果
 */
data class ScanResult(
    val device: BleDevice,
    val timestampNanos: Long,
)
