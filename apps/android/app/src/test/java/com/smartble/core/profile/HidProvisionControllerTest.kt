package com.smartble.core.profile

/*
 * HidProvisionController 单元测试（FakeTransport 双形态中的 Fake 侧）。
 *
 * 覆盖 P002 状态机主链：connect 验证 / happy path（步进→ready 全 done）/
 * 设备侧错误→行+恢复映射 / 60s 超时 / 下发中断线 / 写失败分类 / 单调推进
 * （旧 step 回放与 ready 后迟到 error 不回退终态）/ cancelWait / 表单回退 /
 * 配置态 STATUS 轮询刷新。
 * 虚拟时间：controller scope 用 UnconfinedTestDispatcher(testScheduler)，
 * withTimeoutOrNull 与 poll delay 均走虚拟时钟（advanceTimeBy 快进）。
 */

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestCoroutineScheduler
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

private const val VALID_INFO =
    """{"product":"smart-hid","protocol":"1.0","device_id":"HID-ABCD1234","firmware":"1.1.0","state":"unprovisioned","provisioned":false}"""

private class FakeTransport : HidProvisionTransport {
    override var mtu: Int = 23
    var infoJson: String = VALID_INFO
    var statusJson: String = """{"state":"unprovisioned","step":"","error":null}"""
    var connectError: Exception? = null
    var onWrite: (suspend (index: Int, frame: ByteArray) -> Unit)? = null
    val written = mutableListOf<ByteArray>()
    var closeCount = 0
    var onLostCb: (() -> Unit)? = null

    private val statusFlow = MutableSharedFlow<String>(extraBufferCapacity = 64)
    private val infoFlow = MutableSharedFlow<String>(extraBufferCapacity = 64)
    override val statusNotifications: Flow<String> = statusFlow
    override val deviceInfoNotifications: Flow<String> = infoFlow

    override suspend fun connect(deviceId: String, onLost: () -> Unit) {
        connectError?.let { throw it }
        onLostCb = onLost
    }

    override suspend fun readDeviceInfo(): String = infoJson
    override suspend fun readStatus(): String = statusJson

    override suspend fun writeFrames(frames: List<ByteArray>, intervalMs: Long) {
        frames.forEachIndexed { index, frame ->
            written.add(frame)
            onWrite?.invoke(index, frame)
        }
    }

    override suspend fun close() {
        closeCount += 1
    }

    suspend fun emitStatus(text: String) = statusFlow.emit(text)
}

private fun makeController(
    scheduler: TestCoroutineScheduler,
    fake: FakeTransport,
    statusTimeoutMs: Long = 60_000,
): HidProvisionController = HidProvisionController(
    transportFactory = { fake },
    scope = CoroutineScope(UnconfinedTestDispatcher(scheduler)),
    statusTimeoutMs = statusTimeoutMs,
)

private data class SubmitInput(
    val ssid: String,
    val password: String,
    val host: String,
    val port: Int?,
    val token: String,
)

private fun submitInput() = SubmitInput(
    ssid = "Home-2.4G",
    password = "p@ss w0rd",
    host = "192.168.1.10",
    port = 17892,
    token = "0123456789abcdef0123456789abcdef",
)

private suspend fun HidProvisionController.submitVia(input: SubmitInput) = submit(
    wifiSsid = input.ssid,
    wifiPassword = input.password,
    hubHost = input.host,
    hubPort = input.port,
    token = input.token,
)

private fun expectedCandidateJson(input: SubmitInput): String =
    SmartHidProtocol.buildProvisionCandidateJson(
        ProvisionCandidateInput(
            wifiSsid = input.ssid,
            wifiPassword = input.password,
            hubHost = input.host,
            hubPort = input.port,
            token = input.token,
        ),
    )

class HidProvisionControllerTest {

    @Test
    fun `connect ok 进入 Configure 且 deviceInfo 就位`() = runTest {
        val fake = FakeTransport()
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        val s = c.state.value
        assertEquals(ProvisionPhase.Configure, s.phase)
        assertEquals("HID-ABCD1234", s.deviceInfo?.deviceId)
        assertNull(s.connError)
        assertFalse(s.lost)
        c.dispose()
    }

    @Test
    fun `connect 身份验证失败关连接并停 Connect 阶段`() = runTest {
        val fake = FakeTransport().apply {
            infoJson = """{"product":"other","protocol":"1.0","device_id":"HID-ABCD1234"}"""
        }
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        val s = c.state.value
        assertEquals(ProvisionPhase.Connect, s.phase)
        assertNotNull(s.connError)
        assertTrue(s.connError!!.contains("身份验证失败"))
        assertEquals(1, fake.closeCount)
        c.dispose()
    }

