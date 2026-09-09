package com.smartble.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.core.model.BleDevice
import com.smartble.core.model.ConnectionState
import com.smartble.ui.design.DsPrimaryButton
import com.smartble.ui.design.DsSignal
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.design.DsIcons
import com.smartble.ui.theme.cAvaGradEnd
import com.smartble.ui.theme.cCard
import com.smartble.ui.theme.cLine
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cPh
import com.smartble.ui.theme.cPrimary
import com.smartble.ui.theme.cPrimaryWeak
import com.smartble.ui.theme.cSuccess
import com.smartble.ui.theme.cText

/**
 * 正典设备卡（COMPONENT.md C1 · components.css .dev · scan 变体）：
 * 白卡 cLine 边 r16 + 头像渐变方块 + 名称/mono ID + 信号条；acts 行连接按钮。
 */
@Composable
fun DeviceCard(
    device: BleDevice,
    onDeviceClick: (BleDevice) -> Unit,
    onAction: (BleDevice) -> Unit,
) {
    val connected = device.state == ConnectionState.Connected
    val busy = device.state == ConnectionState.Connecting || device.state == ConnectionState.Disconnecting
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(cCard)
            .drawBehind {
                val w = 1.dp.toPx()
                drawRoundRect(
                    color = cLine,
                    topLeft = Offset(w / 2, w / 2),
                    size = Size(size.width - w, size.height - w),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(16.dp.toPx()),
                    style = Stroke(w),
                )
            }
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { onDeviceClick(device) }
            .padding(16.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
            DeviceAva(device, connectedBadge = false)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    device.name ?: "未命名 BLE 设备",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.W700,
                    color = cText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    if (device.name != null) device.deviceId else "${device.deviceId}（未命名）",
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = cMut,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp),
                )
                Row(
                    modifier = Modifier.padding(top = 5.dp),
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    DsSignal(rssi = device.rssi)
                    Text(
                        "${device.rssi} dBm",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = cMut,
                        fontWeight = FontWeight.W600,
                    )
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            when {
                busy -> DsPrimaryButton(
                    label = "连接中…",
                    icon = null,
                    onClick = {},
                    small = true,
                    loading = true,
                    enabled = false,
                    modifier = Modifier.weight(1f),
                )
                connected -> Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(32.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(com.smartble.ui.theme.cFill),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("已连接", fontSize = 13.sp, fontWeight = FontWeight.W600, color = cPh)
                }
                else -> DsPrimaryButton(
                    label = "连接",
                    icon = DsIcons.Link,
                    onClick = { onAction(device) },
                    small = true,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

/**
 * 正典设备卡 conn 变体（P007）：头像带 success 角标 + meta 副行 + 右侧断开软按钮。
 */
@Composable
fun DeviceCardConnected(
    device: BleDevice,
    onTap: () -> Unit,
    onDisconnect: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(cCard)
            .drawBehind {
                val w = 1.dp.toPx()
                drawRoundRect(
                    color = cLine,
                    topLeft = Offset(w / 2, w / 2),
                    size = Size(size.width - w, size.height - w),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(16.dp.toPx()),
                    style = Stroke(w),
                )
            }
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onTap,
            )
            .padding(16.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            DeviceAva(device, connectedBadge = true)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    device.name ?: "未命名设备",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.W700,
                    color = cText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    device.deviceId,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = cMut,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp),
                )
                Row(
                    modifier = Modifier.padding(top = 5.dp),
                    verticalAlignment = Alignment.Bottom,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    DsSignal(rssi = device.rssi)
                    Text(
                        "${device.rssi} dBm",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = cMut,
                        fontWeight = FontWeight.W600,
                    )
                    Text("已连接 · 可进行 GATT 调试", fontSize = 11.sp, color = cMut)
                }
            }
            DsSoftButton(
                label = "断开",
                onClick = onDisconnect,
                small = true,
                danger = true,
            )
        }
    }
}

/** 头像方块（.dev .ava）：44dp r10 primary-weak 渐变 + 首字母；conn 变体加 success 角标 */
@Composable
private fun DeviceAva(device: BleDevice, connectedBadge: Boolean) {
    Box {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(Brush.linearGradient(listOf(cPrimaryWeak, cAvaGradEnd))),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                ((device.name ?: device.deviceId).trim().firstOrNull() ?: '?').toString().uppercase(),
                color = cPrimary,
                fontSize = 17.sp,
                fontWeight = FontWeight.W800,
            )
        }
        if (connectedBadge) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .offset(x = (-4).dp, y = (-4).dp)
                    .size(15.dp)
                    .drawBehind { drawCircle(cCard, radius = size.minDimension / 2f + 2.dp.toPx()) }
                    .background(cSuccess, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    DsIcons.Check,
                    contentDescription = "已连接",
                    modifier = Modifier.size(9.dp),
                    tint = cCard,
                )
            }
        }
    }
}
