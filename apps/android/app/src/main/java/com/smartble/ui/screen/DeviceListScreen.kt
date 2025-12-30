package com.smartble.ui.screen

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.BluetoothDisabled
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.SignalWifi1Bar
import androidx.compose.material.icons.filled.SignalWifi2Bar
import androidx.compose.material.icons.filled.SignalWifi3Bar
import androidx.compose.material.icons.filled.SignalWifi4Bar
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartble.core.ble.BluetoothState
import com.smartble.core.model.BleDevice
import com.smartble.core.model.RssiLevel
import com.smartble.ui.theme.Error
import com.smartble.ui.theme.Primary
import com.smartble.ui.theme.RssiExcellent
import com.smartble.ui.theme.RssiFair
import com.smartble.ui.theme.RssiGood
import com.smartble.ui.theme.RssiWeak
import com.smartble.ui.theme.Success
import com.smartble.ui.theme.TextSecondary
import com.smartble.ui.viewmodel.DeviceListUiState
import com.smartble.ui.viewmodel.DeviceListViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceListScreen(
    viewModel: DeviceListViewModel,
    onDeviceClick: (String, String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val scanResults by viewModel.scanResults.collectAsState()
    val isScanning by viewModel.isScanning.collectAsState()
    val bluetoothState by viewModel.bluetoothState.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Smart BLE") },
                actions = {
                    BluetoothStateIndicator(bluetoothState)
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Error message
            errorMessage?.let { message ->
                ErrorMessageCard(message = message, onDismiss = { viewModel.clearError() })
            }

            // Bluetooth state
            when (uiState) {
                is DeviceListUiState.BluetoothOff -> BluetoothOffCard(
                    onEnableClick = { viewModel.enableBluetooth() }
                )
                is DeviceListUiState.BluetoothUnavailable -> BluetoothUnavailableCard()
                else -> {
                    // Scan controls
                    ScanControlsCard(
                        isScanning = isScanning,
                        deviceCount = scanResults.size,
                        onToggleScan = { viewModel.toggleScan() }
                    )

                    // Device list
                    if (scanResults.isEmpty()) {
                        EmptyState()
                    } else {
                        DeviceList(
                            devices = scanResults,
                            onDeviceClick = onDeviceClick
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun BluetoothStateIndicator(state: BluetoothState?) {
    val (icon, tint, text) = when (state) {
        BluetoothState.On -> Triple(Icons.Default.Bluetooth, Success, "蓝牙已开启")
        BluetoothState.Off -> Triple(Icons.Default.BluetoothDisabled, TextSecondary, "蓝牙已关闭")
        BluetoothState.Unavailable -> Triple(Icons.Default.BluetoothDisabled, Error, "蓝牙不可用")
        BluetoothState.Unauthorized -> Triple(Icons.Default.BluetoothDisabled, Error, "未授权")
        null -> Triple(Icons.Default.BluetoothDisabled, TextSecondary, "状态未知")
    }

    Row(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier.size(8.dp),
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(8.dp)
            )
        }
        Spacer(modifier = Modifier.width(6.dp))
        Text(text, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun ErrorMessageCard(message: String, onDismiss: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Error.copy(alpha = 0.1f)
        ),
        border = CardDefaults.outlinedCardBorder()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Error,
                contentDescription = null,
                tint = Error,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                message,
                style = MaterialTheme.typography.bodyMedium,
                color = Error,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                Icon(
                    Icons.Default.Clear,
                    contentDescription = "关闭",
                    tint = Error,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
fun BluetoothOffCard(onEnableClick: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.BluetoothDisabled,
            contentDescription = null,
            tint = TextSecondary,
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "蓝牙未开启",
            style = MaterialTheme.typography.titleMedium,
            color = TextSecondary
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "请开启蓝牙以继续使用",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = onEnableClick) {
            Text("开启蓝牙")
        }
    }
}

@Composable
fun BluetoothUnavailableCard() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.BluetoothDisabled,
            contentDescription = null,
            tint = Error,
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "蓝牙不可用",
            style = MaterialTheme.typography.titleMedium,
            color = Error
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "您的设备不支持蓝牙低功耗(BLE)",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
    }
}

@Composable
fun ScanControlsCard(
    isScanning: Boolean,
    deviceCount: Int,
    onToggleScan: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = onToggleScan,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isScanning) Error else Primary
                ),
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    if (isScanning) Icons.Default.Stop else Icons.Default.Search,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(if (isScanning) "停止扫描" else "开始扫描")
            }

            Spacer(modifier = Modifier.width(12.dp))

            DeviceCountBadge(count = deviceCount)
        }
    }
}

@Composable
fun DeviceCountBadge(count: Int) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = Primary.copy(alpha = 0.1f)
        )
    ) {
        Text(
            "发现 $count 台设备",
            style = MaterialTheme.typography.labelLarge,
            color = Primary,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
        )
    }
}

@Composable
fun EmptyState() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.Bluetooth,
            contentDescription = null,
            tint = TextSecondary.copy(alpha = 0.5f),
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "暂无设备",
            style = MaterialTheme.typography.titleMedium,
            color = TextSecondary
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "点击上方按钮开始扫描",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary.copy(alpha = 0.7f)
        )
    }
}

@Composable
fun DeviceList(
    devices: List<BleDevice>,
    onDeviceClick: (String, String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(devices) { device ->
            DeviceCard(device = device, onClick = onDeviceClick)
        }
    }
}

@Composable
fun DeviceCard(device: BleDevice, onClick: (String, String) -> Unit) {
    val rssiColor = when (device.rssiLevel) {
        RssiLevel.Excellent -> RssiExcellent
        RssiLevel.Good -> RssiGood
        RssiLevel.Fair -> RssiFair
        RssiLevel.Weak -> RssiWeak
    }

    val rssiIcon = when (device.rssiLevel) {
        RssiLevel.Excellent -> Icons.Default.SignalWifi4Bar
        RssiLevel.Good -> Icons.Default.SignalWifi3Bar
        RssiLevel.Fair -> Icons.Default.SignalWifi2Bar
        RssiLevel.Weak -> Icons.Default.SignalWifi1Bar
    }

    Card(
        onClick = { onClick(device.id, device.displayName) },
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Device icon
            Card(
                colors = CardDefaults.cardColors(containerColor = Primary)
            ) {
                Box(
                    modifier = Modifier.size(48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Bluetooth,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Device info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    device.displayName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.W600
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    device.id,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            // RSSI indicator
            Column(horizontalAlignment = Alignment.End) {
                Icon(
                    rssiIcon,
                    contentDescription = null,
                    tint = rssiColor,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    "${device.rssi} dBm",
                    style = MaterialTheme.typography.labelSmall,
                    color = rssiColor,
                    fontWeight = FontWeight.W500
                )
            }
        }
    }
}
