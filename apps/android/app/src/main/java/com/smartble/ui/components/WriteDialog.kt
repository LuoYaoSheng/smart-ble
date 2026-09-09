package com.smartble.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.smartble.core.utils.DataConverter
import com.smartble.ui.design.DsPrimaryButton
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.theme.cBg
import com.smartble.ui.theme.cCard
import com.smartble.ui.theme.cDanger
import com.smartble.ui.theme.cFill
import com.smartble.ui.theme.cLine
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cPh
import com.smartble.ui.theme.cPrimary
import com.smartble.ui.theme.cSub
import com.smartble.ui.theme.cText

enum class SendMode { Single, Batch, Loop }
enum class WriteInputMode { Text, Hex }

/**
 * 正典写入弹窗（COMPONENT.md C9 · pages.css .modal/.seg/.ta）：
 * 居中白卡 r20；TEXT/HEX 与 单次/批量/循环 分段器；mono 文本域；
 * 底部按钮组 flex:1。发送逻辑沿用旧实现（含批量/循环参数）。
 */
@Composable
fun WriteCharacteristicDialog(
    characteristicName: String,
    onDismiss: () -> Unit,
    onConfirm: (ByteArray) -> Unit
) {
    var input by remember { mutableStateOf("") }
    var inputMode by remember { mutableStateOf(WriteInputMode.Text) }
    var sendMode by remember { mutableStateOf(SendMode.Single) }
    var loopCount by remember { mutableStateOf("10") }
    var intervalMs by remember { mutableStateOf("50") }
    var infiniteLoop by remember { mutableStateOf(false) }

    val validationError = when {
        input.isBlank() -> "请输入要写入的数据"
        inputMode == WriteInputMode.Hex && sendMode == SendMode.Batch -> {
            val lines = input.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
            val invalidLine = lines.firstOrNull { !DataConverter.isValidHex(it) }
            if (invalidLine != null) "HEX 格式无效: $invalidLine" else null
        }
        inputMode == WriteInputMode.Hex && !DataConverter.isValidHex(input) -> "HEX 格式无效，请输入偶数长度十六进制，例如 FF00AA"
        else -> null
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 36.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(cCard)
                .padding(start = 20.dp, end = 20.dp, top = 22.dp, bottom = 16.dp),
        ) {
            Text(
                "写入特征值",
                fontSize = 16.sp,
                fontWeight = FontWeight.W700,
                color = cText,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                characteristicName,
                fontSize = 11.sp,
                color = cMut,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 3.dp),
            )

            Spacer(modifier = Modifier.height(14.dp))
            DsSeg(
                options = listOf("TEXT", "HEX"),
                selected = if (inputMode == WriteInputMode.Text) 0 else 1,
                onSelect = { inputMode = if (it == 0) WriteInputMode.Text else WriteInputMode.Hex },
            )

            Spacer(modifier = Modifier.height(10.dp))
            DsSeg(
                options = listOf("单次", "批量", "循环"),
                selected = sendMode.ordinal,
                onSelect = { sendMode = SendMode.entries[it] },
            )

            Spacer(modifier = Modifier.height(10.dp))
            BasicTextField(
                value = input,
                onValueChange = { input = it },
                textStyle = TextStyle(color = cText, fontSize = 13.sp, fontFamily = FontFamily.Monospace, lineHeight = 13.sp * 1.5f),
                cursorBrush = SolidColor(cPrimary),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = if (sendMode == SendMode.Batch) 110.dp else 84.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(cBg)
                    .border(1.5.dp, cLine, RoundedCornerShape(8.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                decorationBox = { inner ->
                    Box {
                        if (input.isEmpty()) {
                            Text(
                                when {
                                    sendMode == SendMode.Batch && inputMode == WriteInputMode.Hex -> "FF 01 AA\n00 02 BB\n03 CC DD"
                                    sendMode == SendMode.Batch -> "第一行\n第二行\n第三行"
                                    inputMode == WriteInputMode.Text -> "例如：hello"
                                    else -> "例如：FF 00 AA"
                                },
                                fontSize = 13.sp,
                                fontFamily = FontFamily.Monospace,
                                color = cPh,
                            )
                        }
                        inner()
                    }
                },
            )

            if (sendMode == SendMode.Loop) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("次数", fontSize = 12.sp, color = cSub)
                    if (!infiniteLoop) {
                        DsMiniInput(value = loopCount, onValueChange = { loopCount = it.filter { c -> c.isDigit() } })
                    }
                    Text(
                        if (infiniteLoop) "✓ 无限循环" else "无限循环",
                        fontSize = 12.sp,
                        color = if (infiniteLoop) cPrimary else cSub,
                        fontWeight = FontWeight.W600,
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null,
                            ) { infiniteLoop = !infiniteLoop }
                            .padding(4.dp),
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("间隔", fontSize = 12.sp, color = cSub)
                    DsMiniInput(value = intervalMs, onValueChange = { intervalMs = it.filter { c -> c.isDigit() } })
                    Text("ms", fontSize = 12.sp, color = cMut)
                }
            }

            if (sendMode == SendMode.Batch) {
                Text(
                    "每行一条指令，按顺序发送",
                    fontSize = 11.sp,
                    color = cMut,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

            Text(
                validationError ?: "当前模式：${if (inputMode == WriteInputMode.Text) "TEXT" else "HEX"}",
                fontSize = 12.sp,
                color = if (validationError != null) cDanger else cMut,
                modifier = Modifier.padding(top = 10.dp),
            )

            Spacer(modifier = Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                DsSoftButton(label = "取消", onClick = onDismiss, modifier = Modifier.weight(1f))
                DsPrimaryButton(
                    label = when (sendMode) {
                        SendMode.Single -> "写入"
                        SendMode.Batch -> "批量发送"
                        SendMode.Loop -> "开始循环"
                    },
                    icon = null,
                    enabled = validationError == null,
                    onClick = {
                        val payload = when (inputMode) {
                            WriteInputMode.Hex -> DataConverter.hexToBytes(input)
                            WriteInputMode.Text -> DataConverter.stringToBytes(input)
                        }
                        onConfirm(payload)
                    },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

/** 分段器（.seg）：cFill 底圆角 8；激活白底主色字带阴影 */
@Composable
private fun DsSeg(options: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(cFill)
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        options.forEachIndexed { i, opt ->
            val active = i == selected
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(30.dp)
                    .clip(RoundedCornerShape(7.dp))
                    .background(if (active) cCard else cFill)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { onSelect(i) },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    opt,
                    fontSize = 12.sp,
                    color = if (active) cPrimary else cSub,
                    fontWeight = if (active) FontWeight.W800 else FontWeight.W600,
                )
            }
        }
    }
}

/** 弹窗内数字小输入（次数/间隔） */
@Composable
private fun DsMiniInput(value: String, onValueChange: (String) -> Unit) {
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        textStyle = TextStyle(color = cText, fontSize = 13.sp),
        cursorBrush = SolidColor(cPrimary),
        modifier = Modifier
            .width(72.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(cBg)
            .border(1.dp, cLine, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
    )
}