    @Test
    fun `connect 异常归类 connError`() = runTest {
        val fake = FakeTransport().apply { connectError = HidConnectException("连接设备失败: boom") }
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        assertEquals("连接设备失败: boom", c.state.value.connError)
        c.dispose()
    }

    @Test
    fun `未连接 submit 抛 IllegalStateException`() = runTest {
        val c = makeController(testScheduler, FakeTransport())
        var thrown = false
        try {
            c.submitVia(submitInput())
        } catch (e: IllegalStateException) {
            thrown = true
        }
        assertTrue(thrown)
        c.dispose()
    }

    @Test
    fun `happy path 步进到 ready 全行 done 且帧内容重组等于 candidate`() = runTest {
        val fake = FakeTransport()
        val input = submitInput()
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        // 首帧写入即触发设备侧步进序列（终态 waiter 已在写入前挂好，快速终态不丢）
        fake.onWrite = { index, _ ->
            if (index == 0) {
                fake.emitStatus("""{"state":"provisioning","step":"received","error":null}""")
                fake.emitStatus("""{"state":"provisioning","step":"connecting_wifi","error":null}""")
                fake.emitStatus("""{"state":"provisioning","step":"wifi_connected","error":null}""")
                fake.emitStatus("""{"state":"provisioning","step":"pairing","error":null}""")
                fake.emitStatus("""{"state":"provisioning","step":"pairing_success","error":null}""")
                fake.emitStatus("""{"state":"provisioning","step":"mqtt_connecting","error":null}""")
                fake.emitStatus("""{"state":"ready","step":"ready","error":null}""")
            }
        }
        c.submitVia(input)

        val s = c.state.value
        assertTrue(s.done)
        assertNull(s.failure)
        assertEquals(ProvisionPhase.Status, s.phase)
        s.progress.values.forEach { assertEquals(ProvisionRowState.Done, it) }

        // 帧头契约：seq 从 0 递增、total 一致、len=帧长-3；载荷重组等于 candidate JSON
        val frames = fake.written
        assertTrue(frames.size > 1) // mtu 23 → 17B/帧，candidate 约 150B → 多帧
        frames.forEachIndexed { i, f ->
            assertEquals(i.toByte(), f[0])
            assertEquals(frames.size.toByte(), f[1])
            assertEquals((f.size - 3).toByte(), f[2])
        }
        val reassembled = frames.joinToString("") { String(it.drop(3).toByteArray(), Charsets.UTF_8) }
        assertEquals(expectedCandidateJson(input), reassembled)
        c.dispose()
    }

    @Test
    fun `设备侧 wifi_failed 映射 wifi 行失败与 form 恢复`() = runTest {
        val fake = FakeTransport()
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        fake.onWrite = { _, _ ->
            fake.emitStatus("""{"state":"provisioning","step":"connecting_wifi","error":null}""")
            fake.emitStatus("""{"state":"error","step":"","error":"wifi_failed"}""")
        }
        c.submitVia(submitInput())
        val s = c.state.value
        val f = s.failure
        assertNotNull(f)
        assertEquals("wifi_failed", f!!.code)
        assertEquals("wifi", f.row)
        assertEquals("form", f.recovery)
        assertEquals("Wi-Fi 连接失败，请检查 SSID / 密码", f.message)
        assertEquals(ProvisionRowState.Fail, s.progress["wifi"])
        assertEquals(ProvisionRowState.Pending, s.progress["hub"])
        assertEquals(ProvisionRowState.Pending, s.progress["conn"])
        assertFalse(s.done)
        c.dispose()
    }

    @Test
    fun `pairing_used 映射 hub 行 pairing 恢复且失败行前 wifi 行推 done`() = runTest {
        val fake = FakeTransport()
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        fake.onWrite = { _, _ ->
            fake.emitStatus("""{"state":"provisioning","step":"wifi_connected","error":null}""")
            fake.emitStatus("""{"state":"error","step":"","error":"pairing_used"}""")
        }
        c.submitVia(submitInput())
        val s = c.state.value
        assertEquals("hub", s.failure?.row)
        assertEquals("pairing", s.failure?.recovery)
        assertEquals(ProvisionRowState.Done, s.progress["wifi"]) // hub 失败行起点 idx=2 → wifi 推 done
        assertEquals(ProvisionRowState.Fail, s.progress["hub"])
        c.dispose()
    }

