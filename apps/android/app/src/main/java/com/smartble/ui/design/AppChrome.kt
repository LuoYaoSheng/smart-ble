package com.smartble.ui.design

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.graphics.vector.ImageVector.Builder
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.ui.theme.cBg
import com.smartble.ui.theme.cCard
import com.smartble.ui.theme.cDanger
import com.smartble.ui.theme.cDangerWeak
import com.smartble.ui.theme.cFill
import com.smartble.ui.theme.cLine
import com.smartble.ui.theme.cLineSoft
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cPh
import com.smartble.ui.theme.cPrimary
import com.smartble.ui.theme.cPrimaryDeep
import com.smartble.ui.theme.cPrimaryWeak
import com.smartble.ui.theme.cSub
import com.smartble.ui.theme.cSuccess
import com.smartble.ui.theme.cText

/** 蓝牙状态三态（P001 契约：on=就绪 / off=未开启 / null=平台不支持） */
enum class BtTone { On, Off }

/**
 * 正典 tab 页导航栏（PAGE_LAYOUT_CONTRACT §2 · prototype pages.css .navbar）：
 * 白→冰蓝渐变底 + cLineSoft 底边；kicker 10sp +2 字距品牌蓝；标题 20sp w800；
 * 右侧 bt-chip：P001 用状态点（statusTone/statusText），其余页用 trailing 槽（chip/badge）。
 */
@Composable
fun AppNavbar(
    title: String,
    modifier: Modifier = Modifier,
    kicker: String = "BLE TOOLKIT+",
    statusText: String = "",
    statusTone: BtTone? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    val dotColor = when (statusTone) {
        BtTone.On -> cSuccess
        BtTone.Off -> cDanger
        null -> cPh
    }
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(cCard, cBg)))
            .statusBarsPadding()
            .drawBehind {
                val y = size.height - 0.5.dp.toPx()
                drawLine(cLineSoft, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
            }
            .padding(start = 18.dp, end = 18.dp, top = 8.dp, bottom = 12.dp),
    ) {
        Text(
            kicker,
            fontSize = 10.sp,
            letterSpacing = 2.sp,
            color = cPrimary,
            fontWeight = FontWeight.W800,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                title,
                fontSize = 20.sp,
                fontWeight = FontWeight.W800,
                color = cText,
                modifier = Modifier.weight(1f),
            )
            Spacer(modifier = Modifier.width(6.dp))
            if (trailing != null) {
                trailing()
            } else {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .drawBehind {
                            if (statusTone == BtTone.On) {
                                drawCircle(cSuccess.copy(alpha = 0.3f), radius = size.minDimension * 0.9f)
                            }
                        }
                        .background(dotColor, CircleShape),
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(statusText, fontSize = 11.sp, color = cMut, fontWeight = FontWeight.W600)
            }
        }
    }
}

/**
 * 正典二级页导航栏（PAGE_LAYOUT_CONTRACT §3 · pages.css .subnav）：
 * 返回键 30×30 cFill 圆角 9（chev-r rotate180）+ 标题 17sp w700 + 右槽 action；白底 cLineSoft 底边。
 */
@Composable
fun AppSubnav(
    title: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(cCard)
            .statusBarsPadding()
            .drawBehind {
                val y = size.height - 0.5.dp.toPx()
                drawLine(cLineSoft, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx())
            }
            .padding(start = 14.dp, end = 16.dp, top = 8.dp, bottom = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(30.dp)
                    .clip(RoundedCornerShape(9.dp))
                    .background(cFill)
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onBack,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    DsIcons.ChevR,
                    contentDescription = "返回",
                    modifier = Modifier.size(17.dp).rotate(180f),
                    tint = cText,
                )
            }
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                title,
                fontSize = 17.sp,
                fontWeight = FontWeight.W700,
                color = cText,
                modifier = Modifier.weight(1f),
            )
            if (action != null) action()
        }
    }
}

