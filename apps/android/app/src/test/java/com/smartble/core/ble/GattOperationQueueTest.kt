package com.smartble.core.ble
import org.junit.Assert.*
import org.junit.Test
class GattOperationQueueTest {
    @Test fun `receipts serialize each device and unrelated receipt cannot advance`() {
        val starts = mutableListOf<String>()
        val a = GattOperationQueue()
        val b = GattOperationQueue()
        assertTrue(a.submit("read") { starts.add("a-read"); true })
        assertTrue(a.submit("write") { starts.add("a-write"); true })
        assertTrue(b.submit("write") { starts.add("b-write"); true })
        assertEquals(listOf("a-read", "b-write"), starts)
        a.complete("unrelated")
        assertEquals(2, a.depth)
        a.complete("read")
        assertEquals(listOf("a-read", "b-write", "a-write"), starts)
    }
    @Test fun `depth includes active and clearing discards pending`() {
        val queue = GattOperationQueue()
        var sent = 0
        repeat(16) { assertTrue(queue.submit("$it") { sent++; true }) }
        assertFalse(queue.submit("overflow") { sent++; true })
        assertEquals(16, queue.depth)
        queue.clear()
        queue.complete("0")
        assertEquals(1, sent)
        assertEquals(0, queue.depth)
    }
    @Test fun `rejected platform submission does not wedge queue`() {
        val queue = GattOperationQueue()
        queue.submit("first") { true }
        queue.submit("rejected") { false }
        var started = false
        queue.submit("next") { started = true; true }
        queue.complete("first")
        assertTrue(started)
        assertEquals(1, queue.depth)
    }
}
