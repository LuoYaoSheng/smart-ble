package com.smartble.core.profile

/*
 * Smart HID 配网 GATT 会话层（K-AND）。
 *
 * 镜像 apps/flutter/lib/core/ble/provisioning_transport.dart（其对应
 * uni-app services/provisioning/transport.js + orchestrator.js 组合）：
 * 连接 → 服务/特征确认 → notify 订阅 → 分帧写入（带响应写逐帧确认）。
 *
 * 说明：BleManager.connect() 自带自动重连，与配网「断线即呈报、手动重连」
 * 语义打架——本传输层在会话内首次观察到 Disconnected 即停止该链路的静默
 * 重连（disconnect() 落 userInitiated），把决策交还控制器/UI。
 */

import com.smartble.core.ble.BleManager
import com.smartble.core.ble.CharacteristicChangeKind
import com.smartble.core.model.ConnectionState
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import java.nio.charset.StandardCharsets

/** 写入失败类别（对齐 transport.js normalizeWriteError / Dart ProvisioningWriteErrorKind） */
enum class HidWriteErrorKind { ENCRYPT, DISCONNECT, WRITE }

class HidConnectException(message: String) : Exception(message)

class HidWriteException(val kind: HidWriteErrorKind, message: String) : Exception(message)

/** 设备无关的配网传输接口（BleManager 实现 + 单测 Fake 双形态） */
interface HidProvisionTransport {
    /** 连接、发现服务、确认配网服务与三特征、打开 notify。
     *  [onLost] 在会话建立后意外断开时回调一次。 */
    suspend fun connect(deviceId: String, onLost: () -> Unit)

    /** 协商后的 ATT MTU（未协商成功按 23 保守） */
    val mtu: Int

    /** 读 Device Info 特征（UTF-8 JSON 文本） */
    suspend fun readDeviceInfo(): String

    /** 读 Provision Status 特征（UTF-8 JSON 文本） */
    suspend fun readStatus(): String

    /** Device Info notify 流（UTF-8 文本） */
    val deviceInfoNotifications: Flow<String>

    /** Provision Status notify 流（UTF-8 文本） */
    val statusNotifications: Flow<String>

    /** 顺序写入帧序列（带响应写，帧间默认 30ms，避免压垮部分 Android 栈）。
     *  失败抛 [HidWriteException]（已分类）。 */
    suspend fun writeFrames(frames: List<ByteArray>, intervalMs: Long = 30)

    /** 断开连接并释放订阅 */
    suspend fun close()
}

/** 按会话 MTU 把 candidate JSON 文本编码为帧序列 */
fun buildCandidateFrames(candidateJson: String, mtu: Int): List<ByteArray> =
    SmartHidProtocol.buildFrames(
        candidateJson.toByteArray(StandardCharsets.UTF_8),
        SmartHidProtocol.chunkSizeForMtu(mtu),
    )