/** TabBar 项（prototype app.js renderAll：scan/link/cast/info 四项） */
data class DsTab(val key: String, val label: String, val icon: ImageVector)

val DsTabs = listOf(
    DsTab("scan", "扫描", DsIcons.Scan),
    DsTab("connected", "已连接", DsIcons.Link),
    DsTab("broadcast", "广播", DsIcons.Cast),
    DsTab("about", "关于", DsIcons.Info),
)

/**
 * 正典 TabBar（pages.css .tabbar）：64dp 高 + 底安全区、白 96% 底、cLineSoft 顶边、
 * 23dp 描边图标 + 10sp 标签；激活 = 品牌蓝（非 Material 胶囊）。
 */
@Composable
fun AppTabBar(
    activeIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
    connectedBadge: Int = 0,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(cCard.copy(alpha = 0.96f))
            .navigationBarsPadding(),
    ) {
        Divider(color = cLineSoft, thickness = 1.dp)
        Row(modifier = Modifier.fillMaxWidth().height(64.dp)) {
            DsTabs.forEachIndexed { index, tab ->
                val active = index == activeIndex
                val tint = if (active) cPrimary else cMut
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) { onSelect(index) },
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Box(contentAlignment = Alignment.TopEnd) {
                            Icon(
                                tab.icon,
                                contentDescription = tab.label,
                                modifier = Modifier.size(23.dp),
                                tint = tint,
                            )
                            if (tab.key == "connected" && connectedBadge > 0) {
                                Box(
                                    modifier = Modifier
                                        .padding(start = 8.dp)
                                        .background(cDanger, RoundedCornerShape(8.dp))
                                        .padding(horizontal = 4.dp)
                                        .height(16.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    val label = if (connectedBadge > 99) "99+" else "$connectedBadge"
                                    Text(label, fontSize = 9.sp, color = cCard, fontWeight = FontWeight.W800)
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(3.dp))
                        Text(
                            tab.label,
                            fontSize = 10.sp,
                            color = tint,
                            fontWeight = if (active) FontWeight.W800 else FontWeight.W600,
                        )
                    }
                }
            }
        }
    }
}

/* ============ 正典空态插画（prototype components.js ILL · 118×86 视口 · 烘焙原色） ============ */

private data class IllPath(val d: String, val color: Color, val strokeW: Float = 2f, val filled: Boolean = false)

private fun dsIll(name: String, paths: List<IllPath>): ImageVector =
    Builder(
        name = name,
        defaultWidth = 118.dp,
        defaultHeight = 86.dp,
        viewportWidth = 118f,
        viewportHeight = 86f,
    ).apply {
        for (p in paths) {
            addPath(
                addPathNodes(p.d),
                fill = if (p.filled) SolidColor(p.color) else SolidColor(Color.Transparent),
                stroke = if (p.filled) null else SolidColor(p.color),
                strokeLineWidth = p.strokeW,
                strokeLineCap = StrokeCap.Round,
            )
        }
    }.build()

/** 空态插画四幅（B6）：radar 未扫描 / link 无连接 / doc 无版本 / box 路由无效 */
enum class DsIll { Radar, Link, Doc, Box }

@Composable
fun DsIllArt(ill: DsIll, modifier: Modifier = Modifier) {
    val art = when (ill) {
        DsIll.Radar -> RadarIll
        DsIll.Link -> LinkIll
        DsIll.Doc -> DocIll
        DsIll.Box -> BoxIll
    }
    Icon(art, contentDescription = null, modifier = modifier.size(width = 118.dp, height = 86.dp), tint = Color.Unspecified)
}

