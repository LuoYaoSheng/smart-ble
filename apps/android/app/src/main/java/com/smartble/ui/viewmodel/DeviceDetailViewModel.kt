package com.smartble.ui.viewmodel

import android.app.Application
import android.net.Uri
import android.provider.OpenableColumns
import com.smartble.core.ota.BleManagerOtaTransport
import com.smartble.core.ota.OtaEngine
import com.smartble.core.ota.OtaPackage
import com.smartble.core.ota.OtaPhase
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.withContext
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.smartble.core.ble.BleManager
import com.smartble.core.ble.CharacteristicChangeKind
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

    // 必须在 init 之前初始化：viewModelScope 走 Main.immediate，observeServices
    // 的首个 StateFlow 发射会在构造期间同步执行（4c9d31a 连接即崩根因）。
    private var lastAnnouncedServiceUuids: Set<String>? = emptySet()

    private val _connectionState = MutableStateFlow(ConnectionState.Disconnected)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _services = MutableStateFlow<List<BleService>>(emptyList())
    val services: StateFlow<List<BleService>> = _services.asStateFlow()

    val logs: StateFlow<List<LogEntry>> = Logger.logs

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _otaState = MutableStateFlow(OtaUiState())
    val otaState: StateFlow<OtaUiState> = _otaState.asStateFlow()
    private var otaPackage: OtaPackage? = null
    private var otaJob: Job? = null

    init {
        observeConnectionState()
        observeServices()
        observeCharacteristicChanges()
        viewModelScope.launch {
            bleManager.operationFailures.collect { event ->
                if (event.deviceId == deviceId) Logger.error(event.message)
            }
        }
        connectToDevice()
    }

    private fun observeConnectionState() {
        viewModelScope.launch {
            bleManager.connectionState(deviceId).collect { state ->
                _connectionState.value = state
                _isLoading.value = state == ConnectionState.Connecting || state == ConnectionState.Disconnecting
                // 服务发现由 BleManager 串行编排（requestMtu→onMtuChanged→discover，
                // WIN-AAND-006）；这里不再并发补发，避免 GATT 操作互斥失败
            }
        }
    }

    private fun observeServices() {
        viewModelScope.launch {
            bleManager.services(deviceId).collect { serviceList ->
                _services.value = serviceList
                // WIN-AAND-007：读/写/notify 的特征值更新同样重放本流，
                // 「发现 N 个服务」只在服务 UUID 集合真正变化时播报一次
                if (shouldAnnounceServices(lastAnnouncedServiceUuids, serviceList)) {
                    _isLoading.value = false
                    Logger.info("发现 ${serviceList.size} 个服务")
                    lastAnnouncedServiceUuids = serviceList.map { it.uuid }.toSet()
                }
            }
        }
    }

    private fun observeCharacteristicChanges() {
        viewModelScope.launch {
            bleManager.characteristicChanges.collect { event ->
                if (event.deviceId != deviceId) return@collect
                val hex = DataConverter.bytesToHex(event.value)
                // WIN-AAND-004：读值与通知同样进入日志（按 kind 区分呈现）；
                // W3：带响应写完成同流（配网分帧逐帧确认），按发送方向呈现
                when (event.kind) {
                    CharacteristicChangeKind.Read -> Logger.receive("读取结果: $hex")
                    CharacteristicChangeKind.Write -> Logger.send("写入完成: $hex")
                    CharacteristicChangeKind.Notify -> Logger.receive("收到通知: $hex")
                }
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

    /** P006 devhead「连接设备」：断开后手动重连 */
    fun connect() {
        _errorMessage.value = null
        _isLoading.value = true
        connectToDevice()
    }

    fun disconnect() {
        cancelOtaTransfer()
        Logger.info("断开连接")
        bleManager.disconnect(deviceId)
    }

    fun readCharacteristic(serviceUuid: String, characteristicUuid: String) {
        if (_otaState.value.isInProgress) { Logger.warning("OTA 占用设备操作，请等待清理完成"); return }
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
        if (_otaState.value.isInProgress) { Logger.warning("OTA 占用设备操作，请等待清理完成"); return }
        viewModelScope.launch {
            val service = _services.value.find { it.uuid == serviceUuid }
            val characteristic = service?.characteristics?.find { it.uuid == characteristicUuid }

            Logger.info("写入 ${characteristic?.displayName ?: characteristicUuid}: ${DataConverter.bytesToHex(data)}")

            val success = bleManager.writeCharacteristic(deviceId, serviceUuid, characteristicUuid, data)
            if (success) {
                Logger.info("写入已提交，等待设备回执")
            } else {
                Logger.error("写入失败")
            }
        }
    }

    fun toggleNotification(serviceUuid: String, characteristicUuid: String) {
        if (_otaState.value.isInProgress) { Logger.warning("OTA 占用设备操作，请等待清理完成"); return }
        viewModelScope.launch {
            val service = _services.value.find { it.uuid == serviceUuid }
            val characteristic = service?.characteristics?.find { it.uuid == characteristicUuid }

            val newState = !(characteristic?.isNotifying ?: false)
            val action = if (newState) "启用" else "禁用"

            Logger.info("$action 通知 ${characteristic?.displayName ?: characteristicUuid}...")

            val success = bleManager.setNotificationAwait(deviceId, serviceUuid, characteristicUuid, newState)

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

    fun selectOtaFiles(uris: List<Uri>) {
        if (_otaState.value.isInProgress || otaJob?.isActive == true) return
        otaPackage = null
        _otaState.value = OtaUiState(statusMessage = "正在校验固件与 manifest.json")
        otaJob = viewModelScope.launch {
            try {
                val selected = withContext(Dispatchers.IO) {
                    require(uris.size == 2) { "请同时选择 .bin 和 manifest.json" }
                    val resolver = getApplication<Application>().contentResolver
                    fun name(uri: Uri): String = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                        if (cursor.moveToFirst()) cursor.getString(cursor.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME)) else null
                    } ?: error("无法读取所选文件名称")
                    val names = uris.associateWith { name(it) }
                    val bin = names.entries.singleOrNull { it.value.endsWith(".bin", ignoreCase = true) } ?: error("请选择一个 .bin 应用镜像")
                    val manifest = names.entries.singleOrNull { it.value == "manifest.json" } ?: error("请选择对应的 manifest.json")
                    fun read(uri: Uri, limit: Int) = resolver.openInputStream(uri)?.use { OtaPackage.readBounded(it, limit) } ?: error("无法读取所选文件")
                    val pkg = OtaPackage.validate(read(bin.key, OtaPackage.MAX_FIRMWARE_SIZE), read(manifest.key, 64 * 1024).toString(Charsets.UTF_8))
                    Triple(bin.key, bin.value, pkg)
                }
                otaPackage = selected.third
                _otaState.value = OtaUiState(fileUri = selected.first, fileName = selected.second,
                    fileSize = selected.third.size.toLong(), totalBytes = selected.third.size.toLong(),
                    statusMessage = "已校验 ${selected.third.target} / ${selected.third.hardware} / ${selected.third.version}")
            } catch (error: CancellationException) { throw error }
            catch (error: Exception) { _otaState.value = OtaUiState(errorMessage = "固件包校验失败：${error.message}") }
        }
    }

    fun startOtaTransfer() {
        val pkg = otaPackage ?: return
        if (_otaState.value.isInProgress || otaJob?.isActive == true) return
        if (connectionState.value != ConnectionState.Connected) {
            _otaState.value = _otaState.value.copy(errorMessage = "请先连接设备")
            return
        }
        _otaState.value = _otaState.value.copy(isInProgress = true, isCompleted = false, errorMessage = null, progressPercent = 0, sentBytes = 0)
        otaJob = viewModelScope.launch {
            try {
                OtaEngine().run(BleManagerOtaTransport(bleManager, deviceId), pkg) { value ->
                    val message = when (value.phase) {
                        OtaPhase.Checking -> "正在核对设备型号、硬件及运行版本"
                        OtaPhase.Subscribing -> "正在开启 OTA 状态通知"
                        OtaPhase.WaitingReady -> "等待设备擦除分区并就绪"
                        OtaPhase.Transferring -> "正在发送固件"
                        OtaPhase.Committing -> "等待设备校验并提交固件"
                        OtaPhase.WaitingReboot -> "固件已提交，等待设备真实重启"
                        OtaPhase.Verifying -> "正在重连并核对运行固件版本"
                        OtaPhase.Success -> "OTA 升级成功，运行版本已核实"
                    }
                    _otaState.value = _otaState.value.copy(sentBytes = value.sent.toLong(), totalBytes = value.total.toLong(),
                        progressPercent = value.percent, statusMessage = message, isCompleted = value.phase == OtaPhase.Success)
                }
            } catch (error: CancellationException) {
                _otaState.value = _otaState.value.copy(isCompleted = false, statusMessage = "已停止升级跟踪，已尝试取消；设备结果请重连核实")
                throw error
            } catch (error: Exception) {
                _otaState.value = _otaState.value.copy(isCompleted = false, statusMessage = "OTA 失败，已尝试中止设备事务", errorMessage = error.message ?: "未确认升级完成")
                Logger.error("OTA 失败：${error.message}")
            } finally { _otaState.value = _otaState.value.copy(isInProgress = false) }
        }
    }

    fun cancelOtaTransfer() { otaJob?.cancel() }

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

}

/**
 * WIN-AAND-007：服务列表播报判定——仅当服务 UUID 集合真正变化（首次发现/
 * 重新发现后集合不同）时播报；特征值更新（读/写/notify 重放同集合）不播报。
 * lastUuids 可空：null = 无历史（首次）→ 非空集合即播报。可空是构造序防御——
 * viewModelScope 为 Main.immediate，collector 首个发射可能在属性初始化前同步执行。
 */
internal fun shouldAnnounceServices(lastUuids: Set<String>?, next: List<BleService>): Boolean {
    val nextUuids = next.map { it.uuid }.toSet()
    if (nextUuids.isEmpty()) return false
    val last = lastUuids ?: return true
    return nextUuids != last
}

data class OtaUiState(
    val fileUri: Uri? = null,
    val fileName: String? = null,
    val fileSize: Long = 0,
    val isInProgress: Boolean = false,
    val isCompleted: Boolean = false,
    val sentBytes: Long = 0,
    val totalBytes: Long = 0,
    val progressPercent: Int = 0,
    val statusMessage: String = "请选择 .bin 和 manifest.json；OTA 尚未完成真实设备验证",
    val errorMessage: String? = null,
)
