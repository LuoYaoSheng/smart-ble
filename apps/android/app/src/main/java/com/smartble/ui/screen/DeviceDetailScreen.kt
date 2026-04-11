package com.smartble.ui.screen

import android.content.Intent
import android.provider.OpenableColumns
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.BluetoothDisabled
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material.icons.filled.SettingsInputAntenna
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardColors
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartble.core.model.BleCharacteristic
import com.smartble.core.model.BleService
import com.smartble.core.model.ConnectionState
import com.smartble.core.model.hexToByteArray
import com.smartble.ui.theme.Error
import com.smartble.ui.theme.Primary
import com.smartble.ui.theme.Success
import com.smartble.ui.theme.TextSecondary
import com.smartble.ui.theme.Warning
import com.smartble.ui.viewmodel.DeviceDetailViewModel
import com.smartble.core.model.LogEntry
import com.smartble.core.model.LogType
import com.smartble.ui.viewmodel.OtaUiState
import com.smartble.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
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
    val otaFilePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            queryDocumentMeta(context, uri)?.let { (displayName, size) ->
                viewModel.selectOtaFile(uri, displayName, size)
            } ?: Toast.makeText(context, "无法读取固件文件信息", Toast.LENGTH_SHORT).show()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(deviceName, style = MaterialTheme.typography.titleMedium)
                        Text(
                            deviceId,
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                    }
                },
                actions = {
                    ConnectionStatusBadge(connectionState)
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Action buttons
            if (connectionState == ConnectionState.Connected || logs.isNotEmpty() || services.isNotEmpty()) {
                ActionButtons(
                    canExport = logs.isNotEmpty() || services.isNotEmpty(),
                    canClearLogs = logs.isNotEmpty(),
                    isConnected = connectionState == ConnectionState.Connected,
                    onExport = {
                        val exportIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, "BLE Toolkit+ 导出 - $deviceName")
                            putExtra(Intent.EXTRA_TEXT, viewModel.buildExportText())
                        }
                        context.startActivity(Intent.createChooser(exportIntent, "导出设备数据"))
                    },
                    onClearLogs = { viewModel.clearLogs() },
                    onDisconnect = { viewModel.disconnect(); onBack() }
                )
            }

            if (connectionState == ConnectionState.Connected) {
                OtaCard(
                    state = otaState,
                    onSelectFile = { otaFilePicker.launch(arrayOf("*/*")) },
                    onStart = { viewModel.startOtaTransfer() },
                    onCancel = { viewModel.cancelOtaTransfer() }
                )
            }

            // Content
            if (isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (errorMessage != null) {
                ErrorView(
                    message = errorMessage!!,
                    onRetry = { /* Retry */ }
                )
            } else if (services.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "未发现服务",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
            } else {
                ServicePanel(
                    services = services,
                    onRead = { service, char -> viewModel.readCharacteristic(service.uuid, char.uuid) },
                    onWrite = { service, char -> pendingWriteTarget = WriteTarget(service, char) },
                    onToggleNotify = { service, char -> viewModel.toggleNotification(service.uuid, char.uuid) },
                    modifier = Modifier.weight(1f)
                )
            }

            // Log panel
            if (logs.isNotEmpty()) {
                LogPanel(logs = logs)
            }
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
            }
        )
    }
}

private data class WriteTarget(
    val service: BleService,
    val characteristic: BleCharacteristic
)

private enum class WriteInputMode {
    Text,
    Hex,
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

@Composable
fun ConnectionStatusBadge(state: ConnectionState) {
    val (color, text) = when (state) {
        ConnectionState.Connected -> Pair(Success, "已连接")
        ConnectionState.Connecting -> Pair(Warning, "连接中")
        ConnectionState.Disconnected -> Pair(Error, "未连接")
        ConnectionState.Disconnecting -> Pair(Warning, "断开中")
    }

    Card(
        colors = CardDefaults.cardColors(
            containerColor = color.copy(alpha = 0.1f)
        )
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(8.dp),
            ) {
                Icon(
                    if (state == ConnectionState.Connected) Icons.Default.CheckCircle else Icons.Default.Clear,
                    contentDescription = null,
                    tint = color,
                    modifier = Modifier.size(8.dp)
                )
            }
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text,
                style = MaterialTheme.typography.labelMedium,
                color = color,
                fontWeight = FontWeight.W500
            )
        }
    }
}

@Composable
fun ActionButtons(
    canExport: Boolean,
    canClearLogs: Boolean,
    isConnected: Boolean,
    onExport: () -> Unit,
    onClearLogs: () -> Unit,
    onDisconnect: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onExport,
                enabled = canExport,
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("导出数据")
            }

            OutlinedButton(
                onClick = onClearLogs,
                enabled = canClearLogs,
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Clear, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("清空日志")
            }
        }

        if (isConnected) {
            Button(
                onClick = onDisconnect,
                colors = ButtonDefaults.buttonColors(containerColor = Error),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    Icons.Default.BluetoothDisabled,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("断开连接")
            }
        }
    }
}

@Composable
fun OtaCard(
    state: OtaUiState,
    onSelectFile: () -> Unit,
    onStart: () -> Unit,
    onCancel: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "BLE OTA 升级",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )

            Text(
                state.statusMessage,
                style = MaterialTheme.typography.bodySmall,
                color = if (state.errorMessage != null) Error else TextSecondary
            )

            if (state.fileName != null) {
                Text(
                    "固件文件: ${state.fileName} (${formatBytes(state.fileSize)})",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }

            LinearProgressIndicator(
                progress = state.progressPercent / 100f,
                modifier = Modifier.fillMaxWidth(),
            )

            Text(
                "${state.progressPercent}% (${formatBytes(state.sentBytes)} / ${formatBytes(state.totalBytes)})",
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary
            )

            state.errorMessage?.let { error ->
                Text(
                    error,
                    style = MaterialTheme.typography.bodySmall,
                    color = Error
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(
                    onClick = onSelectFile,
                    enabled = !state.isInProgress,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("选择固件")
                }

                if (state.isInProgress) {
                    Button(
                        onClick = onCancel,
                        colors = ButtonDefaults.buttonColors(containerColor = Error),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("取消 OTA")
                    }
                } else {
                    Button(
                        onClick = onStart,
                        enabled = state.fileUri != null,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("开始 OTA")
                    }
                }
            }
        }
    }
}

@Composable
fun ErrorView(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.Error,
            contentDescription = null,
            tint = Error,
            modifier = Modifier.size(48.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(message, style = MaterialTheme.typography.bodyMedium)
        Spacer(modifier = Modifier.height(16.dp))
        Button(onClick = onRetry) {
            Text("重试")
        }
    }
}

}