private val RadarIll: ImageVector by lazy {
    dsIll(
        "ill-radar",
        listOf(
            IllPath("M25 46 a34 34 0 0 1 68 0 a34 34 0 0 1 -68 0", cLine),
            IllPath("M38 46 a21 21 0 0 1 42 0 a21 21 0 0 1 -42 0", cLine),
            IllPath("M51 46 a8 8 0 0 1 16 0 a8 8 0 0 1 -16 0", cPrimary),
            IllPath("M59 46 L88 20", cPrimary),
            IllPath("M72.5 54 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0", cSuccess, filled = true),
            IllPath("M45.5 34 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0", cPh, filled = true),
            IllPath("M18 78 h82", cLine),
        ),
    )
}

private val LinkIll: ImageVector by lazy {
    dsIll(
        "ill-link",
        listOf(
            IllPath("M46 40 a12 12 0 0 0 17 17 l8 -8 a12 12 0 0 0 -17 -17", cPh, strokeW = 2.2f),
            IllPath("M72 46 a12 12 0 0 0 -17 -17 l-8 8 a12 12 0 0 0 17 17", cPrimary, strokeW = 2.2f),
            IllPath("M24 74 h70", cLine),
        ),
    )
}

private val DocIll: ImageVector by lazy {
    dsIll(
        "ill-doc",
        listOf(
            IllPath("M46 12 h18 l12 12 v46 a4 4 0 0 1 -4 4 H50 a4 4 0 0 1 -4 -4 V16 a4 4 0 0 1 4 -4 z", cPrimary, strokeW = 2.2f),
            IllPath("M64 12 v12 h12", cPrimary, strokeW = 2.2f),
            IllPath("M52 42 h16 M52 50 h16 M52 58 h9", cPh),
            IllPath("M83 64 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0", cSuccess, filled = true),
        ),
    )
}

private val BoxIll: ImageVector by lazy {
    dsIll(
        "ill-box",
        listOf(
            IllPath("M59 22 L83 34 V60 L59 72 L35 60 V34 z", cPrimary, strokeW = 2.2f),
            IllPath("M35 34 L59 46 L83 34 M59 46 V72", cPh, strokeW = 2.2f),
            IllPath("M56 12 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", cSuccess, filled = true),
        ),
    )
}

/** 正典空态（components.css .empty）：插画 + 17sp 标题 + 13sp 描述 + 可选 action */
@Composable
fun AppEmpty(
    title: String,
    desc: String,
    modifier: Modifier = Modifier,
    ill: DsIll = DsIll.Radar,
    action: (@Composable () -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 38.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        DsIllArt(ill)
        Spacer(modifier = Modifier.height(16.dp))
        Text(title, fontSize = 17.sp, fontWeight = FontWeight.W700, color = cText)
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            desc,
            fontSize = 13.sp,
            color = cMut,
            textAlign = TextAlign.Center,
            lineHeight = 13.sp * 1.6f,
            modifier = Modifier.width(250.dp),
        )
        if (action != null) {
            Spacer(modifier = Modifier.height(16.dp))
            action()
        }
    }
}

/* ============ 正典按钮族（components.css .btn 五调 × 两尺寸） ============ */

/** 主按钮（.btn.primary/danger）：135° 渐变 + 品牌投影；sm=h32 r8 13sp；loading 换 spinner */
@Composable
fun DsPrimaryButton(
    label: String,
    icon: ImageVector?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    danger: Boolean = false,
    small: Boolean = false,
    loading: Boolean = false,
    enabled: Boolean = true,
) {
    val from = if (danger) Color(0xFFFF6B74) else cPrimary
    val to = if (danger) cDanger else cPrimaryDeep
    val glow = (if (danger) cDanger else cPrimary).copy(alpha = 0.32f)
    val shape = RoundedCornerShape(if (small) 8.dp else 12.dp)
    val hPad = if (small) 13.dp else 18.dp
    Row(
        modifier = modifier
            .then(
                if (enabled) {
                    Modifier.shadow(
                        if (small) 4.dp else 8.dp,
                        shape = shape,
                        spotColor = glow,
                        ambientColor = Color.Transparent,
                    )
                } else Modifier
            )
            .clip(shape)
            .background(
                if (enabled) Brush.linearGradient(listOf(from, to)) else Brush.linearGradient(listOf(cFill, cFill))
            )
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                enabled = enabled,
                onClick = onClick,
            )
            .padding(horizontal = hPad)
            .height(if (small) 32.dp else 40.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(if (small) 13.dp else 14.dp),
                color = Color.White,
                strokeWidth = 2.dp,
            )
        } else if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(if (small) 15.dp else 17.dp), tint = Color.White)
        }
        Text(
            label,
            fontSize = if (small) 13.sp else 15.sp,
            fontWeight = FontWeight.W600,
            color = if (enabled) Color.White else cPh,
        )
    }
}

