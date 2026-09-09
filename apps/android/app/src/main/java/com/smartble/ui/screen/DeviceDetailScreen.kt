package com.smartble.ui.screen

import android.content.Intent
import android.provider.OpenableColumns
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.core.model.BleCharacteristic
import com.smartble.core.model.BleService
import com.smartble.core.model.BleUuids
import com.smartble.core.model.ConnectionState
import com.smartble.ui.components.LogPanel
import com.smartble.ui.components.ServicePanel
import com.smartble.ui.components.WriteCharacteristicDialog
import com.smartble.ui.design.AppSubnav
import com.smartble.ui.design.DsGhostButton
import com.smartble.ui.design.DsIcons
import com.smartble.ui.design.DsNote
import com.smartble.ui.design.DsNoteKind
import com.smartble.ui.design.DsPrimaryButton
import com.smartble.ui.design.DsSectionTitle
import com.smartble.ui.design.DsTxtLink
import com.smartble.ui.design.dsCard
import com.smartble.ui.theme.cBg
import com.smartble.ui.theme.cCard
import com.smartble.ui.theme.cDanger
import com.smartble.ui.theme.cFill
import com.smartble.ui.theme.cLine
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cPh
import com.smartble.ui.theme.cPrimary
import com.smartble.ui.theme.cPrimaryWeak
import com.smartble.ui.theme.cSub
import com.smartble.ui.theme.cSuccess
import com.smartble.ui.theme.cText
import com.smartble.ui.theme.cWarning
import com.smartble.ui.viewmodel.DeviceDetailViewModel
import com.smartble.ui.viewmodel.OtaUiState

/**
 * P006 GATT 调试（PAGE_LAYOUT_CONTRACT sub 型 · prototype p006-gatt.js）：
 * AppSubnav → devhead（状态点 + 名称/ID + 连接/断开）→ op 面板（服务树/空/错）
 * → LogPanel dock 贴底。OTA 保留内联卡（正典 ota-bar 样式）。
 */
