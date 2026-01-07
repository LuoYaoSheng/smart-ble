package com.smartble.ui.viewmodel

import android.app.Application
import android.text.TextUtils
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.smartble.core.ble.BlePeripheralManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * 广播页面 ViewModel
 */
class BroadcastViewModel(application: Application) : AndroidViewModel(application) {

    private val peripheralManager = BlePeripheralManager(application)

    // UUID 输入
    private val _uuidInput = MutableStateFlow("0000FFF0-0000-1000-8000-00805F9B34FB")
    val uuidInput: StateFlow<String> = _uuidInput.asStateFlow()

    // 是否正在广播
    val isAdvertising = peripheralManager.isAdvertising

    // 是否支持广播
    val isAdvertisingSupported: Boolean
        get() = peripheralManager.isAdvertisingSupported

    // 错误消息
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // 状态消息
    private val _statusMessage = MutableStateFlow("未广播")
    val statusMessage: StateFlow<String> = _statusMessage.asStateFlow()

    /**
     * 更新 UUID 输入
     */
    fun updateUuid(uuid: String) {
        _uuidInput.value = uuid
        _errorMessage.value = null
    }

    /**
     * 验证 UUID 格式
     */
    private fun isValidUuid(uuid: String): Boolean {
        return try {
            UUID.fromString(uuid)
            true
        } catch (e: IllegalArgumentException) {
            false
        }
    }

    /**
     * 切换广播状态
     */
    fun toggleAdvertising() {
        viewModelScope.launch {
            if (isAdvertising.value) {
                stopAdvertising()
            } else {
                startAdvertising()
            }
        }
    }

    /**
     * 开始广播
     */
    private fun startAdvertising() {
        val uuid = _uuidInput.value.trim()

        if (uuid.isEmpty()) {
            _errorMessage.value = "请输入服务UUID"
            return
        }

        if (!isValidUuid(uuid)) {
            _errorMessage.value = "UUID 格式不正确"
            return
        }

        _errorMessage.value = null

        peripheralManager.startAdvertising(uuid) { success ->
            if (success) {
                _statusMessage.value = "正在广播"
            } else {
                _errorMessage.value = "启动广播失败"
            }
        }
    }

    /**
     * 停止广播
     */
    private fun stopAdvertising() {
        peripheralManager.stopAdvertising()
        _statusMessage.value = "未广播"
    }

    /**
     * 清除错误消息
     */
    fun clearError() {
        _errorMessage.value = null
    }

    override fun onCleared() {
        super.onCleared()
        peripheralManager.release()
    }
}
