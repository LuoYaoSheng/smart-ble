package com.smartble.core.profile

/*
 * Smart HID V1 跨语言向量 parity 执行器（Kotlin 线）。
 *
 * 单源向量：core/protocols/smart-hid-v1-vectors.json（与 JS/Dart 消费同一文件，
 * 由 scripts/check-platform-parity.mjs kotlin 车道经 gradle 调用本测试）。
 *
 * 结果双出口：
 *   1) apps/android/app/build/smart-hid-parity-kotlin.json —— 供 parity runner 解析
 *      （路径从向量文件反推仓库根，不依赖 gradle 工作目录；SMART_HID_PARITY_OUT 可覆盖）；
 *   2) stdout 的 @@PARITY@@ 行 —— 供人工在测试报告里核对。
 * 文件先写、后断言：向量失败 → JUnit 失败 + 结果文件记录失败明细。
 */

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class SmartHidVectorParityTest {

    private class Failure(val suite: String, val id: String, val detail: String)

    @Test
    fun `smart hid v1 vectors parity`() {
        val vectorsFile = resolveVectorsFile()
        val root = JSONObject(vectorsFile.readText())
        val constants = root.getJSONObject("constants")
        val suites = root.getJSONObject("suites")
        val P = SmartHidProtocol

        val failures = mutableListOf<Failure>()
        var pass = 0
        fun check(suite: String, id: String, ok: Boolean, detail: String = "") {
            if (ok) pass += 1 else failures += Failure(suite, id, detail)
        }

        // ---- constants（与 JS 线同面：含错误提示表） ----
        val frame = constants.getJSONObject("frame")
        val chars = constants.getJSONObject("characteristicUuids")
        val constChecks = mapOf(
            "serviceUuid" to (P.SERVICE_UUID == constants.getString("serviceUuid")),
            "charInfo" to (SmartHidProtocol.CharacteristicUuids.INFO == chars.getString("info")),
            "charInput" to (SmartHidProtocol.CharacteristicUuids.INPUT == chars.getString("input")),
            "charStatus" to (SmartHidProtocol.CharacteristicUuids.STATUS == chars.getString("status")),
            "namePrefix" to (P.NAME_PREFIX == constants.getString("namePrefix")),
            "protocolVersion" to (P.PROTOCOL_VERSION == constants.getString("protocolVersion")),
            "candidateVersion" to (P.CANDIDATE_VERSION == constants.getInt("candidateVersion")),
            "deviceIdPattern" to (P.DEVICE_ID_PATTERN.pattern == constants.getString("deviceIdPattern")),
            "deviceNamePattern" to (P.DEVICE_NAME_PATTERN.pattern == constants.getString("deviceNamePattern")),
            "tokenPattern" to (P.TOKEN_PATTERN.pattern == constants.getString("tokenPattern")),
            "qrScheme" to (P.QR_SCHEME == constants.getString("qrScheme")),
            "defaultPairingPort" to (P.DEFAULT_PAIRING_PORT == constants.getInt("defaultPairingPort")),
            "frameHeaderSize" to (P.FRAME_HEADER_SIZE == frame.getInt("headerSize")),
            "maxChunkBytes" to (P.MAX_CHUNK_BYTES == frame.getInt("maxChunkBytes")),
            "maxAssembledBytes" to (P.MAX_ASSEMBLED_BYTES == frame.getInt("maxAssembledBytes")),
            "maxFrames" to (P.MAX_FRAMES == frame.getInt("maxFrames")),
            "defaultAttMtu" to (P.DEFAULT_ATT_MTU == frame.getInt("defaultAttMtu")),
            "states" to (P.STATES == constants.getJSONArray("states").toStringList()),
            "steps" to (P.STEPS == constants.getJSONArray("steps").toStringList()),
            "errorCodes" to (SmartHidProtocol.ErrorCodes.ALL == constants.getJSONArray("errorCodes").toStringList()),
        )
        for ((id, ok) in constChecks) check("constants", id, ok, "constant mismatch: $id")

        // errorHints 按映射语义比较（org.json 不保序；值表逐键对齐）
        val hintsJson = constants.getJSONObject("errorHints")
        val hintsVec = mutableMapOf<String, String>()
        for (key in hintsJson.keys()) hintsVec[key] = hintsJson.getString(key)
        check("constants", "errorHints", hintsVec == P.ERROR_HINTS, "errorHints 映射不一致")

        // ---- qr ----
        for (c in suites.getJSONObject("qr").getJSONArray("cases").cases()) {
            val id = c.getString("id")
            val expect = c.getJSONObject("expect")
            var payload: PairingQrPayload? = null
            var threw = false
            try {
                payload = P.parsePairingQrPayload(c.getString("input"))
            } catch (e: Exception) {
                threw = true
            }
            when {
                threw -> check("qr", id, !expect.getBoolean("ok"), "unexpected throw")
                !expect.getBoolean("ok") -> check("qr", id, payload == null, "expected null, got $payload")
                payload == null -> check("qr", id, false, "expected payload, got null")
                else -> check(
                    "qr", id,
                    payload!!.token == expect.getString("token") &&
                        payload.host == expect.getString("host") &&
                        payload.port == expect.getInt("port"),
                    "got $payload",
                )
            }
        }

        // ---- candidate ----
        for (c in suites.getJSONObject("candidate").getJSONArray("cases").cases()) {
            val expect = c.getJSONObject("expect")
            val input = c.getJSONObject("input")
            val built = try {
                P.buildProvisionCandidateJson(
                    ProvisionCandidateInput(
                        wifiSsid = input.getString("wifi_ssid"),
                        wifiPassword = input.getString("wifi_password"),
                        hubHost = input.getString("hub_host"),
                        hubPort = if (input.isNull("hub_port")) null else input.getInt("hub_port"),
                        token = input.getString("token"),
                    ),
                )
            } catch (e: IllegalArgumentException) {
                null
            }
            if (expect.getBoolean("ok")) {
                check("candidate", c.getString("id"), built == expect.getString("json"), "expected ${expect.getString("json")}, got $built")
            } else {
                check("candidate", c.getString("id"), built == null, "expected throw, got $built")
            }
        }

        // ---- framingMtu ----
        for (c in suites.getJSONObject("framingMtu").getJSONArray("cases").cases()) {
            val got = P.chunkSizeForMtu(c.getInt("mtu"))
            check("framingMtu", c.getString("id"), got == c.getInt("expect"), "mtu ${c.getInt("mtu")} -> $got, expect ${c.getInt("expect")}")
        }

        // ---- frames ----
        for (c in suites.getJSONObject("frames").getJSONArray("cases").cases()) {
            val payload: ByteArray = if (!c.isNull("payloadHex")) {
                // 空串 = 空 payload（frames_empty_throws 用例），直接走 buildFrames 的空校验
                c.getString("payloadHex").hexToBytes()
            } else {
                val fill = c.getJSONObject("fill")
                ByteArray(fill.getInt("length")) { fill.getString("byte").toInt(16).toByte() }
            }
            val got = try {
                P.buildFrames(payload, c.getInt("chunkSize")).map { it.toHexString() }
            } catch (e: IllegalArgumentException) {
                null
            }
            val expect = c.getJSONObject("expect")
            if (expect.getBoolean("ok")) {
                val want = expect.getJSONArray("frames").toStringList()
                check("frames", c.getString("id"), got == want, "got $got")
            } else {
                check("frames", c.getString("id"), got == null, "expected throw, got $got")
            }
        }

        // ---- deviceInfo ----
        for (c in suites.getJSONObject("deviceInfo").getJSONArray("cases").cases()) {
            val expect = c.getJSONObject("expect")
            val got = P.parseDeviceInfo(c.getString("input"))
            if (!expect.getBoolean("ok")) {
                check("deviceInfo", c.getString("id"), got == null, "expected null, got $got")
            } else if (got == null) {
                check("deviceInfo", c.getString("id"), false, "expected payload, got null")
            } else {
                check(
                    "deviceInfo", c.getString("id"),
                    got.product == expect.getString("product") && got.protocol == expect.getString("protocol") &&
                        got.deviceId == expect.getString("device_id") && got.firmware == expect.getString("firmware") &&
                        got.state == expect.getString("state") && got.provisioned == expect.getBoolean("provisioned"),
                    "got $got",
                )
            }
        }

        // ---- status ----
        for (c in suites.getJSONObject("status").getJSONArray("cases").cases()) {
            val expect = c.getJSONObject("expect")
            val got = P.parseProvisionStatus(c.getString("input"))
            if (!expect.getBoolean("ok")) {
                check("status", c.getString("id"), got == null, "expected null, got $got")
            } else if (got == null) {
                check("status", c.getString("id"), false, "expected payload, got null")
            } else {
                val wantError = if (expect.isNull("error")) null else expect.getString("error")
                check(
                    "status", c.getString("id"),
                    got.state == expect.getString("state") && got.step == expect.getString("step") && got.error == wantError,
                    "got $got",
                )
            }
        }

        // ---- errorRecovery（恢复映射；本套件平台面 = js + kotlin） ----
        for (c in suites.getJSONObject("errorRecovery").getJSONArray("cases").cases()) {
            val got = P.recoveryAction(c.getString("code"))
            check("errorRecovery", c.getString("id"), got == c.getString("expect"), "code ${c.getString("code")} -> $got, expect ${c.getString("expect")}")
        }

        // ---- 结果双出口 ----
        val esc = { s: String -> s.replace("\\", "\\\\").replace("\"", "\\\"") }
        val resultJson = "{\"platform\":\"kotlin\",\"pass\":$pass,\"fail\":${failures.size}," +
            "\"failures\":[${failures.joinToString(",") { "{\"suite\":\"${esc(it.suite)}\",\"case\":\"${esc(it.id)}\",\"detail\":\"${esc(it.detail)}\"}" }}]}"
        resultOutFile(vectorsFile).let {
            it.parentFile.mkdirs()
            it.writeText(resultJson)
        }
        println("@@PARITY@@ $resultJson")

        assertTrue(
            "Smart HID 向量 parity 失败 ${failures.size} 例（vectors=${vectorsFile.path}）：\n" +
                failures.joinToString("\n") { "  ✗ [${it.suite}] ${it.id}: ${it.detail}" },
            failures.isEmpty(),
        )
    }

    /* ------------------------------------------------------------------ */

    private fun resolveVectorsFile(): File {
        System.getenv("SMART_HID_VECTORS")?.let { return File(it) }
        var dir: File? = File(System.getProperty("user.dir")).absoluteFile
        repeat(8) {
            val d = dir ?: return@repeat
            val cand = File(d, "core/protocols/smart-hid-v1-vectors.json")
            if (cand.isFile) return cand
            dir = d.parentFile
        }
        throw IllegalStateException(
            "smart-hid-v1-vectors.json 未找到（from ${System.getProperty("user.dir")}，可设 SMART_HID_VECTORS 指定）",
        )
    }

    /** 结果文件固定落 apps/android/app/build/（从向量文件反推仓库根，不依赖 gradle 工作目录） */
    private fun resultOutFile(vectorsFile: File): File {
        System.getenv("SMART_HID_PARITY_OUT")?.let { return File(it) }
        val repoRoot = vectorsFile.absoluteFile.parentFile?.parentFile?.parentFile
            ?: throw IllegalStateException("无法从 ${vectorsFile.path} 反推仓库根")
        return File(repoRoot, "apps/android/app/build/smart-hid-parity-kotlin.json")
    }

    private fun JSONArray.cases(): List<JSONObject> = List(length()) { getJSONObject(it) }

    private fun JSONArray.toStringList(): List<String> = List(length()) { i -> getString(i) }

    private fun String.hexToBytes(): ByteArray =
        chunked(2).map { it.toInt(16).toByte() }.toByteArray()

    private fun ByteArray.toHexString(): String =
        joinToString("") { "%02x".format(it) }
}
