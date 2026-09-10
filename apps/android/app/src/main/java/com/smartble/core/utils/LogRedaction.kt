package com.smartble.core.utils

import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

/**
 * F026 日志脱敏（BUSINESS_FLOW §7 / STORAGE_POLICY S-3 / R28）。
 *
 * uniapp `services/logger/log-redaction.js` 的 Kotlin 锁定镜像：
 * 敏感键（token/password/secret…）→ "***"，保护键白名单（deviceId/serviceUuid/sha256…）不脱敏。
 * Logger.emit 是唯一漏斗；任何旁路日志打印也必须先过这里。
 */
object LogRedaction {
    const val REDACT_PLACEHOLDER = "***"

    private val SENSITIVE_KEY_FRAGMENTS = listOf(
        "token", "password", "passwd", "secret", "apikey", "privatekey",
        "credential", "authorization", "cookie", "qrtoken",
    )

    private val PROTECTED_KEY_FRAGMENTS = listOf(
        "deviceid", "serviceuuid", "characteristicuuid", "serviceid",
        "characteristicid", "firmwareversion", "sha256",
    )

    private val STRING_SECRET_PATTERNS = listOf(
        Regex("""\bauthorization\s*:\s*Bearer\s+[A-Za-z0-9._-]+""", RegexOption.IGNORE_CASE),
        Regex("""\bBearer\s+[A-Za-z0-9._-]+""", RegexOption.IGNORE_CASE),
        Regex("""\b(access_token|refresh_token|qr_token|api_key|apikey|private_key|authorization|cookie)\s*[=:]\s*[^\s,&}"']+""", RegexOption.IGNORE_CASE),
        Regex("""\b(token|password|passwd|secret|credential|pw)\s*[=:]\s*[^\s,&}"']+""", RegexOption.IGNORE_CASE),
        Regex("\"(access_token|refresh_token|qr_token|api_key|apikey|private_key|authorization|cookie)\"\\s*:\\s*\"[^\"]*\"", RegexOption.IGNORE_CASE),
        Regex("\"(token|password|passwd|secret|credential)\"\\s*:\\s*\"[^\"]*\"", RegexOption.IGNORE_CASE),
    )

    private fun normalizeKey(key: Any?): String =
        (key?.toString() ?: "").lowercase().replace(Regex("[-_]"), "")

    fun isProtectedKey(key: Any?): Boolean {
        val normalized = normalizeKey(key)
        if (normalized.isEmpty()) return false
        if (PROTECTED_KEY_FRAGMENTS.contains(normalized)) return true
        if (normalized.endsWith("uuid") &&
            (normalized.contains("service") || normalized.contains("characteristic"))
        ) {
            return true
        }
        return false
    }

    fun isSensitiveKey(key: Any?): Boolean {
        if (isProtectedKey(key)) return false
        val normalized = normalizeKey(key)
        if (normalized.isEmpty()) return false
        return SENSITIVE_KEY_FRAGMENTS.any { normalized.contains(it) }
    }

    fun sanitizeLogValue(value: Any?, seen: MutableSet<Int> = mutableSetOf()): Any? = when (value) {
        null -> null
        is String -> sanitizeLogString(value)
        is Number, is Boolean -> value
        is Throwable -> mapOf(
            "name" to value.javaClass.simpleName,
            "message" to (sanitizeLogString(value.message ?: value.toString()) ?: ""),
        )
        is List<*> -> value.map { sanitizeLogValue(it, seen) }
        is Array<*> -> value.map { sanitizeLogValue(it, seen) }
        is Map<*, *> -> sanitizeLogMap(value, seen)
        else -> value
    }

    fun sanitizeLogMap(input: Map<*, *>, seen: MutableSet<Int> = mutableSetOf()): Any {
        val marker = System.identityHashCode(input)
        if (seen.contains(marker)) return "[Circular]"
        seen.add(marker)

        val output = LinkedHashMap<String, Any?>()
        for ((key, value) in input) {
            output[key.toString()] =
                if (isSensitiveKey(key)) REDACT_PLACEHOLDER else sanitizeLogValue(value, seen)
        }
        return output
    }

    fun sanitizeLogString(input: String?): String? {
        val text = input ?: return null
        if (text.isEmpty()) return text

        val trimmed = text.trim()
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
            try {
                return sanitizeJsonValue(JSONTokener(trimmed).nextValue()).toString()
            } catch (_: Exception) {
                // fall through to pattern redaction
            }
        }

        var redacted = text
        for (pattern in STRING_SECRET_PATTERNS) {
            redacted = pattern.replace(redacted) { m ->
                val matched = m.value
                when {
                    Regex("""^Bearer\s+""", RegexOption.IGNORE_CASE).containsMatchIn(matched) ->
                        "Bearer $REDACT_PLACEHOLDER"
                    Regex("""^authorization\s*:\s*Bearer""", RegexOption.IGNORE_CASE).containsMatchIn(matched) ->
                        "authorization: Bearer $REDACT_PLACEHOLDER"
                    else -> {
                        val label = matched.split(Regex("[=:]"))[0].trim()
                        val sep = if (matched.contains(":") && !matched.contains("=")) ":" else "="
                        "$label$sep$REDACT_PLACEHOLDER"
                    }
                }
            }
        }
        return redacted
    }

    private fun sanitizeJsonValue(value: Any?): Any = when (value) {
        is JSONObject -> {
            val out = JSONObject()
            for (key in value.keys()) {
                if (isSensitiveKey(key)) out.put(key, REDACT_PLACEHOLDER)
                else out.put(key, sanitizeJsonValue(value.get(key)))
            }
            out
        }
        is JSONArray -> {
            val out = JSONArray()
            for (i in 0 until value.length()) out.put(sanitizeJsonValue(value.get(i)))
            out
        }
        null, JSONObject.NULL -> JSONObject.NULL
        else -> value
    }
}