/** BleManager 实现：GATT 会话建立在共享 BleManager 之上（per-device GATT） */
class BleManagerHidTransport(
    private val bleManager: BleManager,
    private val deviceId: String,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate),
) : HidProvisionTransport {

    private var sessionScope: CoroutineScope? = null
    private var closedByUser = false
    private var lostReported = false

    override var mtu: Int = SmartHidProtocol.DEFAULT_ATT_MTU
        private set

    override suspend fun connect(deviceId: String, onLost: () -> Unit) {
        closedByUser = false
        lostReported = false
        if (deviceId != this.deviceId) {
            throw HidConnectException("传输层绑定设备 $deviceId 与会话设备不符")
        }
        if (!bleManager.connect(deviceId)) {
            throw HidConnectException("连接设备失败：GATT 会话建立请求被拒")
        }

        // 等待服务表出现配网服务（含 MTU 协商→服务发现的既有编排，超时对齐 F006 10s）
        val service = withTimeoutOrNull(CONNECT_TIMEOUT_MS) {
            bleManager.services(deviceId).first { list ->
                list.any { it.uuid.equals(SmartHidProtocol.SERVICE_UUID, ignoreCase = true) }
            }.firstOrNull { it.uuid.equals(SmartHidProtocol.SERVICE_UUID, ignoreCase = true) }
        } ?: run {
            close()
            throw HidConnectException("目标设备上未找到配网服务（UUID 不匹配或设备固件过旧）")
        }

        val chars = service.characteristics.associateBy { it.uuid.lowercase() }
        val missing = listOf(
            SmartHidProtocol.CharacteristicUuids.INFO,
            SmartHidProtocol.CharacteristicUuids.INPUT,
            SmartHidProtocol.CharacteristicUuids.STATUS,
        ).filter { chars[it.lowercase()] == null }
        if (missing.isNotEmpty()) {
            close()
            throw HidConnectException("配网特征缺失: ${missing.joinToString()}")
        }

        val session = CoroutineScope(scope.coroutineContext + Job())
        sessionScope = session
        session.launch {
            bleManager.connectionState(deviceId).collect { state ->
                if (state == ConnectionState.Disconnected && !closedByUser && !lostReported) {
                    lostReported = true
                    // 停掉 BleManager 的静默自动重连链（断线即呈报，手动重连）
                    runCatching { bleManager.disconnect(deviceId) }
                    onLost()
                }
            }
        }

        val okInfo = enableNotificationAwait(service.uuid, SmartHidProtocol.CharacteristicUuids.INFO)
        val okStatus = enableNotificationAwait(service.uuid, SmartHidProtocol.CharacteristicUuids.STATUS)
        if (!okInfo || !okStatus) {
            close()
            throw HidConnectException("打开配网特征通知失败")
        }
        // 订阅完成后的沉降：EMUI 实测紧跟的读会被栈吞（accepted 却无回调），
        // 给 GATT 队列一个排空窗口
        delay(NOTIFY_SETTLE_MS)
        mtu = bleManager.currentMtu(deviceId)
    }

    override suspend fun readDeviceInfo(): String =
        readCharacteristicText(SmartHidProtocol.CharacteristicUuids.INFO)

    override suspend fun readStatus(): String =
        readCharacteristicText(SmartHidProtocol.CharacteristicUuids.STATUS)

    override val deviceInfoNotifications: Flow<String> =
        characteristicTextOf(SmartHidProtocol.CharacteristicUuids.INFO, kinds = setOf(CharacteristicChangeKind.Notify))

    override val statusNotifications: Flow<String> =
        characteristicTextOf(SmartHidProtocol.CharacteristicUuids.STATUS, kinds = setOf(CharacteristicChangeKind.Notify))

    override suspend fun writeFrames(frames: List<ByteArray>, intervalMs: Long) {
        val inputUuid = SmartHidProtocol.CharacteristicUuids.INPUT
        if (bleManager.currentConnectionState(deviceId) != ConnectionState.Connected) {
            throw HidWriteException(HidWriteErrorKind.DISCONNECT, "BLE 连接已断开")
        }
        frames.forEachIndexed { index, frame ->
            if (index > 0 && intervalMs > 0) delay(intervalMs)
            val ack = CompletableDeferred<Unit>()
            val waiter = sessionScope?.launch {
                bleManager.characteristicChanges
                    .filter { event ->
                        event.deviceId == deviceId &&
                            event.characteristicUuid.equals(inputUuid, ignoreCase = true) &&
                            event.kind == CharacteristicChangeKind.Write
                    }
                    .first()
                ack.complete(Unit)
            }
            val accepted = runCatching {
                bleManager.writeCharacteristic(deviceId, SmartHidProtocol.SERVICE_UUID, inputUuid, frame)
            }.getOrDefault(false)
            if (!accepted) {
                waiter?.cancel()
                throw HidWriteException(HidWriteErrorKind.DISCONNECT, "BLE 连接已断开，请重新连接设备")
            }
            // 15s 单帧超时：真机验证发现部分 Android 栈写可能无限 PENDING
            val ok = withTimeoutOrNull(WRITE_FRAME_TIMEOUT_MS) { ack.await() }
            waiter?.cancel()
            if (ok == null) {
                throw HidWriteException(HidWriteErrorKind.WRITE, "写入超时（15s）: 第 ${index + 1}/${frames.size} 帧")
            }
        }
    }

    override suspend fun close() {
        closedByUser = true
        sessionScope?.cancel()
        sessionScope = null
        runCatching {
            bleManager.setNotification(deviceId, SmartHidProtocol.SERVICE_UUID, SmartHidProtocol.CharacteristicUuids.INFO, false)
        }
        runCatching {
            bleManager.setNotification(deviceId, SmartHidProtocol.SERVICE_UUID, SmartHidProtocol.CharacteristicUuids.STATUS, false)
        }
        bleManager.disconnect(deviceId)
    }

    /* ------------------------------------------------------------------ */

    /**
     * 订阅单个特征通知并等待 CCCD 写真正落地（onDescriptorWrite status==0）。
     *
     * 20260927 真机首曝（EMUI/TAS-AN00）：原实现背靠背两个 setNotification，
     * 第二个 writeDescriptor 在前一个仍在途时被 Android GATT 串行队列拒绝
     * （同步返回 false，无任何回调）→「打开配网特征通知失败」秒断链。
     * 现改为「写→等事件」串行 + 假失败重试（间隔 120ms，共 4 次机会）。
     */
    private suspend fun enableNotificationAwait(serviceUuid: String, characteristicUuid: String): Boolean {
        repeat(NOTIFY_SUBSCRIBE_ATTEMPTS) { attempt ->
            if (attempt > 0) delay(NOTIFY_SUBSCRIBE_RETRY_MS)
            if (bleManager.setNotificationAwait(
                    deviceId, serviceUuid, characteristicUuid, true, NOTIFY_SUBSCRIBE_ACK_MS,
                )) return true
        }
        return false
    }

    private fun characteristicTextOf(
        characteristicUuid: String,
        kinds: Set<CharacteristicChangeKind>,
    ): Flow<String> =
        bleManager.characteristicChanges
            .filter { event ->
                event.deviceId == deviceId &&
                    event.characteristicUuid.equals(characteristicUuid, ignoreCase = true) &&
                    event.kind in kinds
            }
            .map { String(it.value, StandardCharsets.UTF_8) }

    private suspend fun readCharacteristicText(characteristicUuid: String): String {
        // 读重试（20260927 EMUI 实测）：accepted 的读也可能被栈吞（10s 无回调），
        // 间隔重发通常第二次即通；「连接不可用」类拒绝同样走重试
        repeat(READ_ATTEMPTS) { attempt ->
            if (attempt > 0) delay(READ_RETRY_MS)
            // 先挂采集再发起读（SharedFlow 无重放，顺序反了会丢事件）
            val ack = CompletableDeferred<String>()
            val waiter = sessionScope?.launch {
                bleManager.characteristicChanges
                    .filter { event ->
                        event.deviceId == deviceId &&
                            event.characteristicUuid.equals(characteristicUuid, ignoreCase = true) &&
                            event.kind == CharacteristicChangeKind.Read
                    }
                    .first()
                    .let { ack.complete(String(it.value, StandardCharsets.UTF_8)) }
            }
            val accepted = runCatching {
                bleManager.readCharacteristic(deviceId, SmartHidProtocol.SERVICE_UUID, characteristicUuid)
            }.getOrDefault(false)
            val text = if (accepted) withTimeoutOrNull(READ_TIMEOUT_MS) { ack.await() } else null
            waiter?.cancel()
            if (text != null) return text
        }
        throw HidConnectException("读取特征超时（${READ_TIMEOUT_MS / 1000}s）")
    }

    private companion object {
        const val CONNECT_TIMEOUT_MS = 10_000L
        const val READ_TIMEOUT_MS = 10_000L
        const val WRITE_FRAME_TIMEOUT_MS = 15_000L
        const val NOTIFY_SUBSCRIBE_ATTEMPTS = 4
        const val NOTIFY_SUBSCRIBE_RETRY_MS = 120L
        const val NOTIFY_SUBSCRIBE_ACK_MS = 2_000L
        const val NOTIFY_SETTLE_MS = 150L
        const val READ_ATTEMPTS = 3
        const val READ_RETRY_MS = 300L
    }
}
