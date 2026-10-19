package com.smartble.core.profile

/*
 * Smart HID BLE Provisioning Protocol — Android 侧锁定镜像
 *
 * 事实源：core/protocols/hid-provisioning-protocol.ts（其事实源为
 * Smart-HID-Workspace protocols/ble/PROVISIONING_V1.md）。
 * 与 TS / Dart 镜像逐字段一致：UUID、校验规则、错误码、恢复动作。
 * 跨语言一致性由 core/protocols/smart-hid-v1-vectors.json 向量锁定，
 * 执行器：apps/android/app/src/test/.../SmartHidVectorParityTest.kt
 * （scripts/check-platform-parity.mjs kotlin 车道经 gradle 调用）。
 *
 * BLE 只负责：设备发现 / 配网 / 状态查询。
 * HID 实时控制不走 BLE（走 ControlHub HTTP → MQTT → ESP32）。
 */

import org.json.JSONException
import org.json.JSONObject
import java.util.Locale
import kotlin.math.min

/* ------------------------------------------------------------------ */
/* GATT 结构（PROVISIONING_V1 §2）                                     */
/* ------------------------------------------------------------------ */

/** Smart HID Provisioning Service UUID（128-bit，广播中携带，可据此过滤扫描） */
object SmartHidProtocol {

    const val SERVICE_UUID = "9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04"

    /** 三个 GATT 特征（UUID 仅末尾一段不同：1002 info / 1003 input / 1004 status） */
    object CharacteristicUuids {
        /** Device Info：read + notify */
        const val INFO = "9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04"

        /** Provision Input：write（明文；V1 简化不发起 SMP/系统配对） */
        const val INPUT = "9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04"

        /** Provision Status：read + notify */
        const val STATUS = "9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04"
    }

    /** 设备名前缀（Scan Response 广播名形如 SHID-ABCD1234） */
    const val NAME_PREFIX = "SHID-"

    /* ------------------------------------------------------------------ */
    /* 常量（与向量 constants 对锁）                                        */
    /* ------------------------------------------------------------------ */

    /** Provision Input JSON 的 v 字段（协议版本，当前仅 1） */
    const val CANDIDATE_VERSION = 1

    /** Device Info 中的 protocol 字段 */
    const val PROTOCOL_VERSION = "1.0"

    /** Device ID 正则（HID- + 8 位大写字母数字） */
    val DEVICE_ID_PATTERN = Regex("^HID-[A-Z0-9]{8}$")

    /** 广播设备名正则（SHID- + 6~8 位） */
    val DEVICE_NAME_PATTERN = Regex("^SHID-[A-Z0-9]{6,8}$")

    /** ControlHub Pairing 默认端口 */
    const val DEFAULT_PAIRING_PORT = 17892

    /** Pairing token 形态（32 位小写十六进制） */
    val TOKEN_PATTERN = Regex("^[0-9a-f]{32}$")

    /** 配网 QR URI scheme */
    const val QR_SCHEME = "shid://pair"

    /* 分帧（PROVISIONING_V1 §3；帧 = [seq:u8][total:u8][len:u8][payload]） */

    /** 帧头字节数：seq + total + len */
    const val FRAME_HEADER_SIZE = 3

    /** 每帧 payload 上限（字节） */
    const val MAX_CHUNK_BYTES = 128

    /** 组装后的总 payload 上限（字节） */
    const val MAX_ASSEMBLED_BYTES = 1024

    /** 最大帧数（保护上限） */
    const val MAX_FRAMES = 64

    /** 默认 ATT MTU（未协商成功时的保守值） */
    const val DEFAULT_ATT_MTU = 23

    /** 设备侧状态机取值（provisioning 组件状态） */
    val STATES = listOf(
        "boot", "load_config", "unprovisioned", "provisioning", "connecting_wifi",
        "pairing", "mqtt_connecting", "ready", "recovery", "error",
    )

