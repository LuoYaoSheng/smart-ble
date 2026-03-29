package com.smartble.core.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult as LeScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Build
import android.os.ParcelUuid
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.smartble.core.model.BleCharacteristic
import com.smartble.core.model.BleDevice
import com.smartble.core.model.BleService
import com.smartble.core.model.ConnectionState
import com.smartble.core.model.Property
import com.smartble.core.model.ScanRecord
import com.smartble.core.model.ScanResult
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import java.util.UUID

/**
 * BLE 管理器
 */
class BleManager private constructor(private val context: Context) {

    companion object {
        private const val TAG = "BleManager"

        // CCC Descriptor UUID
        private val CCC_DESCRIPTOR_UUID = UUID.fromString("00002902-0000-1000-8000-00805F9B34FB")

        // Auto-stop scan duration - aligned with UniApp (5 seconds)
        private const val AUTO_STOP_SCAN_DURATION_MS = 5000L

        // Auto reconnect policy
        private const val AUTO_RECONNECT_DELAY_MS = 2000L
        private const val MAX_AUTO_RECONNECT_ATTEMPTS = 3

        @Volatile
        private var instance: BleManager? = null

        fun getInstance(context: Context): BleManager {
            return instance ?: synchronized(this) {
                instance ?: BleManager(context.applicationContext).also { instance = it }
            }
        }
    }

    private val bluetoothManager: BluetoothManager =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager.adapter
    private val bluetoothLeScanner: BluetoothLeScanner? = bluetoothAdapter?.bluetoothLeScanner

    private val gattConnections = mutableMapOf<String, BluetoothGatt>()

    // Auto-stop scan timer - aligned with UniApp behavior
    private val autoStopHandler = Handler(Looper.getMainLooper())
    private var autoStopRunnable: Runnable? = null

    // Auto reconnect state
    private val reconnectHandler = Handler(Looper.getMainLooper())
    private val reconnectRunnables = mutableMapOf<String, Runnable>()
    private val reconnectAttempts = mutableMapOf<String, Int>()
    private val autoReconnectEnabled = mutableSetOf<String>()
    private val userInitiatedDisconnects = mutableSetOf<String>()

    // State flows
    private val _scanResults = MutableSharedFlow<List<ScanResult>>(replay = 1)
    val scanResults: Flow<List<ScanResult>> = _scanResults.asSharedFlow()

    private val _isScanning = MutableStateFlow(false)
    val isScanning: Flow<Boolean> = _isScanning.asStateFlow()

    private val _connectionStates = MutableStateFlow<Map<String, ConnectionState>>(emptyMap())
    val connectionStates: Flow<Map<String, ConnectionState>> = _connectionStates.asStateFlow()

    private val _servicesByDevice = MutableStateFlow<Map<String, List<BleService>>>(emptyMap())
    val servicesByDevice: Flow<Map<String, List<BleService>>> = _servicesByDevice.asStateFlow()

    private val _characteristicChanges = MutableSharedFlow<CharacteristicChangeEvent>()
    val characteristicChanges: Flow<CharacteristicChangeEvent> = _characteristicChanges.asSharedFlow()

    // Scan result storage
    private val scanResultsMap = mutableMapOf<String, ScanResult>()

    /**
     * 获取蓝牙状态
     */
    val bluetoothState: BluetoothState
        get() = when {
            bluetoothAdapter == null -> BluetoothState.Unavailable
            bluetoothAdapter.isEnabled -> BluetoothState.On
            else -> BluetoothState.Off
        }

    /**
     * 启用蓝牙
     */
    @Suppress("DEPRECATION")
    fun enableBluetooth(): Boolean {
        return bluetoothAdapter?.enable() ?: false
    }

    /**
     * 开始扫描
     */
    @SuppressLint("MissingPermission")
    fun startScan(serviceUuids: List<UUID>? = null) {
        val scanner = bluetoothLeScanner ?: run {
            Log.e(TAG, "BluetoothLeScanner not available")
            return
        }

        if (_isScanning.value) {
            Log.w(TAG, "Already scanning")
            return
        }

        scanResultsMap.clear()

        val scanSettings = ScanSettings.Builder().apply {
            setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                setMatchMode(ScanSettings.MATCH_MODE_AGGRESSIVE)
            }
        }.build()

        val filters = buildList {
            if (serviceUuids != null) {
                serviceUuids.forEach { uuid ->
                    add(ScanFilter.Builder().setServiceUuid(ParcelUuid(uuid)).build())
                }
            }
        }

