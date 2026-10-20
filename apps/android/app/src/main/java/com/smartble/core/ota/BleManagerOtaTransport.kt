package com.smartble.core.ota

import com.smartble.core.ble.BleManager
import com.smartble.core.ble.CharacteristicChangeKind
import com.smartble.core.model.BleUuids
import com.smartble.core.model.ConnectionState
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.merge
import kotlinx.coroutines.withTimeout

/** Uses the existing per-device serialized ATT queue; never steals callback ownership. */
class BleManagerOtaTransport(private val ble: BleManager, private val deviceId: String) : OtaTransport {
    companion object {
        const val INFO_SERVICE = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
        const val INFO_CHARACTERISTIC = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
    }
    private var restoreNotification = false
    private val statusChanges = ble.characteristicChanges.filter {
        it.deviceId == deviceId && it.serviceUuid.equals(BleUuids.SERVICE_OTA, true) &&
            it.characteristicUuid.equals(BleUuids.CHARACTERISTIC_OTA_STATUS, true) && it.kind == CharacteristicChangeKind.Notify
    }
    private val lost = ble.connectionState(deviceId).filter { it == ConnectionState.Disconnected }
    override val events = merge(statusChanges.map { OtaEvent.Status(it.value) },
        lost.map { OtaEvent.Disconnected }, ble.operationFailures.filter { it.deviceId == deviceId }.map { OtaEvent.Failure(it.message) })
    override val chunkCapacity get() = (ble.currentMtu(deviceId) - 3).coerceAtLeast(1)
    override suspend fun readInfo(): String = awaitValue(INFO_SERVICE, INFO_CHARACTERISTIC, CharacteristicChangeKind.Read) {
        ble.readCharacteristic(deviceId, INFO_SERVICE, INFO_CHARACTERISTIC)
    }.toString(Charsets.UTF_8)
    override suspend fun subscribe(enabled: Boolean) {
        if (enabled) {
            restoreNotification = ble.services(deviceId).first().firstOrNull { it.uuid.equals(BleUuids.SERVICE_OTA, true) }
                ?.characteristics?.firstOrNull { it.uuid.equals(BleUuids.CHARACTERISTIC_OTA_STATUS, true) }?.isNotifying == true
        }
        val desired = enabled || restoreNotification
        check(ble.setNotificationAwait(deviceId, BleUuids.SERVICE_OTA, BleUuids.CHARACTERISTIC_OTA_STATUS, desired)) { "OTA 状态订阅设置未确认" }
    }
    override suspend fun writeControl(data: ByteArray) { write(BleUuids.CHARACTERISTIC_OTA_CONTROL, data) }
    override suspend fun writeData(data: ByteArray) { write(BleUuids.CHARACTERISTIC_OTA_DATA, data) }
    private suspend fun write(characteristic: String, data: ByteArray) {
        awaitValue(BleUuids.SERVICE_OTA, characteristic, CharacteristicChangeKind.Write, expected = data) {
            ble.writeCharacteristic(deviceId, BleUuids.SERVICE_OTA, characteristic, data)
        }
    }
    override suspend fun reconnect() {
        check(ble.connect(deviceId)) { "设备重启后重连失败" }
        withTimeout(40_000) {
            ble.services(deviceId).first { services ->
                services.any { it.uuid.equals(INFO_SERVICE, true) && it.characteristics.any { c -> c.uuid.equals(INFO_CHARACTERISTIC, true) } }
            }
        }
    }
    private suspend fun awaitValue(service: String, characteristic: String, kind: CharacteristicChangeKind,
                                   expected: ByteArray? = null, submit: () -> Boolean): ByteArray = coroutineScope {
        // Register before enqueue: both Android callbacks and Fake transports may complete synchronously.
        val receipt = async(start = CoroutineStart.UNDISPATCHED) {
            withTimeout(6_000) {
                merge(
                    ble.characteristicChanges.filter { it.deviceId == deviceId && it.serviceUuid.equals(service, true) &&
                        it.characteristicUuid.equals(characteristic, true) && it.kind == kind && (expected == null || it.value.contentEquals(expected)) }.map { it.value },
                    ble.operationFailures.filter { it.deviceId == deviceId }.map { error(it.message) },
                    lost.map { error("OTA GATT 操作期间断连") },
                ).first()
            }
        }
        try { check(submit()) { "OTA GATT 请求未入队" }; receipt.await() } finally { receipt.cancel() }
    }
}
