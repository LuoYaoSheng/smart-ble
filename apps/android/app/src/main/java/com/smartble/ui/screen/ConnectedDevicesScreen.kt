package com.smartble.ui.screen

import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BluetoothConnected
import androidx.compose.material.icons.filled.BluetoothDisabled
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.LinkOff
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartble.core.model.ConnectionState
import com.smartble.ui.theme.Error
import com.smartble.ui.theme.Primary
import com.smartble.ui.theme.Success
import com.smartble.ui.theme.TextSecondary
import com.smartble.ui.viewmodel.DeviceListViewModel

/**
 * 已连接设备列表页面内容
 *
 * 展示所有已连接的 BLE 设备，点击跳转到设备详情页。
 */
@Composable
fun ConnectedDevicesContent(
    viewModel: DeviceListViewModel,
    onDeviceClick: (String, String) -> Unit
) {
    val connectedDevices by viewModel.connectedDevices.collectAsState()

    if (connectedDevices.isEmpty()) {
        EmptyConnectedState()
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // 顶部信息栏
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        "${connectedDevices.size} 个已连接设备",
                        style = MaterialTheme.typography.titleSmall,
                        color = TextSecondary
                    )
                    if (connectedDevices.size > 1) {
                        TextButton(
                            onClick = { viewModel.disconnectAll() }
                        ) {
                            Icon(
                                Icons.Default.BluetoothDisabled,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = Error
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("全部断开", color = Error)
                        }
                    }
                }
            }

            items(connectedDevices) { device ->
                ConnectedDeviceCard(
                    deviceId = device.id,
                    deviceName = device.displayName,
                    onTap = { onDeviceClick(device.id, device.displayName) },
                    onDisconnect = { viewModel.disconnectDevice(device.id) }
                )
            }
        }
    }
}

@Composable
private fun EmptyConnectedState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.BluetoothDisabled,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = TextSecondary.copy(alpha = 0.5f)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                "暂无已连接设备",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.W500,
                color = TextSecondary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "在扫描页面点击设备进行连接",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
        }
    }
}

@Composable
private fun ConnectedDeviceCard(
    deviceId: String,
    deviceName: String,
    onTap: () -> Unit,
    onDisconnect: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onTap() },
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 连接状态图标
            Surface(
                color = Success.copy(alpha = 0.1f),
                shape = MaterialTheme.shapes.medium
            ) {
                Box(
                    modifier = Modifier.size(48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.BluetoothConnected,
                        contentDescription = null,
                        tint = Success,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // 设备信息
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    deviceName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.W600
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    if (deviceId.length > 20) "${deviceId.take(20)}..." else deviceId,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }

            // 断开连接按钮
            IconButton(onClick = onDisconnect) {
                Icon(
                    Icons.Default.LinkOff,
                    contentDescription = "断开",
                    tint = Error,
                    modifier = Modifier.size(20.dp)
                )
            }

            // 箭头
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = TextSecondary
            )
        }
    }
}
