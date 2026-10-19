package com.smartble.core.ble

/** One ATT operation per device. Separate queue instances may run concurrently. */
internal class GattOperationQueue(private val maxDepth: Int = 16) {
    private data class Operation(val key: String, val start: () -> Boolean, var accepted: Boolean? = null)
    private val pending = ArrayDeque<Operation>()
    private var active: Operation? = null
    val activeKey: String? @Synchronized get() = active?.key
    val depth: Int @Synchronized get() = pending.size + if (active == null) 0 else 1

    @Synchronized fun submit(key: String, start: () -> Boolean): Boolean {
        if (depth >= maxDepth) return false
        val operation = Operation(key, start)
        pending.addLast(operation)
        drain()
        return operation.accepted != false
    }

    @Synchronized fun complete(key: String) {
        if (active?.key != key) return
        active = null
        drain()
    }

    @Synchronized fun clear() {
        active = null
        pending.clear()
    }

    private fun drain() {
        while (active == null && pending.isNotEmpty()) {
            val next = pending.removeFirst()
            active = next
            next.accepted = next.start()
            if (next.accepted == false) active = null
        }
    }
}
