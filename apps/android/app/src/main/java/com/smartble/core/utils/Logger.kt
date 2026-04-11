package com.smartble.core.utils

import android.util.Log
import com.smartble.core.model.LogEntry
import com.smartble.core.model.LogType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object Logger {
    private const val TAG = "SmartBLE_Logger"
    private const val MAX_HISTORY_SIZE = 1000

    private val _logs = MutableStateFlow<List<LogEntry>>(emptyList())
    val logs: StateFlow<List<LogEntry>> = _logs.asStateFlow()

    fun info(message: String) = emit(message, LogType.Info)
    fun success(message: String) = emit(message, LogType.Success)
    fun error(message: String) = emit(message, LogType.Error)
    fun receive(message: String) = emit(message, LogType.Receive)
    
    // 扩展类型以对齐 Flutter / iOS
    fun warning(message: String) {
        // 当前 Android 暂未提供 Warning LogType, 回落 Info
        emit(message, LogType.Info)
    }
    fun send(message: String) {
        // Fallback to Info
        emit(message, LogType.Info) 
    }

    private fun emit(message: String, type: LogType) {
        Log.d(TAG, "[${type.name}] $message")
        
        val entry = LogEntry(message = message, type = type)
        val currentLogs = _logs.value.toMutableList()
        currentLogs.add(entry)
        
        if (currentLogs.size > MAX_HISTORY_SIZE) {
            currentLogs.removeAt(0)
        }
        
        _logs.value = currentLogs
    }

    fun clear() {
        _logs.value = emptyList()
    }
}
