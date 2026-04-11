package com.smartble.core.utils

import java.nio.charset.Charset

object DataConverter {
    /**
     * 将字节数组转换为十六进制字符串
     * @param data 字节数组
     * @param separator 是否使用空格分隔
     */
    fun bytesToHex(data: ByteArray, separator: Boolean = true): String {
        return data.joinToString(if (separator) " " else "") { "%02X".format(it) }
    }

    /**
     * 将十六进制字符串转换为字节数组
     * @param hex 十六进制字符串
     */
    fun hexToBytes(hex: String): ByteArray {
        val clean = hex.replace(Regex("[^0-9A-Fa-f]"), "")
        require(clean.length % 2 == 0) { "Hex 字符串长度必须是偶数" }
        return clean.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
    }

    /**
     * 判断字符串是否是合法的 Hex
     */
    fun isValidHex(hex: String): Boolean {
        val clean = hex.replace(Regex("\\s+"), "")
        if (clean.isEmpty() || clean.length % 2 != 0) return false
        return clean.matches(Regex("^[0-9A-Fa-f]+$"))
    }

    /**
     * 字节数组转字符串
     */
    fun bytesToString(data: ByteArray, charset: Charset = Charsets.UTF_8): String {
        return String(data, charset)
    }

    /**
     * 字符串转字节数组
     */
    fun stringToBytes(str: String, charset: Charset = Charsets.UTF_8): ByteArray {
        return str.toByteArray(charset)
    }
}

// 扩展属性为了向前兼容UI中现有的调用，推荐逐渐替换为直接调用 DataConverter
fun ByteArray.toHexString(separator: Boolean = true): String = DataConverter.bytesToHex(this, separator)
fun String.hexToByteArray(): ByteArray = DataConverter.hexToBytes(this)