    /** 配网过渡步骤取值 */
    val STEPS = listOf(
        "received", "connecting_wifi", "wifi_connected", "pairing",
        "pairing_success", "mqtt_connecting", "ready",
    )

    /* ------------------------------------------------------------------ */
    /* Provision Input（一次分帧写入的完整 candidate，PROVISIONING_V1 §4）   */
    /* ------------------------------------------------------------------ */

    /** 构造并发送用的 candidate JSON 字符串。
     *  校验失败抛 [IllegalArgumentException]（UI 层捕获后提示用户检查输入）。
     *  手工拼装保证键序稳定（v, wifi_ssid, wifi_password, hub_host, hub_port, token），
     *  与 TS / Dart 镜像字节一致——org.json JSONObject 不保序，不可用于此处。 */
    fun buildProvisionCandidateJson(input: ProvisionCandidateInput): String {
        val ssid = input.wifiSsid.trim()
        val password = input.wifiPassword
        val host = input.hubHost.trim()
        val token = input.token.trim()
        val port = input.hubPort ?: DEFAULT_PAIRING_PORT

        require(ssid.isNotEmpty()) { "wifi_ssid 不能为空" }
        require(ssid.length <= 32) { "wifi_ssid 超长（≤32 字符）" }
        require(password.length <= 64) { "wifi_password 超长（≤64 字符）" }
        require(host.isNotEmpty()) { "hub_host 不能为空（请检查配对二维码）" }
        require(port in 1..65535) { "hub_port 非法" }
        require(TOKEN_PATTERN.matches(token)) { "token 形态非法（需 32 位十六进制）" }

        return "{\"v\":$CANDIDATE_VERSION," +
            "\"wifi_ssid\":${jsonString(ssid)}," +
            "\"wifi_password\":${jsonString(password)}," +
            "\"hub_host\":${jsonString(host)}," +
            "\"hub_port\":$port," +
            "\"token\":${jsonString(token)}}"
    }

    /* ------------------------------------------------------------------ */
    /* 配对 QR（PROVISIONING_V1 §1）                                        */
    /* ------------------------------------------------------------------ */

    /** 解析 ControlHub 动态配对二维码载荷：
     *   shid://pair?token=<32hex>&host=<hub-lan-ip>&port=<17892>
     *  解析失败返回 null（不抛错，扫码流程按「非 Smart HID 码」处理）。 */
    fun parsePairingQrPayload(text: String): PairingQrPayload? {
        val s = text.trim()
        if (!s.lowercase(Locale.ROOT).startsWith(QR_SCHEME)) return null
        val query = s.substring(QR_SCHEME.length)
        if (query.isNotEmpty() && query[0] != '?' && query[0] != '&') return null

        val params = LinkedHashMap<String, String>()
        try {
            // 与 TS 镜像一致：去掉一个前导 ? 或 & 后按 & 拆分；空段跳过；
            // 无 = 或空键跳过；键解码后小写；重复键整串无效。
            for (kv in query.substring(1).split('&')) {
                if (kv.isEmpty()) continue
                val eq = kv.indexOf('=')
                if (eq <= 0) continue
                val key = decodeComponent(kv.substring(0, eq)).lowercase(Locale.ROOT)
                if (params.containsKey(key)) return null
                params[key] = decodeComponent(kv.substring(eq + 1))
            }
        } catch (e: IllegalArgumentException) {
            return null
        }

        val token = (params["token"] ?: "").lowercase(Locale.ROOT)
        val host = (params["host"] ?: "").trim()
        if (!TOKEN_PATTERN.matches(token)) return null
        if (host.isEmpty() || HOST_FORBIDDEN_PATTERN.containsMatchIn(host)) return null
        var port = DEFAULT_PAIRING_PORT
        val portText = params["port"]
        if (portText != null && portText.isNotEmpty()) {
            val p = portText.toIntOrNull() ?: return null
            if (p < 1 || p > 65535) return null
            port = p
        }
        return PairingQrPayload(token = token, host = host, port = port)
    }

