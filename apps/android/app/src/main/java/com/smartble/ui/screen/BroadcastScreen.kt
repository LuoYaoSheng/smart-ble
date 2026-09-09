package com.smartble.ui.screen

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.ui.components.LogPanel
import com.smartble.ui.components.LogVariant
import com.smartble.ui.design.DsChip
import com.smartble.ui.design.DsErrLine
import com.smartble.ui.design.DsFieldLabel
import com.smartble.ui.design.DsIcons
import com.smartble.ui.design.DsInput
import com.smartble.ui.design.DsNote
import com.smartble.ui.design.DsNoteKind
import com.smartble.ui.design.DsPicker
import com.smartble.ui.design.DsPrimaryButton
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.design.dsCard
import com.smartble.ui.theme.cDanger
import com.smartble.ui.theme.cFill
import com.smartble.ui.theme.cInk
import com.smartble.ui.theme.cLine
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cSub
import com.smartble.ui.theme.cText
import com.smartble.ui.viewmodel.BroadcastViewModel

/**
 * P008 广播（prototype p008-broadcast.js · Android 平台分支）：
 * 表单卡（名称/UUID/模式/功率/厂商块）+ bytebar 31B 预算 + budget 明细 +
 * 开始/停止 + 检查支持；日志面板 cardv 白卡变体。状态徽章在导航栏（MainActivity）。
 */
@Composable
fun BroadcastContent(viewModel: BroadcastViewModel) {
    val context = LocalContext.current
    val isAdvertising by viewModel.isAdvertising.collectAsState()
    val nameInput by viewModel.nameInput.collectAsState()
    val uuidInput by viewModel.uuidInput.collectAsState()
    val mfrIdInput by viewModel.mfrIdInput.collectAsState()
    val mfrDataInput by viewModel.mfrDataInput.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val logs by viewModel.logs.collectAsState()

    val bytes = viewModel.advBytes
    val over = bytes.total > 31

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
    ) {
        Spacer(modifier = Modifier.height(12.dp))
        Column(Modifier.dsCard()) {
            // 设备名称（Android 实际使用系统蓝牙名）
            DsFieldLabel(text = "设备名称", trailing = { if (isAdvertising) DsChip(text = "广播中禁用") })
            DsInput(
                value = nameInput,
                onValueChange = viewModel::updateName,
                enabled = !isAdvertising,
                trailing = {
                    Text("实际用系统蓝牙名", fontSize = 10.sp, color = cMut)
                },
            )

            Spacer(modifier = Modifier.height(12.dp))
            DsFieldLabel(text = "服务 UUID")
            DsInput(
                value = uuidInput,
                onValueChange = viewModel::updateUuid,
                placeholder = "4 / 8 / 36 位 HEX",
                mono = true,
                enabled = !isAdvertising,
            )
            if (viewModel.uuidInvalid) {
                DsErrLine(text = "UUID 需为 4 / 8 / 36 位十六进制")
            }

            Spacer(modifier = Modifier.height(12.dp))
            DsFieldLabel(text = "广播模式")
            DsPicker(value = "平衡（默认）")

            Spacer(modifier = Modifier.height(12.dp))
            DsFieldLabel(text = "发射功率")
            DsPicker(value = "高功率（默认）")

            Spacer(modifier = Modifier.height(12.dp))
            DsFieldLabel(text = "厂商 ID（HEX）")
            DsInput(
                value = mfrIdInput,
                onValueChange = viewModel::updateMfrId,
                placeholder = "0001",
                mono = true,
                enabled = !isAdvertising,
            )

            Spacer(modifier = Modifier.height(12.dp))
            DsFieldLabel(text = "厂商数据（ASCII）")
            DsInput(
                value = mfrDataInput,
                onValueChange = viewModel::updateMfrData,
                enabled = !isAdvertising,
            )

            // ADV 负载预算（bytebar 深色条）
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(cInk)
                    .padding(horizontal = 13.dp, vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("ADV 负载预算", fontSize = 10.sp, color = Color(0xFF8FA3C0), fontWeight = FontWeight.W600, modifier = Modifier.weight(1f))
                Text(
                    "${bytes.total}",
                    fontSize = 15.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.W800,
                    color = if (over) Color(0xFFFF8B94) else Color.White,
                )
                Text("/ 31 字节", fontSize = 11.sp, color = Color(0xFF7C8DA6))
            }

            // budget 明细
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(cFill)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                BudgetRow(label = "完整名称 (0x09)", value = "${bytes.name} B", over = bytes.name > 31)
                BudgetRow(label = "服务 UUID (0x03/0x07)", value = "${bytes.uuid} B")
                BudgetRow(label = "厂商块 (0xFF = 2+2+${mfrDataInput.length})", value = "${bytes.mfr} B")
                BudgetRow(
                    label = if (over) "合计 · 超限，启动将被拦截（不静默截断）" else "合计",
                    value = "${bytes.total} / 31 B",
                    over = over,
                    total = true,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(9.dp),
            ) {
                DsPrimaryButton(
                    label = if (isAdvertising) "停止广播" else "开始广播",
                    icon = if (isAdvertising) DsIcons.Stop else DsIcons.Cast,
                    danger = isAdvertising,
                    enabled = !over && !viewModel.uuidInvalid,
                    onClick = { viewModel.toggleAdvertising() },
                    modifier = Modifier.weight(1f),
                )
                DsSoftButton(
                    label = "检查支持",
                    icon = DsIcons.Refresh,
                    onClick = { viewModel.checkSupport() },
                    small = true,
                )
            }
        }

        if (errorMessage != null) {
            Spacer(modifier = Modifier.height(12.dp))
            DsNote(kind = DsNoteKind.Danger, boldLead = "广播失败：", text = errorMessage ?: "")
        }

        Spacer(modifier = Modifier.height(12.dp))
        LogPanel(
            logs = logs,
            variant = LogVariant.Card,
            emptyText = "暂无日志 · 开始广播或检查支持后，操作记录会显示在这里",
            onClear = { viewModel.clearLogs() },
            onExport = {
                val text = logs.reversed().joinToString("\n") { "[${it.timestamp}] ${it.message}" }
                val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clipboard.setPrimaryClip(ClipData.newPlainText("broadcast-log", text))
            },
        )
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun BudgetRow(label: String, value: String, over: Boolean = false, total: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .drawBehind {
                if (total) {
                    // 合计行顶边虚线（.budget .b-r.tot border-top dashed --c-line）
                    val y = 0.5.dp.toPx()
                    val dash = 3.dp.toPx()
                    val gap = 2.dp.toPx()
                    var x = 0f
                    while (x < size.width) {
                        drawLine(cLine, Offset(x, y), Offset(minOf(x + dash, size.width), y), strokeWidth = 1.dp.toPx())
                        x += dash + gap
                    }
                }
            }
            .padding(top = if (total) 7.dp else 2.5.dp, bottom = 2.5.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            label,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            color = when {
                over -> cDanger
                total -> cText
                else -> cSub
            },
            fontWeight = if (over || total) FontWeight.W800 else FontWeight.Normal,
        )
        Text(
            value,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
            color = if (over) cDanger else if (total) cText else cSub,
            fontWeight = if (over || total) FontWeight.W800 else FontWeight.Normal,
        )
    }
}