        try {
            scanner.startScan(filters, scanSettings, scanCallback)
            _isScanning.value = true
            _scanResults.tryEmit(emptyList())
            Log.i(TAG, "Scan started")

            // Auto-stop scan after 5 seconds - aligned with UniApp
            scheduleAutoStopScan()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start scan", e)
        }
    }

    /**
     * 停止扫描
     */
    @SuppressLint("MissingPermission")
    fun stopScan() {
        val scanner = bluetoothLeScanner ?: return

        // Cancel auto-stop timer
        cancelAutoStopScan()

        if (!_isScanning.value) {
            return
        }

        try {
            scanner.stopScan(scanCallback)
            _isScanning.value = false
            Log.i(TAG, "Scan stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop scan", e)
        }
    }

    /**
     * 安排自动停止扫描（5秒后）- 与 UniApp 对齐
     */
    private fun scheduleAutoStopScan() {
        cancelAutoStopScan()
        autoStopRunnable = Runnable {
            if (_isScanning.value) {
                stopScan()
                Log.i(TAG, "Auto-stop scan after ${AUTO_STOP_SCAN_DURATION_MS}ms")
            }
        }
        autoStopRunnable?.let {
            autoStopHandler.postDelayed(it, AUTO_STOP_SCAN_DURATION_MS)
        }
    }

    /**
     * 取消自动停止扫描
     */
    private fun cancelAutoStopScan() {
        autoStopRunnable?.let {
            autoStopHandler.removeCallbacks(it)
        }
        autoStopRunnable = null
    }

    /**
     * 连接设备
     */
    @SuppressLint("MissingPermission")
    fun connect(deviceId: String): Boolean {
        reconnectAttempts[deviceId] = 0
        autoReconnectEnabled.add(deviceId)
        userInitiatedDisconnects.remove(deviceId)
        cancelAutoReconnect(deviceId)
        return connectInternal(deviceId)
    }

    @SuppressLint("MissingPermission")
    private fun connectInternal(deviceId: String): Boolean {
        when (currentConnectionState(deviceId)) {
            ConnectionState.Connected,
            ConnectionState.Connecting -> return true
            else -> {}
        }

        val device = bluetoothAdapter?.getRemoteDevice(deviceId) ?: run {
            Log.e(TAG, "Device not found: $deviceId")
            return false
        }

        gattConnections.remove(deviceId)?.let { existingGatt ->
            existingGatt.disconnect()
            existingGatt.close()
        }

        updateConnectionState(deviceId, ConnectionState.Connecting)

        val gatt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
        } else {
            device.connectGatt(context, false, gattCallback)
        }
        gattConnections[deviceId] = gatt

        Log.i(TAG, "Connecting to ${device.address}")
        return true
    }

    /**
     * 断开连接
     */
    @SuppressLint("MissingPermission")
    fun disconnect(deviceId: String) {
        userInitiatedDisconnects.add(deviceId)
        disableAutoReconnect(deviceId)
        gattConnections[deviceId]?.disconnect()
        gattConnections[deviceId]?.close()
        gattConnections.remove(deviceId)
        updateConnectionState(deviceId, ConnectionState.Disconnected)
        updateServices(deviceId, emptyList())
    }

    /**
     * 发现服务
     */
    @SuppressLint("MissingPermission")
    fun discoverServices(deviceId: String): Boolean {
        return gattConnections[deviceId]?.discoverServices() ?: false
    }

    /**
     * 读取特征值
     */
    @SuppressLint("MissingPermission")
    fun readCharacteristic(deviceId: String, serviceUuid: String, characteristicUuid: String): Boolean {
        val gatt = gattConnections[deviceId] ?: return false
        val characteristic = getCharacteristic(gatt, serviceUuid, characteristicUuid) ?: return false

        return gatt.readCharacteristic(characteristic)
    }

    /**
     * 写入特征值
     */
    @SuppressLint("MissingPermission")
    @Suppress("DEPRECATION")
    fun writeCharacteristic(deviceId: String, serviceUuid: String, characteristicUuid: String, value: ByteArray): Boolean {
        val gatt = gattConnections[deviceId] ?: return false
        val characteristic = getCharacteristic(gatt, serviceUuid, characteristicUuid) ?: return false

        characteristic.value = value

        val writeType = when {
            characteristic.properties and BluetoothGattCharacteristic.PROPERTY_WRITE != 0 -> {
                BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
            }
            characteristic.properties and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE != 0 -> {
                BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
            }
            else -> return false
        }

        characteristic.writeType = writeType

        return gatt.writeCharacteristic(characteristic)
    }

    /**
     * 设置通知
     */
    @SuppressLint("MissingPermission")
    @Suppress("DEPRECATION")
    fun setNotification(deviceId: String, serviceUuid: String, characteristicUuid: String, enable: Boolean): Boolean {
        val gatt = gattConnections[deviceId] ?: return false
        val characteristic = getCharacteristic(gatt, serviceUuid, characteristicUuid) ?: return false

        if (!gatt.setCharacteristicNotification(characteristic, enable)) {
            return false
        }

        // 写入 CCC Descriptor
        val descriptor = characteristic.getDescriptor(CCC_DESCRIPTOR_UUID) ?: return false
        descriptor.value = if (enable) {
            BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
        } else {
            BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
        }

        return gatt.writeDescriptor(descriptor)
    }

    /**
     * 读取 RSSI
     */
    @SuppressLint("MissingPermission")
    fun readRemoteRssi(deviceId: String): Boolean {
        return gattConnections[deviceId]?.readRemoteRssi() ?: false
    }

    private fun getCharacteristic(
        gatt: BluetoothGatt,
        serviceUuid: String,
        characteristicUuid: String
    ): BluetoothGattCharacteristic? {
        val service = gatt.getService(UUID.fromString(serviceUuid)) ?: return null
        return service.getCharacteristic(UUID.fromString(characteristicUuid))
    }

    fun connectionState(deviceId: String): Flow<ConnectionState> {
        return connectionStates
            .map { it[deviceId] ?: ConnectionState.Disconnected }
            .distinctUntilChanged()
    }

    fun services(deviceId: String): Flow<List<BleService>> {
        return servicesByDevice
            .map { it[deviceId] ?: emptyList() }
            .distinctUntilChanged()
    }

    fun currentConnectionState(deviceId: String): ConnectionState {
        return _connectionStates.value[deviceId] ?: ConnectionState.Disconnected
    }

    private fun updateConnectionState(deviceId: String, state: ConnectionState) {
        _connectionStates.value = _connectionStates.value.toMutableMap().apply {
            if (state == ConnectionState.Disconnected) {
                remove(deviceId)
            } else {
                this[deviceId] = state
            }
        }

        scanResultsMap[deviceId]?.let { existing ->
            scanResultsMap[deviceId] = existing.copy(
                device = existing.device.copy(state = state)
            )
            _scanResults.tryEmit(scanResultsMap.values.toList())
        }
    }

    private fun updateServices(deviceId: String, services: List<BleService>) {
        _servicesByDevice.value = _servicesByDevice.value.toMutableMap().apply {
            if (services.isEmpty()) {
                remove(deviceId)
            } else {
                this[deviceId] = services
            }
        }
    }

    private fun scheduleAutoReconnect(deviceId: String) {
        val attempts = reconnectAttempts[deviceId] ?: 0
        if (!autoReconnectEnabled.contains(deviceId) || attempts >= MAX_AUTO_RECONNECT_ATTEMPTS) {
            Log.w(TAG, "Auto reconnect skipped: device=$deviceId, attempts=$attempts")
            return
        }

        cancelAutoReconnect(deviceId)
        val attempt = attempts + 1
        reconnectAttempts[deviceId] = attempt
        val reconnectRunnable = Runnable {
            Log.i(TAG, "Auto reconnect attempt $attempt/$MAX_AUTO_RECONNECT_ATTEMPTS for $deviceId")
            connectInternal(deviceId)
        }
        reconnectRunnables[deviceId] = reconnectRunnable
        reconnectHandler.postDelayed(reconnectRunnable, AUTO_RECONNECT_DELAY_MS)
    }

    private fun cancelAutoReconnect(deviceId: String) {
        reconnectRunnables.remove(deviceId)?.let {
            reconnectHandler.removeCallbacks(it)
        }
    }

    private fun disableAutoReconnect(deviceId: String) {
        cancelAutoReconnect(deviceId)
        autoReconnectEnabled.remove(deviceId)
        reconnectAttempts.remove(deviceId)
        userInitiatedDisconnects.remove(deviceId)
    }

    // Scan callback
    private val scanCallback = object : ScanCallback() {
        @SuppressLint("MissingPermission")
        override fun onScanResult(callbackType: Int, result: LeScanResult) {
            val device = result.device
            val scanRecord = result.scanRecord

            val bleDevice = BleDevice(
                id = device.address,
                name = device.name,
                rssi = result.rssi,
                state = currentConnectionState(device.address),
                scanRecord = ScanRecord(
                    serviceUuids = scanRecord?.serviceUuids?.map { it.uuid.toString() },
                    manufacturerData = null,  // Simplified for now
                    serviceData = scanRecord?.serviceData?.mapKeys { it.key.toString() },
                    txPowerLevel = scanRecord?.txPowerLevel,
                ),
            )

            val scanResult = ScanResult(
                device = bleDevice,
                timestampNanos = result.timestampNanos,
            )

            scanResultsMap[device.address] = scanResult
            _scanResults.tryEmit(scanResultsMap.values.toList())
        }

        override fun onScanFailed(errorCode: Int) {
            Log.e(TAG, "Scan failed: $errorCode")
            _isScanning.value = false
        }

        override fun onBatchScanResults(results: List<LeScanResult>) {
            results.forEach { onScanResult(ScanSettings.CALLBACK_TYPE_ALL_MATCHES, it) }
        }
    }

    // GATT callback
    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            val device = gatt.device
            Log.d(TAG, "onConnectionStateChange: ${device.address}, status=$status, newState=$newState")

            when (newState) {
                BluetoothGatt.STATE_CONNECTED -> {
                    cancelAutoReconnect(device.address)
                    reconnectAttempts[device.address] = 0
                    userInitiatedDisconnects.remove(device.address)
                    gattConnections[device.address] = gatt
                    updateConnectionState(device.address, ConnectionState.Connected)
                    // 自动发现服务
                    discoverServices(device.address)
                }
                BluetoothGatt.STATE_DISCONNECTED -> {
                    val deviceId = device.address
                    val attempts = reconnectAttempts[deviceId] ?: 0
                    val shouldReconnect = !userInitiatedDisconnects.contains(deviceId) &&
                        autoReconnectEnabled.contains(deviceId) &&
                        attempts < MAX_AUTO_RECONNECT_ATTEMPTS

                    gatt.close()
                    gattConnections.remove(deviceId)

                    updateConnectionState(deviceId, ConnectionState.Disconnected)
                    updateServices(deviceId, emptyList())

                    if (shouldReconnect) {
                        Log.w(
                            TAG,
                            "Disconnected unexpectedly (status=$status), scheduling reconnect ${attempts + 1}/$MAX_AUTO_RECONNECT_ATTEMPTS"
                        )
                        scheduleAutoReconnect(deviceId)
                    } else {
                        Log.i(
                            TAG,
                            "Disconnected without auto reconnect (userInitiated=${userInitiatedDisconnects.contains(deviceId)}, status=$status)"
                        )
                        reconnectAttempts.remove(deviceId)
                    }
                }
                BluetoothGatt.STATE_CONNECTING -> {
                    updateConnectionState(device.address, ConnectionState.Connecting)
                }
                BluetoothGatt.STATE_DISCONNECTING -> {
                    updateConnectionState(device.address, ConnectionState.Disconnecting)
                }
            }
        }

        @SuppressLint("MissingPermission")
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            Log.d(TAG, "onServicesDiscovered: status=$status")

            if (status == BluetoothGatt.GATT_SUCCESS) {
                val services = gatt.services.map { gattService ->
                    mapBleService(gattService)
                }
                updateServices(gatt.device.address, services)
                Log.i(TAG, "Discovered ${services.size} services")
            } else {
                Log.e(TAG, "Service discovery failed: $status")
            }
        }

        @SuppressLint("MissingPermission")
        override fun onCharacteristicRead(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            value: ByteArray,
            status: Int
        ) {
            Log.d(TAG, "onCharacteristicRead: ${characteristic.uuid}, status=$status")

            if (status == BluetoothGatt.GATT_SUCCESS) {
                updateCharacteristicValue(
                    gatt.device.address,
                    characteristic.service.uuid.toString(),
                    characteristic.uuid.toString(),
                    value
                )
            }
        }

        @SuppressLint("MissingPermission")
        override fun onCharacteristicWrite(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int
        ) {
            Log.d(TAG, "onCharacteristicWrite: ${characteristic.uuid}, status=$status")
        }

        @SuppressLint("MissingPermission")
        override fun onCharacteristicChanged(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            value: ByteArray
        ) {
            Log.d(TAG, "onCharacteristicChanged: ${characteristic.uuid}")

            updateCharacteristicValue(
                gatt.device.address,
                characteristic.service.uuid.toString(),
                characteristic.uuid.toString(),
                value
            )

            _characteristicChanges.tryEmit(
                CharacteristicChangeEvent(
                    deviceId = gatt.device.address,
                    serviceUuid = characteristic.service.uuid.toString(),
                    characteristicUuid = characteristic.uuid.toString(),
                    value = value
                )
            )
        }

        @SuppressLint("MissingPermission")
        @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
        override fun onDescriptorRead(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
            Log.d(TAG, "onDescriptorRead: ${descriptor.uuid}, status=$status")
        }

        @SuppressLint("MissingPermission")
        override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
            Log.d(TAG, "onDescriptorWrite: ${descriptor.uuid}, status=$status")
        }

        override fun onReadRemoteRssi(gatt: BluetoothGatt, rssi: Int, status: Int) {
            Log.d(TAG, "onReadRemoteRssi: rssi=$rssi, status=$status")
        }
    }

    private fun mapBleService(gattService: BluetoothGattService): BleService {
        val characteristics = gattService.characteristics.map { gattChar ->
            mapBleCharacteristic(gattService.uuid.toString(), gattChar)
        }

        return BleService(
            uuid = gattService.uuid.toString(),
            characteristics = characteristics,
        )
    }

    @SuppressLint("MissingPermission")
    @Suppress("DEPRECATION")
    private fun mapBleCharacteristic(serviceUuid: String, gattChar: BluetoothGattCharacteristic): BleCharacteristic {
        val properties = mutableSetOf<Property>()

        val props = gattChar.properties
        if (props and BluetoothGattCharacteristic.PROPERTY_READ != 0) {
            properties.add(Property.Read)
        }
        if (props and BluetoothGattCharacteristic.PROPERTY_WRITE != 0) {
            properties.add(Property.Write)
        }
        if (props and BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE != 0) {
            properties.add(Property.WriteNoResponse)
        }
        if (props and BluetoothGattCharacteristic.PROPERTY_NOTIFY != 0) {
            properties.add(Property.Notify)
        }
        if (props and BluetoothGattCharacteristic.PROPERTY_INDICATE != 0) {
            properties.add(Property.Indicate)
        }

        return BleCharacteristic(
            serviceUuid = serviceUuid,
            uuid = gattChar.uuid.toString(),
            properties = properties,
            value = gattChar.value,
            isNotifying = gattChar.getDescriptor(CCC_DESCRIPTOR_UUID)?.value?.let {
                it.contentEquals(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE) ||
                it.contentEquals(BluetoothGattDescriptor.ENABLE_INDICATION_VALUE)
            } ?: false
        )
    }

    private fun updateCharacteristicValue(
        deviceId: String,
        serviceUuid: String,
        characteristicUuid: String,
        value: ByteArray
    ) {
        val currentServices = _servicesByDevice.value[deviceId] ?: return
        val updatedServices = currentServices.map { service ->
            if (service.uuid == serviceUuid) {
                service.copy(
                    characteristics = service.characteristics.map { char ->
                        if (char.uuid == characteristicUuid) {
                            char.copyWithValue(value)
                        } else {
                            char
                        }
                    }
                )
            } else {
                service
            }
        }
        updateServices(deviceId, updatedServices)
    }

    /**
     * 释放资源
     */
    fun release() {
        stopScan()
        disableAllAutoReconnect()
        disconnectAll()
    }

    @SuppressLint("MissingPermission")
    private fun disconnectAll() {
        val deviceIds = gattConnections.keys.toList()
        deviceIds.forEach { deviceId ->
            userInitiatedDisconnects.add(deviceId)
            gattConnections[deviceId]?.disconnect()
            gattConnections[deviceId]?.close()
        }
        gattConnections.clear()
        _connectionStates.value = emptyMap()
        _servicesByDevice.value = emptyMap()
    }

    private fun disableAllAutoReconnect() {
        reconnectRunnables.keys.toList().forEach { cancelAutoReconnect(it) }
        reconnectAttempts.clear()
        autoReconnectEnabled.clear()
        userInitiatedDisconnects.clear()
    }
}

/**
 * 蓝牙状态
 */
enum class BluetoothState {
    On,
    Off,
    Unavailable,
    Unauthorized,
}

/**
 * 特征值变化事件
 */
data class CharacteristicChangeEvent(
    val deviceId: String,
    val serviceUuid: String,
    val characteristicUuid: String,
    val value: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as CharacteristicChangeEvent

        if (deviceId != other.deviceId) return false
        if (serviceUuid != other.serviceUuid) return false
        if (characteristicUuid != other.characteristicUuid) return false
        if (!value.contentEquals(other.value)) return false

        return true
    }

    override fun hashCode(): Int {
        var result = deviceId.hashCode()
        result = 31 * result + serviceUuid.hashCode()
        result = 31 * result + characteristicUuid.hashCode()
        result = 31 * result + value.contentHashCode()
        return result
    }
}