    /** host 中不允许出现的字符：空白与路径斜杠（对齐 TS /[\s/]/，ASCII \s 口径） */
    private val HOST_FORBIDDEN_PATTERN = Regex("[\\s/]")

    /** decodeURIComponent 语义的严格 %XX 解码（'+' 不转空格；坏转义抛错→上层判无效）。
     *  注意：多字节 UTF-8 序列按单字节逐个映射（向量域内 host/token 均为 ASCII，
     *  与 JS decodeURIComponent 在本协议取值域内行为一致）。 */
    private fun decodeComponent(s: String): String {
        if (!s.contains('%')) return s
        val sb = StringBuilder(s.length)
        var i = 0
        while (i < s.length) {
            val c = s[i]
            if (c != '%') {
                sb.append(c)
                i += 1
                continue
            }
            if (i + 3 > s.length) throw IllegalArgumentException("URI malformed")
            val hex = s.substring(i + 1, i + 3)
            val v = hex.toIntOrNull(16) ?: throw IllegalArgumentException("URI malformed")
            sb.append(v.toChar())
            i += 3
        }
        return sb.toString()
    }

    /* ------------------------------------------------------------------ */
    /* 分帧（PROVISIONING_V1 §3）                                          */
    /* ------------------------------------------------------------------ */

    /** 依据协商 MTU 计算安全的每帧 payload 尺寸。
     *  ATT write 每次可发 (MTU-3) 字节，其中 3 字节是帧头，
     *  故 payload 上限为 MTU-3-3；同时不超过协议的 [MAX_CHUNK_BYTES]。 */
    fun chunkSizeForMtu(mtu: Int): Int {
        if (mtu < DEFAULT_ATT_MTU) return DEFAULT_ATT_MTU - FRAME_HEADER_SIZE - 3
        val size = mtu - FRAME_HEADER_SIZE - 3
        return when {
            size < 1 -> 1
            size > MAX_CHUNK_BYTES -> MAX_CHUNK_BYTES
            else -> size
        }
    }

    /** 将完整 payload 切成帧数组（已带 [seq][total][len] 头）。
     *  payload 为空 / 超过 [MAX_ASSEMBLED_BYTES] / 帧数超过 [MAX_FRAMES] 时抛错。 */
    fun buildFrames(bytes: ByteArray, chunkSize: Int): List<ByteArray> {
        require(bytes.isNotEmpty()) { "framing: empty payload" }
        require(bytes.size <= MAX_ASSEMBLED_BYTES) {
            "framing: payload ${bytes.size}B exceeds ${MAX_ASSEMBLED_BYTES}B"
        }
        var chunk = if (chunkSize < 1) 1 else chunkSize
        if (chunk > MAX_CHUNK_BYTES) chunk = MAX_CHUNK_BYTES
        val total = (bytes.size + chunk - 1) / chunk
        require(total <= MAX_FRAMES) { "framing: needs $total frames > $MAX_FRAMES" }

        val frames = ArrayList<ByteArray>(total)
        for (seq in 0 until total) {
            val off = seq * chunk
            val len = min(chunk, bytes.size - off)
            val frame = ByteArray(FRAME_HEADER_SIZE + len)
            frame[0] = seq.toByte()
            frame[1] = total.toByte()
            frame[2] = len.toByte()
            System.arraycopy(bytes, off, frame, FRAME_HEADER_SIZE, len)
            frames.add(frame)
        }
        return frames
    }

    /* ------------------------------------------------------------------ */
    /* Device Info / Provision Status（PROVISIONING_V1 §5 §6）              */
    /* ------------------------------------------------------------------ */

