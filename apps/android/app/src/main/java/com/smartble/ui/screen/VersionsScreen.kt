package com.smartble.ui.screen

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.BuildConfig
import com.smartble.ui.design.AppEmpty
import com.smartble.ui.design.AppSubnav
import com.smartble.ui.design.DsChip
import com.smartble.ui.design.DsChipTone
import com.smartble.ui.design.DsCardTitle
import com.smartble.ui.design.DsFoot
import com.smartble.ui.design.DsIcons
import com.smartble.ui.design.DsIll
import com.smartble.ui.design.DsKv
import com.smartble.ui.design.DsNote
import com.smartble.ui.design.DsNoteKind
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.design.dsCard
import com.smartble.ui.theme.cBg
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cPrimary
import com.smartble.ui.theme.cSub
import com.smartble.ui.theme.cText
import com.smartble.ui.theme.cWarnStrong

/**
 * P010 版本记录（prototype p010-versions.js · sub 型）：
 * 当前版本(display + channel chip + kv + 平台 chip + 复制) → 当前限制 →
 * 正式发布历史(空态) → 预览记录(空态) → 页脚（Release Metadata 投影声明）。
 * 正式/预览列表无投影数据源，按正典空态如实展示，不手写版本事实。
 */
@Composable
fun VersionsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val displayVersion = "v${BuildConfig.VERSION_NAME}+${BuildConfig.VERSION_CODE}"

    Column(
        modifier = Modifier.fillMaxSize().background(cBg),
    ) {
        AppSubnav(title = "版本记录", onBack = onBack)
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            // ① 当前版本
            Column(Modifier.dsCard()) {
                DsCardTitle(icon = DsIcons.Doc, text = "当前版本")
                Spacer(modifier = Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(displayVersion, fontSize = 24.sp, fontWeight = FontWeight.W800, color = cPrimary)
                    Box(modifier = Modifier.padding(bottom = 2.dp)) { DsChip(text = "preview", tone = DsChipTone.Primary) }
                }
                DsKv(k = "构建", v = "v+${BuildConfig.VERSION_CODE}", mono = true)
                DsKv(k = "Release tag", v = "已登记（preview）")
                Row(modifier = Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    DsChip(text = "Android PREVIEW", tone = DsChipTone.Primary)
                }
                Spacer(modifier = Modifier.height(12.dp))
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    DsSoftButton(
                        label = "复制版本信息",
                        icon = DsIcons.Copy,
                        onClick = { copyVersion(context, displayVersion) },
                        small = true,
                    )
                }
            }

            // ② 当前限制
            Column(Modifier.dsCard()) {
                DsCardTitle(icon = DsIcons.Warn, text = "当前限制")
                Row(
                    modifier = Modifier.padding(top = 7.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Icon(DsIcons.Warn, contentDescription = null, tint = cWarnStrong, modifier = Modifier.size(13.dp))
                    Text(
                        "OTA 固件升级端到端 BLOCKED（P-03）：客户端与固件完整事务未对齐，入口仅对 OTA 服务设备开放",
                        fontSize = 13.sp,
                        color = cSub,
                        lineHeight = 13.sp * 1.55f,
                        modifier = Modifier.weight(1f),
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                DsNote(kind = DsNoteKind.Info, text = "当前无 Artifact，不提供下载入口。")
            }

            // ③ 正式发布历史（空态）
            Column(Modifier.dsCard()) {
                DsCardTitle(icon = DsIcons.Check, text = "正式发布历史")
                AppEmpty(
                    title = "暂无正式发布版本",
                    desc = "产品当前处于 PREVIEW 阶段，首个正式版发布后将在此列出。",
                    ill = DsIll.Doc,
                )
            }

            // ④ 预览记录（空态）
            Column(Modifier.dsCard()) {
                DsCardTitle(icon = DsIcons.Dl, text = "预览记录")
                AppEmpty(title = "暂无预览记录", desc = "", ill = DsIll.Doc)
            }

            DsFoot("本页数据来自 Release Metadata 投影，不是手写版本事实源。")
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

private fun copyVersion(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("version", text))
    Toast.makeText(context, "版本已复制", Toast.LENGTH_SHORT).show()
}
