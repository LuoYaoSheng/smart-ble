package com.smartble.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.smartble.core.ble.BleManager
import com.smartble.core.ble.BluetoothState
import com.smartble.core.model.BleDevice
import com.smartble.core.model.ConnectionState
import com.smartble.core.model.ScanResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * 设备列表 ViewModel
 */
class DeviceListViewModel(application: Application) : AndroidViewModel(application) {

    private val bleManager = BleManager(application)

    // UI State
    private val _uiState = MutableStateFlow<DeviceListUiState>(DeviceListUiState.Initializing)
    val uiState: StateFlow<DeviceListUiState> = _uiState.asStateFlow()

    private val _scanResults = MutableStateFlow<List<BleDevice>>(emptyList())
    val scanResults: StateFlow<List<BleDevice>> = _scanResults.asStateFlow()

    private val _isScanning = MutableStateFlow(false)
    val isScanning: StateFlow<Boolean> = _isScanning.asStateFlow()

    private val _bluetoothState = MutableStateFlow<BluetoothState?>(null)
    val bluetoothState: StateFlow<BluetoothState?> = _bluetoothState.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _connectedDevice = MutableStateFlow<BleDevice?>(null)
    val connectedDevice: StateFlow<BleDevice?> = _connectedDevice.asStateFlow()

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    init {
        observeBluetoothState()
        observeScanResults()
        observeConnectionState()
    }

    private fun observeBluetoothState() {
        _bluetoothState.value = bleManager.bluetoothState
        updateUiState()

        if (bleManager.bluetoothState != BluetoothState.On) {
            _errorMessage.value = "蓝牙未开启"
        }
    }

    private fun observeScanResults() {
        viewModelScope.launch {
            bleManager.scanResults.collect { results ->
                _scanResults.value = results.map { it.device }
            }
        }

        viewModelScope.launch {
            bleManager.isScanning.collect { scanning ->
                _isScanning.value = scanning
            }
        }
    }

    private fun observeConnectionState() {
        viewModelScope.launch {
            bleManager.connectionState.collect { state ->
                _connectionState.value = state
                when (state) {
                    ConnectionState.Connected -> {
                        // Connected state will be handled by DeviceDetailViewModel
                    }
                    ConnectionState.Disconnected -> {
                        _connectedDevice.value = null
                    }
                    else -> {}
                }
            }
        }
    }

    fun startScan() {
        if (bleManager.bluetoothState != BluetoothState.On) {
            _errorMessage.value = "蓝牙未开启"
            return
        }

        _errorMessage.value = null
        bleManager.startScan()
    }

    fun stopScan() {
        bleManager.stopScan()
    }

    fun toggleScan() {
        if (_isScanning.value) {
            stopScan()
        } else {
            startScan()
        }
    }

    fun connect(deviceId: String): Boolean {
        _errorMessage.value = null
        val success = bleManager.connect(deviceId)
        if (!success) {
            _errorMessage.value = "连接失败"
        }
        return success
    }

    fun enableBluetooth() {
        bleManager.enableBluetooth()
        _bluetoothState.value = bleManager.bluetoothState
        updateUiState()
    }

    fun clearError() {
        _errorMessage.value = null
    }

    private fun updateUiState() {
        _uiState.value = when (bleManager.bluetoothState) {
            BluetoothState.On -> DeviceListUiState.Ready
            BluetoothState.Off -> DeviceListUiState.BluetoothOff
            BluetoothState.Unavailable -> DeviceListUiState.BluetoothUnavailable
            else -> DeviceListUiState.BluetoothUnauthorized
        }
    }

    override fun onCleared() {
        super.onCleared()
        bleManager.release()
    }
}

/**
 * 设备列表 UI 状态
 */
sealed class DeviceListUiState {
    object Initializing : DeviceListUiState()
    object Ready : DeviceListUiState()
    object BluetoothOff : DeviceListUiState()
    object BluetoothUnavailable : DeviceListUiState()
    object BluetoothUnauthorized : DeviceListUiState()
}
