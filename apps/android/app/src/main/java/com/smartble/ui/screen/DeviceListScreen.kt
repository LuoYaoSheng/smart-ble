package com.smartble.ui.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.BluetoothDisabled
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.outlined.SignalCellularAlt
import androidx.compose.material3.BottomSheetScaffold
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
import androidx.compose.material3.SheetValue
import androidx.compose.material3.Snackbar
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberBottomSheetScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartble.core.ble.BluetoothState
import com.smartble.core.model.BleDevice
import com.smartble.core.model.ConnectionState
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
import kotlinx.coroutines.launch

// === Main Screen with Scaffold ===
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceListScreen(
    viewModel: DeviceListViewModel,
    onDeviceClick: (String, String) -> Unit
) {
    val bluetoothState by viewModel.bluetoothState.collectAsState()

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
        DeviceListContent(
            viewModel = viewModel,
            onDeviceClick = onDeviceClick,
            modifier = Modifier.padding(paddingValues)
        )
    }
}

// === Content without Scaffold ===
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceListContent(
    viewModel: DeviceListViewModel,
    onDeviceClick: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val filteredScanResults by viewModel.filteredScanResults.collectAsState()
    val isScanning by viewModel.isScanning.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val connectionState by viewModel.connectionState.collectAsState()

    // Filter state
    val filterRSSI by viewModel.filterRSSI.collectAsState()
    val filterNamePrefix by viewModel.filterNamePrefix.collectAsState()
    val hideUnnamed by viewModel.hideUnnamed.collectAsState()
    var filterExpanded by remember { mutableStateOf(false) }

    // Bottom sheet state
    val scaffoldState = rememberBottomSheetScaffoldState()
    val scope = rememberCoroutineScope()
    var selectedDevice by remember { mutableStateOf<BleDevice?>(null) }

    BottomSheetScaffold(
        scaffoldState = scaffoldState,
        sheetContent = {
            selectedDevice?.let { device ->
                DeviceDetailSheet(
                    device = device,
                    connectionState = connectionState,
                    onConnect = {
                        viewModel.connect(device.id)
                        scope.launch {
                            kotlinx.coroutines.delay(500)
                        }
                    },
                    onDismiss = {
                        scope.launch {
                            scaffoldState.bottomSheetState.partialExpand()
                        }
                    }
                )
            }
        },
        sheetPeekHeight = 0.dp
    ) { innerPadding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
                // Error message
                errorMessage?.let { message ->
                    ErrorMessageCard(message = message, onDismiss = { viewModel.clearError() })
                }

                // Connection in progress
                if (connectionState == ConnectionState.Connecting) {
                    ConnectingCard()
                }

                // Bluetooth state
                when (uiState) {
                    is DeviceListUiState.Initializing -> ConnectingCard(message = "正在初始化蓝牙...")
                    is DeviceListUiState.BluetoothOff -> BluetoothOffCard(
                        onEnableClick = { viewModel.enableBluetooth() }
                    )
                    is DeviceListUiState.BluetoothUnavailable -> BluetoothUnavailableCard()
                    is DeviceListUiState.BluetoothUnauthorized -> BluetoothUnauthorizedCard()
                    is DeviceListUiState.Ready -> {
                        FilterPanel(
                            expanded = filterExpanded,
                            onToggleExpanded = { filterExpanded = !filterExpanded },
                            filterRSSI = filterRSSI,
                            onFilterRSSIChange = { viewModel.setFilterRSSI(it) },
                            filterNamePrefix = filterNamePrefix,
                            onFilterNamePrefixChange = { viewModel.setFilterNamePrefix(it) },
                            hideUnnamed = hideUnnamed,
                            onHideUnnamedChange = { viewModel.setHideUnnamed(it) },
                            onReset = { viewModel.resetFilters() }
                        )

                        ScanControlsCard(
                            isScanning = isScanning,
                            deviceCount = filteredScanResults.size,
                            onToggleScan = { viewModel.toggleScan() }
                        )

                        if (filteredScanResults.isEmpty()) {
                            EmptyState()
                        } else {
                            DeviceList(
                                devices = filteredScanResults,
                                onDeviceClick = { device ->
                                    selectedDevice = device
                                    scope.launch {
                                        scaffoldState.bottomSheetState.expand()
                                    }
                                },
                                onConnectClick = { deviceId ->
                                    viewModel.connect(deviceId)
                                },
                                connectionState = connectionState
                            )
                        }
                    }
                }
            }
        }

    // Navigate to detail page when connected
    LaunchedEffect(connectionState) {
        if (connectionState == ConnectionState.Connected && selectedDevice != null) {
            onDeviceClick(selectedDevice!!.id, selectedDevice!!.displayName)
            selectedDevice = null
        }
    }
}

