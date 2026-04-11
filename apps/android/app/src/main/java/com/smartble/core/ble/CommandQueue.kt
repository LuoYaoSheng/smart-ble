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
    FAILED
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
    var intervalMs: Long = 50L
) {
    private val _queue = mutableListOf<CommandItem>()
    private val _history = mutableListOf<CommandItem>()

    private var isRunning = false
    private var isPaused = false
    private var isLooping = false
    private var loopCount = 0  // 0 = 无限循环
    private var currentLoop = 0
    private var loopTemplate: List<CommandItem>? = null
    private var processingJob: Job? = null

    private val _state = MutableStateFlow(QueueState())
    val state: StateFlow<QueueState> = _state.asStateFlow()

    // 回调
    var onCommandStart: ((CommandItem) -> Unit)? = null
    var onCommandComplete: ((CommandItem) -> Unit)? = null
    var onCommandError: ((CommandItem) -> Unit)? = null
    var onQueueEmpty: (() -> Unit)? = null

    val pendingCount: Int get() = _queue.size
    val history: List<CommandItem> get() = _history.toList()

    /**
     * 添加单条指令
     */
    fun enqueue(command: CommandItem) {
        _queue.add(command)
        emitState()
        startProcessing()
    }

    /**
     * 批量添加指令
     */
    fun enqueueBatch(commands: List<CommandItem>) {
        _queue.addAll(commands)
        emitState()
        startProcessing()
    }

    /**
     * 开始循环发送
     */
    fun startLoop(commands: List<CommandItem>, loopCount: Int = 0) {
        stopLoop()
        isLooping = true
        this.loopCount = loopCount
        currentLoop = 0
        loopTemplate = commands
        enqueueNextLoop()
        emitState()
    }

    /**
     * 停止循环
     */
    fun stopLoop() {
        isLooping = false
        loopTemplate = null
        loopCount = 0
        currentLoop = 0
        emitState()
    }

    /**
     * 暂停队列
     */
    fun pause() {
        isPaused = true
        emitState()
    }

    /**
     * 恢复队列
     */
    fun resume() {
        isPaused = false
        emitState()
        startProcessing()
    }

    /**
     * 清空队列
     */
    fun clear() {
        processingJob?.cancel()
        _queue.clear()
        stopLoop()
        isRunning = false
        isPaused = false
        emitState()
    }

    /**
     * 清空历史
     */
    fun clearHistory() {
        _history.clear()
    }

    private fun startProcessing() {
        if (isRunning || isPaused || _queue.isEmpty()) return
        isRunning = true
        processingJob = CoroutineScope(Dispatchers.IO).launch {
            processNext()
        }
    }

    private suspend fun processNext() {
        if (isPaused || _queue.isEmpty()) {
            isRunning = false
            if (_queue.isEmpty() && !isLooping) {
                onQueueEmpty?.invoke()
            }
            if (_queue.isEmpty() && isLooping) {
                enqueueNextLoop()
                if (_queue.isNotEmpty()) {
                    processNext()
                } else {
                    isRunning = false
                }
            }
            emitState()
            return
        }

        val command = _queue.removeAt(0)
        command.status = CommandStatus.SENDING
        command.sentAt = System.currentTimeMillis()
        onCommandStart?.invoke(command)
        emitState()

        try {
            sender(command)
            command.status = CommandStatus.SUCCESS
            onCommandComplete?.invoke(command)
        } catch (e: Exception) {
            command.status = CommandStatus.FAILED
            command.error = e.message
            onCommandError?.invoke(command)
        }

        _history.add(command)
        emitState()

        // 间隔后处理下一条
        if (_queue.isNotEmpty() || isLooping) {
            delay(intervalMs)
            processNext()
        } else {
            isRunning = false
            onQueueEmpty?.invoke()
            emitState()
        }
    }

    private fun enqueueNextLoop() {
        if (!isLooping || loopTemplate == null) return

        if (loopCount > 0 && currentLoop >= loopCount) {
            isLooping = false
            loopTemplate = null
            onQueueEmpty?.invoke()
            emitState()
            return
        }

        currentLoop++

        val newCommands = loopTemplate!!.map { template ->
            CommandItem(
                id = "${template.deviceId}_loop$currentLoop",
                deviceId = template.deviceId,
                serviceUuid = template.serviceUuid,
                characteristicUuid = template.characteristicUuid,
                data = template.data.copyOf(),
                withoutResponse = template.withoutResponse,
                displayHex = template.displayHex
            )
        }

        _queue.addAll(newCommands)
    }

    private fun emitState() {
        _state.value = QueueState(
            isRunning = isRunning,
            isPaused = isPaused,
            isLooping = isLooping,
            pendingCount = _queue.size,
            currentLoop = currentLoop,
            targetLoopCount = loopCount
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
