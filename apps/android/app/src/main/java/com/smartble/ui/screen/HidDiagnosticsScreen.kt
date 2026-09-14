package com.smartble.ui.screen

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.core.profile.ProvisionPhase
import com.smartble.ui.design.AppSubnav
import com.smartble.ui.design.DsCardTitle
import com.smartble.ui.design.DsChip
import com.smartble.ui.design.DsChipTone
import com.smartble.ui.design.DsErrLine
import com.smartble.ui.design.DsIcons
import com.smartble.ui.design.DsNote
import com.smartble.ui.design.DsNoteKind
import com.smartble.ui.design.DsPrimaryButton
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.design.dsCard
import com.smartble.ui.hid.HidDeviceSessionViewModel
import com.smartble.ui.theme.cMut
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/*
 * P005 Smart HID 诊断（MAC-005 · prototype p005-hid-diagnostics）：
 * 连接 → 读取 device info / status 两特征原始 JSON 快照（pretty 展示）→
 * 刷新 / 复制。诊断只读：不写 INPUT、不改设备状态；快照不含 Wi-Fi 密码或
 * token（特征本身不返回敏感字段，F023 口径）。
 */

@Composable
fun HidDiagnosticsScreen(
    deviceId: String,
    deviceName: String,
    viewModel: HidDeviceSessionViewModel,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsState()
    val snapshot by viewModel.snapshot.collectAsState()
    val snapshotError by viewModel.snapshotError.collectAsState()

    LaunchedEffect(deviceId) {
        if (state.phase == ProvisionPhase.Connect) {
            viewModel.startConnect()
        }
        // 连接就绪（Configure 阶段到达）后立即读取一次快照
    }
    LaunchedEffect(state.phase) {
        if (state.phase == ProvisionPhase.Configure && snapshot == null && snapshotError == null) {
            viewModel.readSnapshot()
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(com.smartble.ui.theme.cBg)) {
        AppSubnav(title = "Smart HID 诊断", onBack = onBack)
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            Column(Modifier.dsCard()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        DsCardTitle(icon = DsIcons.Doc, text = "设备快照")
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(deviceName.ifBlank { deviceId }, fontSize = 11.sp, color = cMut)
                    }
                    val snap = snapshot
                    if (snap != null) {
                        DsChip(
                            text = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(snap.at)),
                            tone = DsChipTone.Neutral,
                            mono = true,
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))

                val snap = snapshot
                when {
                    snap != null -> {
                        SnapshotBlock(title = "Device Info", raw = snap.deviceInfoRaw)
                        Spacer(modifier = Modifier.height(10.dp))
                        SnapshotBlock(title = "Status", raw = snap.statusRaw)
                    }
                    snapshotError != null -> {
                        DsErrLine(snapshotError ?: "读取失败")
                        Spacer(modifier = Modifier.height(8.dp))
                        DsNote(
                            kind = DsNoteKind.Info,
                            boldLead = "提示",
                            text = "读取失败通常因设备未连接；请返回重连后重试。",
                        )
                    }
                    else -> DsNote(kind = DsNoteKind.Info, boldLead = "正在读取", text = "连接设备并读取两特征…")
                }

                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    DsPrimaryButton(
                        label = "刷新快照",
                        icon = DsIcons.Refresh,
                        onClick = { viewModel.readSnapshot() },
                        modifier = Modifier.weight(1f),
                    )
                    DsSoftButton(
                        label = "复制",
                        icon = DsIcons.Copy,
                        onClick = {
                            val snap2 = snapshot ?: return@DsSoftButton
                            val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            cm.setPrimaryClip(
                                ClipData.newPlainText(
                                    "smart-hid-diagnostics",
                                    "device_info: ${snap2.deviceInfoRaw}\nstatus: ${snap2.statusRaw}",
                                ),
                            )
                            Toast.makeText(context, "诊断快照已复制", Toast.LENGTH_SHORT).show()
                        },
                    )
                }
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                "诊断只读：不写入配置特征；快照不含 Wi-Fi 密码 / 配对 token。",
                fontSize = 11.sp,
                color = com.smartble.ui.theme.cSub,
                modifier = Modifier.padding(horizontal = 4.dp),
            )
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SnapshotBlock(title: String, raw: String) {
    Text(title, fontSize = 12.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.W700, color = com.smartble.ui.theme.cSub)
    Spacer(modifier = Modifier.height(4.dp))
    Text(
        prettyJson(raw),
        fontSize = 11.sp,
        fontFamily = FontFamily.Monospace,
        color = com.smartble.ui.theme.cText,
        modifier = Modifier
            .fillMaxWidth()
            .background(com.smartble.ui.theme.cFill)
            .padding(10.dp),
    )
}

/** 原始 JSON 已是紧凑单行时做 2 空格缩进的美化；失败则原样展示。 */
internal fun prettyJson(raw: String): String {
    val text = raw.trim()
    if (text.isEmpty()) return "（空）"
    val sb = StringBuilder()
    var indent = 0
    var inString = false
    var escaped = false
    for (ch in text) {
        when {
            escaped -> { sb.append(ch); escaped = false }
            ch == '\\' && inString -> { sb.append(ch); escaped = true }
            ch == '"' -> { inString = !inString; sb.append(ch) }
            !inString && (ch == '{' || ch == '[') -> {
                sb.append(ch); indent += 1
                sb.append('\n').append("  ".repeat(indent))
            }
            !inString && (ch == '}' || ch == ']') -> {
                indent -= 1
                sb.append('\n').append("  ".repeat(indent)).append(ch)
            }
            !inString && ch == ',' -> {
                sb.append(ch); sb.append('\n').append("  ".repeat(indent))
            }
            !inString && ch == ':' -> { sb.append(": ") }
            else -> sb.append(ch)
        }
    }
    return sb.toString()
}
