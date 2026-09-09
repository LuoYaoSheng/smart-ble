package com.smartble.ui.design

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
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
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.ui.theme.cCard
import com.smartble.ui.theme.cDanger
import com.smartble.ui.theme.cDangerWeak
import com.smartble.ui.theme.cFill
import com.smartble.ui.theme.cLine
import com.smartble.ui.theme.cLineSoft
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cNoteInfoText
import com.smartble.ui.theme.cNoteWarnText
import com.smartble.ui.theme.cPh
import com.smartble.ui.theme.cPrimary
import com.smartble.ui.theme.cPrimaryWeak
import com.smartble.ui.theme.cSub
import com.smartble.ui.theme.cSuccess
import com.smartble.ui.theme.cSuccessStrong
import com.smartble.ui.theme.cSuccessWeak
import com.smartble.ui.theme.cText
import com.smartble.ui.theme.cWarnStrong
import com.smartble.ui.theme.cWarning
import com.smartble.ui.theme.cWarningWeak

/* ============ B2 chip（胶囊 · weak 底深字） ============ */

enum class DsChipTone(val bg: Color, val fg: Color) {
    Neutral(cFill, cSub),
    Primary(cPrimaryWeak, cPrimary),
    Success(cSuccessWeak, cSuccessStrong),
    Danger(cDangerWeak, cDanger),
    Warning(cWarningWeak, cWarnStrong),
}

@Composable
fun DsChip(text: String, tone: DsChipTone = DsChipTone.Neutral, mono: Boolean = false, modifier: Modifier = Modifier) {
    Text(
        text,
        color = tone.fg,
        fontSize = if (mono) 10.sp else 11.sp,
        fontFamily = if (mono) FontFamily.Monospace else null,
        fontWeight = FontWeight.W600,
        lineHeight = if (mono) 10.sp * 1.7f else 11.sp * 1.7f,
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(tone.bg)
            .padding(horizontal = 9.dp, vertical = 2.dp),
    )
}

/* ============ B3 badge（状态徽章 · 点 + 字） ============ */

enum class DsBadgeTone(val bg: Color, val fg: Color, val dot: Color) {
    Dim(cFill, cMut, cPh),
    On(cSuccessWeak, cSuccessStrong, cSuccess),
    Err(cDangerWeak, cDanger, cDanger),
    Warn(cWarningWeak, cWarnStrong, cWarning),
}

@Composable
fun DsBadge(text: String, tone: DsBadgeTone = DsBadgeTone.Dim, dot: Boolean = true, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(tone.bg)
            .padding(horizontal = 10.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        if (dot) {
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .drawBehind {
                        if (tone == DsBadgeTone.On) {
                            drawCircle(cSuccess.copy(alpha = 0.35f), radius = size.minDimension * 0.95f)
                        }
                    }
                    .background(tone.dot, CircleShape)
            )
        }
        Text(text, color = tone.fg, fontSize = 11.sp, fontWeight = FontWeight.W800)
    }
}

/* ============ B4 kv（信息行） ============ */

