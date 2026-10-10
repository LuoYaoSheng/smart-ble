package com.smartble.core.ble

import com.smartble.core.utils.DataConverter
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * 指令队列项
 */
data class CommandItem(
    val id: String,
    val deviceId: String,
    val serviceUuid: String,
    val characteristicUuid: String,
    val data: ByteArray,
    val withoutResponse: Boolean = false,
    val displayHex: String = "",
    var status: CommandStatus = CommandStatus.PENDING,
    var error: String? = null,
    var sentAt: Long = 0L
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is CommandItem) return false
        return id == other.id
    }

    override fun hashCode(): Int = id.hashCode()
}

/**
 * 指令状态
 */
enum class CommandStatus {
    PENDING,
    SENDING,
    SUCCESS,
    FAILED,
    CANCELLED
}

/**
 * 队列状态
 */
data class QueueState(
    val isRunning: Boolean = false,
    val isPaused: Boolean = false,
    val isLooping: Boolean = false,
    val pendingCount: Int = 0,
    val currentLoop: Int = 0,
    val targetLoopCount: Int = 0
)

/**
 * BLE 指令队列
 *
 * 支持:
 * - FIFO 顺序发送，可配置发送间隔
 * - 批量发送（多条指令排队）
 * - 循环发送（重复 N 次或无限循环）
 * - 暂停/恢复/清空
 */
class CommandQueue(
    private val sender: suspend (CommandItem) -> Unit,
    var intervalMs: Long = 50L,
    val maxDepth: Int = 16,
    val writeTimeoutMs: Long = 5000L,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
) {
    private val pending = mutableListOf<CommandItem>()
    private val active = mutableMapOf<String, CommandItem>()
    private val jobs = mutableMapOf<String, Job>()
    private val completed = mutableListOf<CommandItem>()
    private var generation = 0L
    private var paused = false
    private var looping = false
    private var loopCount = 0
    private var currentLoop = 0
    private var loopTemplate: List<CommandItem>? = null
    private val _state = MutableStateFlow(QueueState())
    val state: StateFlow<QueueState> = _state.asStateFlow()
    var onCommandStart: ((CommandItem) -> Unit)? = null
    var onCommandComplete: ((CommandItem) -> Unit)? = null
    var onCommandError: ((CommandItem) -> Unit)? = null
    var onQueueEmpty: (() -> Unit)? = null
    val pendingCount: Int @Synchronized get() = pending.size
    val history: List<CommandItem> @Synchronized get() = completed.toList()

    @Synchronized fun enqueue(command: CommandItem) = enqueueBatch(listOf(command))

    @Synchronized fun enqueueBatch(commands: List<CommandItem>) {
        commands.groupingBy { it.deviceId }.eachCount().forEach { (id, count) ->
            require(pending.count { it.deviceId == id } + (if (active.containsKey(id)) 1 else 0) + count <= maxDepth) {
                "写队列已满（$maxDepth）"
            }
        }
        pending.addAll(commands)
        startProcessing()
        emitState()
    }

    @Synchronized fun startLoop(commands: List<CommandItem>, loopCount: Int = 0) {
        require(commands.isNotEmpty()) { "循环模板不能为空" }
        require(loopCount >= 0) { "循环次数不能为负数" }
        commands.groupingBy { it.deviceId }.eachCount().forEach { (id, count) ->
            require(count + pending.count { it.deviceId == id } + (if (active.containsKey(id)) 1 else 0) <= maxDepth) {
                "循环模板超过队列深度 $maxDepth"
            }
        }
        stopLoop()
        looping = true
        this.loopCount = loopCount
        loopTemplate = commands.toList()
        enqueueNextLoop()
        startProcessing()
        emitState()
    }

    @Synchronized fun stopLoop() {
        looping = false
        loopTemplate = null
        loopCount = 0
        currentLoop = 0
        emitState()
    }

    @Synchronized fun pause() { paused = true; emitState() }
    @Synchronized fun resume() { paused = false; startProcessing(); emitState() }

    @Synchronized fun clear() {
        generation++
        (pending + active.values).forEach { it.status = CommandStatus.CANCELLED }
        jobs.values.forEach { it.cancel() }
        jobs.clear()
        pending.clear()
        active.clear()
        paused = false
        stopLoop()
        emitState()
    }

    @Synchronized fun clearHistory() { completed.clear() }

    private fun startProcessing() {
        if (paused) return
        pending.map { it.deviceId }.distinct().forEach { deviceId ->
            if (jobs.containsKey(deviceId)) return@forEach
            val run = generation
            val job = scope.launch(start = CoroutineStart.LAZY) { process(deviceId, run) }
            jobs[deviceId] = job
            job.start()
        }
    }

    private suspend fun process(deviceId: String, run: Long) {
        while (true) {
            val command = synchronized(this) {
                if (run != generation) return
                val index = if (paused) -1 else pending.indexOfFirst { it.deviceId == deviceId }
                if (index < 0) {
                    jobs.remove(deviceId)
                    if (pending.isEmpty() && active.isEmpty() && looping) enqueueNextLoop()
                    startProcessing()
                    emitState()
                    if (pending.isEmpty() && active.isEmpty() && !looping) onQueueEmpty?.invoke()
                    return
                }
                pending.removeAt(index).also {
                    active[deviceId] = it
                    it.status = CommandStatus.SENDING
                    it.sentAt = System.currentTimeMillis()
                    emitState()
                }
            }
            onCommandStart?.invoke(command)
            var failure: Exception? = null
            try { withTimeout(writeTimeoutMs) { sender(command) } }
            catch (e: TimeoutCancellationException) { failure = e }
            catch (e: CancellationException) { throw e }
            catch (e: Exception) { failure = e }
            synchronized(this) {
                if (run != generation) return
                active.remove(deviceId)
                command.status = if (failure == null) CommandStatus.SUCCESS else CommandStatus.FAILED
                command.error = failure?.message
                completed.add(command)
                if (failure == null) onCommandComplete?.invoke(command) else onCommandError?.invoke(command)
                emitState()
            }
            if (intervalMs > 0) delay(intervalMs)
        }
    }

    private fun enqueueNextLoop() {
        val template = loopTemplate ?: return
        if (loopCount > 0 && currentLoop >= loopCount) { looping = false; loopTemplate = null; return }
        currentLoop++
        pending.addAll(template.mapIndexed { index, item -> item.copy(
            id = "${item.id}_loop${currentLoop}_$index", data = item.data.copyOf(), status = CommandStatus.PENDING,
            error = null, sentAt = 0
        ) })
    }

    private fun emitState() {
        _state.value = QueueState(
            isRunning = jobs.isNotEmpty(), isPaused = paused, isLooping = looping,
            pendingCount = pending.size, currentLoop = currentLoop, targetLoopCount = loopCount
        )
    }

    companion object {
        /**
         * 解析 HEX 字符串为字节数组
         */
        fun parseHex(hex: String): ByteArray {
            return DataConverter.hexToBytes(hex)
        }

        /**
         * 解析多行 HEX 文本为多条指令
         */
        fun parseMultiLineHex(text: String): List<ByteArray> {
            return text.split("\n")
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .map { parseHex(it) }
        }

        /**
         * 格式化字节为 HEX 显示字符串
         */
        fun formatHex(data: ByteArray): String {
            return DataConverter.bytesToHex(data)
        }
    }
}