@Composable
fun DeviceDetailScreen(
    deviceId: String,
    deviceName: String,
    viewModel: DeviceDetailViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val connectionState by viewModel.connectionState.collectAsState()
    val services by viewModel.services.collectAsState()
    val logs by viewModel.logs.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val otaState by viewModel.otaState.collectAsState()
    var pendingWriteTarget by remember { mutableStateOf<WriteTarget?>(null) }
    var otaVisible by remember { mutableStateOf(false) }
    var expanded by remember(services) {
        mutableStateOf(services.map { it.uuid }.toSet())
    }

    val otaFilePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            queryDocumentMeta(context, uri)?.let { (displayName, size) ->
                viewModel.selectOtaFile(uri, displayName, size)
            } ?: Toast.makeText(context, "无法读取固件文件信息", Toast.LENGTH_SHORT).show()
        }
    }

    val connected = connectionState == ConnectionState.Connected
    val connecting = connectionState == ConnectionState.Connecting
    val charCount = services.sumOf { it.characteristics.size }
    val hasOtaService = services.any { it.uuid.equals(BleUuids.SERVICE_OTA, ignoreCase = true) }

    Column(modifier = Modifier.fillMaxSize().background(cBg)) {
        AppSubnav(
            title = "GATT 调试",
            onBack = onBack,
            action = {
                if (connected && services.isNotEmpty()) {
                    DsGhostButton(
                        label = "固件更新",
                        icon = DsIcons.Dl,
                        onClick = { otaVisible = !otaVisible },
                        small = true,
                        danger = true,
                    )
                }
            },
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            // devhead
            Column(Modifier.dsCard()) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(11.dp)) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .drawBehind {
                                if (connected) {
                                    drawCircle(cSuccess.copy(alpha = 0.3f), radius = size.minDimension * 0.95f)
                                }
                            }
                            .background(
                                when {
                                    connected -> cSuccess
                                    connecting -> cWarning
                                    else -> cPh
                                },
                                CircleShape,
                            ),
                    )
                    Column {
                        Text(deviceName, fontSize = 17.sp, fontWeight = FontWeight.W700, color = cText)
                        Text(
                            "$deviceId · ${stateWord(connectionState)}",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            color = cMut,
                            modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                }
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    DsPrimaryButton(
                        label = when {
                            connecting -> "连接中…"
                            connected -> "断开连接"
                            else -> "连接设备"
                        },
                        icon = when {
                            connected -> DsIcons.X
                            connecting -> null
                            else -> DsIcons.Link
                        },
                        danger = connected,
                        loading = connecting,
                        enabled = !connecting,
                        onClick = { if (connected) { viewModel.disconnect(); onBack() } else viewModel.connect() },
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            // OTA 提示（服务树就绪时）
            if (connected && services.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                DsNote(
                    kind = DsNoteKind.Warn,
                    boldLead = "OTA 端到端链路 BLOCKED",
                    text = "（固件侧暂未开放）：右上「固件更新」可演示完整流程，正式使用前需固件配合。",
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 主体面板
            when {
                connecting -> OpState(
                    title = "连接中…",
                    desc = "正在连接 $deviceName（10s 超时 · 失败自动重试 3 次）",
                    loading = true,
                )
                errorMessage != null -> OpState(
                    title = "连接失败",
                    desc = errorMessage ?: "",
                    mode = OpMode.Err,
                    onRetry = { viewModel.connect() },
                )
                connected && services.isEmpty() && !isLoading -> OpState(
                    title = "服务发现完成 · 列表为空",
                    desc = "该设备未暴露任何 GATT 服务（或权限受限）。",
                    mode = OpMode.Warn,
                )
                connected && services.isNotEmpty() -> {
                    Column {
                        DsSectionTitle(
                            icon = DsIcons.Log,
                            text = "服务与特征",
                            countText = "${services.size} 服务 / $charCount 特征",
                            trailing = {
                                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    DsTxtLink(text = "全部展开", onClick = { expanded = services.map { it.uuid }.toSet() })
                                    DsTxtLink(text = "全部收起", onClick = { expanded = emptySet() })
                                }
                            },
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        ServicePanel(
                            services = services,
                            expanded = expanded,
                            onToggleService = { uuid ->
                                expanded = if (uuid in expanded) expanded - uuid else expanded + uuid
                            },
                            onRead = { service, char -> viewModel.readCharacteristic(service.uuid, char.uuid) },
                            onWrite = { service, char -> pendingWriteTarget = WriteTarget(service, char) },
                            onToggleNotify = { service, char -> viewModel.toggleNotification(service.uuid, char.uuid) },
                        )
                        if (otaVisible || otaState.fileUri != null || otaState.isInProgress) {
                            Spacer(modifier = Modifier.height(12.dp))
                            OtaCard(
                                state = otaState,
                                onSelectFile = { otaFilePicker.launch(arrayOf("*/*")) },
                                onStart = { viewModel.startOtaTransfer() },
                                onCancel = { viewModel.cancelOtaTransfer() },
                            )
                        }
                    }
                }
                isLoading -> OpState(title = "连接中…", desc = "正在连接 $deviceName", loading = true)
                else -> OpState(
                    title = "未初始化",
                    desc = "点击「连接设备」建立 GATT 会话。",
                    loading = true,
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
        }

        // logdock 贴底
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(cBg.copy(alpha = 0f), cBg)))
                .padding(start = 16.dp, end = 16.dp, bottom = 12.dp, top = 4.dp),
        ) {
            LogPanel(
                logs = logs,
                onClear = { viewModel.clearLogs() },
                onExport = {
                    val send = Intent(Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(Intent.EXTRA_SUBJECT, "BLE Toolkit+ 导出 - $deviceName")
                        putExtra(Intent.EXTRA_TEXT, viewModel.buildExportText())
                    }
                    context.startActivity(Intent.createChooser(send, "导出设备数据"))
                },
            )
        }
    }

    pendingWriteTarget?.let { target ->
        WriteCharacteristicDialog(
            characteristicName = target.characteristic.displayName,
            onDismiss = { pendingWriteTarget = null },
            onConfirm = { payload ->
                viewModel.writeCharacteristic(
                    serviceUuid = target.service.uuid,
                    characteristicUuid = target.characteristic.uuid,
                    data = payload
                )
                Toast.makeText(context, "写入请求已发送", Toast.LENGTH_SHORT).show()
                pendingWriteTarget = null
            },
        )
    }
}

private data class WriteTarget(
    val service: BleService,
    val characteristic: BleCharacteristic
)

