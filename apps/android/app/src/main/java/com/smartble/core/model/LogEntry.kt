package com.smartble.core.model

/**
 * 日志类型
 */
enum class LogType {
    Info,
    Success,
    Warning,
    Error,
    Receive,
    Send,
}

/**
 * 日志条目
 */
data class LogEntry(
    val message: String,
    val type: LogType,
    val timestamp: String = ""
)
