package com.smartble.core.ota

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.security.MessageDigest

@OptIn(ExperimentalCoroutinesApi::class)
class OtaEngineTest {
    private val firmware = ByteArray(400) { it.toByte() }
    private fun manifest(): JSONObject = JSONObject().put("format_version", 1).put("target", "lightble-peripheral")
        .put("hardware", "esp32-s3").put("firmware_version", "1.0.1").put("size", firmware.size)
        .put("sha256", MessageDigest.getInstance("SHA-256").digest(firmware).joinToString("") { "%02x".format(it) })
    private fun pkg() = OtaPackage.validate(firmware, manifest().toString())
    private class Fake : OtaTransport {
        override val events = MutableSharedFlow<OtaEvent>(extraBufferCapacity = 64)
        override val chunkCapacity = 180
        val controls = mutableListOf<JSONObject>()
        val chunks = mutableListOf<ByteArray>()
        val subscriptions = mutableListOf<Boolean>()
        var target = "lightble-peripheral"; var hardware = "esp32-s3"
        var current = "1.0.0"; var actual = "1.0.1"
        var reconnects = 0; var readCount = 0
        var sendReady = true; var reboot = true; var staleSnapshot = false
        var readyMax: Any = 180
        var writeGate: CompletableDeferred<Unit>? = null
        var failData = false
        var initialInfoGate: CompletableDeferred<Unit>? = null
        var verifiedInfoGate: CompletableDeferred<Unit>? = null
        override suspend fun readInfo(): String {
            readCount++
            withContext(NonCancellable) { (if (reconnects == 0) initialInfoGate else verifiedInfoGate)?.await() }
            return JSONObject().put("type", "system_info").put("target", target).put("hardware", hardware)
                .put("firmware_version", if (reconnects == 0) current else actual).toString()
        }
        private suspend fun status(json: JSONObject) { events.emit(OtaEvent.Status(json.put("type", "ota").toString().toByteArray())) }
        override suspend fun subscribe(enabled: Boolean) {
            subscriptions.add(enabled)
            if (enabled && staleSnapshot) {
                status(JSONObject().put("status", "success"))
                status(JSONObject().put("status", "ready").put("max_chunk", 0))
            }
        }
        override suspend fun writeControl(data: ByteArray) {
            val json = JSONObject(data.toString(Charsets.UTF_8)); controls.add(json)
            when (json.getString("op")) {
                "start" -> if (sendReady) status(JSONObject().put("status", "ready").put("max_chunk", readyMax))
                "commit" -> {
                    status(JSONObject().put("status", "success").put("rebooting", true))
                    if (reboot) events.emit(OtaEvent.Disconnected)
                }
            }
        }
        override suspend fun writeData(data: ByteArray) {
            writeGate?.await(); chunks.add(data)
            if (failData) events.emit(OtaEvent.Status("""{"type":"ota","status":"error","detail":"already ready success ok"}""".toByteArray()))
        }
        override suspend fun reconnect() { reconnects++ }
    }
    private suspend fun failure(block: suspend () -> Unit): Throwable = try {
        block(); fail("expected failure"); error("unreachable")
    } catch (error: Throwable) { if (error is AssertionError) throw error; error }

