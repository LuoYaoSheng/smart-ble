package com.smartble.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.smartble.core.ble.BlePeripheralManager
import com.smartble.core.model.LogEntry
import com.smartble.core.model.LogType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * P008 广播页 ViewModel（对齐 flutter broadcast_page 口径）：
 * 表单五字段 + 31B 预算 + UUID 4/8/36 位校验 + 检查支持 + 操作日志。
 */
class BroadcastViewModel(application: Application) : AndroidViewModel(application) {

    private val peripheralManager = BlePeripheralManager(application)
    private val timeFmt = SimpleDateFormat("HH:mm:ss", Locale.US)

    // 表单字段（默认值与 flutter 一致）
    private val _nameInput = MutableStateFlow("BLE Toolkit+")
    val nameInput: StateFlow<String> = _nameInput.asStateFlow()

    private val _uuidInput = MutableStateFlow("FFF0")
    val uuidInput: StateFlow<String> = _uuidInput.asStateFlow()

    private val _mfrIdInput = MutableStateFlow("0001")
    val mfrIdInput: StateFlow<String> = _mfrIdInput.asStateFlow()

    private val _mfrDataInput = MutableStateFlow("BLE")
    val mfrDataInput: StateFlow<String> = _mfrDataInput.asStateFlow()

    // 是否正在广播
    val isAdvertising = peripheralManager.isAdvertising

    // 是否已执行「检查支持」（badge 口径：未检查=未就绪）
    private val _checked = MutableStateFlow(false)
    val checked: StateFlow<Boolean> = _checked.asStateFlow()

    // 运行时是否支持（检查结果）
    private val _runtimeSupported = MutableStateFlow(true)
    val runtimeSupported: StateFlow<Boolean> = _runtimeSupported.asStateFlow()

    // 已停止（曾广播后停止；badge 口径：已停止 dim）
    private val _stopped = MutableStateFlow(false)
    val stopped: StateFlow<Boolean> = _stopped.asStateFlow()

    val isAdvertisingSupported: Boolean
        get() = peripheralManager.isAdvertisingSupported

    // 错误消息（P008 note：广播失败）
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // 操作日志（C5 logPanel cardv）
    private val _logs = MutableStateFlow<List<LogEntry>>(emptyList())
    val logs: StateFlow<List<LogEntry>> = _logs.asStateFlow()

    private fun log(type: LogType, message: String) {
        _logs.value = _logs.value + LogEntry(message = message, type = type, timestamp = timeFmt.format(Date()))
    }

    fun updateName(value: String) { if (value.length <= 20) _nameInput.value = value }
    fun updateUuid(value: String) { if (value.length <= 36) { _uuidInput.value = value.trim(); _errorMessage.value = null } }
    fun updateMfrId(value: String) { if (value.length <= 4) _mfrIdInput.value = value.trim() }
    fun updateMfrData(value: String) { if (value.length <= 26) _mfrDataInput.value = value }

    /** UUID 需为 4 / 8 / 36 位十六进制（非空才判错） */
    val uuidInvalid: Boolean
        get() = _uuidInput.value.isNotEmpty() && normalizeServiceUuid(_uuidInput.value) == null

    /** 4 / 8 / 36 位 HEX → 128 位 UUID */
    fun normalizeServiceUuid(input: String): String? {
        val v = input.lowercase()
        val hex = Regex("^[0-9a-f]+$")
        return when {
            v.length == 4 && v.matches(hex) -> "0000$v-0000-1000-8000-00805f9b34fb"
            v.length == 8 && v.matches(hex) -> "$v-0000-1000-8000-00805f9b34fb"
            v.length == 36 && v.matches(Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")) -> v
            else -> null
        }
    }

    /** ADV 负载预算（P008 F016）：name 2+len / uuid 2+len/2 / mfr 4+len */
    data class AdvBytes(val name: Int, val uuid: Int, val mfr: Int) {
        val total: Int get() = name + uuid + mfr
    }

    val advBytes: AdvBytes
        get() {
            val name = if (_nameInput.value.isNotEmpty()) 2 + _nameInput.value.length else 0
            val uuid = _uuidInput.value.let { if (it.isNotEmpty()) 2 + it.length / 2 else 0 }
            val mfr = if (_mfrIdInput.value.isNotEmpty() || _mfrDataInput.value.isNotEmpty()) {
                4 + _mfrDataInput.value.length
            } else 0
            return AdvBytes(name, uuid, mfr)
        }

    val overBudget: Boolean get() = advBytes.total > 31

    fun toggleAdvertising() {
        viewModelScope.launch {
            if (isAdvertising.value) stopAdvertising() else startAdvertising()
        }
    }

    private fun startAdvertising() {
        val uuidRaw = _uuidInput.value.trim()
        if (uuidRaw.isEmpty()) {
            _errorMessage.value = "请输入服务 UUID"
            log(LogType.Error, "启动被拦截：服务 UUID 为空")
            return
        }
        val uuid = normalizeServiceUuid(uuidRaw)
        if (uuid == null) {
            _errorMessage.value = "UUID 需为 4 / 8 / 36 位十六进制"
            log(LogType.Error, "启动被拦截：UUID 格式无效")
            return
        }
        if (overBudget) {
            _errorMessage.value = "广播数据超限：当前 ${advBytes.total} 字节，BLE 最多支持 31 字节"
            log(LogType.Error, "启动被拦截：ADV 负载 ${advBytes.total}B 超 31B 预算")
            return
        }
        _errorMessage.value = null

        val mfrId = _mfrIdInput.value.toIntOrNull(16)
        val mfrData = _mfrDataInput.value.toByteArray()
        log(LogType.Info, "开始广播…")

        peripheralManager.startAdvertising(
            serviceUuid = uuid,
            manufacturerId = if (_mfrIdInput.value.isEmpty()) null else mfrId,
            manufacturerData = if (_mfrIdInput.value.isEmpty()) null else mfrData,
            includeDeviceName = _nameInput.value.isNotEmpty(),
        ) { success ->
            if (success) {
                _checked.value = true
                _runtimeSupported.value = true
                _stopped.value = false
                log(LogType.Success, "广播已开启（${advBytes.total}B / 31B）")
            } else {
                _errorMessage.value = "启动广播失败"
                log(LogType.Error, "启动广播失败")
            }
        }
    }

    private fun stopAdvertising() {
        peripheralManager.stopAdvertising()
        _stopped.value = true
        log(LogType.Info, "已停止广播")
    }

    /** 检查支持（badge：已就绪 / 不支持） */
    fun checkSupport() {
        val supported = peripheralManager.isAdvertisingSupported
        _checked.value = true
        _runtimeSupported.value = supported
        if (supported) {
            log(LogType.Success, "设备支持低功耗蓝牙广播")
        } else {
            log(LogType.Error, "设备不支持低功耗蓝牙广播")
        }
    }

    fun clearLogs() {
        _logs.value = emptyList()
    }

    fun clearError() {
        _errorMessage.value = null
    }

    override fun onCleared() {
        super.onCleared()
        peripheralManager.release()
    }
}