    /** 解析 Device Info JSON（防御式；非法返回 null） */
    fun parseDeviceInfo(text: String): SmartHidDeviceInfo? {
        return try {
            val o = JSONObject(text)
            val deviceId = o.optStringOrEmpty("device_id")
            if (deviceId.isEmpty()) null
            else SmartHidDeviceInfo(
                product = o.optStringOrEmpty("product"),
                protocol = o.optStringOrEmpty("protocol"),
                deviceId = deviceId,
                firmware = o.optStringOrEmpty("firmware"),
                state = o.optStringOrEmpty("state"),
                // 对齐 Dart `o['provisioned'] == true`：仅布尔 true 判真（字符串 "true" 不算）
                provisioned = o.opt("provisioned") == true,
            )
        } catch (e: JSONException) {
            null
        }
    }

    /** 解析 Provision Status JSON（防御式；非法返回 null） */
    fun parseProvisionStatus(text: String): SmartHidProvisionStatus? {
        return try {
            val o = JSONObject(text)
            SmartHidProvisionStatus(
                state = o.optStringOrEmpty("state"),
                step = o.optStringOrEmpty("step"),
                error = if (o.isNull("error")) null else o.opt("error")?.toString(),
            )
        } catch (e: JSONException) {
            null
        }
    }

    /** 设备身份验证（对齐 Dart verifySmartHidDeviceInfo / uni-app profile.verifyDeviceInfo）：
     *  product 必须是 smart-hid、协议 1.0、device_id 符合 HID-XXXXXXXX */
    fun verifyDeviceInfo(info: SmartHidDeviceInfo): Boolean {
        return info.product == "smart-hid" &&
            info.protocol == PROTOCOL_VERSION &&
            DEVICE_ID_PATTERN.matches(info.deviceId)
    }

    /* ------------------------------------------------------------------ */
    /* 错误码（PROVISIONING_V1 §6，字符串，稳定勿改；可扩展新码）            */
    /* ------------------------------------------------------------------ */

    object ErrorCodes {
        const val INVALID_PAYLOAD = "invalid_payload"
        const val WIFI_FAILED = "wifi_failed"
        const val CONTROLHUB_UNREACHABLE = "controlhub_unreachable"
        const val PAIRING_INVALID = "pairing_invalid"
        const val PAIRING_EXPIRED = "pairing_expired"
        const val PAIRING_USED = "pairing_used"
        const val MQTT_INVALID = "mqtt_invalid"
        const val STORAGE_FAILED = "storage_failed"

        val ALL = listOf(
            INVALID_PAYLOAD, WIFI_FAILED, CONTROLHUB_UNREACHABLE, PAIRING_INVALID,
            PAIRING_EXPIRED, PAIRING_USED, MQTT_INVALID, STORAGE_FAILED,
        )
    }

    /** 错误码 → 客户端提示（PROVISIONING_V1 §6 表；LinkedHashMap 保序对齐 TS/Dart） */
    val ERROR_HINTS: Map<String, String> = linkedMapOf(
        ErrorCodes.INVALID_PAYLOAD to "配置内容非法，请检查输入",
        ErrorCodes.WIFI_FAILED to "Wi-Fi 连接失败，请检查 SSID / 密码",
        ErrorCodes.CONTROLHUB_UNREACHABLE to "连不上 ControlHub，请确认它在运行、地址可达",
        ErrorCodes.PAIRING_INVALID to "配对码无效，请重新扫码",
        ErrorCodes.PAIRING_EXPIRED to "配对码已过期，请重新扫码",
        ErrorCodes.PAIRING_USED to "配对码已被使用，请重新扫码",
        ErrorCodes.MQTT_INVALID to "MQTT 连接失败，请进入诊断",
        ErrorCodes.STORAGE_FAILED to "设备存储失败，请重试或联系支持",
    )

    fun errorHint(code: String): String? = ERROR_HINTS[code]

    /** 本地等待超时使用的伪错误码（非设备侧码；对齐原型 cancelwait 语义） */
    const val TIMEOUT_ERROR_CODE = "timeout"

    /** 状态行键（P002 下发状态四行） */
    val PROVISION_ROW_KEYS = listOf("wifi", "hub", "conn", "usb")

