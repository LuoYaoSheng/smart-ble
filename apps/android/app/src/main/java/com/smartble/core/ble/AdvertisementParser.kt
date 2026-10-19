package com.smartble.core.ble

import com.smartble.core.model.BleDevice
import com.smartble.core.profile.HidMatchLevel
import com.smartble.core.profile.SmartHidMatcher

/**
 * 广播帧 AD 结构真值解析（p001-advdlg 口径，20260924 手机端广播弹窗重建）。
 *
 * uniapp/桌面壳只有平台解析字段，须按 buildAdSegments 重建段；Android 拿得到
 * ScanRecord.getBytes() 原始字节，此处直接按 len / type / payload 序列真值逐段走读，
 * 比「平台解析字段重建」多覆盖 Flags/发射功率/Appearance 等平台未投影的段。
 */
data class AdSegment(
    val type: Int,
    val name: String,
    val payload: ByteArray,
    // 含长度字节与类型字节（= payload.size + 2，截断段按实际收到的字节计）
    val frameLength: Int,
    // 人类可读注解（本地名称 / 发射功率值 / 厂商 ID 等），无则为 null
    val decoded: String?,
    val truncated: Boolean = false,
) {
    fun frameBytes(): ByteArray = byteArrayOf((payload.size + 1).toByte(), type.toByte()) + payload
    fun frameHex(): String = AdvertisementParser.hex(frameBytes())
    fun frameHexSpaced(): String = AdvertisementParser.hexSpaced(frameBytes())
}

object AdvertisementParser {

    fun typeName(type: Int): String = when (type) {
        0x01 -> "Flags"
        0x02 -> "不完整 16 位 Service UUID 列表"
        0x03 -> "完整 16 位 Service UUID 列表"
        0x04 -> "不完整 32 位 Service UUID 列表"
        0x05 -> "完整 32 位 Service UUID 列表"
        0x06 -> "不完整 128 位 Service UUID 列表"
        0x07 -> "完整 128 位 Service UUID 列表"
        0x08 -> "缩短本地名称"
        0x09 -> "完整本地名称"
        0x0A -> "发射功率"
        0x0D -> "Class of Device"
        0x16 -> "Service Data"
        0x19 -> "Appearance"
        0x1A -> "广播间隔"
        0xFF -> "厂商数据"
        else -> "未知类型"
    }

    fun parse(raw: ByteArray?): List<AdSegment> {
        if (raw == null || raw.isEmpty()) return emptyList()
        val out = mutableListOf<AdSegment>()
        var i = 0
        while (i < raw.size) {
            val len = raw[i].toInt() and 0xFF
            if (len == 0) break // 帧尾 padding
            val end = i + 1 + len
            if (end > raw.size) {
                // 截断段：按剩余字节收口，不再向后走读
                val payload = if (i + 2 <= raw.size) raw.copyOfRange(i + 2, raw.size) else ByteArray(0)
                if (raw.size - i >= 2) {
                    out += buildSegment(raw[i + 1].toInt() and 0xFF, payload, truncated = true)
                }
                break
            }
            out += buildSegment(raw[i + 1].toInt() and 0xFF, raw.copyOfRange(i + 2, end), truncated = false)
            i = end
        }
        return out
    }

    private fun buildSegment(type: Int, payload: ByteArray, truncated: Boolean): AdSegment = AdSegment(
        type = type,
        name = typeName(type),
        payload = payload,
        frameLength = payload.size + 2,
        decoded = decode(type, payload),
        truncated = truncated,
    )

    private fun decode(type: Int, payload: ByteArray): String? = when {
        type == 0x08 || type == 0x09 -> payload.toString(Charsets.UTF_8).takeIf { it.isNotBlank() }
        type == 0x0A && payload.isNotEmpty() -> "${payload[0].toInt()} dBm"
        type == 0x16 && payload.size >= 2 -> formatUuid16(((payload[1].toInt() and 0xFF) shl 8) or (payload[0].toInt() and 0xFF))
        type == 0xFF && payload.size >= 2 -> {
            val cid = ((payload[1].toInt() and 0xFF) shl 8) or (payload[0].toInt() and 0xFF)
            "厂商 ID 0x${cid.toString(16).padStart(4, '0').uppercase()}"
        }
        else -> null
    }

    fun formatUuid16(value: Int): String =
        "0000${value.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb"

    fun hex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

    fun hexSpaced(bytes: ByteArray): String = bytes.joinToString(" ") { "%02x".format(it) }

    fun manufacturerIdText(manufacturerData: Map<Int, ByteArray>?): String? =
        manufacturerData?.keys?.firstOrNull()?.let { id ->
            "0x${id.toString(16).padStart(4, '0').uppercase()}"
        }

    fun profileMatchText(device: BleDevice): String = when (SmartHidMatcher.matchDevice(device)) {
        HidMatchLevel.STRONG -> "STRONG · smart-hid"
        HidMatchLevel.WEAK -> "WEAK · smart-hid"
        HidMatchLevel.NONE -> "—"
    }

    /**
     * 复制文本（对齐 uniapp advertisement-dialog copyText；AD 结构一行一段，
     * 整包 hex 连续小写便于 diff 空口抓包）。
     */
    fun buildAdvCopyText(device: BleDevice): String {
        val record = device.scanRecord
        val uuids = record?.serviceUuids.orEmpty()
        val manufacturerData = record?.manufacturerData
        val serviceData = record?.serviceData
        val raw = record?.rawBytes
        val segments = parse(raw)
        val lines = mutableListOf(
            "设备 ID: ${device.deviceId}",
            "名称: ${device.name ?: "（未命名）"}",
            "RSSI: ${device.rssi} dBm",
            "profileMatch: ${profileMatchText(device)}",
        )
        if (uuids.isNotEmpty()) {
            lines += "Service UUIDs:"
            lines += uuids
        }
        if (segments.isNotEmpty()) {
            lines += "AD 结构（原始字节解析）:"
            for (seg in segments) {
                val mark = if (seg.truncated) " · 截断" else ""
                lines += "${"%02X".format(seg.type)} · ${seg.name} (${seg.frameLength} B)$mark: ${seg.frameHex()}"
            }
        }
        if (raw != null) {
            lines += "整包 hex (${raw.size} B): ${hex(raw)}"
        }
        manufacturerIdText(manufacturerData)?.let { lines += "厂商 ID: $it" }
        for ((uuid, data) in serviceData.orEmpty()) {
            lines += "Service Data $uuid: ${hex(data)}"
        }
        if (record == null || (uuids.isEmpty() && raw == null &&
                manufacturerData.isNullOrEmpty() && serviceData.isNullOrEmpty())
        ) {
            lines += "本轮平台 API 未提供此字段（advertisement 不存在）"
        }
        return lines.joinToString("\n")
    }
}