private fun stateWord(state: ConnectionState): String = when (state) {
    ConnectionState.Connected -> "已连接"
    ConnectionState.Connecting -> "连接中"
    ConnectionState.Disconnecting -> "断开中"
    ConnectionState.Disconnected -> "未连接"
}

private fun queryDocumentMeta(context: android.content.Context, uri: android.net.Uri): Pair<String, Long>? {
    context.contentResolver.query(
        uri,
        arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE),
        null,
        null,
        null
    )?.use { cursor ->
        if (!cursor.moveToFirst()) return null
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
        val name = if (nameIndex >= 0) cursor.getString(nameIndex) else "firmware.bin"
        val size = if (sizeIndex >= 0) cursor.getLong(sizeIndex) else 0L
        return name to size
    }
    return null
}

/* ============ B7 op-state（components.css .op） ============ */

private enum class OpMode { Loading, Warn, Err }

@Composable
private fun OpState(
    title: String,
    desc: String,
    mode: OpMode = OpMode.Loading,
    loading: Boolean = false,
    onRetry: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth().dsCard(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        val titleColor = when (mode) {
            OpMode.Warn -> com.smartble.ui.theme.cWarnStrong
            OpMode.Err -> cDanger
            OpMode.Loading -> cText
        }
        Box(modifier = Modifier.padding(top = 1.dp)) {
            if (loading || mode == OpMode.Loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = cPrimary,
                    strokeWidth = 2.5.dp,
                    trackColor = cPrimaryWeak,
                )
            } else {
                Icon(
                    if (mode == OpMode.Err) DsIcons.X else DsIcons.Warn,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = titleColor,
                )
            }
        }
        Column {
            Text(title, fontSize = 15.sp, fontWeight = FontWeight.W700, color = titleColor)
            Text(
                desc,
                fontSize = 13.sp,
                color = cSub,
                lineHeight = 13.sp * 1.55f,
                modifier = Modifier.padding(top = 3.dp),
            )
            if (onRetry != null) {
                Spacer(modifier = Modifier.height(10.dp))
                DsGhostButton(label = "重试", icon = DsIcons.Refresh, onClick = onRetry, small = true)
            }
        }
    }
}

/* ============ OTA 内联卡（C7 ota-bar 样式） ============ */

@Composable
private fun OtaCard(
    state: OtaUiState,
    onSelectFile: () -> Unit,
    onStart: () -> Unit,
    onCancel: () -> Unit,
) {
    Column(Modifier.dsCard()) {
        Text(
            "BLE OTA 升级",
            fontSize = 15.sp,
            fontWeight = FontWeight.W700,
            color = cText,
        )
        Text(
            state.statusMessage,
            fontSize = 12.sp,
            color = if (state.errorMessage != null) cDanger else cMut,
            modifier = Modifier.padding(top = 4.dp),
        )
        state.fileName?.let {
            Text(
                "固件文件: $it (${formatBytes(state.fileSize)})",
                fontSize = 12.sp,
                color = cMut,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(cFill),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth((state.progressPercent / 100f).coerceAtLeast(0.02f))
                    .height(8.dp)
                    .background(
                        when {
                            state.isCompleted -> Brush.linearGradient(listOf(cSuccess, cSuccess))
                            state.errorMessage != null -> Brush.linearGradient(listOf(cDanger, cDanger))
                            else -> Brush.linearGradient(listOf(cPrimary, Color(0xFF5B9BFF)))
                        }
                    ),
            )
        }
        Text(
            "${state.progressPercent}% (${formatBytes(state.sentBytes)} / ${formatBytes(state.totalBytes)})",
            fontSize = 11.sp,
            color = cMut,
            modifier = Modifier.padding(top = 6.dp),
        )
        state.errorMessage?.let {
            Text(it, fontSize = 12.sp, color = cDanger, modifier = Modifier.padding(top = 6.dp))
        }
        Row(modifier = Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
            DsGhostButton(
                label = "选择固件",
                onClick = onSelectFile,
                modifier = Modifier.weight(1f),
            )
            if (state.isInProgress) {
                DsPrimaryButton(
                    label = "取消 OTA",
                    icon = null,
                    danger = true,
                    onClick = onCancel,
                    modifier = Modifier.weight(1f),
                )
            } else {
                DsPrimaryButton(
                    label = "开始 OTA",
                    icon = null,
                    enabled = state.fileUri != null,
                    onClick = onStart,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}
