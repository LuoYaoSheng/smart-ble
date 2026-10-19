package com.smartble.core.ble
import kotlinx.coroutines.*
import kotlinx.coroutines.test.*
import org.junit.Assert.*
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CommandQueueTest {
    private fun item(id: String, device: String = "A") = CommandItem(id, device, "service", "characteristic", byteArrayOf(1))
    @Test fun `devices progress independently and writes time out`() = runTest {
        val sent = mutableListOf<String>()
        val queue = CommandQueue(sender = { command ->
            sent.add(command.id)
            if (command.id == "hang") awaitCancellation()
        }, intervalMs = 0, scope = this)
        queue.enqueueBatch(listOf(item("hang"), item("next"), item("other", "B")))
        runCurrent()
        assertEquals(listOf("hang", "other"), sent)
        advanceUntilIdle()
        assertEquals(listOf("hang", "other", "next"), sent)
        assertEquals(CommandStatus.FAILED, queue.history.first { it.id == "hang" }.status)
    }
    @Test fun `depth counts in flight and rejects batch atomically`() = runTest {
        val queue = CommandQueue(sender = { awaitCancellation() }, intervalMs = 0, scope = this)
        queue.enqueueBatch((0 until 16).map { item("$it") })
        runCurrent()
        assertThrows(IllegalArgumentException::class.java) { queue.enqueue(item("overflow")) }
        assertEquals(15, queue.pendingCount)
        queue.clear()
        advanceUntilIdle()
        assertTrue(queue.history.isEmpty())
    }
    @Test fun `clear cancels old run and loop sends requested count`() = runTest {
        val sent = mutableListOf<String>()
        val queue = CommandQueue(sender = { sent.add(it.id) }, intervalMs = 0, scope = this)
        queue.pause()
        queue.enqueue(item("discard"))
        queue.clear()
        queue.startLoop(listOf(item("loop")), loopCount = 2)
        advanceUntilIdle()
        assertEquals(listOf("loop_loop1_0", "loop_loop2_0"), sent)
        assertFalse(queue.state.value.isLooping)
        assertFalse(queue.state.value.isRunning)
    }
}
