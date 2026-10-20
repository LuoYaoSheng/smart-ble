package com.smartble.core.ota

import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.yield
import kotlinx.coroutines.ensureActive
import org.json.JSONObject
import java.io.InputStream
import java.security.MessageDigest

/** Local firmware only. No catalogue, account or network backend is involved. */
class OtaPackage private constructor(
    internal val firmware: ByteArray,
    val target: String,
    val hardware: String,
    val version: String,
    val sha256: String,
) {
    val size: Int get() = firmware.size
    companion object {
        const val MAX_FIRMWARE_SIZE = 0x180000
        private val semVer = Regex("(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?")
        internal fun isSemVer(value: String) = semVer.matches(value)
        fun readBounded(input: InputStream, limit: Int): ByteArray {
            val output = java.io.ByteArrayOutputStream()
            val buffer = ByteArray(8192)
            while (true) {
                val count = input.read(buffer, 0, minOf(buffer.size, limit + 1 - output.size()))
                if (count < 0) return output.toByteArray()
                if (count == 0) continue
                output.write(buffer, 0, count)
                require(output.size() <= limit) { "固件包超过大小上限" }
            }
        }
        fun validate(firmware: ByteArray, manifest: String): OtaPackage {
            require(firmware.isNotEmpty() && firmware.size <= MAX_FIRMWARE_SIZE) { "固件必须为非空应用镜像且不超过当前 OTA 分区 0x180000" }
            val json = JSONObject(manifest)
            val keys = setOf("format_version", "target", "hardware", "firmware_version", "size", "sha256")
            require(json.keys().asSequence().toSet() == keys) { "manifest 必须且只能包含契约六字段" }
            require((json.opt("format_version") as? Number)?.toDouble() == 1.0) { "manifest format_version 必须为 1" }
            val target = json.opt("target") as? String ?: error("manifest target 类型错误")
            val hardware = json.opt("hardware") as? String ?: error("manifest hardware 类型错误")
            val version = json.opt("firmware_version") as? String ?: error("manifest firmware_version 类型错误")
            require(target in setOf("lightble-peripheral", "lightble-observer")) { "manifest target 非法" }
            require(hardware.isNotBlank() && hardware == hardware.trim()) { "manifest hardware 非法" }
            require(isSemVer(version)) { "manifest firmware_version 非 SemVer" }
            require((json.opt("size") as? Number)?.toDouble() == firmware.size.toDouble()) { "固件 size 与 manifest 不符" }
            val hash = MessageDigest.getInstance("SHA-256").digest(firmware).joinToString("") { "%02x".format(it) }
            require(json.opt("sha256") == hash) { "固件 SHA256 与 manifest 不符" }
            return OtaPackage(firmware.copyOf(), target, hardware, version, hash)
        }
    }
}

sealed interface OtaEvent {
    data class Status(val data: ByteArray) : OtaEvent
    data class Failure(val message: String) : OtaEvent
    object Disconnected : OtaEvent
}

interface OtaTransport {
    val events: Flow<OtaEvent>
    val chunkCapacity: Int
    suspend fun readInfo(): String
    suspend fun subscribe(enabled: Boolean)
    /** Return only after the platform has acknowledged the queued GATT operation. */
    suspend fun writeControl(data: ByteArray)
    suspend fun writeData(data: ByteArray)
    suspend fun reconnect()
}

enum class OtaPhase { Checking, Subscribing, WaitingReady, Transferring, Committing, WaitingReboot, Verifying, Success }
data class OtaProgress(val phase: OtaPhase, val sent: Int, val total: Int) {
    val percent: Int get() = if (phase == OtaPhase.Success) 100 else minOf(99, if (total == 0) 0 else sent * 100 / total)
}