@Composable
fun ConnectingCard() {
    ConnectingCard(message = "正在连接设备...")
}

@Composable
fun ConnectingCard(message: String) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(
            containerColor = Primary.copy(alpha = 0.1f)
        )
    ) {
    Row(
        modifier = Modifier.padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(20.dp),
            color = Primary
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyMedium,
            color = Primary
        )
    }
    }
}

@Composable
fun BluetoothUnauthorizedCard() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Error.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                "蓝牙权限未授权",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = Error
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "请在系统设置中授予蓝牙扫描和连接权限后重试。",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceDetailSheet(
    device: BleDevice,
    connectionState: ConnectionState,
    onConnect: () -> Unit,
    onDismiss: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        // Drag handle
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .width(40.dp)
                    .height(4.dp)
                    .background(
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                        shape = RoundedCornerShape(2.dp)
                    )
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Device info
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Primary)
            ) {
                Box(
                    modifier = Modifier.size(56.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Bluetooth,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column {
                Text(
                    device.displayName,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    device.id,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Device details
        DetailRow("信号强度", "${device.rssi} dBm")
        DetailRow("设备状态", when (connectionState) {
            ConnectionState.Connected -> "已连接"
            ConnectionState.Connecting -> "连接中..."
            ConnectionState.Disconnected -> "未连接"
            ConnectionState.Disconnecting -> "断开中..."
        })

        // Scan record info
        device.scanRecord?.let { record ->
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "广播数据",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(8.dp))

            record.serviceUuids?.let { uuids ->
                if (uuids.isNotEmpty()) {
                    DetailRow("服务UUID", "${uuids.size} 个")
                }
            }
            record.txPowerLevel?.let {
                DetailRow("发射功率", "$it dBm")
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Connect button
        Button(
            onClick = {
                onConnect()
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = connectionState != ConnectionState.Connecting && connectionState != ConnectionState.Connected,
            colors = ButtonDefaults.buttonColors(
                containerColor = Primary
            ),
            shape = RoundedCornerShape(12.dp)
        ) {
            if (connectionState == ConnectionState.Connecting) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = Color.White
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("连接中...")
            } else {
                Icon(Icons.Default.Link, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("连接设备")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Close button
        TextButton(
            onClick = onDismiss,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("关闭")
        }
    }
}

@Composable
fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium
        )
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
    onDeviceClick: (BleDevice) -> Unit,
    onConnectClick: (String) -> Unit,
    connectionState: ConnectionState
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(devices) { device ->
            DeviceCard(
                device = device,
                onDeviceClick = onDeviceClick,
                onConnectClick = onConnectClick,
                connectionState = connectionState
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceCard(
    device: BleDevice,
    onDeviceClick: (BleDevice) -> Unit,
    onConnectClick: (String) -> Unit,
    connectionState: ConnectionState
) {
    val rssiColor = when (device.rssiLevel) {
        RssiLevel.Excellent -> RssiExcellent
        RssiLevel.Good -> RssiGood
        RssiLevel.Fair -> RssiFair
        RssiLevel.Weak -> RssiWeak
    }

    val rssiIcon = Icons.Outlined.SignalCellularAlt
    val isConnectingThis = connectionState == ConnectionState.Connecting
    val isConnected = connectionState == ConnectionState.Connected

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onDeviceClick(device) },
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

            Spacer(modifier = Modifier.width(12.dp))

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

            Spacer(modifier = Modifier.width(8.dp))

            // Connect button
            IconButton(
                onClick = {
                    onConnectClick(device.id)
                },
                enabled = !isConnectingThis && !isConnected,
                modifier = Modifier.size(40.dp)
            ) {
                if (isConnectingThis) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Primary
                    )
                } else {
                    Icon(
                        Icons.Default.Link,
                        contentDescription = "连接",
                        tint = Primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
