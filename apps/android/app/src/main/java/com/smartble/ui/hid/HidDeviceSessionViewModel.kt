package com.smartble.ui.hid

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.smartble.core.ble.BleManager
import com.smartble.core.profile.DiagnosticsSnapshot
import com.smartble.core.profile.HidProvisionController
import com.smartble.core.profile.HidProvisionTransport
import com.smartble.core.profile.BleManagerHidTransport
import com.smartble.core.profile.ProvisionUiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/*
 * Smart HID 页面会话 ViewModel（MAC-005 · P002/P003/P005 共用底座）。
 *
 * - P002 配网页：[startConnect] → Configure 表单 → [submit]（表单值来自
 *   [form]；敏感字段仅内存，[onCleared] 统一清空并释放控制器）。
 * - P003 详情 / P005 诊断：复用控制器的 connect + 读特征能力
 *   （[readSnapshot] = runDiagnostics 最小真实投影）。
 * - 恢复动作由页面层消费 controller.state.failure.recovery +
 *   HidRecovery.navFor，VM 不自带第二套映射。
 */

open class HidDeviceSessionViewModel(
    application: Application,
    private val deviceId: String,
    private val deviceName: String,
) : AndroidViewModel(application) {

    private val bleManager: BleManager = BleManager.getInstance(application)

    val form = ProvisionFormState()

    private val controller: HidProvisionController = HidProvisionController(
        transportFactory = {
            BleManagerHidTransport(
                bleManager = bleManager,
                deviceId = deviceId,
                scope = viewModelScope,
            ) as HidProvisionTransport
        },
        scope = viewModelScope,
    )

    val state: StateFlow<ProvisionUiState> = controller.state

    private val _snapshot = MutableStateFlow<DiagnosticsSnapshot?>(null)
    val snapshot: StateFlow<DiagnosticsSnapshot?> = _snapshot.asStateFlow()

    private val _snapshotError = MutableStateFlow<String?>(null)
    val snapshotError: StateFlow<String?> = _snapshotError.asStateFlow()

    private val _submitError = MutableStateFlow<String?>(null)
    val submitError: StateFlow<String?> = _submitError.asStateFlow()

    fun startConnect() {
        viewModelScope.launch {
            try {
                controller.connectDevice(deviceId)
            } catch (e: Exception) {
                // 连接失败由 state.connError 呈现（控制器写入），此处兜底不吞异常语义。
            }
        }
    }

    fun submitForm() {
        viewModelScope.launch {
            try {
                _submitError.value = null
                controller.submit(
                    wifiSsid = form.wifiSsid,
                    wifiPassword = form.wifiPassword,
                    hubHost = form.hubHost,
                    hubPort = form.hubPort.toIntOrNull(),
                    token = form.pairingToken,
                )
            } catch (e: Exception) {
                _submitError.value = e.message ?: "配置下发失败"
            }
        }
    }

    fun backToForm() = controller.backToForm()

    fun cancelWait() = controller.cancelWait()

    fun retrySubmit() = submitForm()

    fun reconnect() = startConnect()

    /** P003/P005：读取 device info + status 原始投影。 */
    fun readSnapshot() {
        viewModelScope.launch {
            try {
                _snapshotError.value = null
                _snapshot.value = controller.runDiagnostics()
            } catch (e: Exception) {
                _snapshotError.value = e.message ?: "读取设备数据失败"
            }
        }
    }

    override fun onCleared() {
        // F023 红线：离开页面清空敏感表单值，再释放 BLE 会话。
        form.clearAll()
        controller.dispose()
    }
}
