package com.smartble.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.ui.components.DeviceCardConnected
import com.smartble.ui.design.AppEmpty
import com.smartble.ui.design.DsIcons
import com.smartble.ui.design.DsIll
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.design.dsCard
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cPrimary
import com.smartble.ui.viewmodel.DeviceListViewModel

/**
 * P007 已连接（PAGE_LAYOUT_CONTRACT tab 型 · prototype p007-connected.js）：
 * sumcard（N 台在线 + 全部断开）→ conn 设备卡纵列；空态 link 插画 + 去扫描 action。
 */
@Composable
fun ConnectedDevicesContent(
    viewModel: DeviceListViewModel,
    onDeviceClick: (String, String) -> Unit,
    onGoScan: () -> Unit = {},
) {
    val connectedDevices by viewModel.connectedDevices.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (connectedDevices.isEmpty()) {
            item {
                AppEmpty(
                    title = "还没有连接中的设备",
                    desc = "先在「扫描」页找到设备并连接，会话将保存在这里",
                    ill = DsIll.Link,
                    action = {
                        DsSoftButton(
                            label = "去扫描",
                            icon = DsIcons.Scan,
                            onClick = onGoScan,
                        )
                    },
                )
            }
        } else {
            item {
                SessionSumCard(
                    count = connectedDevices.size,
                    onDisconnectAll = { viewModel.disconnectAll() },
                )
            }
            items(connectedDevices, key = { it.deviceId }) { device ->
                DeviceCardConnected(
                    device = device,
                    onTap = { onDeviceClick(device.deviceId, device.displayName) },
                    onDisconnect = { viewModel.disconnectDevice(device.deviceId) },
                )
            }
        }
    }
}

/** 汇总卡（.sumcard）：N（display 主色）+ 台在线 · 全部为内存会话 + 全部断开 */
@Composable
private fun SessionSumCard(count: Int, onDisconnectAll: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp)
            .dsCard(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column {
            Text("$count", fontSize = 24.sp, fontWeight = FontWeight.W800, color = cPrimary)
            Text("台在线 · 全部为内存会话", fontSize = 12.sp, color = cMut)
        }
        Spacer(modifier = Modifier.weight(1f))
        if (count > 1) {
            DsSoftButton(
                label = "全部断开",
                icon = DsIcons.X,
                onClick = onDisconnectAll,
                small = true,
                danger = true,
            )
        }
    }
}
