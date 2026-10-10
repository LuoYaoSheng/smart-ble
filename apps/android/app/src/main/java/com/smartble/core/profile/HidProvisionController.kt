package com.smartble.core.profile

/*
 * Smart HID 配网编排控制器（P002 三阶段状态机，K-AND）。
 *
 * 镜像 apps/flutter/lib/core/ble/provisioning_controller.dart（其对应
 * 原型 p002-provision.js + uni-app orchestrator/workflow 组合）：
 * connect → verify → write → status 终态（ready / error，60s 超时）
 * → 错误码→行/恢复动作映射。
 *
 * 安全约定（F023 红线）：token 与 Wi-Fi 密码只作为 submit() 参数经过本控制器，
 * 不落任何字段/日志/存储；离开配网页由 UI 负责清空其持有的表单值。
 *
 * 协程形态：状态经 StateFlow<UiState> 暴露；终态等待用 CompletableDeferred +
 * withTimeoutOrNull（对齐 Dart Completer+Timer 语义）。scope 由宿主注入
 * （生产=viewModelScope；单测=测试调度器，delay/timeout 走虚拟时间）。
 */

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull

/** 页面阶段（对齐原型 phase: connect / configure / status） */
enum class ProvisionPhase { Connect, Configure, Status }

/** 下发状态行（对齐原型 progress: pending / active / done / fail） */
enum class ProvisionRowState { Pending, Active, Done, Fail }

/** 终局失败描述（code + 展示行 + 恢复动作） */
data class ProvisionFailure(
    val code: String,
    val message: String,
    val row: String,
    val recovery: String,
)

/** 页面状态快照（对齐 Flutter 控制器的可变字段族，Kotlin 侧合并为不可变 data class） */
data class ProvisionUiState(
    val phase: ProvisionPhase = ProvisionPhase.Connect,
    val connecting: Boolean = false,
    val connError: String? = null,
    val lost: Boolean = false,
    val deviceInfo: SmartHidDeviceInfo? = null,
    val provisioning: Boolean = false,
    val done: Boolean = false,
    val failure: ProvisionFailure? = null,
    val lastStatus: SmartHidProvisionStatus? = null,
    val progress: Map<String, ProvisionRowState> = initialProgress(),
) {
    val hasOutcome: Boolean get() = done || failure != null

    companion object {
        fun initialProgress(): Map<String, ProvisionRowState> = linkedMapOf(
            "wifi" to ProvisionRowState.Pending,
            "hub" to ProvisionRowState.Pending,
            "conn" to ProvisionRowState.Pending,
            "usb" to ProvisionRowState.Pending,
        )
    }
}

/** 诊断快照（原始 JSON 文本，页面侧再 pretty-print） */
data class DiagnosticsSnapshot(
    val deviceInfoRaw: String,
    val statusRaw: String,
    val at: Long,
)

/** 状态终态等待结果 */
private enum class TerminalOutcome { Ready, Error, Timeout, Lost }

/** step → 行推进表（PROVISIONING_STEPS 顺序索引） */
private val STEP_INDEX = mapOf(
    "received" to 0,
    "connecting_wifi" to 1,
    "wifi_connected" to 2,
    "pairing" to 3,
    "pairing_success" to 4,
    "mqtt_connecting" to 5,
    "ready" to 6,
)

/** 失败行 → 该行对应的起始 step 索引（失败行之前的行推到 done） */
private val ROW_START_INDEX = mapOf("wifi" to 0, "hub" to 2, "conn" to 4, "usb" to 5)

