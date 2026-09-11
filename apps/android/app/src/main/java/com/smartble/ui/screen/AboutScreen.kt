package com.smartble.ui.screen

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.compose.foundation.Image
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
import androidx.compose.ui.res.painterResource
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
 * 品牌行 → 更多小程序(promo) → 应用信息(kv) → 菜单(网站/版本记录/反馈/分享) → 页脚。
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
        DsSectionTitle(icon = DsIcons.Share, text = "更多小程序")
        Spacer(modifier = Modifier.height(10.dp))
        PromoCard(onOpen = ::openUrl)
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

/** 问题反馈弹窗（P009 · 与 uniapp/iOS 同口径）：微信扫码进小程序客服；复制 issues 链接兜底 */
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
            Image(
                painter = painterResource(R.drawable.wx_mini_qr),
                contentDescription = "微信小程序码",
                modifier = Modifier
                    .size(172.dp)
                    .clip(RoundedCornerShape(12.dp)),
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "使用微信「扫一扫」扫描上方小程序码\n进入「BLE Toolkit+」小程序，即可直接联系客服反馈问题",
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

/** 推广卡（.promo 行：缩写块 + 名称/描述 + 前往） */
@Composable
private fun PromoCard(onOpen: (String) -> Unit) {
    Column(Modifier.fillMaxWidth().dsCard(innerPadding = 6.dp)) {
        PROMOS.forEachIndexed { i, p ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .drawBehind {
                        if (i < PROMOS.lastIndex) {
                            val y = size.height - 0.5.dp.toPx()
                            drawLine(cLineSoft, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
                        }
                    }
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { onOpen(p.url) }
                    .padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(11.dp))
                        .background(p.bg),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(p.abbr, color = p.color, fontSize = 15.sp, fontWeight = FontWeight.W800)
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(p.name, fontSize = 14.sp, fontWeight = FontWeight.W600, color = cText)
                    Text(
                        p.desc,
                        fontSize = 12.sp,
                        color = cMut,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = 12.sp * 1.4f,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
                DsSoftButton(label = "前往", onClick = { onOpen(p.url) }, small = true)
            }
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

/* 产品推广位（与 flutter ProductConfig.promos / uniapp RELATED_MINI_PROGRAMS 同源） */
private data class Promo(val name: String, val desc: String, val abbr: String, val bg: Color, val color: Color, val url: String)

private const val WEBSITE = "https://lightble.i2kai.com/"
private const val FEEDBACK_URL = "https://gitee.com/luoyaosheng/smart-ble/issues"

private val PROMOS = listOf(
    Promo(
        name = "萌喵圈",
        desc = "看猫片、做问候图和轻量 AI 创作，把宠物内容变成可爱又治愈的分享素材。",
        abbr = "萌喵",
        bg = Color(0xFFFFEDF2),
        color = Color(0xFFE06C9A),
        url = "https://cutemeowcircle.anxiqing.cn",
    ),
    Promo(
        name = "宝宝点滴",
        desc = "记录喂奶、换尿布、睡眠和成长数据，帮家人一起照看宝宝的日常节奏。",
        abbr = "宝宝",
        bg = Color(0xFFFFF3E2),
        color = Color(0xFFC77E14),
        url = "https://babydiary.anxiqing.cn",
    ),
)
