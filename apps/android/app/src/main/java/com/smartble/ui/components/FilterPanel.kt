package com.smartble.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartble.ui.theme.Primary
import com.smartble.ui.theme.TextSecondary

/**
 * Filter panel - aligned with UniApp reference implementation
 * Features:
 * - RSSI slider (-100 to -30) with preset buttons [-100, -90, -70, -50]
 * - Name prefix text input
 * - Hide unnamed checkbox
 * - Reset button
 */
@Composable
fun FilterPanel(
    expanded: Boolean,
    onToggleExpanded: () -> Unit,
    filterRSSI: Int,
    onFilterRSSIChange: (Int) -> Unit,
    filterNamePrefix: String,
    onFilterNamePrefixChange: (String) -> Unit,
    hideUnnamed: Boolean,
    onHideUnnamedChange: (Boolean) -> Unit,
    onReset: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Filter header with expand/collapse and reset button
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onToggleExpanded) {
                    Icon(
                        if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                        contentDescription = if (expanded) "收起" else "展开",
                        tint = Primary
                    )
                }

                Text(
                    "过滤条件",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )

                Spacer(modifier = Modifier.weight(1f))

                // Active filter count badge
                val activeCount = getActiveFilterCount(filterRSSI, filterNamePrefix, hideUnnamed)
                if (activeCount > 0) {
                    Text(
                        "$activeCount",
                        style = MaterialTheme.typography.labelSmall,
                        color = Primary,
                        modifier = Modifier
                            .background(Primary.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }

                OutlinedButton(
                    onClick = onReset,
                    modifier = Modifier.height(32.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)
                ) {
                    Icon(
                        Icons.Default.Refresh,
                        contentDescription = null,
                        modifier = Modifier.padding(end = 4.dp)
                    )
                    Text("重置", style = MaterialTheme.typography.labelSmall)
                }
            }

            // Filter options
            if (expanded) {
                Spacer(modifier = Modifier.height(16.dp))

                // RSSI Filter - aligned with UniApp (-100 to -30)
                FilterItem(label = "信号强度", value = "$filterRSSI dBm") {
                    Slider(
                        value = filterRSSI.toFloat(),
                        onValueChange = { onFilterRSSIChange(it.toInt()) },
                        valueRange = -100f..-30f,
                        steps = 13
                    )

                    // Preset buttons - aligned with UniApp
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        PresetButton(
                            label = "全部",
                            selected = filterRSSI == -100,
                            onClick = { onFilterRSSIChange(-100) },
                            modifier = Modifier.weight(1f)
                        )
                        PresetButton(
                            label = "-90",
                            selected = filterRSSI == -90,
                            onClick = { onFilterRSSIChange(-90) },
                            modifier = Modifier.weight(1f)
                        )
                        PresetButton(
                            label = "-70",
                            selected = filterRSSI == -70,
                            onClick = { onFilterRSSIChange(-70) },
                            modifier = Modifier.weight(1f)
                        )
                        PresetButton(
                            label = "-50",
                            selected = filterRSSI == -50,
                            onClick = { onFilterRSSIChange(-50) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Name prefix filter
                FilterItem(label = "名称前缀") {
                    TextField(
                        value = filterNamePrefix,
                        onValueChange = onFilterNamePrefixChange,
                        placeholder = { Text("输入设备名称前缀...", style = MaterialTheme.typography.bodySmall) },
                        singleLine = true,
                        colors = TextFieldDefaults.colors(
                            focusedIndicatorColor = Primary,
                            unfocusedIndicatorColor = MaterialTheme.colorScheme.outline
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Hide unnamed checkbox
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "隐藏无名设备",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    Switch(
                        checked = hideUnnamed,
                        onCheckedChange = onHideUnnamedChange
                    )
                }
            }
        }
    }
}

@Composable
private fun FilterItem(
    label: String,
    value: String? = null,
    content: @Composable () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                label,
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                fontWeight = FontWeight.Medium
            )
            if (value != null) {
                Text(
                    value,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (value == "-100 dBm") TextSecondary else Primary,
                    fontWeight = FontWeight.Medium
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        content()
    }
}

@Composable
private fun PresetButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        modifier = modifier.height(32.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (selected) Primary else MaterialTheme.colorScheme.surfaceVariant
        ),
        shape = RoundedCornerShape(6.dp),
        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp)
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelSmall,
            color = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

private fun getActiveFilterCount(rssi: Int, namePrefix: String, hideUnnamed: Boolean): Int {
    var count = 0
    if (rssi > -100) count++
    if (namePrefix.isNotEmpty()) count++
    if (hideUnnamed) count++
    return count
}
