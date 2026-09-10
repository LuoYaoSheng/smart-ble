package com.smartble.core.utils

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * F026 日志脱敏——uniapp `services/logger/log-redaction.js` 的 Kotlin 锁定镜像向量。
 * 与 apps/flutter `log_redaction_test.dart` 同向量组（V1–V12）。
 */
class LogRedactionTest {

    @Test
    fun v1_provisioningCandidateJson() {
        // JVM 测试类路径 org.json(HashMap) 不保序（真机平台版 LinkedHashMap 保序），
        // 语义断言跨环境稳定；Dart/JS 车道用精确串断言。
        val input =
            """{"v":1,"wifi_ssid":"home5g","wifi_password":"p@ss1234","hub_host":"192.168.1.8","hub_port":1883,"token":"0123456789abcdef0123456789abcdef"}"""
        val out = JSONObject(LogRedaction.sanitizeLogString(input)!!)
        assertEquals("***", out.getString("wifi_password"))
        assertEquals("***", out.getString("token"))
        assertEquals("home5g", out.getString("wifi_ssid"))
        assertEquals("192.168.1.8", out.getString("hub_host"))
        assertEquals(1883, out.getInt("hub_port"))
        assertEquals(1, out.getInt("v"))
    }

    @Test
    fun v2_queryString() {
        assertEquals("token=***&x=1", LogRedaction.sanitizeLogString("token=abc123&x=1"))
    }

    @Test
    fun v3_bareBearer() {
        assertEquals("Bearer ***", LogRedaction.sanitizeLogString("Bearer eyJhbGciOi.abc-123"))
    }

    @Test
    fun v4_authorizationHeader() {
        // 正典（uniapp JS）多趟模式替换产出 'authorization: Bearer *** ***'（P1 整段替换后 P3 再命中前缀段）；
        // 三线镜像行为一致，这里锁语义：密文不出现、Bearer 已脱敏。
        val out = LogRedaction.sanitizeLogString("authorization: Bearer xyz789")!!
        assertTrue(out.contains("Bearer ***"))
        assertFalse(out.contains("xyz789"))
    }

    @Test
    fun v5_protectedKeysStay() {
        val input =
            """{"deviceId":"10:B4:1D:CD:23:8D","serviceUuid":"4fafc201-1fb5","sha256":"a1b2c3"}"""
        val out = JSONObject(LogRedaction.sanitizeLogString(input)!!)
        assertEquals("10:B4:1D:CD:23:8D", out.getString("deviceId"))
        assertEquals("4fafc201-1fb5", out.getString("serviceUuid"))
        assertEquals("a1b2c3", out.getString("sha256"))
    }

    @Test
    fun v6_nestedMapSanitize() {
        // 显式 Map 构造器：Any 重载会被解析成 bean 反射构造器
        val out = JSONObject(
            LogRedaction.sanitizeLogMap(
                linkedMapOf(
                    "v" to 1,
                    "token" to "t0",
                    "nested" to mapOf("password" to "p0"),
                ),
            ) as Map<*, *>,
        )
        assertEquals(1, out.getInt("v"))
        assertEquals("***", out.getString("token"))
        assertEquals("***", out.getJSONObject("nested").getString("password"))
    }

    @Test
    fun v7_hexDumpUnchanged() {
        val input = "写入完成: 7B 22 74 79 70 65"
        assertEquals(input, LogRedaction.sanitizeLogString(input))
    }

    @Test
    fun v8_malformedJsonUnchanged() {
        val input = "{oops not json"
        assertEquals(input, LogRedaction.sanitizeLogString(input))
    }

    @Test
    fun v9_jsonStyleKeyValueString() {
        assertEquals(
            """resp "qr_token":*** end""",
            LogRedaction.sanitizeLogString("""resp "qr_token":"z9" end"""),
        )
    }

    @Test
    fun v10_multipleKeys() {
        assertEquals(
            "api_key=***&password=***",
            LogRedaction.sanitizeLogString("api_key=ZZZ&password=q1"),
        )
    }

    @Test
    fun v11_keyNormalization() {
        val out = LogRedaction.sanitizeLogMap(
            linkedMapOf(
                "wifi-password" to "x",
                "API_KEY" to "y",
                "hubHost" to "h",
            ),
        ) as Map<*, *>
        assertEquals("***", out["wifi-password"])
        assertEquals("***", out["API_KEY"])
        assertEquals("h", out["hubHost"])
    }

    @Test
    fun v12_loggerFunnelRedacts() {
        Logger.clear()
        Logger.info("""提交配网 {"token":"abcdef"}""")
        val message = Logger.logs.value.last().message
        assertTrue(message.contains("\"token\":***"))
        assertFalse(message.contains("abcdef"))
    }
}