    /** 错误码 → 状态行（失败行展示错误码 chip；此前的行标 done，其后保持 pending）。
     *  storage_failed 发生在设备侧 promote（MQTT 之后），归入 usb 行。 */
    fun provisionErrorRow(code: String): String = when (code) {
        ErrorCodes.WIFI_FAILED, ErrorCodes.INVALID_PAYLOAD -> "wifi"
        ErrorCodes.CONTROLHUB_UNREACHABLE, ErrorCodes.PAIRING_INVALID,
        ErrorCodes.PAIRING_EXPIRED, ErrorCodes.PAIRING_USED -> "hub"
        ErrorCodes.MQTT_INVALID -> "conn"
        ErrorCodes.STORAGE_FAILED -> "usb"
        TIMEOUT_ERROR_CODE -> "conn"
        else -> "conn"
    }

    /** 恢复动作（对齐 TS workflow.smartHidRecoveryAction / Dart provisionRecoveryAction）：
     *  form=返回表单修改 / pairing=重新扫码 / diagnostics=运行诊断 / retry=重新下发 */
    fun recoveryAction(code: String): String = when (code) {
        ErrorCodes.WIFI_FAILED, ErrorCodes.INVALID_PAYLOAD -> "form"
        ErrorCodes.PAIRING_INVALID, ErrorCodes.PAIRING_EXPIRED,
        ErrorCodes.PAIRING_USED, ErrorCodes.CONTROLHUB_UNREACHABLE -> "pairing"
        ErrorCodes.MQTT_INVALID -> "diagnostics"
        else -> "retry"
    }

    /* ------------------------------------------------------------------ */
    /* 内部工具                                                             */
    /* ------------------------------------------------------------------ */

    /** JSON 字符串转义（对齐 Dart JsonEncoder / JS JSON.stringify 的 ASCII 域行为） */
    private fun jsonString(value: String): String {
        val sb = StringBuilder(value.length + 2).append('"')
        for (c in value) {
            when (c) {
                '"' -> sb.append("\\\"")
                '\\' -> sb.append("\\\\")
                '\n' -> sb.append("\\n")
                '\r' -> sb.append("\\r")
                '\t' -> sb.append("\\t")
                '\b' -> sb.append("\\b")
                '\u000C' -> sb.append("\\f")
                else -> {
                    if (c < ' ') sb.append("\\u").append(String.format("%04x", c.code))
                    else sb.append(c)
                }
            }
        }
        return sb.append('"').toString()
    }

    /** JSON null / 缺键 → ""（org.json 的 optString 对 NULL 哨兵会给出 "null"，需显式处理） */
    private fun JSONObject.optStringOrEmpty(key: String): String =
        if (this.isNull(key)) "" else this.optString(key, "")
}

/* ------------------------------------------------------------------ */
/* 数据类（对齐 TS interface / Dart class）                             */
/* ------------------------------------------------------------------ */

/** 配网候选配置输入（V1 为单次写入：Wi-Fi + hub + token 一个 JSON，
 *  设备侧 stage 到 NVS pending、全链路成功才 promote 为 active）。 */
data class ProvisionCandidateInput(
    val wifiSsid: String,
    val wifiPassword: String,
    val hubHost: String,
    val hubPort: Int? = null,
    val token: String,
)

/** QR 解析结果（敏感：token 仅内存持有，不持久化——F023 红线） */
data class PairingQrPayload(
    val token: String,
    val host: String,
    val port: Int,
)

/** Device Info 特征返回（读 / notify） */
data class SmartHidDeviceInfo(
    val product: String,
    val protocol: String,
    val deviceId: String,
    val firmware: String,
    val state: String,
    val provisioned: Boolean,
)

/** Provision Status 特征返回（读 / notify） */
data class SmartHidProvisionStatus(
    val state: String,
    val step: String,
    val error: String?,
)
