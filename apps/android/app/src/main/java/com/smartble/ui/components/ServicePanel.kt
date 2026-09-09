package com.smartble.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.core.model.BleCharacteristic
import com.smartble.core.model.BleService
import com.smartble.ui.design.DsChip
import com.smartble.ui.design.DsChipTone
import com.smartble.ui.design.DsGhostButton
import com.smartble.ui.design.DsIcons
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.theme.cCard
import com.smartble.ui.theme.cLine
import com.smartble.ui.theme.cLineSoft
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cPrimary
import com.smartble.ui.theme.cText

/**
 * 正典服务面板（COMPONENT.md C4 · components.css .svc）：
 * svc 卡（白/边/r16/overflow 裁切）+ svc-h 折叠头（chip 图标 + 名称 + uuid chip + chev）
 * + svc-b 特征行（read/write/notify chips + 读取/写入 soft + 监听 ghost）。
 * 折叠态由页面持有（P006 全部展开/收起联动）。
 */
@Composable
fun ServicePanel(
    services: List<BleService>,
    expanded: Set<String>,
    onToggleService: (String) -> Unit,
    onRead: (BleService, BleCharacteristic) -> Unit,
    onWrite: (BleService, BleCharacteristic) -> Unit,
    onToggleNotify: (BleService, BleCharacteristic) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        services.forEach { service ->
            ServiceCard(
                service = service,
                expanded = service.uuid in expanded,
                onToggle = { onToggleService(service.uuid) },
                onRead = onRead,
                onWrite = onWrite,
                onToggleNotify = onToggleNotify,
            )
        }
    }
}

@Composable
fun ServiceCard(
    service: BleService,
    expanded: Boolean,
    onToggle: () -> Unit,
    onRead: (BleService, BleCharacteristic) -> Unit,
    onWrite: (BleService, BleCharacteristic) -> Unit,
    onToggleNotify: (BleService, BleCharacteristic) -> Unit,
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
                    size = androidx.compose.ui.geometry.Size(size.width - w, size.height - w),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(16.dp.toPx()),
                    style = androidx.compose.ui.graphics.drawscope.Stroke(w),
                )
            },
    ) {
        // svc-h 折叠头
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onToggle,
                )
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(9.dp),
        ) {
            Icon(DsIcons.Chip, contentDescription = null, modifier = Modifier.size(17.dp), tint = cPrimary)
            Text(
                service.displayName,
                fontSize = 15.sp,
                fontWeight = FontWeight.W700,
                color = cText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            DsChip(text = service.shortUuid, tone = DsChipTone.Neutral, mono = true)
            Icon(
                DsIcons.ChevR,
                contentDescription = if (expanded) "收起" else "展开",
                modifier = Modifier.size(17.dp).rotate(if (expanded) 90f else 0f),
                tint = cMut,
            )
        }
        // svc-b 特征列表
        if (expanded) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .drawBehind {
                        val y = 0.5.dp.toPx()
                        drawLine(cLineSoft, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
                    },
            ) {
                service.characteristics.forEachIndexed { index, ch ->
                    CharRow(
                        characteristic = ch,
                        showDivider = index < service.characteristics.lastIndex,
                        onRead = { onRead(service, ch) },
                        onWrite = { onWrite(service, ch) },
                        onToggleNotify = { onToggleNotify(service, ch) },
                    )
                }
            }
        }
    }
}

@Composable
private fun CharRow(
    characteristic: BleCharacteristic,
    showDivider: Boolean,
    onRead: () -> Unit,
    onWrite: () -> Unit,
    onToggleNotify: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .drawBehind {
                if (showDivider) {
                    val y = size.height - 0.5.dp.toPx()
                    drawLine(cLineSoft, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
                }
            }
            .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                characteristic.displayName,
                fontSize = 13.sp,
                fontWeight = FontWeight.W600,
                color = cText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            if (characteristic.canRead) DsChip(text = "read", tone = DsChipTone.Primary, mono = true)
            if (characteristic.canWrite) DsChip(text = "write", tone = DsChipTone.Success, mono = true)
            if (characteristic.canNotify) DsChip(text = "notify", tone = DsChipTone.Warning, mono = true)
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            if (characteristic.canRead) {
                DsSoftButton(label = "读取", onClick = onRead, small = true)
            }
            if (characteristic.canWrite) {
                DsSoftButton(label = "写入", onClick = onWrite, small = true)
            }
            if (characteristic.canNotify) {
                DsGhostButton(
                    label = if (characteristic.isNotifying) "停止监听" else "开始监听",
                    onClick = onToggleNotify,
                    small = true,
                )
            }
        }
    }
}
