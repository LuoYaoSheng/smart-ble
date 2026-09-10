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
import com.smartble.core.utils.VersionMetadata
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
 * 当前版本(display + channel chip + 渠道 kv + 平台状态列表 + 复制) → 当前限制 →
 * 正式发布历史(投影/空态) → 预览记录(投影/空态) → 页脚（Release Metadata 投影声明）。
 * F027：整页消费 VersionMetadata.versionPageModel（Release Metadata 投影），
 * 不读 BuildConfig，也不手写版本/渠道/限制事实。
 */
@Composable
fun VersionsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val model = VersionMetadata.versionPageModel()
    val current = model.current
    val displayVersion = current.version.ifBlank { current.displayVersion }
    val copyText = current.displayVersion.ifBlank { current.version }.ifBlank { "dev.unknown" }

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
                    Box(modifier = Modifier.padding(bottom = 2.dp)) { DsChip(text = current.channel, tone = DsChipTone.Primary) }
                }
                DsKv(k = "渠道", v = current.channelLabel)
                if (current.hasReleaseTag) {
                    DsKv(k = "Release tag", v = "已登记")
                }
                Spacer(modifier = Modifier.height(10.dp))
                current.platforms.forEach { p -> DsKv(k = p.name, v = formatPlatformStatus(p)) }
                Spacer(modifier = Modifier.height(12.dp))
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    DsSoftButton(
                        label = "复制版本信息",
                        icon = DsIcons.Copy,
                        onClick = { copyVersion(context, copyText) },
                        small = true,
                    )
                }
            }

            // ② 当前限制
            Column(Modifier.dsCard()) {
                DsCardTitle(icon = DsIcons.Warn, text = "当前限制")
                if (current.limitations.isNotEmpty()) {
                    current.limitations.forEach { item ->
                        Row(
                            modifier = Modifier.padding(top = 7.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.Top,
                        ) {
                            Icon(DsIcons.Warn, contentDescription = null, tint = cWarnStrong, modifier = Modifier.size(13.dp))
                            Text(
                                item,
                                fontSize = 13.sp,
                                color = cSub,
                                lineHeight = 13.sp * 1.55f,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                } else {
                    Text("暂无已知限制条目。", fontSize = 13.sp, color = cMut, modifier = Modifier.padding(top = 7.dp))
                }
            }

            // ③ 正式发布历史（投影/空态）
            Column(Modifier.dsCard()) {
                DsCardTitle(icon = DsIcons.Check, text = "正式发布历史")
                if (model.history.releases.isNotEmpty()) {
                    model.history.releases.forEach { r ->
                        HistoryRow(title = r.tag.ifBlank { r.version }, sub = "${r.status} · ${r.channel}")
                    }
                } else {
                    AppEmpty(
                        title = "暂无正式发布版本",
                        desc = "产品当前处于 PREVIEW 阶段，首个正式版发布后将在此列出。",
                        ill = DsIll.Doc,
                    )
                }
                if (!current.hasArtifacts) {
                    DsNote(kind = DsNoteKind.Info, text = "当前无 Artifact，不提供下载入口。")
                }
            }

            // ④ 预览记录（投影/空态）
            Column(Modifier.dsCard()) {
                DsCardTitle(icon = DsIcons.Dl, text = "预览记录")
                if (model.history.previews.isNotEmpty()) {
                    model.history.previews.forEach { p ->
                        HistoryRow(title = p.label, sub = "${p.status} · ${p.channel}")
                    }
                } else {
                    AppEmpty(title = "暂无预览记录", desc = "", ill = DsIll.Doc)
                }
            }

            DsFoot("本页数据来自 Release Metadata 投影，不是手写版本事实源。")
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

/** 正典 formatPlatformStatus：REFERENCE 直接展示；cap/rel 不一致 → "cap / rel"，
 * 否则取其一，兜底 NOT_RELEASED。 */
private fun formatPlatformStatus(p: VersionMetadata.PlatformPublicStatus): String {
    if (p.role == "REFERENCE") return "REFERENCE"
    val cap = p.capabilityStatus.orEmpty()
    val rel = p.releaseStatus
    if (cap.isNotEmpty() && rel.isNotEmpty() && cap != rel) return "$cap / $rel"
    return if (cap.isNotEmpty()) cap else rel.ifEmpty { "NOT_RELEASED" }
}

@Composable
private fun HistoryRow(title: String, sub: String) {
    Column(modifier = Modifier.padding(top = 10.dp)) {
        Text(title, fontSize = 14.sp, fontWeight = FontWeight.W800, color = cText)
        Text(sub, fontSize = 12.sp, color = cMut, modifier = Modifier.padding(top = 3.dp))
    }
}

private fun copyVersion(context: Context, text: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("version", text))
    Toast.makeText(context, "版本已复制", Toast.LENGTH_SHORT).show()
}
