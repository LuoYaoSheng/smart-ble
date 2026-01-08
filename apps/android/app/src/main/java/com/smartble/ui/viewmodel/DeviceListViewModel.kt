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
import kotlinx.coroutines.flow.combine
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

    // Filter state - aligned with UniApp reference
    private val _filterRSSI = MutableStateFlow(-100)  // -100 means show all
    val filterRSSI: StateFlow<Int> = _filterRSSI.asStateFlow()

    private val _filterNamePrefix = MutableStateFlow("")
    val filterNamePrefix: StateFlow<String> = _filterNamePrefix.asStateFlow()

    private val _hideUnnamed = MutableStateFlow(false)
    val hideUnnamed: StateFlow<Boolean> = _hideUnnamed.asStateFlow()

    // Filtered results - combines scan results with filter state
    private val _filteredScanResults = MutableStateFlow<List<BleDevice>>(emptyList())
    val filteredScanResults: StateFlow<List<BleDevice>> = _filteredScanResults.asStateFlow()

    init {
        observeBluetoothState()
        observeScanResults()
        observeConnectionState()
        observeFilters()
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

    // Apply filters whenever scan results or filter criteria change - aligned with UniApp
    private fun observeFilters() {
        viewModelScope.launch {
            combine(
                _scanResults,
                _filterRSSI,
                _filterNamePrefix,
                _hideUnnamed
            ) { results, rssi, namePrefix, hideUnnamed ->
                applyFilters(results, rssi, namePrefix, hideUnnamed)
            }.collect { filtered ->
                _filteredScanResults.value = filtered
            }
        }
    }

    private fun applyFilters(
        devices: List<BleDevice>,
        rssiThreshold: Int,
        namePrefix: String,
        hideUnnamed: Boolean
    ): List<BleDevice> {
        return devices.filter { device ->
            // RSSI filter - only filter if threshold > -100 (not "show all")
            if (rssiThreshold > -100 && device.rssi < rssiThreshold) {
                return@filter false
            }

            // Hide unnamed filter
            if (hideUnnamed && (device.name.isNullOrEmpty() || device.name == "Unknown Device")) {
                return@filter false
            }

            // Name prefix filter
            if (namePrefix.isNotEmpty()) {
                device.name?.startsWith(namePrefix, ignoreCase = true) != false
            } else {
                true
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

    // Filter methods - aligned with UniApp
    fun setFilterRSSI(value: Int) {
        _filterRSSI.value = value.coerceIn(-100, -30)
    }

    fun setFilterNamePrefix(value: String) {
        _filterNamePrefix.value = value
    }

    fun setHideUnnamed(value: Boolean) {
        _hideUnnamed.value = value
    }

    fun resetFilters() {
        _filterRSSI.value = -100
        _filterNamePrefix.value = ""
        _hideUnnamed.value = false
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
