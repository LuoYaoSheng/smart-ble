package com.smartble.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.width
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonSegment
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.smartble.core.model.BleCharacteristic
import com.smartble.core.model.hexToByteArray
import com.smartble.ui.theme.Error
import com.smartble.ui.theme.TextSecondary

enum class SendMode { Single, Batch, Loop }
enum class WriteInputMode { Text, Hex }

data class WriteDialogResult(
    val data: String,
    val isHexMode: Boolean,
    val sendMode: SendMode = SendMode.Single,
    val loopCount: Int = 1,
    val intervalMs: Int = 50,
)

fun isValidHexInput(input: String): Boolean {
    val clean = input.replace(" ", "")
    if (clean.length % 2 != 0) return false
    return clean.matches(Regex("^[0-9A-Fa-f]+$"))
}

@OptIn(ExperimentalMaterial3Api::class)
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
            val invalidLine = lines.firstOrNull { !isValidHexInput(it) }
            if (invalidLine != null) "HEX 格式无效: $invalidLine" else null
        }
        inputMode == WriteInputMode.Hex && !isValidHexInput(input) -> "HEX 格式无效，请输入偶数长度十六进制，例如 FF00AA"
        else -> null
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column {
                Text("写入特征值")
                Text(
                    characteristicName,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                )
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { inputMode = WriteInputMode.Text },
                        enabled = inputMode != WriteInputMode.Text
                    ) { Text("TEXT") }
                    OutlinedButton(
                        onClick = { inputMode = WriteInputMode.Hex },
                        enabled = inputMode != WriteInputMode.Hex
                    ) { Text("HEX") }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        SendMode.Single to "单次",
                        SendMode.Batch to "批量",
                        SendMode.Loop to "循环"
                    ).forEach { (mode, label) ->
                        OutlinedButton(
                            onClick = { sendMode = mode },
                            enabled = sendMode != mode
                        ) { Text(label) }
                    }
                }

                TextField(
                    value = input,
                    onValueChange = { input = it },
                    singleLine = false,
                    minLines = if (sendMode == SendMode.Batch) 5 else 3,
                    maxLines = if (sendMode == SendMode.Batch) 8 else 6,
                    label = {
                        Text(when {
                            sendMode == SendMode.Batch && inputMode == WriteInputMode.Hex -> "HEX 指令 (每行一条)"
                            sendMode == SendMode.Batch -> "文本数据 (每行一条)"
                            inputMode == WriteInputMode.Text -> "UTF-8 文本"
                            else -> "十六进制数据"
                        })
                    },
                    placeholder = {
                        Text(when {
                            sendMode == SendMode.Batch && inputMode == WriteInputMode.Hex -> "FF 01 AA\n00 02 BB\n03 CC DD"
                            sendMode == SendMode.Batch -> "第一行\n第二行\n第三行"
                            inputMode == WriteInputMode.Text -> "例如：hello"
                            else -> "例如：FF 00 AA"
                        })
                    },
                )

                if (sendMode == SendMode.Loop) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("次数:", style = MaterialTheme.typography.bodySmall)
                        if (!infiniteLoop) {
                            TextField(
                                value = loopCount,
                                onValueChange = { loopCount = it.filter { c -> c.isDigit() } },
                                modifier = Modifier.width(80.dp),
                                singleLine = true,
                                textStyle = MaterialTheme.typography.bodySmall,
                            )
                        }
                        TextButton(onClick = { infiniteLoop = !infiniteLoop }) {
                            Text(if (infiniteLoop) "✓ 无限循环" else "无限循环")
                        }
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("间隔:", style = MaterialTheme.typography.bodySmall)
                        TextField(
                            value = intervalMs,
                            onValueChange = { intervalMs = it.filter { c -> c.isDigit() } },
                            modifier = Modifier.width(80.dp),
                            singleLine = true,
                            textStyle = MaterialTheme.typography.bodySmall,
                            suffix = { Text("ms") }
                        )
                    }
                }

                if (sendMode == SendMode.Batch) {
                    Text(
                        "每行一条指令，按顺序发送",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                }

                Text(
                    validationError ?: "当前模式：${if (inputMode == WriteInputMode.Text) "TEXT" else "HEX"}",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (validationError != null) Error else TextSecondary
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val payload = when (inputMode) {
                        WriteInputMode.Text -> input.toByteArray()
                        WriteInputMode.Hex -> input.hexToByteArray()
                    }
                    onConfirm(payload)
                },
                enabled = validationError == null
            ) {
                Text(when (sendMode) {
                    SendMode.Single -> "写入"
                    SendMode.Batch -> "批量发送"
                    SendMode.Loop -> "开始循环"
                })
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}
