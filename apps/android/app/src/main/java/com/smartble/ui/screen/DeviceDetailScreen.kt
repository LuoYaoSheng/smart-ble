package com.smartble.ui.screen

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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartble.core.model.BleCharacteristic
import com.smartble.core.model.BleService
import com.smartble.core.model.ConnectionState
import com.smartble.ui.theme.Error
import com.smartble.ui.theme.Primary
import com.smartble.ui.theme.Success
import com.smartble.ui.theme.TextSecondary
import com.smartble.ui.theme.Warning
import com.smartble.ui.viewmodel.DeviceDetailViewModel
import com.smartble.ui.viewmodel.LogEntry
import com.smartble.ui.viewmodel.LogType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceDetailScreen(
    deviceId: String,
    deviceName: String,
    viewModel: DeviceDetailViewModel,
    onBack: () -> Unit
) {
    val connectionState by viewModel.connectionState.collectAsState()
    val services by viewModel.services.collectAsState()
    val logs by viewModel.logs.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

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
            if (connectionState == ConnectionState.Connected) {
                ActionButtons(
                    onClearLogs = { viewModel.clearLogs() },
                    onDisconnect = { viewModel.disconnect(); onBack() }
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
                ServicesList(
                    services = services,
                    onRead = { service, char -> viewModel.readCharacteristic(service.uuid, char.uuid) },
                    onWrite = { _, _ -> /* Show write dialog */ },
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
    onClearLogs: () -> Unit,
    onDisconnect: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        OutlinedButton(
            onClick = onClearLogs,
            modifier = Modifier.weight(1f)
        ) {
            Icon(Icons.Default.Clear, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text("清空日志")
        }

        Button(
            onClick = onDisconnect,
            colors = ButtonDefaults.buttonColors(containerColor = Error),
            modifier = Modifier.weight(1f)
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

@Composable
fun ServicesList(
    services: List<BleService>,
    onRead: (BleService, BleCharacteristic) -> Unit,
    onWrite: (BleService, BleCharacteristic) -> Unit,
    onToggleNotify: (BleService, BleCharacteristic) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier,
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(services) { service ->
            ServiceCard(
                service = service,
                onRead = onRead,
                onWrite = onWrite,
                onToggleNotify = onToggleNotify
            )
        }
    }
}

@Composable
fun ServiceCard(
    service: BleService,
    onRead: (BleService, BleCharacteristic) -> Unit,
    onWrite: (BleService, BleCharacteristic) -> Unit,
    onToggleNotify: (BleService, BleCharacteristic) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Service header
            Surface(
                onClick = { expanded = !expanded },
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = Primary.copy(alpha = 0.1f),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Box(
                            modifier = Modifier.size(40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.SettingsInputAntenna,
                                contentDescription = null,
                                tint = Primary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            service.displayName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.W600
                        )
                        Text(
                            service.shortUuid,
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Characteristic count badge
                    Surface(
                        color = Primary.copy(alpha = 0.1f),
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text(
                            "${service.characteristics.size} 特征值",
                            style = MaterialTheme.typography.labelMedium,
                            color = Primary,
                            fontWeight = FontWeight.W500,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Icon(
                        if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = if (expanded) "收起" else "展开",
                        tint = TextSecondary
                    )
                }
            }

            // Characteristics
            if (expanded) {
                Divider()
                if (service.characteristics.isEmpty()) {
                    Text(
                        "无特征值",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        modifier = Modifier.padding(16.dp)
                    )
                } else {
                    Column(modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp)) {
                        service.characteristics.forEach { characteristic ->
                            CharacteristicItem(
                                characteristic = characteristic,
                                onRead = { onRead(service, characteristic) },
                                onWrite = { onWrite(service, characteristic) },
                                onToggleNotify = { onToggleNotify(service, characteristic) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CharacteristicItem(
    characteristic: BleCharacteristic,
    onRead: () -> Unit,
    onWrite: () -> Unit,
    onToggleNotify: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon
            Surface(
                color = if (characteristic.isNotifying) Success.copy(alpha = 0.1f) else Color.White,
                shape = MaterialTheme.shapes.small,
                border = BorderStroke(
                    1.dp,
                    if (characteristic.isNotifying) Success else MaterialTheme.colorScheme.outline
                )
            ) {
                Box(
                    modifier = Modifier.size(36.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        when {
                            characteristic.isNotifying -> Icons.Default.NotificationsActive
                            characteristic.canNotify -> Icons.Default.Notifications
                            characteristic.canRead -> Icons.Default.Download
                            characteristic.canWrite -> Icons.Default.NotificationsNone
                            else -> Icons.Default.SettingsInputAntenna
                        },
                        contentDescription = null,
                        tint = if (characteristic.isNotifying) Success else TextSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    characteristic.displayName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.W500
                )
                Text(
                    characteristic.shortUuid,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                    fontFamily = FontFamily.Monospace
                )

                // Property chips
                PropertiesChips(characteristic = characteristic)
            }

            // Action buttons
            Row {
                if (characteristic.canRead) {
                    IconButton(onClick = onRead, modifier = Modifier.size(32.dp)) {
                        Icon(
                            Icons.Default.Download,
                            contentDescription = "读取",
                            tint = Primary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                if (characteristic.canWrite) {
                    IconButton(onClick = onWrite, modifier = Modifier.size(32.dp)) {
                        Icon(
                            Icons.Default.ArrowUpward,
                            contentDescription = "写入",
                            tint = Warning,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                if (characteristic.canNotify) {
                    IconButton(onClick = onToggleNotify, modifier = Modifier.size(32.dp)) {
                        Icon(
                            if (characteristic.isNotifying) Icons.Default.NotificationsActive else Icons.Default.NotificationsNone,
                            contentDescription = if (characteristic.isNotifying) "停止通知" else "启用通知",
                            tint = if (characteristic.isNotifying) Success else TextSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun PropertiesChips(characteristic: BleCharacteristic) {
    val chips = buildList {
        if (characteristic.canRead) {
            add("Read" to Primary)
        }
        if (characteristic.canWrite) {
            add("Write" to Warning)
        }
        if (characteristic.canNotify) {
            val label = if (characteristic.isNotifying) "Notifying" else "Notify"
            val color = if (characteristic.isNotifying) Success else TextSecondary
            add(label to color)
        }
    }

    if (chips.isEmpty()) {
        Text(
            "无权限",
            style = MaterialTheme.typography.labelSmall,
            color = TextSecondary
        )
    } else {
        Row(
            modifier = Modifier.padding(top = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            chips.forEach { (label, color) ->
                PropertyChip(label = label, color = color)
            }
        }
    }
}

@Composable
fun PropertyChip(label: String, color: Color) {
    Surface(
        color = color.copy(alpha = 0.1f),
        shape = MaterialTheme.shapes.small,
        border = BorderStroke(0.5.dp, color.copy(alpha = 0.3f))
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.W500,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

@Composable
fun LogPanel(logs: List<LogEntry>) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(150.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column {
            // Header
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Article,
                        contentDescription = null,
                        tint = TextSecondary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "操作日志",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.W500
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    Text(
                        "${logs.size} 条",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                }
            }

            Divider()

            // Log list
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(logs.reversed()) { log ->
                    LogItem(log = log)
                }
            }
        }
    }
}

@Composable
fun LogItem(log: LogEntry) {
    val (icon, color) = when (log.type) {
        LogType.Info -> Icons.Default.Article to Primary
        LogType.Success -> Icons.Default.CheckCircle to Success
        LogType.Error -> Icons.Default.Error to Error
        LogType.Receive -> Icons.Default.Download to Primary
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                log.message,
                style = MaterialTheme.typography.labelSmall,
                color = color
            )
            Text(
                log.timestamp,
                style = MaterialTheme.typography.labelSmall,
                color = TextSecondary
            )
        }
    }
}