/** Real device success == flash receipt + observed disconnect + fresh matching running INFO. */
class OtaEngine(private val receiptTimeoutMs: Long = 30_000) {
    private fun identity(raw: String, pkg: OtaPackage): String {
        val info = JSONObject(raw)
        require(info.opt("type") == "system_info" && info.opt("target") == pkg.target && info.opt("hardware") == pkg.hardware) { "设备 target/hardware 与固件包不匹配" }
        val version = info.opt("firmware_version") as? String ?: error("设备未提供实际运行版本")
        require(OtaPackage.isSemVer(version)) { "设备实际运行版本非 SemVer" }
        return version
    }
    suspend fun run(transport: OtaTransport, pkg: OtaPackage, progress: (OtaProgress) -> Unit) = coroutineScope {
        var phase = OtaPhase.Checking
        var sent = 0
        var started = false
        var flashCommitted = false
        var subscribed = false
        val events = Channel<OtaEvent>(Channel.UNLIMITED)
        val reboot = kotlinx.coroutines.CompletableDeferred<Unit>()
        fun update(next: OtaPhase) { coroutineContext.ensureActive(); phase = next; progress(OtaProgress(phase, sent, pkg.size)) }
        val collector = launch(start = CoroutineStart.UNDISPATCHED) {
            transport.events.collect { event ->
                when (event) {
                    OtaEvent.Disconnected -> { reboot.complete(Unit); events.send(event) }
                    is OtaEvent.Failure -> events.send(event)
                    is OtaEvent.Status -> {
                        val frame = runCatching { JSONObject(event.data.toString(Charsets.UTF_8)) }.getOrNull()
                        if (frame?.opt("type") == "ota") {
                            val status = frame.opt("status")
                            if (status in listOf("error", "failed", "aborted") ||
                                status == "ready" && phase == OtaPhase.WaitingReady ||
                                status == "success" && phase == OtaPhase.Committing) events.send(event)
                        }
                    }
                }
            }
        }
        fun checkEvent(event: OtaEvent): JSONObject? = when (event) {
            OtaEvent.Disconnected -> error("OTA 提交确认前连接断开，未确认升级完成")
            is OtaEvent.Failure -> error(event.message)
            is OtaEvent.Status -> JSONObject(event.data.toString(Charsets.UTF_8)).also {
                if (it.opt("status") in listOf("error", "failed", "aborted")) error("设备拒绝 OTA：${it.optString("detail", it.optString("code", it.optString("status")))}")
            }
        }
        fun checkPending() { while (true) checkEvent(events.tryReceive().getOrNull() ?: break) }
        suspend fun waitStatus(expected: String): JSONObject = withTimeout(receiptTimeoutMs) {
            while (true) {
                val frame = checkEvent(events.receive())
                if (frame?.opt("status") == expected) return@withTimeout frame
            }
            @Suppress("UNREACHABLE_CODE") error("unreachable")
        }
        try {
            update(OtaPhase.Checking)
            require(withTimeout(receiptTimeoutMs) { identity(transport.readInfo(), pkg) } != pkg.version) { "设备已运行该固件版本，无需重复升级" }
            checkPending()
            update(OtaPhase.Subscribing)
            withTimeout(receiptTimeoutMs) { transport.subscribe(true) }; subscribed = true
            // Let already buffered subscription snapshots reach the collector while still
            // in Subscribing; they cannot be receipts for a start not yet written.
            yield()
            checkPending()
            val chunk = minOf(180, transport.chunkCapacity).also { require(it > 0) { "分包长度无效" } }
            val start = JSONObject().put("op", "start").put("target", pkg.target).put("hardware", pkg.hardware)
                .put("target_version", pkg.version).put("size", pkg.size).put("chunk_size", chunk).put("sha256", pkg.sha256)
            update(OtaPhase.WaitingReady); started = true
            withTimeout(receiptTimeoutMs) { transport.writeControl(start.toString().toByteArray()) }
            val maximum = waitStatus("ready").opt("max_chunk") as? Number ?: error("ready 缺少 max_chunk")
            require(maximum.toDouble() == maximum.toInt().toDouble() && maximum.toInt() in 1..512) { "设备 max_chunk 非法" }
            val capacity = minOf(chunk, maximum.toInt())
            update(OtaPhase.Transferring)
            for (offset in pkg.firmware.indices step capacity) {
                checkPending()
                val end = minOf(offset + capacity, pkg.size)
                withTimeout(receiptTimeoutMs) { transport.writeData(pkg.firmware.copyOfRange(offset, end)) }
                sent = end; update(OtaPhase.Transferring)
                delay(20)
            }
            yield()
            checkPending()
            update(OtaPhase.Committing)
            withTimeout(receiptTimeoutMs) { transport.writeControl("""{"op":"commit"}""".toByteArray()) }
            waitStatus("success"); flashCommitted = true
            update(OtaPhase.WaitingReboot)
            withTimeout(receiptTimeoutMs) { reboot.await() }
            update(OtaPhase.Verifying)
            withTimeout(45_000) {
                transport.reconnect()
                require(identity(transport.readInfo(), pkg) == pkg.version) { "OTA_VERSION_MISMATCH：重启后实际版本与目标不一致" }
            }
            update(OtaPhase.Success)
        } finally {
            collector.cancel()
            withContext(NonCancellable) {
                if (started && !flashCommitted) runCatching { withTimeout(3_000) { transport.writeControl("""{"op":"abort"}""".toByteArray()) } }
                if (subscribed) runCatching { withTimeout(3_000) { transport.subscribe(false) } }
            }
        }
    }
}