    @Test fun `six fields exact types hash and bounded file reads`() {
        for (key in manifest().keys().asSequence().toList()) {
            assertThrows(Exception::class.java) { OtaPackage.validate(firmware, manifest().apply { remove(key) }.toString()) }
        }
        for (invalid in listOf(manifest().put("version", "1.0.1"), manifest().put("format_version", true),
            manifest().put("size", true), manifest().put("size", 400.1), manifest().put("hardware", " "),
            manifest().put("firmware_version", "01.0.1"), manifest().put("sha256", "0".repeat(64)))) {
            assertThrows(Exception::class.java) { OtaPackage.validate(firmware, invalid.toString()) }
        }
        assertEquals("1.0.1", pkg().version)
        assertThrows(IllegalArgumentException::class.java) {
            OtaPackage.readBounded(ByteArray(OtaPackage.MAX_FIRMWARE_SIZE + 1).inputStream(), OtaPackage.MAX_FIRMWARE_SIZE)
        }
    }
    @Test fun `full transaction verifies actual running info after reboot`() = runTest {
        val fake = Fake(); val updates = mutableListOf<OtaProgress>()
        OtaEngine().run(fake, pkg()) { updates.add(it) }
        assertEquals(listOf("start", "commit"), fake.controls.map { it.getString("op") })
        assertEquals("esp32-s3", fake.controls[0].getString("hardware"))
        assertEquals("1.0.1", fake.controls[0].getString("target_version"))
        assertEquals(7, fake.controls[0].length())
        assertArrayEquals(firmware, fake.chunks.fold(byteArrayOf()) { a, b -> a + b })
        assertEquals(2, fake.readCount); assertEquals(1, fake.reconnects)
        assertEquals(listOf(true, false), fake.subscriptions)
        assertTrue(updates.filter { it.phase != OtaPhase.Success }.all { it.percent < 100 })
        assertEquals(OtaPhase.Success, updates.last().phase); assertEquals(100, updates.last().percent)
    }
    @Test fun `subscription snapshots cannot start data or finalize success`() = runTest {
        val fake = Fake().apply { staleSnapshot = true }
        OtaEngine().run(fake, pkg()) {}; assertEquals(3, fake.chunks.size)
    }
    @Test fun `target hardware and same running version block start`() = runTest {
        for (fake in listOf(Fake().apply { target = "lightble-observer" }, Fake().apply { hardware = "esp32" }, Fake().apply { current = "1.0.1" })) {
            failure { OtaEngine().run(fake, pkg()) {} }
            assertTrue(fake.controls.isEmpty()); assertTrue(fake.subscriptions.isEmpty())
        }
    }
    @Test fun `ready timeout aborts and unsubscribes without data`() = runTest {
        val fake = Fake().apply { sendReady = false }
        failure { OtaEngine(receiptTimeoutMs = 100).run(fake, pkg()) {} }
        assertTrue(fake.chunks.isEmpty())
        assertEquals(listOf("start", "abort"), fake.controls.map { it.getString("op") })
        assertEquals(listOf(true, false), fake.subscriptions)
    }
    @Test fun `invalid ready chunk fails before data`() = runTest {
        for (maximum in listOf(0, -1, 513, true, 1.5)) {
            val fake = Fake().apply { readyMax = maximum }
            failure { OtaEngine().run(fake, pkg()) {} }
            assertTrue(fake.chunks.isEmpty()); assertEquals("abort", fake.controls.last().getString("op"))
        }
    }
    @Test fun `error text mentioning ready success cannot commit`() = runTest {
        val fake = Fake().apply { failData = true }
        failure { OtaEngine().run(fake, pkg()) {} }
        assertEquals(listOf("start", "abort"), fake.controls.map { it.getString("op") }); assertEquals(1, fake.chunks.size)
    }
    @Test fun `flash receipt without reboot cannot reach one hundred`() = runTest {
        val fake = Fake().apply { reboot = false }; val updates = mutableListOf<OtaProgress>()
        failure { OtaEngine(receiptTimeoutMs = 100).run(fake, pkg()) { updates.add(it) } }
        assertTrue(updates.all { it.percent < 100 }); assertEquals(0, fake.reconnects)
    }
    @Test fun `reverted running image fails verification`() = runTest {
        val fake = Fake().apply { actual = "1.0.0" }
        assertTrue(failure { OtaEngine().run(fake, pkg()) {} }.message!!.contains("OTA_VERSION_MISMATCH"))
    }
    @Test fun `cancel stops queued data and performs cleanup`() = runTest {
        val fake = Fake().apply { writeGate = CompletableDeferred() }
        val job = launch { OtaEngine().run(fake, pkg()) {} }; runCurrent()
        assertTrue(fake.chunks.isEmpty()); job.cancelAndJoin(); assertTrue(fake.chunks.isEmpty())
        assertEquals(listOf("start", "abort"), fake.controls.map { it.getString("op") })
        assertEquals(listOf(true, false), fake.subscriptions)
    }
    @Test fun `unexpected disconnect before ready never sends data`() = runTest {
        val fake = Fake().apply { sendReady = false }
        val job = launch { failure { OtaEngine().run(fake, pkg()) {} } }
        runCurrent(); fake.events.emit(OtaEvent.Disconnected); advanceUntilIdle(); job.join()
        assertTrue(fake.chunks.isEmpty()); assertEquals("abort", fake.controls.last().getString("op"))
    }
    @Test fun `late preflight info after cancellation cannot send start`() = runTest {
        val gate = CompletableDeferred<Unit>(); val fake = Fake().apply { initialInfoGate = gate }
        val updates = mutableListOf<OtaProgress>()
        val job = launch { OtaEngine().run(fake, pkg()) { updates.add(it) } }
        runCurrent(); job.cancel(); gate.complete(Unit); advanceUntilIdle(); job.join()
        assertTrue(fake.controls.isEmpty()); assertTrue(fake.subscriptions.isEmpty())
        assertTrue(updates.none { it.phase == OtaPhase.Success })
    }
    @Test fun `late final info after cancellation cannot turn green`() = runTest {
        val gate = CompletableDeferred<Unit>(); val fake = Fake().apply { verifiedInfoGate = gate }
        val updates = mutableListOf<OtaProgress>()
        val job = launch { OtaEngine().run(fake, pkg()) { updates.add(it) } }
        runCurrent(); advanceTimeBy(100); runCurrent()
        assertEquals(2, fake.readCount)
        job.cancel(); gate.complete(Unit); advanceUntilIdle(); job.join()
        assertTrue(updates.all { it.percent < 100 })
        assertEquals(listOf(true, false), fake.subscriptions)
    }

}
