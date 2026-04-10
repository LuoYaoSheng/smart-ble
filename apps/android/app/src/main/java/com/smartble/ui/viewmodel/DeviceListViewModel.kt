package com.smartble.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.smartble.core.ble.BleManager
import com.smartble.core.ble.BluetoothState
import com.smartble.core.model.BleDevice
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

/**
 * 设备列表 ViewModel
 */
class DeviceListViewModel(application: Application) : AndroidViewModel(application) {

    private val bleManager = BleManager.getInstance(application)

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

    // Connected devices - for ConnectedDevicesScreen
    private val _connectedDevices = MutableStateFlow<List<BleDevice>>(emptyList())
    val connectedDevices: StateFlow<List<BleDevice>> = _connectedDevices.asStateFlow()

    init {
        observeBluetoothState()
        observeScanResults()
        observeFilters()
        observeConnectedDevices()
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
                filterDevices(results, rssi, namePrefix, hideUnnamed)
            }.collect { filtered ->
                _filteredScanResults.value = filtered
            }
        }
    }

    private fun observeConnectedDevices() {
        viewModelScope.launch {
            bleManager.connectionStates.collect { states ->
                val connected = states
                    .filter { it.value == com.smartble.core.model.ConnectionState.Connected }
                    .keys
                val devices = connected.map { deviceId ->
                    _scanResults.value.find { it.id == deviceId }
                        ?: BleDevice(
                            id = deviceId,
                            name = "",
                            rssi = 0,
                            state = com.smartble.core.model.ConnectionState.Connected
                        )
                }
                _connectedDevices.value = devices
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

    fun disconnectDevice(deviceId: String) {
        bleManager.disconnect(deviceId)
    }

    fun disconnectAll() {
        bleManager.disconnectAll()
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
