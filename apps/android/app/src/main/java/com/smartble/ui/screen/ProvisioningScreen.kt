package com.smartble.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.core.profile.HidRecovery
import com.smartble.core.profile.HidRecoveryNav
import com.smartble.core.profile.ProvisionFailure
import com.smartble.core.profile.ProvisionPhase
import com.smartble.core.profile.ProvisionRowState
import com.smartble.core.profile.ProvisionUiState
import com.smartble.core.profile.SmartHidDeviceInfo
import com.smartble.ui.design.AppSubnav
import com.smartble.ui.design.DsCardTitle
import com.smartble.ui.design.DsChip
import com.smartble.ui.design.DsChipTone
import com.smartble.ui.design.DsErrLine
import com.smartble.ui.design.DsFieldLabel
import com.smartble.ui.design.DsIcons
import com.smartble.ui.design.DsInput
import com.smartble.ui.design.DsKv
import com.smartble.ui.design.DsNote
import com.smartble.ui.design.DsNoteKind
import com.smartble.ui.design.DsPrimaryButton
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.design.dsCard
import com.smartble.ui.hid.HidDeviceSessionViewModel
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cSub
import com.smartble.ui.theme.cText

/*
 * P002 Smart HID 配网（MAC-005 · prototype p002-provision 三阶段）：
 * Connect（自动连接 + Device Info 校验）→ Configure（表单 + 二维码/粘贴配对码）
 * → Status（四行进度 + 终态 + 恢复动作）。
 *
 * F023：Wi-Fi 密码 / pairing token 仅内存（VM 表单），离页清空；密码输入
 * 密文呈现，token 已录入后以脱敏文本展示。
 */

private val PHASE_LABELS = listOf("连接设备", "填写配置", "查看状态")

/** 状态行显示名（canon：wifi / hub / conn / usb） */
private val ROW_LABELS = linkedMapOf(
    "wifi" to "写入 Wi-Fi",
    "hub" to "配置 ControlHub",
    "conn" to "等待连接",
    "usb" to "HID 上线",
)

