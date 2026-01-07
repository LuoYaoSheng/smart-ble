package com.smartble.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.smartble.core.ble.BleManager
import com.smartble.core.ble.CharacteristicChangeEvent
import com.smartble.core.model.BleCharacteristic
import com.smartble.core.model.BleService
import com.smartble.core.model.ConnectionState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 设备详情 ViewModel
 */
class DeviceDetailViewModel(
    application: Application,
    val deviceId: String,
    val deviceName: String
) : AndroidViewModel(application) {

    private val bleManager = BleManager(application)

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _services = MutableStateFlow<List<BleService>>(emptyList())
    val services: StateFlow<List<BleService>> = _services.asStateFlow()

    private val _logs = MutableStateFlow<List<LogEntry>>(emptyList())
    val logs: StateFlow<List<LogEntry>> = _logs.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

    init {
        observeConnectionState()
        observeServices()
        observeCharacteristicChanges()
        connectToDevice()
    }

    private fun observeConnectionState() {
        viewModelScope.launch {
            bleManager.connectionState.collect { state ->
                _connectionState.value = state
                if (state == ConnectionState.Connected) {
                    // 自动发现服务
                    bleManager.discoverServices()
                }
            }
        }
    }

    private fun observeServices() {
        viewModelScope.launch {
            bleManager.services.collect { serviceList ->
                _services.value = serviceList
                _isLoading.value = false
                if (serviceList.isNotEmpty()) {
                    addLog("发现 ${serviceList.size} 个服务", LogType.Info)
                }
            }
        }
    }

    private fun observeCharacteristicChanges() {
        viewModelScope.launch {
            bleManager.characteristicChanges.collect { event ->
                val hex = event.value.toHexString()
                addLog("收到通知: $hex", LogType.Receive)
            }
        }
    }

    private fun connectToDevice() {
        addLog("正在连接设备...", LogType.Info)
        val success = bleManager.connect(deviceId)
        if (!success) {
            addLog("连接失败", LogType.Error)
            _errorMessage.value = "连接失败"
            _isLoading.value = false
        }
    }

    fun disconnect() {
        addLog("断开连接", LogType.Info)
        bleManager.disconnect()
    }

    fun readCharacteristic(serviceUuid: String, characteristicUuid: String) {
        viewModelScope.launch {
            val service = _services.value.find { it.uuid == serviceUuid }
            val characteristic = service?.characteristics?.find { it.uuid == characteristicUuid }

            addLog("读取 ${characteristic?.displayName ?: characteristicUuid}...", LogType.Info)

            val success = bleManager.readCharacteristic(serviceUuid, characteristicUuid)
            if (!success) {
                addLog("读取失败", LogType.Error)
            }
        }
    }

    fun writeCharacteristic(serviceUuid: String, characteristicUuid: String, data: ByteArray) {
        viewModelScope.launch {
            val service = _services.value.find { it.uuid == serviceUuid }
            val characteristic = service?.characteristics?.find { it.uuid == characteristicUuid }

            addLog("写入 ${characteristic?.displayName ?: characteristicUuid}: ${data.toHexString()}", LogType.Info)

            val success = bleManager.writeCharacteristic(serviceUuid, characteristicUuid, data)
            if (success) {
                addLog("写入成功", LogType.Success)
            } else {
                addLog("写入失败", LogType.Error)
            }
        }
    }

    fun toggleNotification(serviceUuid: String, characteristicUuid: String) {
        viewModelScope.launch {
            val service = _services.value.find { it.uuid == serviceUuid }
            val characteristic = service?.characteristics?.find { it.uuid == characteristicUuid }

            val newState = !(characteristic?.isNotifying ?: false)
            val action = if (newState) "启用" else "禁用"

            addLog("$action 通知 ${characteristic?.displayName ?: characteristicUuid}...", LogType.Info)

            val success = bleManager.setNotification(serviceUuid, characteristicUuid, newState)

            // 更新本地状态
            val updatedServices = _services.value.map { s ->
                if (s.uuid == serviceUuid) {
                    s.copy(characteristics = s.characteristics.map { c ->
                        if (c.uuid == characteristicUuid) {
                            c.copyWithNotifying(newState)
                        } else {
                            c
                        }
                    })
                } else {
                    s
                }
            }
            _services.value = updatedServices

            if (success) {
                addLog("通知已${action}", LogType.Success)
            } else {
                addLog("设置通知失败", LogType.Error)
            }
        }
    }

    fun clearLogs() {
        _logs.value = emptyList()
    }

    private fun addLog(message: String, type: LogType) {
        val entry = LogEntry(
            message = message,
            type = type,
            timestamp = timeFormat.format(Date())
        )
        _logs.value = _logs.value + entry
    }

    override fun onCleared() {
        super.onCleared()
        bleManager.release()
    }
}

/**
 * 日志条目
 */
data class LogEntry(
    val message: String,
    val type: LogType,
    val timestamp: String
)

/**
 * 日志类型
 */
enum class LogType {
    Info,
    Success,
    Error,
    Receive,
}

/**
 * ByteArray 扩展函数
 */
fun ByteArray.toHexString(): String {
    return joinToString(" ") { "%02X".format(it) }
}

fun String.hexToByteArray(): ByteArray {
    val clean = replace(" ", "")
    return clean.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}
