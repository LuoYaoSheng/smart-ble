package com.smartble.core.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

/**
 * BLE 外设管理器
 * 用于实现 BLE 广播功能
 */
class BlePeripheralManager(private val context: Context) {

    companion object {
        private const val TAG = "BlePeripheralManager"
    }

    private val bluetoothManager: BluetoothManager =
        context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
    private val bluetoothAdapter: BluetoothAdapter? = bluetoothManager.adapter
    private val advertiser: BluetoothLeAdvertiser? = bluetoothAdapter?.bluetoothLeAdvertiser

    private val _isAdvertising = MutableStateFlow(false)
    val isAdvertising: StateFlow<Boolean> = _isAdvertising.asStateFlow()

    private var advertiseCallback: AdvertiseCallback? = null

    /**
     * 检查是否支持广播
     */
    val isAdvertisingSupported: Boolean
        get() = advertiser != null && bluetoothAdapter?.isEnabled == true

    /**
     * 开始广播
     */
    @SuppressLint("MissingPermission")
    fun startAdvertising(
        serviceUuid: String,
        onComplete: (Boolean) -> Unit
    ) {
        if (!isAdvertisingSupported) {
            Log.e(TAG, "Advertising not supported")
            onComplete(false)
            return
        }

        // 验证 UUID
        val uuid = try {
            UUID.fromString(serviceUuid)
        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "Invalid UUID: $serviceUuid")
            onComplete(false)
            return
        }

        // 停止之前的广播
        stopAdvertising()

        val settings = AdvertiseSettings.Builder().apply {
            setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_BALANCED)
            setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            setConnectable(true)
            setTimeout(0)
        }.build()

        val data = AdvertiseData.Builder().apply {
            setIncludeTxPowerLevel(false)
            addServiceUuid(ParcelUuid(uuid))
            // Android 会使用设备名称，无法自定义
            setIncludeDeviceName(true)
        }.build()

        advertiseCallback = object : AdvertiseCallback() {
            override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
                Log.i(TAG, "Advertising started successfully")
                _isAdvertising.value = true
                onComplete(true)
            }

            override fun onStartFailure(errorCode: Int) {
                Log.e(TAG, "Advertising failed to start: $errorCode")
                _isAdvertising.value = false
                onComplete(false)
            }
        }

        advertiser?.startAdvertising(settings, data, advertiseCallback)
    }

    /**
     * 停止广播
     */
    @SuppressLint("MissingPermission")
    fun stopAdvertising() {
        try {
            advertiseCallback?.let {
                advertiser?.stopAdvertising(it)
            }
            _isAdvertising.value = false
            Log.i(TAG, "Advertising stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop advertising", e)
        }
    }

    /**
     * 释放资源
     */
    fun release() {
        stopAdvertising()
    }
}
