package com.smartble.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.theme.cCard
import com.smartble.ui.theme.cFill
import com.smartble.ui.theme.cLine
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cPh
import com.smartble.ui.theme.cPrimary
import com.smartble.ui.theme.cSub
import com.smartble.ui.theme.cSuccess
import com.smartble.ui.theme.cText

/**
 * 正典筛选面板 C3（prototype components.css .filter · PAGE_LAYOUT_CONTRACT §4-5）。
 * 展开由 P001 组标题「筛选」文字链控制，本组件只渲染面板体：
 * 四行 = RSSI 预设×4 / 阈值滑杆(-100..-40 step5) / 名称前缀 / 隐藏无名 + 重置。
 */
@Composable
fun FilterPanel(
    filterRSSI: Int,
    onFilterRSSIChange: (Int) -> Unit,
    filterNamePrefix: String,
    onFilterNamePrefixChange: (String) -> Unit,
    hideUnnamed: Boolean,
    onHideUnnamedChange: (Boolean) -> Unit,
    onReset: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, bottom = 12.dp)
            .background(cCard, RoundedCornerShape(16.dp))
            .border(1.dp, cLine, RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        // 行1：最弱信号预设（激活 primary 实底白字）
        FilterRow(label = "最弱信号") {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                listOf(-40 to "强 [-40]", -60 to "较好 [-60]", -70 to "一般 [-70]", -85 to "弱 [-85]").forEach { (v, lb) ->
                    PresetPill(
                        label = lb,
                        selected = filterRSSI == v,
                        onClick = { onFilterRSSIChange(v) }
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(10.dp))
        // 行2：阈值滑杆
        FilterRow(label = "阈值 $filterRSSI dBm") {
            Slider(
                value = filterRSSI.toFloat(),
                onValueChange = { onFilterRSSIChange(it.toInt()) },
                valueRange = -100f..-40f,
                steps = 11,
                colors = SliderDefaults.colors(
                    thumbColor = cCard,
                    activeTrackColor = cPrimary,
                    inactiveTrackColor = cLine
                )
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        // 行3：名称前缀（fill 底圆角 8）
        FilterRow(label = "名称前缀") {
            BasicTextField(
                value = filterNamePrefix,
                onValueChange = onFilterNamePrefixChange,
                singleLine = true,
                textStyle = androidx.compose.ui.text.TextStyle(
                    fontSize = 13.sp,
                    color = cText
                ),
                cursorBrush = SolidColor(cPrimary),
                decorationBox = { inner ->
                    androidx.compose.foundation.layout.Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(cFill, RoundedCornerShape(8.dp))
                            .padding(horizontal = 10.dp)
                            .height(34.dp),
                        contentAlignment = Alignment.CenterStart
                    ) {
                        if (filterNamePrefix.isEmpty()) {
                            Text("如 SHID / LightBLE", fontSize = 13.sp, color = cPh)
                        }
                        inner()
                    }
                }
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        // 行4：隐藏无名开关 + 重置过滤
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("隐藏无名", fontSize = 12.sp, color = cMut, fontWeight = FontWeight.W600)
            Spacer(modifier = Modifier.width(10.dp))
            Switch(
                checked = hideUnnamed,
                onCheckedChange = onHideUnnamedChange,
                colors = SwitchDefaults.colors(
                    checkedTrackColor = cSuccess,
                    checkedThumbColor = cCard,
                    uncheckedTrackColor = cPh,
                    uncheckedThumbColor = cCard
                )
            )
            Spacer(modifier = Modifier.weight(1f))
            DsSoftButton(label = "重置过滤", onClick = onReset)
        }
    }
}

@Composable
private fun FilterRow(label: String, content: @Composable () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(
            label,
            fontSize = 12.sp,
            color = cMut,
            fontWeight = FontWeight.W600,
            modifier = Modifier.width(64.dp)
        )
        Column(modifier = Modifier.weight(1f)) { content() }
    }
}

@Composable
private fun PresetPill(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        fontSize = 11.sp,
        color = if (selected) cCard else cSub,
        fontWeight = FontWeight.W600,
        modifier = Modifier
            .background(
                if (selected) cPrimary else cFill,
                RoundedCornerShape(999.dp)
            )
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            )
            .padding(horizontal = 11.dp, vertical = 4.dp)
    )
}
