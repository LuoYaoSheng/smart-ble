package com.smartble.ui.screen

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.smartble.BuildConfig
import com.smartble.R
import com.smartble.core.utils.VersionMetadata
import com.smartble.ui.design.DsChip
import com.smartble.ui.design.DsFoot
import com.smartble.ui.design.DsIcons
import com.smartble.ui.design.DsKv
import com.smartble.ui.design.DsMenuRow
import com.smartble.ui.design.DsPrimaryButton
import com.smartble.ui.design.DsSectionTitle
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.design.dsCard
import com.smartble.ui.theme.cCard
import com.smartble.ui.theme.cLine
import com.smartble.ui.theme.cLineSoft
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cPrimary
import com.smartble.ui.theme.cPrimaryDeep
import com.smartble.ui.theme.cText

/**
 * P009 关于（prototype p009-about.js · 数据口径对齐 flutter ProductConfig）：
 * 品牌行 → 应用信息(kv) → 菜单(网站/版本记录/反馈/分享) → 页脚。
 * 2026-09-11（小程序整体裁撤）：F028 更多小程序推广卡与反馈小程序码一并移除。
 */
@Composable
fun AboutContent(
    modifier: Modifier = Modifier,
    onOpenVersions: () -> Unit = {},
) {
    val context = LocalContext.current
    var showFeedback by remember { mutableStateOf(false) }
    // F027 版本三态：基准 = Release Metadata 投影（verFallback），
    // 运行时渠道（包版本）非空才覆盖，失败保留基准。
    val version = BuildConfig.VERSION_NAME.takeIf { it.isNotBlank() }
        ?.let { "v$it+${BuildConfig.VERSION_CODE}" }
        ?: VersionMetadata.metadataVersionLabel()

    fun openUrl(url: String) {
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
    ) {
        Spacer(modifier = Modifier.height(12.dp))
        BrandRow(version)
        Spacer(modifier = Modifier.height(16.dp))
        DsSectionTitle(icon = DsIcons.Info, text = "应用信息")
        Spacer(modifier = Modifier.height(10.dp))
        Column(Modifier.dsCard()) {
            DsKv(k = "当前环境", v = "Android · ${Build.VERSION.RELEASE}")
            DsKv(k = "设备型号", v = "${Build.MANUFACTURER} ${Build.MODEL}")
            DsKv(k = "版本", v = version, mono = true, showDivider = false)
        }
        Spacer(modifier = Modifier.height(16.dp))
        Column(Modifier.dsCard(innerPadding = 8.dp)) {
            DsMenuRow(icon = DsIcons.Ext, label = "官方网站", onClick = { openUrl(WEBSITE) })
            DsMenuRow(icon = DsIcons.Doc, label = "版本记录", onClick = onOpenVersions)
            DsMenuRow(icon = DsIcons.Send, label = "问题反馈", onClick = { showFeedback = true })
            DsMenuRow(icon = DsIcons.Share, label = "分享应用", onClick = { shareApp(context) }, showDivider = false)
        }
        DsFoot("日志全局脱敏：敏感凭据显示为 token=***\n© 2026 BLE Toolkit+ · Smart BLE 产品家族")
        Spacer(modifier = Modifier.height(8.dp))
    }

    if (showFeedback) {
        FeedbackQrDialog(onDismiss = { showFeedback = false })
    }
}

/** 问题反馈弹窗（P009）：GitHub Issues 引导；2026-09-11 小程序反馈通道裁撤 */
@Composable
private fun FeedbackQrDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    var linkCopied by remember { mutableStateOf(false) }

    fun copyLink() {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText("feedback-url", FEEDBACK_URL))
        linkCopied = true
    }

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(cCard)
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("问题反馈", fontSize = 16.sp, fontWeight = FontWeight.W700, color = cText)
                Spacer(modifier = Modifier.weight(1f))
                Icon(
                    DsIcons.X,
                    contentDescription = "关闭",
                    modifier = Modifier
                        .size(28.dp)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { onDismiss() },
                    tint = cMut,
                )
            }
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                "通过 GitHub Issues 提交问题反馈\n描述复现步骤与环境信息，我们会尽快跟进处理\n$FEEDBACK_URL",
                fontSize = 12.sp,
                color = cMut,
                textAlign = TextAlign.Center,
                lineHeight = 12.sp * 1.5f,
            )
            if (linkCopied) {
                Spacer(modifier = Modifier.height(6.dp))
                Text("反馈链接已复制", fontSize = 11.sp, fontWeight = FontWeight.W600, color = cPrimary)
            }
            Spacer(modifier = Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                DsSoftButton(
                    label = if (linkCopied) "已复制" else "复制反馈链接",
                    onClick = { copyLink() },
                    modifier = Modifier.weight(1f),
                    small = true,
                )
                DsPrimaryButton(
                    label = "我知道了",
                    icon = null,
                    onClick = onDismiss,
                    modifier = Modifier.weight(1f),
                    small = true,
                )
            }
        }
    }
}

/** 品牌行（.card + 38dp 渐变 bt 标 + 名称 + 单行元数据） */
@Composable
private fun BrandRow(version: String) {
    Row(
        modifier = Modifier.fillMaxWidth().dsCard(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(11.dp),
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(RoundedCornerShape(11.dp))
                .background(Brush.linearGradient(listOf(cPrimaryDeep, cPrimary))),
            contentAlignment = Alignment.Center,
        ) {
            Icon(DsIcons.Bt, contentDescription = null, modifier = Modifier.size(20.dp), tint = Color.White)
        }
        Column {
            Text("BLE Toolkit+", fontSize = 16.sp, fontWeight = FontWeight.W700, color = cText)
            Text(
                "$version · 零后端 · 零本地持久化",
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                color = cMut,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

private fun shareApp(context: android.content.Context) {
    val text = "BLE Toolkit+ —— 跨平台 BLE 调试工具 $WEBSITE"
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
        putExtra(Intent.EXTRA_SUBJECT, "BLE Toolkit+")
    }
    runCatching { context.startActivity(Intent.createChooser(intent, "分享应用")) }
}

private const val WEBSITE = "https://lightble.i2kai.com/"
private const val FEEDBACK_URL = "https://gitee.com/luoyaosheng/smart-ble/issues"