@Composable
fun DsKv(k: String, v: String, mono: Boolean = false, modifier: Modifier = Modifier, showDivider: Boolean = true) {
    val dim = v.isEmpty()
    Row(
        modifier = modifier
            .fillMaxWidth()
            .drawBehind {
                if (showDivider) {
                    val y = size.height - 0.5.dp.toPx()
                    drawLine(cLineSoft, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
                }
            }
            .padding(vertical = 9.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        Text(k, color = cMut, fontSize = 12.sp, fontWeight = FontWeight.W600, modifier = Modifier.width(96.dp))
        Text(
            if (dim) "—" else v,
            color = if (dim) cPh else cText,
            fontSize = 13.sp,
            fontFamily = if (mono && !dim) FontFamily.Monospace else null,
            lineHeight = 13.sp * 1.5f,
            modifier = Modifier.weight(1f),
        )
    }
}

/* ============ B9 note（横幅提示） ============ */

enum class DsNoteKind(val bg: Color, val fg: Color, val icon: ImageVector) {
    Info(cPrimaryWeak, cNoteInfoText, DsIcons.Info),
    Warn(cWarningWeak, cNoteWarnText, DsIcons.Warn),
    Danger(cDangerWeak, cDanger, DsIcons.Warn),
}

/** note：boldLead 为加粗前缀（原型 <b> 段），text 为正文 */
@Composable
fun DsNote(kind: DsNoteKind, boldLead: String = "", text: String, modifier: Modifier = Modifier) {
    val content = remember(boldLead, text) {
        buildAnnotatedString {
            if (boldLead.isNotEmpty()) {
                withStyle(SpanStyle(fontWeight = FontWeight.W800)) { append(boldLead) }
            }
            append(text)
        }
    }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(kind.bg)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        Icon(kind.icon, contentDescription = null, modifier = Modifier.size(17.dp), tint = kind.fg)
        Text(content, color = kind.fg, fontSize = 12.sp, lineHeight = 12.sp * 1.6f)
    }
}

/* ============ 卡片容器（components.css .card） ============ */

/** 卡片容器修饰符：白底 + cLine 边 + r16 + 内边距 16 */
fun Modifier.dsCard(innerPadding: Dp = 16.dp): Modifier =
    clip(RoundedCornerShape(16.dp))
        .background(cCard)
        .drawBehind {
            val w = 1.dp.toPx()
            drawRoundRect(
                color = cLine,
                topLeft = Offset(w / 2, w / 2),
                size = Size(size.width - w, size.height - w),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(16.dp.toPx()),
                style = Stroke(w),
            )
        }
        .padding(innerPadding)

@Composable
fun DsCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(modifier = modifier.fillMaxWidth().dsCard()) {
        content()
    }
}

/** 卡片标题（.card-t）：图标 + 17sp w700 */
@Composable
fun DsCardTitle(icon: ImageVector, text: String, modifier: Modifier = Modifier, tint: Color = cText) {
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(22.dp), tint = tint)
        Text(text, fontSize = 17.sp, fontWeight = FontWeight.W700, color = tint)
    }
}

/** 组标题（.sec-t）：图标 22 主色 + 17sp w700 + 计数 chip + 右槽 */
@Composable
fun DsSectionTitle(
    icon: ImageVector,
    text: String,
    modifier: Modifier = Modifier,
    countText: String? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth().padding(horizontal = 2.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(7.dp),
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(22.dp), tint = cPrimary)
        Text(text, fontSize = 17.sp, fontWeight = FontWeight.W700, color = cText)
        if (countText != null) {
            DsChip(countText)
        }
        Spacer(modifier = Modifier.weight(1f))
        if (trailing != null) trailing()
    }
}

/** 文字链（.txtlink）：12sp 主色 w600 */
@Composable
fun DsTxtLink(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Text(
        text,
        color = cPrimary,
        fontSize = 12.sp,
        fontWeight = FontWeight.W600,
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .padding(horizontal = 2.dp, vertical = 4.dp),
    )
}

/* ============ P009/P010 行件 ============ */

/** 菜单行（.menu-row）：左灰图标 + 13sp w600 标题 + 右尖角 */
@Composable
fun DsMenuRow(icon: ImageVector, label: String, onClick: () -> Unit, modifier: Modifier = Modifier, showDivider: Boolean = true) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .drawBehind {
                if (showDivider) {
                    val y = size.height - 0.5.dp.toPx()
                    drawLine(cLineSoft, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
                }
            }
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .padding(horizontal = 2.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(11.dp),
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(22.dp), tint = cMut)
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.W600, color = cText, modifier = Modifier.weight(1f))
        Icon(DsIcons.ChevR, contentDescription = null, modifier = Modifier.size(13.dp), tint = cPh)
    }
}