/** 软按钮（.btn.soft）：cFill 底 + cLine 内描边；danger-t = danger-weak 底红字无描边 */
@Composable
fun DsSoftButton(
    label: String,
    icon: ImageVector? = null,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    small: Boolean = false,
    danger: Boolean = false,
) {
    val shape = RoundedCornerShape(if (small) 8.dp else 12.dp)
    val bg = if (danger) cDangerWeak else cFill
    val fg = if (danger) cDanger else cText
    Row(
        modifier = modifier
            .clip(shape)
            .background(bg)
            .drawBehind {
                if (!danger) {
                    val w = 1.dp.toPx()
                    drawRoundRect(
                        color = cLine,
                        topLeft = Offset(w / 2, w / 2),
                        size = Size(size.width - w, size.height - w),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(8.dp.toPx()),
                        style = Stroke(w),
                    )
                }
            }
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .padding(horizontal = if (small) 13.dp else 16.dp)
            .height(if (small) 32.dp else 40.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(if (small) 15.dp else 17.dp), tint = fg)
        }
        Text(label, fontSize = if (small) 13.sp else 15.sp, fontWeight = FontWeight.W600, color = fg)
    }
}

/** 幽灵按钮（.btn.ghost）：透明底 + 1.5dp 主色/危险色内描边 */
@Composable
fun DsGhostButton(
    label: String,
    icon: ImageVector? = null,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    small: Boolean = false,
    danger: Boolean = false,
) {
    val shape = RoundedCornerShape(if (small) 8.dp else 12.dp)
    val fg = if (danger) cDanger else cPrimary
    Row(
        modifier = modifier
            .clip(shape)
            .drawBehind {
                val w = 1.5.dp.toPx()
                drawRoundRect(
                    color = fg,
                    topLeft = Offset(w / 2, w / 2),
                    size = Size(size.width - w, size.height - w),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(8.dp.toPx()),
                    style = Stroke(w),
                )
            }
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .padding(horizontal = if (small) 13.dp else 18.dp)
            .height(if (small) 32.dp else 40.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(if (small) 15.dp else 17.dp), tint = fg)
        }
        Text(label, fontSize = if (small) 13.sp else 15.sp, fontWeight = FontWeight.W600, color = fg)
    }
}

/** 正典信号条（components.css .sig）：4 根 3dp 条按 q1-q4 着色 + RSSI dBm mono */
@Composable
fun DsSignal(rssi: Int, modifier: Modifier = Modifier) {
    val q = when {
        rssi >= -60 -> 4
        rssi >= -70 -> 3
        rssi >= -80 -> 2
        else -> 1
    }
    Row(modifier = modifier, verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        listOf(4, 7, 10, 12).forEachIndexed { i, h ->
            val on = when {
                q == 4 -> true
                q == 3 && i < 3 -> true
                q == 2 && i < 2 -> true
                q == 1 && i < 1 -> true
                else -> false
            }
            val color = when {
                !on -> cLine
                q >= 3 -> cSuccess
                q == 2 -> com.smartble.ui.theme.cWarning
                else -> cDanger
            }
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(h.dp)
                    .background(color, RoundedCornerShape(1.dp))
            )
        }
    }
}
