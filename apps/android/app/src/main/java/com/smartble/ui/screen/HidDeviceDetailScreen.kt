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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.core.profile.ProvisionPhase
import com.smartble.ui.design.AppSubnav
import com.smartble.ui.design.DsCardTitle
import com.smartble.ui.design.DsChip
import com.smartble.ui.design.DsChipTone
import com.smartble.ui.design.DsErrLine
import com.smartble.ui.design.DsIcons
import com.smartble.ui.design.DsKv
import com.smartble.ui.design.DsNote
import com.smartble.ui.design.DsNoteKind
import com.smartble.ui.design.DsPrimaryButton
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.design.dsCard
import com.smartble.ui.hid.HidDeviceSessionViewModel
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cSub

/*
 * P003 Smart HID 设备详情（MAC-005 · prototype p003-hid-detail）：
 * 连接设备 → Device Info 身份卡 + 当前状态卡 + 动作区（去配网 / 诊断 / 重新读取）。
 * 由已连接 Tab 的 Profile 分流进入（HidRoutes.connectedOpen），或配网完成后的
 * 查看入口。
 */

@Composable
fun HidDeviceDetailScreen(
    deviceId: String,
    deviceName: String,
    viewModel: HidDeviceSessionViewModel,
    onBack: () -> Unit,
    onOpenProvision: (String, String) -> Unit,
    onOpenDiagnostics: (String, String) -> Unit,
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(deviceId) {
        if (state.phase == ProvisionPhase.Connect) viewModel.startConnect()
    }

    Column(modifier = Modifier.fillMaxSize().background(com.smartble.ui.theme.cBg)) {
        AppSubnav(title = "Smart HID 设备详情", onBack = onBack)
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            // ① 身份卡（Device Info）
            Column(Modifier.dsCard()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    DsCardTitle(icon = DsIcons.Chip, text = deviceName.ifBlank { "Smart HID" }, modifier = Modifier.weight(1f))
                    DsChip(text = "Smart HID", tone = DsChipTone.Primary)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(deviceId, fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = cMut)
                Spacer(modifier = Modifier.height(8.dp))
                val info = state.deviceInfo
                when {
                    info != null -> {
                        DsKv(k = "设备 ID", v = info.deviceId, mono = true)
                        DsKv(k = "固件", v = info.firmware.ifBlank { "—" }, mono = true)
                        DsKv(k = "状态", v = info.state.ifBlank { "—" })
                        DsKv(k = "已配网", v = if (info.provisioned) "是" else "否", showDivider = false)
                    }
                    state.connError != null || state.lost -> DsErrLine(state.connError ?: "设备连接已断开")
                    else -> DsNote(kind = DsNoteKind.Info, boldLead = "正在连接", text = "读取设备 Device Info…")
                }
            }
            Spacer(modifier = Modifier.height(12.dp))

            // ② 当前状态卡（provisioning status 投影）
            Column(Modifier.dsCard()) {
                DsCardTitle(icon = DsIcons.Info, text = "当前状态")
                Spacer(modifier = Modifier.height(8.dp))
                val status = state.lastStatus
                if (status != null) {
                    DsKv(k = "状态机", v = status.state.ifBlank { "—" })
                    DsKv(k = "步骤", v = status.step.ifBlank { "—" })
                    DsKv(k = "错误", v = status.error ?: "无", showDivider = false)
                } else {
                    Text("暂无状态数据；连接后在诊断页可读取完整快照。", fontSize = 12.sp, color = cSub)
                }
            }
            Spacer(modifier = Modifier.height(12.dp))

            // ③ 动作区
            Column(Modifier.dsCard()) {
                DsCardTitle(icon = DsIcons.ChevR, text = "操作")
                Spacer(modifier = Modifier.height(8.dp))
                DsPrimaryButton(
                    label = "去配网",
                    icon = DsIcons.Send,
                    onClick = { onOpenProvision(deviceId, deviceName) },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(8.dp))
                DsSoftButton(
                    label = "进入诊断",
                    icon = DsIcons.Doc,
                    onClick = { onOpenDiagnostics(deviceId, deviceName) },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(8.dp))
                DsSoftButton(
                    label = "重新读取设备信息",
                    icon = DsIcons.Refresh,
                    onClick = {
                        if (state.phase == ProvisionPhase.Connect) viewModel.startConnect() else viewModel.readSnapshot()
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                "BLE 只承担配网与诊断；HID 实时控制由 ControlHub 承接。",
                fontSize = 11.sp,
                color = cSub,
                modifier = Modifier.padding(horizontal = 4.dp),
            )
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