class HidProvisionController(
    private val transportFactory: () -> HidProvisionTransport,
    private val scope: CoroutineScope,
    private val statusTimeoutMs: Long = 60_000,
) {
    private val _state = MutableStateFlow(ProvisionUiState())
    val state: StateFlow<ProvisionUiState> = _state.asStateFlow()

    private var transport: HidProvisionTransport? = null
    private var statusJob: Job? = null
    private var infoJob: Job? = null
    private var pollJob: Job? = null
    private var terminal: CompletableDeferred<TerminalOutcome>? = null
    private var terminalError: String? = null
    private var appliedStepIdx = -1
    private var lastStatusRaw: String? = null

    /* ------------------------------------------------------------------ */
    /* connect 阶段                                                        */
    /* ------------------------------------------------------------------ */

    /** 连接并验证设备（phase: Connect → Configure） */
    suspend fun connectDevice(deviceId: String) {
        _state.value = ProvisionUiState(phase = ProvisionPhase.Connect, connecting = true)
        closeTransport()
        val t = transportFactory()
        try {
            t.connect(deviceId, onLost = ::onConnectionLost)
            transport = t
            statusJob = scope.launch {
                t.statusNotifications.collect { onStatusText(it) }
            }
            infoJob = scope.launch {
                t.deviceInfoNotifications.collect { text ->
                    SmartHidProtocol.parseDeviceInfo(text)?.let { info ->
                        _state.value = _state.value.copy(deviceInfo = info)
                    }
                }
            }
            val info = SmartHidProtocol.parseDeviceInfo(t.readDeviceInfo())
            if (info == null || !SmartHidProtocol.verifyDeviceInfo(info)) {
                closeTransport()
                _state.value = _state.value.copy(
                    connecting = false,
                    connError = "设备身份验证失败：Device Info 缺失或 product / protocol / " +
                        "device_id 与 Smart HID 档案不符",
                )
                return
            }
            _state.value = _state.value.copy(
                deviceInfo = info,
                connecting = false,
                phase = ProvisionPhase.Configure,
            )
            startStatusPoll()
        } catch (e: Exception) {
            closeTransport()
            _state.value = _state.value.copy(
                connecting = false,
                connError = e.message ?: "连接设备失败",
            )
        }
    }

    /* ------------------------------------------------------------------ */
    /* status 阶段（submit）                                               */
    /* ------------------------------------------------------------------ */

    /** 下发配置（phase: Configure → Status）。
     *  校验失败抛 [IllegalArgumentException]（UI 捕获提示，不切阶段）。 */
    suspend fun submit(
        wifiSsid: String,
        wifiPassword: String,
        hubHost: String,
        hubPort: Int?,
        token: String,
    ) {
        val t = transport
        if (t == null || _state.value.lost) {
            throw IllegalStateException("BLE 未连接，请先重新连接设备")
        }
        val candidateJson = SmartHidProtocol.buildProvisionCandidateJson(
            ProvisionCandidateInput(
                wifiSsid = wifiSsid,
                wifiPassword = wifiPassword,
                hubHost = hubHost,
                hubPort = hubPort,
                token = token,
            ),
        )

        appliedStepIdx = 0
        _state.value = _state.value.copy(
            phase = ProvisionPhase.Status,
            provisioning = true,
            done = false,
            failure = null,
            lastStatus = null,
            progress = ProvisionUiState.initialProgress().toMutableMap().apply {
                this["wifi"] = ProvisionRowState.Active // canon：下发即点亮 Wi-Fi 行
            },
        )

        // 先挂终态 waiter 再写入，避免设备快速终态丢失（对齐 orchestrator）
        val waiter = CompletableDeferred<TerminalOutcome>()
        terminal = waiter
        terminalError = null

        val frames = buildCandidateFrames(candidateJson, t.mtu)
        try {
            t.writeFrames(frames)
        } catch (e: Exception) {
            setWriteFailure(e)
            return
        }

        val outcome = withTimeoutOrNull(statusTimeoutMs) { waiter.await() } ?: TerminalOutcome.Timeout
        terminal = null
        _state.value = _state.value.copy(provisioning = false)
        when (outcome) {
            TerminalOutcome.Ready -> {
                applyStepIndex(6)
                _state.value = _state.value.copy(done = true)
            }
            TerminalOutcome.Error -> applyFailure(terminalError ?: "unknown")
            TerminalOutcome.Timeout -> _state.value = _state.value.copy(
                failure = ProvisionFailure(
                    code = SmartHidProtocol.TIMEOUT_ERROR_CODE,
                    message = "等待设备确认超时（${statusTimeoutMs / 1000}s），可重试下发。",
                    row = "conn",
                    recovery = "retry",
                ),
            )
            TerminalOutcome.Lost -> _state.value = _state.value.copy(
                failure = connectionLostFailure(),
            )
        }
    }

    /** 取消等待（canon cancelwait：本地按 timeout 错误呈现，可重试下发） */
    fun cancelWait() {
        scope.launch {
            val waiter = terminal
            terminal = null
            _state.value = _state.value.copy(provisioning = false)
            if (waiter != null && waiter.isActive) {
                waiter.complete(TerminalOutcome.Timeout)
            }
            _state.value = _state.value.copy(
                failure = ProvisionFailure(
                    code = SmartHidProtocol.TIMEOUT_ERROR_CODE,
                    message = "等待设备确认超时（${statusTimeoutMs / 1000}s），可重试下发。",
                    row = "conn",
                    recovery = "retry",
                ),
            )
        }
    }

    /** 返回表单修改（canon backform：重置进度与错误，保留已填表单） */
    fun backToForm() {
        scope.launch {
            appliedStepIdx = -1
            _state.value = _state.value.copy(
                phase = ProvisionPhase.Configure,
                provisioning = false,
                done = false,
                failure = null,
                progress = ProvisionUiState.initialProgress(),
            )
        }
    }

    /** 设备身份/状态复核（P005 诊断的最小真实投影：重读两特征） */
    suspend fun runDiagnostics(): DiagnosticsSnapshot {
        val t = transport ?: throw IllegalStateException("BLE 未连接")
        return DiagnosticsSnapshot(
            deviceInfoRaw = t.readDeviceInfo(),
            statusRaw = t.readStatus(),
            at = System.currentTimeMillis(),
        )
    }

    fun dispose() {
        scope.launch { closeTransport() }
    }

    /* ------------------------------------------------------------------ */
    /* 内部                                                                */
    /* ------------------------------------------------------------------ */

    private fun connectionLostFailure() = ProvisionFailure(
        code = "connection_lost",
        message = "设备连接已断开。已填写的配网信息不会丢失，重新连接后可继续。",
        row = "conn",
        recovery = "reconnect",
    )

    private fun setWriteFailure(error: Exception) {
        terminal = null
        _state.value = _state.value.copy(provisioning = false)
        val failure = if (error is HidWriteException && error.kind == HidWriteErrorKind.DISCONNECT) {
            // 下发中断线：按 connection_lost 呈现（canon：表单不丢，重连后可继续）
            connectionLostFailure()
        } else {
            ProvisionFailure(
                code = "write_failed",
                message = "配置下发失败：${error.message}",
                row = "wifi",
                recovery = "retry",
            )
        }
        _state.value = _state.value.copy(failure = failure)
    }

    private fun onStatusText(text: String) {
        val status = SmartHidProtocol.parseProvisionStatus(text) ?: return
        _state.value = _state.value.copy(lastStatus = status)
        val idx = STEP_INDEX[status.step]
        if (idx != null && idx > appliedStepIdx && status.error == null) {
            applyStepIndex(idx)
        }
        val waiter = terminal ?: return
        if (waiter.isActive) {
            when {
                status.error != null -> {
                    terminalError = status.error
                    waiter.complete(TerminalOutcome.Error)
                }
                status.state == "ready" -> waiter.complete(TerminalOutcome.Ready)
                status.state == "recovery" -> {
                    terminalError = status.error
                    waiter.complete(TerminalOutcome.Error)
                }
            }
        }
    }

    /** 单调推进行状态：失败行之前的行标 done，其后保持 pending */
    private fun applyStepIndex(idx: Int) {
        if (idx <= appliedStepIdx) return
        appliedStepIdx = idx
        val progress = ProvisionUiState.initialProgress().toMutableMap()
        if (idx >= 6) {
            progress.keys.forEach { progress[it] = ProvisionRowState.Done }
        } else {
            progress["wifi"] = if (idx >= 2) ProvisionRowState.Done else ProvisionRowState.Active
            progress["hub"] = when {
                idx >= 4 -> ProvisionRowState.Done
                idx >= 2 -> ProvisionRowState.Active
                else -> ProvisionRowState.Pending
            }
            progress["conn"] = when {
                idx >= 6 -> ProvisionRowState.Done
                idx >= 4 -> ProvisionRowState.Active
                else -> ProvisionRowState.Pending
            }
        }
        _state.value = _state.value.copy(progress = progress)
    }

    private fun applyFailure(code: String) {
        val row = SmartHidProtocol.provisionErrorRow(code)
        // 失败行之前的行推到 done；受单调保护：设备已推进到更后步骤时保留实际进度
        applyStepIndex(ROW_START_INDEX[row] ?: 0)
        val progress = _state.value.progress.toMutableMap()
        progress[row] = ProvisionRowState.Fail
        _state.value = _state.value.copy(
            progress = progress,
            failure = ProvisionFailure(
                code = code,
                message = SmartHidProtocol.errorHint(code) ?: "配网失败：$code",
                row = row,
                recovery = SmartHidProtocol.recoveryAction(code),
            ),
        )
    }

    private fun onConnectionLost() {
        val s = _state.value
        if (s.phase == ProvisionPhase.Status && s.provisioning) {
            // 走终态队列串行化，避免与 submit 的收尾互相覆盖
            val waiter = terminal
            terminal = null
            if (waiter != null && waiter.isActive) {
                waiter.complete(TerminalOutcome.Lost)
            } else {
                _state.value = s.copy(provisioning = false, failure = connectionLostFailure())
            }
        } else {
            _state.value = s.copy(lost = true)
        }
    }

    /** configure 阶段每 2s 读一次 STATUS 特征：维持链路活跃 + 刷新 lastStatus。
     *  轮询读失败不打断流程（瞬时失败属预期）；真实断连由 transport 的 onLost 上报。 */
    private fun startStatusPoll() {
        pollJob?.cancel()
        pollJob = scope.launch {
            while (isActive) {
                delay(2_000)
                val t = transport ?: break
                val s = _state.value
                if (s.lost || s.provisioning) continue
                try {
                    val text = t.readStatus()
                    if (text != lastStatusRaw) {
                        lastStatusRaw = text
                        SmartHidProtocol.parseProvisionStatus(text)?.let { st ->
                            _state.value = _state.value.copy(lastStatus = st)
                        }
                    }
                } catch (e: Exception) {
                    // 瞬时失败忽略：持续断连由 onLost 上报
                }
            }
        }
    }

    private suspend fun closeTransport() {
        pollJob?.cancel()
        pollJob = null
        statusJob?.cancel()
        statusJob = null
        infoJob?.cancel()
        infoJob = null
        val waiter = terminal
        terminal = null
        if (waiter != null && waiter.isActive) {
            waiter.complete(TerminalOutcome.Timeout)
        }
        val t = transport
        transport = null
        t?.let { runCatching { it.close() } }
    }
}