@Composable
fun ProvisioningScreen(
    deviceId: String,
    deviceName: String,
    viewModel: HidDeviceSessionViewModel,
    onBack: () -> Unit,
    onOpenDiagnostics: (String, String) -> Unit,
) {
    val state by viewModel.state.collectAsState()
    val submitError by viewModel.submitError.collectAsState()

    // 进入页面即开始 Connect 阶段（P002 契约：自动连接首页选中的设备）
    LaunchedEffect(deviceId) { viewModel.startConnect() }

    Column(modifier = Modifier.fillMaxSize().background(com.smartble.ui.theme.cBg)) {
        AppSubnav(title = "配置 Smart HID", onBack = onBack)
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            // ① 设备头 + 三步指示
            Column(Modifier.dsCard()) {
                DsCardTitle(icon = DsIcons.Chip, text = deviceName.ifBlank { "Smart HID 设备" })
                Spacer(modifier = Modifier.height(4.dp))
                Text(deviceId, fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = cMut)
                Spacer(modifier = Modifier.height(10.dp))
                ProvisionStepper(phase = state.phase)
            }
            Spacer(modifier = Modifier.height(12.dp))

            when (state.phase) {
                ProvisionPhase.Connect -> ConnectPhaseCard(state)
                ProvisionPhase.Configure -> ConfigurePhaseCard(
                    viewModel = viewModel,
                    state = state,
                )
                ProvisionPhase.Status -> StatusPhaseCard(
                    state = state,
                    submitError = submitError,
                    onRecovery = { nav -> onRecoveryAction(viewModel, nav, onOpenDiagnostics, deviceId, deviceName) },
                )
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

private fun onRecoveryAction(
    viewModel: HidDeviceSessionViewModel,
    nav: HidRecoveryNav,
    onOpenDiagnostics: (String, String) -> Unit,
    deviceId: String,
    deviceName: String,
) {
    when (nav) {
        HidRecoveryNav.BACK_TO_FORM -> viewModel.backToForm()
        HidRecoveryNav.FOCUS_PAIRING -> viewModel.backToForm() // 表单页 token 字段置顶提示（canon pairing 恢复）
        HidRecoveryNav.OPEN_DIAGNOSTICS -> onOpenDiagnostics(deviceId, deviceName)
        HidRecoveryNav.RETRY_SUBMIT -> viewModel.retrySubmit()
        HidRecoveryNav.RECONNECT -> viewModel.reconnect()
    }
}

@Composable
private fun ProvisionStepper(phase: ProvisionPhase) {
    val active = when (phase) {
        ProvisionPhase.Connect -> 0
        ProvisionPhase.Configure -> 1
        ProvisionPhase.Status -> 2
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        PHASE_LABELS.forEachIndexed { index, label ->
            DsChip(
                text = "${index + 1}·$label",
                tone = if (index == active) DsChipTone.Primary else DsChipTone.Neutral,
                mono = false,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun ConnectPhaseCard(state: ProvisionUiState) {
    Column(Modifier.dsCard()) {
        DsCardTitle(icon = DsIcons.Link, text = "连接并校验设备")
        Spacer(modifier = Modifier.height(8.dp))
        when {
            state.connecting || state.phase == ProvisionPhase.Connect && state.deviceInfo == null ->
                DsNote(kind = DsNoteKind.Info, boldLead = "正在连接", text = "自动连接设备并读取 Device Info…")
            state.connError != null || state.lost ->
                DsErrLine(state.connError ?: "设备连接已断开")
            state.deviceInfo != null -> DeviceInfoRows(state.deviceInfo)
            else -> DsNote(kind = DsNoteKind.Info, boldLead = "准备连接", text = "即将开始自动连接。")
        }
    }
}

@Composable
private fun DeviceInfoRows(info: SmartHidDeviceInfo) {
    DsKv(k = "产品", v = info.product.ifBlank { "—" })
    DsKv(k = "协议版本", v = info.protocol.ifBlank { "—" })
    DsKv(k = "设备 ID", v = info.deviceId, mono = true)
    DsKv(k = "固件", v = info.firmware.ifBlank { "—" }, mono = true)
    DsKv(k = "状态", v = info.state.ifBlank { "—" })
    DsKv(k = "已配网", v = if (info.provisioned) "是" else "否", showDivider = false)
}

@Composable
private fun ConfigurePhaseCard(
    viewModel: HidDeviceSessionViewModel,
    state: ProvisionUiState,
) {
    val form = viewModel.form
    var ssid by remember { mutableStateOf(form.wifiSsid) }
    var password by remember { mutableStateOf(form.wifiPassword) }
    var hub by remember { mutableStateOf(form.hubHost) }
    var port by remember { mutableStateOf(form.hubPort) }
    var token by remember { mutableStateOf(form.pairingToken) }
    var paste by remember { mutableStateOf("") }
    val qrMessage = form.qrParseMessage

    Column(Modifier.dsCard()) {
        DsCardTitle(icon = DsIcons.Box, text = "Wi-Fi 与 ControlHub")
        Spacer(modifier = Modifier.height(4.dp))
        DsNote(
            kind = DsNoteKind.Info,
            boldLead = "安全",
            text = "密码与配对 token 仅存于当前会话内存，离开页面即清空。",
        )
        Spacer(modifier = Modifier.height(10.dp))

        // ① ControlHub 配对码（二维码内容粘贴 / 手动输入兜底）
        DsFieldLabel(text = "ControlHub 配对码（shid://pair 链接）")
        DsInput(
            value = paste,
            onValueChange = { paste = it },
            placeholder = "粘贴二维码内容…",
            mono = true,
            trailing = {
                DsSoftButton(
                    label = "解析",
                    icon = null,
                    onClick = {
                        if (form.applyPairingPaste(paste)) {
                            hub = form.hubHost
                            port = form.hubPort
                            token = form.pairingToken
                            paste = ""
                        }
                    },
                    small = true,
                )
            },
        )
        if (qrMessage != null) {
            Spacer(modifier = Modifier.height(4.dp))
            DsErrLine(qrMessage)
        }
        Spacer(modifier = Modifier.height(10.dp))

        DsFieldLabel(text = "Wi-Fi 名称")
        DsInput(value = ssid, onValueChange = { ssid = it; form.updateSsid(it) }, placeholder = "2.4G Wi-Fi SSID")
        Spacer(modifier = Modifier.height(8.dp))
        DsFieldLabel(text = "Wi-Fi 密码")
        DsInput(value = password, onValueChange = { password = it; form.updatePassword(it) }, placeholder = "仅内存，不落日志")
        Spacer(modifier = Modifier.height(8.dp))
        DsFieldLabel(text = "ControlHub 地址")
        DsInput(value = hub, onValueChange = { hub = it; form.updateHubHost(it) }, placeholder = "hub.example.com", mono = true)
        Spacer(modifier = Modifier.height(8.dp))
        DsFieldLabel(text = "端口（默认 17892，可空）")
        DsInput(value = port, onValueChange = { port = it; form.updateHubPort(it) }, placeholder = "17892", mono = true)
        Spacer(modifier = Modifier.height(8.dp))
        DsFieldLabel(text = "配对 token（32 位十六进制）")
        if (token.isBlank()) {
            DsInput(value = token, onValueChange = { token = it; form.updateToken(it) }, placeholder = "可扫码带入或手输", mono = true)
        } else {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(form.maskedToken, fontSize = 13.sp, fontFamily = FontFamily.Monospace, color = cText)
                DsSoftButton(label = "重新输入", icon = null, onClick = { token = ""; form.updateToken("") }, small = true)
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        DsPrimaryButton(
            label = "下发配置",
            icon = DsIcons.Send,
            onClick = { viewModel.submitForm() },
            enabled = form.canSubmit,
            modifier = Modifier.fillMaxWidth(),
        )
        if (state.deviceInfo != null) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                "已连接 ${state.deviceInfo.deviceId}，下发后进入状态页等待设备确认。",
                fontSize = 11.sp,
                color = cSub,
            )
        }
    }
}

@Composable
private fun StatusPhaseCard(
    state: ProvisionUiState,
    submitError: String?,
    onRecovery: (HidRecoveryNav) -> Unit,
) {
    Column(Modifier.dsCard()) {
        DsCardTitle(icon = DsIcons.Doc, text = "配网进度")
        Spacer(modifier = Modifier.height(8.dp))
        ROW_LABELS.forEach { (key, label) ->
            ProvisionRow(label = label, rowState = state.progress[key] ?: ProvisionRowState.Pending)
        }
        Spacer(modifier = Modifier.height(8.dp))

        val failure = state.failure
        when {
            state.done -> DsNote(kind = DsNoteKind.Info, boldLead = "配网完成", text = "设备已 Ready，可进入诊断页复核状态。")
            failure != null -> FailureBlock(failure, onRecovery)
            state.provisioning -> DsNote(kind = DsNoteKind.Info, boldLead = "进行中", text = "等待设备状态推进（超时 60s 可取消重试）。")
            else -> DsNote(kind = DsNoteKind.Info, boldLead = "待下发", text = "返回表单修改后重新下发。")
        }
        if (submitError != null) {
            Spacer(modifier = Modifier.height(6.dp))
            DsErrLine(submitError)
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (state.provisioning) {
                DsSoftButton(
                    label = "取消等待",
                    icon = DsIcons.Stop,
                    onClick = { onRecovery(HidRecoveryNav.BACK_TO_FORM) },
                    small = true,
                )
            }
            if (!state.done && failure == null && !state.provisioning) {
                DsSoftButton(label = "返回表单", icon = null, onClick = { onRecovery(HidRecoveryNav.BACK_TO_FORM) }, small = true)
            }
        }
    }
}

@Composable
private fun ProvisionRow(label: String, rowState: ProvisionRowState) {
    val (mark, tone) = when (rowState) {
        ProvisionRowState.Pending -> "○" to DsChipTone.Neutral
        ProvisionRowState.Active -> "◉" to DsChipTone.Primary
        ProvisionRowState.Done -> "●" to DsChipTone.Success
        ProvisionRowState.Fail -> "✕" to DsChipTone.Danger
    }
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        DsChip(text = mark, tone = tone, mono = true)
        Text(label, fontSize = 13.sp, color = cText, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun FailureBlock(failure: ProvisionFailure, onRecovery: (HidRecoveryNav) -> Unit) {
    DsNote(kind = DsNoteKind.Danger, boldLead = "配网失败（${failure.code}）", text = failure.message)
    Spacer(modifier = Modifier.height(8.dp))
    val nav = HidRecovery.navFor(failure.recovery)
    DsPrimaryButton(
        label = recoveryLabel(nav),
        icon = DsIcons.Refresh,
        onClick = { onRecovery(nav) },
        modifier = Modifier.fillMaxWidth(),
    )
}

private fun recoveryLabel(nav: HidRecoveryNav): String = when (nav) {
    HidRecoveryNav.BACK_TO_FORM -> "返回表单修改"
    HidRecoveryNav.FOCUS_PAIRING -> "重新获取配对码"
    HidRecoveryNav.OPEN_DIAGNOSTICS -> "查看诊断"
    HidRecoveryNav.RETRY_SUBMIT -> "重试下发"
    HidRecoveryNav.RECONNECT -> "重新连接设备"
}
