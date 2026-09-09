package com.smartble.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.core.model.LogEntry
import com.smartble.core.model.LogType
import com.smartble.ui.design.DsIcons
import com.smartble.ui.theme.cCard
import com.smartble.ui.theme.cInk
import com.smartble.ui.theme.cInkLine
import com.smartble.ui.theme.cInkText
import com.smartble.ui.theme.cLine
import com.smartble.ui.theme.cLineSoft
import com.smartble.ui.theme.cLogErr
import com.smartble.ui.theme.cLogErrBg
import com.smartble.ui.theme.cLogOk
import com.smartble.ui.theme.cLogOkBg
import com.smartble.ui.theme.cLogRead
import com.smartble.ui.theme.cLogReadBg
import com.smartble.ui.theme.cLogRecv
import com.smartble.ui.theme.cLogRecvBg
import com.smartble.ui.theme.cLogSys
import com.smartble.ui.theme.cLogSysBg
import com.smartble.ui.theme.cLogWrite
import com.smartble.ui.theme.cLogWriteBg
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cSub

/**
 * 正典通信日志面板（COMPONENT.md C5 · components.css .logwrap dock/cardv 双变体）：
 * dock = P006 贴底深色控制台；card = P008 白卡变体。
 * 行结构：时间 mono + 类型 chip + 消息 mono。
 */
enum class LogVariant { Dock, Card }

@Composable
fun LogPanel(
    logs: List<LogEntry>,
    modifier: Modifier = Modifier,
    variant: LogVariant = LogVariant.Dock,
    emptyText: String = "暂无日志",
    onClear: (() -> Unit)? = null,
    onExport: (() -> Unit)? = null,
) {
    val dark = variant == LogVariant.Dock
    val barBg = if (dark) cInk else cCard
    val titleColor = if (dark) cInkText else cSub
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(barBg),
    ) {
        // logbar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .drawBehind {
                    val y = size.height - 0.5.dp.toPx()
                    drawLine(
                        if (dark) cInkLine else cLineSoft,
                        Offset(0f, y),
                        Offset(size.width, y),
                        strokeWidth = 1.dp.toPx(),
                    )
                }
                .padding(horizontal = 13.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(DsIcons.Log, contentDescription = null, modifier = Modifier.size(13.dp), tint = titleColor)
            Text("通信日志", fontSize = 12.sp, fontWeight = FontWeight.W700, color = titleColor, modifier = Modifier.weight(1f))
            Text(
                "清空",
                fontSize = 12.sp,
                fontWeight = FontWeight.W600,
                color = if (dark) Color(0xFFFF8B94) else com.smartble.ui.theme.cDanger,
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = { onClear?.invoke() },
                    )
                    .padding(horizontal = 6.dp, vertical = 6.dp),
            )
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = { onExport?.invoke() },
                    )
                    .padding(horizontal = 6.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(DsIcons.Copy, contentDescription = null, modifier = Modifier.size(13.dp), tint = titleColor)
                Text("导出", fontSize = 12.sp, fontWeight = FontWeight.W600, color = titleColor)
            }
        }
        // loglist
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 220.dp)
                .verticalScroll(rememberScrollState())
                .padding(vertical = 6.dp),
        ) {
            if (logs.isEmpty()) {
                Text(
                    emptyText,
                    fontSize = 12.sp,
                    color = if (dark) Color(0xFF7C8DA6) else cMut,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 22.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            } else {
                logs.reversed().forEach { log -> LogRow(log, dark) }
            }
        }
    }
}

@Composable
private fun LogRow(log: LogEntry, dark: Boolean) {
    val (label, lightFg, lightBg, darkFg, darkBg) = when (log.type) {
        LogType.Info -> LogChipColors("系统", cLogSys, cLogSysBg, Color(0xFF9FB6D6), Color(0xFF1B2536))
        LogType.Error -> LogChipColors("错误", cLogErr, cLogErrBg, Color(0xFFFF8B94), Color(0xFF3A1F26))
        LogType.Warning -> LogChipColors("警告", cLogErr, cLogErrBg, Color(0xFFFFC37E), Color(0xFF39301C))
        LogType.Success -> LogChipColors("成功", cLogOk, cLogOkBg, Color(0xFF5EE0C4), Color(0xFF14342E))
        LogType.Receive -> LogChipColors("接收", cLogRecv, cLogRecvBg, Color(0xFFBBA8FF), Color(0xFF2A2344))
        LogType.Send -> LogChipColors("写入", cLogWrite, cLogWriteBg, Color(0xFF8FB8FF), Color(0xFF1B2B4A))
    }
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 5.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        if (log.timestamp.isNotEmpty()) {
            Text(
                log.timestamp,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                color = if (dark) Color(0xFF7C8DA6) else cMut,
            )
        }
        Text(
            label,
            fontSize = 10.sp,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.W800,
            color = if (dark) darkFg else lightFg,
            modifier = Modifier
                .clip(RoundedCornerShape(5.dp))
                .background(if (dark) darkBg else lightBg)
                .padding(horizontal = 6.dp),
        )
        Text(
            log.message,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            color = if (dark) cInkText else cSub,
            lineHeight = 11.sp * 1.5f,
            modifier = Modifier.weight(1f),
        )
    }
}

private data class LogChipColors(
    val label: String,
    val lightFg: Color,
    val lightBg: Color,
    val darkFg: Color,
    val darkBg: Color,
)
