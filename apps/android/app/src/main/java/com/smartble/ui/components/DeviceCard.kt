package com.smartble.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.Box
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.BluetoothDisabled
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.outlined.SignalCellularAlt
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
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
import com.smartble.ui.theme.Warning

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceCard(
    device: BleDevice,
    onDeviceClick: (BleDevice) -> Unit,
    onAction: (BleDevice) -> Unit,
    isConnectionTab: Boolean = false
) {
    val rssiColor = when (device.rssiLevel) {
        RssiLevel.Excellent -> RssiExcellent
        RssiLevel.Good -> RssiGood
        RssiLevel.Fair -> RssiFair
        RssiLevel.Weak -> RssiWeak
    }

    val rssiIcon = Icons.Outlined.SignalCellularAlt
    val isConnectingThis = device.state == ConnectionState.Connecting
    val isConnected = device.state == ConnectionState.Connected
    val isDisconnecting = device.state == ConnectionState.Disconnecting

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
                colors = CardDefaults.cardColors(containerColor = if (isConnected) Success else Primary)
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
                    device.deviceId,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // RSSI indicator OR Status Text
            if (!isConnectionTab) {
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

            Spacer(modifier = Modifier.width(8.dp))

            // Action button (Connect or Disconnect)
            IconButton(
                onClick = { onAction(device) },
                enabled = !isConnectingThis && !isDisconnecting,
                modifier = Modifier.size(40.dp)
            ) {
                if (isConnectingThis || isDisconnecting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = if (isDisconnecting) Warning else Primary
                    )
                } else if (isConnectionTab) {
                    Icon(
                        Icons.Default.BluetoothDisabled,
                        contentDescription = "断开",
                        tint = Error,
                        modifier = Modifier.size(20.dp)
                    )
                } else {
                    Icon(
                        if (isConnected) Icons.Default.CheckCircle else Icons.Default.Link,
                        contentDescription = if (isConnected) "已连接" else "连接",
                        tint = if (isConnected) Success else Primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
