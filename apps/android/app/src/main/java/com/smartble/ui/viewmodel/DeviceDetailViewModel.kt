package com.smartble.ui.viewmodel

import android.app.Application
import android.net.Uri
package com.smartble.ui.viewmodel

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.smartble.core.ble.BleManager
import com.smartble.core.model.BleCharacteristic
import com.smartble.core.model.BleService
import com.smartble.core.model.BleUuids
import com.smartble.core.model.ConnectionState
import com.smartble.core.model.LogEntry
import com.smartble.core.model.LogType
import com.smartble.core.utils.DataConverter
import com.smartble.core.utils.Logger
import kotlinx.coroutines.delay
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

    private val bleManager = BleManager.getInstance(application)

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _services = MutableStateFlow<List<BleService>>(emptyList())
    val services: StateFlow<List<BleService>> = _services.asStateFlow()

    // 绑定至全局总线
    val logs: StateFlow<List<LogEntry>> = Logger.logs

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _otaState = MutableStateFlow(OtaUiState())
    val otaState: StateFlow<OtaUiState> = _otaState.asStateFlow()

    init {
        observeConnectionState()
        observeServices()
        observeCharacteristicChanges()
        connectToDevice()
    }

    private fun observeConnectionState() {
        viewModelScope.launch {
            bleManager.connectionState(deviceId).collect { state ->
                _connectionState.value = state
                _isLoading.value = state == ConnectionState.Connecting || state == ConnectionState.Disconnecting
                if (state == ConnectionState.Connected && _services.value.isEmpty()) {
                    bleManager.discoverServices(deviceId)
                }
            }
        }
    }

    private fun observeServices() {
        viewModelScope.launch {
            bleManager.services(deviceId).collect { serviceList ->
                _services.value = serviceList
                if (serviceList.isNotEmpty()) {
                    _isLoading.value = false
                }
                if (serviceList.isNotEmpty()) {
                    Logger.info("发现 ${serviceList.size} 个服务")
                }
            }
        }
    }

    private fun observeCharacteristicChanges() {
        viewModelScope.launch {
            bleManager.characteristicChanges.collect { event ->
                if (event.deviceId != deviceId) return@collect
                if (
                    event.serviceUuid.equals(BleUuids.SERVICE_OTA, ignoreCase = true) &&
                    event.characteristicUuid.equals(BleUuids.CHARACTERISTIC_OTA_STATUS, ignoreCase = true)
                ) {
                    handleOtaStatus(event.value)
                    return@collect
                }
                val hex = DataConverter.bytesToHex(event.value)
                Logger.receive("收到通知: $hex")
            }
        }
    }

    private fun connectToDevice() {
        Logger.info("正在连接设备...")
        val success = bleManager.connect(deviceId)
        if (!success) {
            Logger.error("连接失败")
            _errorMessage.value = "连接失败"
            _isLoading.value = false
        }
    }

    fun disconnect() {
        Logger.info("断开连接")
        bleManager.disconnect(deviceId)
    }

    fun readCharacteristic(serviceUuid: String, characteristicUuid: String) {
        viewModelScope.launch {
            val service = _services.value.find { it.uuid == serviceUuid }
            val characteristic = service?.characteristics?.find { it.uuid == characteristicUuid }

            Logger.info("读取 ${characteristic?.displayName ?: characteristicUuid}...")

            val success = bleManager.readCharacteristic(deviceId, serviceUuid, characteristicUuid)
            if (!success) {
                Logger.error("读取失败")
            }
        }
    }

    fun writeCharacteristic(serviceUuid: String, characteristicUuid: String, data: ByteArray) {
        viewModelScope.launch {
            val service = _services.value.find { it.uuid == serviceUuid }
            val characteristic = service?.characteristics?.find { it.uuid == characteristicUuid }

            Logger.info("写入 ${characteristic?.displayName ?: characteristicUuid}: ${DataConverter.bytesToHex(data)}")

            val success = bleManager.writeCharacteristic(deviceId, serviceUuid, characteristicUuid, data)
            if (success) {
                Logger.success("写入成功")
            } else {
                Logger.error("写入失败")
            }
        }
    }

    fun toggleNotification(serviceUuid: String, characteristicUuid: String) {
        viewModelScope.launch {
            val service = _services.value.find { it.uuid == serviceUuid }
            val characteristic = service?.characteristics?.find { it.uuid == characteristicUuid }

            val newState = !(characteristic?.isNotifying ?: false)
            val action = if (newState) "启用" else "禁用"

            Logger.info("$action 通知 ${characteristic?.displayName ?: characteristicUuid}...")

            val success = bleManager.setNotification(deviceId, serviceUuid, characteristicUuid, newState)

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
                Logger.success("通知已${action}")
            } else {
                Logger.error("设置通知失败")
            }
        }
    }

    fun clearLogs() {
        Logger.clear()
    }

    fun selectOtaFile(uri: Uri, displayName: String, size: Long) {
        _otaState.value = _otaState.value.copy(
            fileUri = uri,
            fileName = displayName,
            fileSize = size,
            progressPercent = 0,
            sentBytes = 0,
            totalBytes = size,
            statusMessage = "已选择固件文件",
            isCompleted = false,
            errorMessage = null
        )
        Logger.info("选择 OTA 文件: $displayName (${size} bytes)")
    }

    fun startOtaTransfer() {
        val state = _otaState.value
        val fileUri = state.fileUri ?: run {
            _otaState.value = state.copy(errorMessage = "请先选择固件文件")
            return
        }
        val totalBytes = state.fileSize
        if (connectionState.value != ConnectionState.Connected) {
            _otaState.value = state.copy(errorMessage = "请先连接设备")
            return
        }
        if (totalBytes <= 0L) {
            _otaState.value = state.copy(errorMessage = "固件文件大小无效")
            return
        }

        viewModelScope.launch {
            try {
                _otaState.value = state.copy(
                    isInProgress = true,
                    isCompleted = false,
                    progressPercent = 0,
                    sentBytes = 0,
                    totalBytes = totalBytes,
                    statusMessage = "正在初始化 OTA...",
                    errorMessage = null
                )
                Logger.info("开始 OTA 传输")

                bleManager.requestMtu(deviceId, 247)
                bleManager.setNotification(
                    deviceId,
                    BleUuids.SERVICE_OTA,
                    BleUuids.CHARACTERISTIC_OTA_STATUS,
                    true
                )

                delay(200)

                val startPayload = """
                    {"action":"start","size":$totalBytes,"chunk_size":$OTA_CHUNK_SIZE,"firmware_version":"teaching-build"}
                """.trimIndent().toByteArray()

                val started = bleManager.writeCharacteristic(
                    deviceId,
                    BleUuids.SERVICE_OTA,
                    BleUuids.CHARACTERISTIC_OTA_CONTROL,
                    startPayload
                )
                if (!started) {
                    throw IllegalStateException("无法发送 OTA start 命令")
                }

                delay(200)

                val buffer = ByteArray(OTA_CHUNK_SIZE)
                var sent = 0L
                getApplication<Application>().contentResolver.openInputStream(fileUri)?.use { input ->
                    while (true) {
                        val read = input.read(buffer)
                        if (read <= 0) break

                        val chunk = if (read == buffer.size) buffer else buffer.copyOf(read)
                        val success = bleManager.writeCharacteristic(
                            deviceId,
                            BleUuids.SERVICE_OTA,
                            BleUuids.CHARACTERISTIC_OTA_DATA,
                            chunk
                        )
                        if (!success) {
                            throw IllegalStateException("第 ${(sent / OTA_CHUNK_SIZE) + 1} 个分包发送失败")
                        }

                        sent += read
                        val percent = ((sent * 100) / totalBytes).toInt().coerceIn(0, 99)
                        _otaState.value = _otaState.value.copy(
                            sentBytes = sent,
                            totalBytes = totalBytes,
                            progressPercent = percent,
                            statusMessage = "正在发送固件分包..."
                        )
                        delay(20)
                    }
                } ?: throw IllegalStateException("无法读取固件文件")

                val committed = bleManager.writeCharacteristic(
                    deviceId,
                    BleUuids.SERVICE_OTA,
                    BleUuids.CHARACTERISTIC_OTA_CONTROL,
                    """{"action":"commit"}""".toByteArray()
                )
                if (!committed) {
                    throw IllegalStateException("无法发送 OTA commit 命令")
                }

                _otaState.value = _otaState.value.copy(
                    sentBytes = totalBytes,
                    totalBytes = totalBytes,
                    progressPercent = 100,
                    statusMessage = "固件已发送，等待设备完成升级..."
                )
                Logger.info("OTA 固件已发送完成，等待设备确认")
            } catch (e: Exception) {
                _otaState.value = _otaState.value.copy(
                    isInProgress = false,
                    isCompleted = false,
                    statusMessage = "OTA 失败",
                    errorMessage = e.message ?: "未知错误"
                )
                Logger.error("OTA 失败: ${e.message}")
            }
        }
    }

    fun cancelOtaTransfer() {
        viewModelScope.launch {
            bleManager.writeCharacteristic(
                deviceId,
                BleUuids.SERVICE_OTA,
                BleUuids.CHARACTERISTIC_OTA_CONTROL,
                """{"action":"abort"}""".toByteArray()
            )
            _otaState.value = _otaState.value.copy(
                isInProgress = false,
                statusMessage = "已取消 OTA",
                errorMessage = null
            )
            Logger.info("已取消 OTA 传输")
        }
    }

    fun buildExportText(): String {
        val exportTime = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
        return buildDeviceExportText(
            deviceId = deviceId,
            deviceName = deviceName,
            connectionState = _connectionState.value,
            services = _services.value,
            logs = Logger.logs.value,
            exportTime = exportTime
        )
    }

    private fun handleOtaStatus(raw: ByteArray) {
        val payload = runCatching { String(raw) }.getOrNull() ?: return
        val transition = applyOtaStatusPayload(_otaState.value, payload) ?: return
        _otaState.value = transition.state
        if (transition.logMessage != null && transition.logType != null) {
            when (transition.logType) {
                LogType.Info -> Logger.info(transition.logMessage)
                LogType.Success -> Logger.success(transition.logMessage)
                LogType.Error -> Logger.error(transition.logMessage)
                else -> Logger.info(transition.logMessage)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
    }
}

private const val OTA_CHUNK_SIZE = 180

data class OtaUiState(
    val fileUri: Uri? = null,
    val fileName: String? = null,
    val fileSize: Long = 0,
    val isInProgress: Boolean = false,
    val isCompleted: Boolean = false,
    val sentBytes: Long = 0,
    val totalBytes: Long = 0,
    val progressPercent: Int = 0,
    val statusMessage: String = "未开始 OTA",
    val errorMessage: String? = null,
)