    @Test
    fun `无终态时 60s 虚拟时间超时呈现 timeout 可重试`() = runTest {
        val fake = FakeTransport()
        val c = makeController(testScheduler, fake, statusTimeoutMs = 60_000)
        c.connectDevice("AA:BB")
        val job = launch { c.submitVia(submitInput()) }
        runCurrent() // 写入完成、submit 挂在终态等待
        advanceTimeBy(60_001)
        runCurrent() // 超时恢复执行
        val s = c.state.value
        assertEquals(SmartHidProtocol.TIMEOUT_ERROR_CODE, s.failure?.code)
        assertEquals("conn", s.failure?.row)
        assertEquals("retry", s.failure?.recovery)
        assertFalse(s.provisioning)
        assertTrue(job.isCompleted)
        c.dispose()
        job.cancel()
    }

    @Test
    fun `下发中链路丢失按 connection_lost 呈现可重连`() = runTest {
        val fake = FakeTransport()
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        fake.onWrite = { _, _ -> fake.onLostCb?.invoke() }
        c.submitVia(submitInput())
        val s = c.state.value
        assertEquals("connection_lost", s.failure?.code)
        assertEquals("reconnect", s.failure?.recovery)
        assertFalse(s.done)
        c.dispose()
    }

    @Test
    fun `写失败 disconnect 类映射 connection_lost 其余 write_failed`() = runTest {
        val fake = FakeTransport()
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        fake.onWrite = { index, _ ->
            if (index == 1) throw HidWriteException(HidWriteErrorKind.DISCONNECT, "BLE 连接已断开")
        }
        c.submitVia(submitInput())
        assertEquals("connection_lost", c.state.value.failure?.code)

        val fake2 = FakeTransport()
        val c2 = makeController(testScheduler, fake2)
        c2.connectDevice("AA:BB")
        fake2.onWrite = { index, _ ->
            if (index == 1) throw HidWriteException(HidWriteErrorKind.WRITE, "gatt error 133")
        }
        c2.submitVia(submitInput())
        val f2 = c2.state.value.failure
        assertEquals("write_failed", f2?.code)
        assertEquals("wifi", f2?.row)
        assertEquals("retry", f2?.recovery)
        c.dispose()
        c2.dispose()
    }

    @Test
    fun `ready 后旧 step 回放与迟到 error 不回退终态`() = runTest {
        val fake = FakeTransport()
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        fake.onWrite = { _, _ ->
            fake.emitStatus("""{"state":"ready","step":"ready","error":null}""")
        }
        c.submitVia(submitInput())
        assertTrue(c.state.value.done)
        // 旧 step 回放（重放/乱序）不得回退进度
        fake.emitStatus("""{"state":"provisioning","step":"connecting_wifi","error":null}""")
        c.state.value.progress.values.forEach { assertEquals(ProvisionRowState.Done, it) }
        // 终态已定：迟到 error 不改判
        fake.emitStatus("""{"state":"error","step":"","error":"wifi_failed"}""")
        assertTrue(c.state.value.done)
        assertNull(c.state.value.failure)
        c.dispose()
    }

    @Test
    fun `cancelWait 本地按 timeout 呈现并停止等待`() = runTest {
        val fake = FakeTransport()
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        val job = launch { c.submitVia(submitInput()) }
        runCurrent()
        c.cancelWait()
        runCurrent()
        val s = c.state.value
        assertEquals(SmartHidProtocol.TIMEOUT_ERROR_CODE, s.failure?.code)
        assertFalse(s.provisioning)
        assertTrue(job.isCompleted)
        c.dispose()
        job.cancel()
    }

    @Test
    fun `backToForm 重置进度错误回 Configure`() = runTest {
        val fake = FakeTransport()
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        fake.onWrite = { _, _ ->
            fake.emitStatus("""{"state":"error","step":"","error":"wifi_failed"}""")
        }
        c.submitVia(submitInput())
        assertNotNull(c.state.value.failure)
        c.backToForm()
        val s = c.state.value
        assertEquals(ProvisionPhase.Configure, s.phase)
        assertNull(s.failure)
        assertFalse(s.done)
        s.progress.values.forEach { assertEquals(ProvisionRowState.Pending, it) }
        c.dispose()
    }

    @Test
    fun `配置态轮询刷新 lastStatus（状态文本变化时）`() = runTest {
        val fake = FakeTransport()
        val c = makeController(testScheduler, fake)
        c.connectDevice("AA:BB")
        advanceTimeBy(2_100) // poll 周期 2s：读一次 STATUS
        runCurrent()
        assertEquals("unprovisioned", c.state.value.lastStatus?.state)
        c.dispose()
    }
}