/** 状态词（.stword）：VERIFIED/PREVIEW/BLOCKED/UNSUPPORTED/NOT_RELEASED mono 胶囊 */
@Composable
fun DsStword(state: String, modifier: Modifier = Modifier) {
    val (bg, fg) = when (state) {
        "VERIFIED" -> cSuccessWeak to cSuccessStrong
        "PREVIEW" -> cPrimaryWeak to cPrimary
        "BLOCKED" -> cWarningWeak to cWarnStrong
        "UNSUPPORTED" -> cFill to cMut
        "NOT_RELEASED" -> cDangerWeak to cDanger
        else -> cFill to cMut
    }
    Text(
        state,
        color = fg,
        fontSize = 10.sp,
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.W800,
        modifier = modifier
            .clip(RoundedCornerShape(5.dp))
            .background(bg)
            .padding(horizontal = 7.dp, vertical = 1.dp),
    )
}

/** 页脚（.foot）：10sp cPh 居中 */
@Composable
fun DsFoot(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        color = cPh,
        fontSize = 10.sp,
        lineHeight = 10.sp * 1.7f,
        textAlign = TextAlign.Center,
        modifier = modifier.fillMaxWidth().padding(top = 18.dp, bottom = 6.dp),
    )
}

/* ============ B5 表单件（P008 广播卡） ============ */

/** 字段标签（.field label）：12sp w600 cSub + 可选尾缀（如「广播中禁用」chip） */
@Composable
fun DsFieldLabel(text: String, modifier: Modifier = Modifier, trailing: (@Composable () -> Unit)? = null) {
    Row(modifier = modifier.padding(bottom = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(text, color = cSub, fontSize = 12.sp, fontWeight = FontWeight.W600)
        if (trailing != null) trailing()
    }
}

/** 输入框（.field .inp）：cFill 底 h42 r8 + focus 主色描边；mono 等宽 */
@Composable
fun DsInput(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String = "",
    modifier: Modifier = Modifier,
    mono: Boolean = false,
    enabled: Boolean = true,
    trailing: (@Composable () -> Unit)? = null,
) {
    var focused by remember { mutableStateOf(false) }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(42.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(if (focused) cCard else cFill)
            .drawBehind {
                val w = if (focused) 1.5.dp.toPx() else 0.dp.toPx()
                if (w > 0) {
                    drawRoundRect(
                        color = cPrimary,
                        topLeft = Offset(w / 2, w / 2),
                        size = Size(size.width - w, size.height - w),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(8.dp.toPx()),
                        style = Stroke(w),
                    )
                }
            }
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            singleLine = true,
            textStyle = TextStyle(
                color = if (enabled) cText else cMut,
                fontSize = 13.sp,
                fontFamily = if (mono) FontFamily.Monospace else null,
            ),
            cursorBrush = SolidColor(cPrimary),
            decorationBox = { inner ->
                Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                    if (value.isEmpty()) {
                        Text(
                            placeholder,
                            color = cPh,
                            fontSize = 13.sp,
                            fontFamily = if (mono) FontFamily.Monospace else null,
                        )
                    }
                    inner()
                }
            },
        )
        if (trailing != null) trailing()
    }
}

/** 选择器行（.picker）：cFill 底 h42 + 值 + 下尖角（Android 平台展示固定值） */
@Composable
fun DsPicker(value: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(42.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(cFill)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(value, color = cText, fontSize = 13.sp, modifier = Modifier.weight(1f))
        Icon(DsIcons.ChevD, contentDescription = null, modifier = Modifier.size(17.dp), tint = cMut)
    }
}

/** 错误行（.err-line）：warning-weak 底 + warn 图标 + 11sp */
@Composable
fun DsErrLine(text: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 6.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(cWarningWeak)
            .padding(horizontal = 8.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Icon(DsIcons.Warn, contentDescription = null, modifier = Modifier.size(13.dp), tint = cWarnStrong)
        Text(text, color = cWarnStrong, fontSize = 11.sp)
    }
}
