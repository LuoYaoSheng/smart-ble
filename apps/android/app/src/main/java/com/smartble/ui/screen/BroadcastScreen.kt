package com.smartble.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.shadow
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Android
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.BroadcastOnPersonal
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Scanner
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.ui.theme.Error
import com.smartble.ui.theme.Primary
import com.smartble.ui.theme.Success
import com.smartble.ui.theme.TextSecondary
import com.smartble.ui.theme.Warning
import com.smartble.ui.viewmodel.BroadcastViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BroadcastScreen(
    viewModel: BroadcastViewModel
) {
    val isAdvertising by viewModel.isAdvertising.collectAsState()
    val uuidInput by viewModel.uuidInput.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val statusMessage by viewModel.statusMessage.collectAsState()
    val isSupported = viewModel.isAdvertisingSupported

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("BLE 广播") }
            )
        }
    ) { paddingValues ->
        if (!isSupported) {
            UnsupportedView()
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
            ) {
                // 状态卡片
                StatusCard(
                    isAdvertising = isAdvertising,
                    statusMessage = statusMessage
                )

                Spacer(modifier = Modifier.height(16.dp))

                // 平台说明卡片
                PlatformWarningCard()

                Spacer(modifier = Modifier.height(16.dp))

                // 广播设置
                BroadcastSettingsCard(
                    uuidInput = uuidInput,
                    isAdvertising = isAdvertising,
                    onUuidChange = { viewModel.updateUuid(it) },
                    onToggleAdvertising = { viewModel.toggleAdvertising() }
                )

                Spacer(modifier = Modifier.height(16.dp))

                // 错误提示
                errorMessage?.let { message ->
                    ErrorCard(
                        message = message,
                        onDismiss = { viewModel.clearError() }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 测试指南
                TestGuideCard()
            }
        }
    }
}

@Composable
fun UnsupportedView() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.Scanner,
            contentDescription = null,
            tint = TextSecondary,
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "功能不可用",
            style = MaterialTheme.typography.titleLarge,
            color = TextSecondary
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "当前设备不支持 BLE 广播功能",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
    }
}

// === Content without Scaffold for use in tabs ===
@Composable
fun BroadcastContent(
    viewModel: BroadcastViewModel
) {
    val isAdvertising by viewModel.isAdvertising.collectAsState()
    val uuidInput by viewModel.uuidInput.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val statusMessage by viewModel.statusMessage.collectAsState()
    val isSupported = viewModel.isAdvertisingSupported

    if (!isSupported) {
        UnsupportedView()
    } else {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            // 状态卡片
            StatusCard(
                isAdvertising = isAdvertising,
                statusMessage = statusMessage
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 平台说明卡片
            PlatformWarningCard()

            Spacer(modifier = Modifier.height(16.dp))

            // 广播设置
            BroadcastSettingsCard(
                uuidInput = uuidInput,
                isAdvertising = isAdvertising,
                onUuidChange = { viewModel.updateUuid(it) },
                onToggleAdvertising = { viewModel.toggleAdvertising() }
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 错误提示
            errorMessage?.let { message ->
                ErrorCard(
                    message = message,
                    onDismiss = { viewModel.clearError() }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 测试指南
            TestGuideCard()
        }
    }
}

@Composable
fun StatusCard(
    isAdvertising: Boolean,
    statusMessage: String
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isAdvertising)
                Color.Transparent
            else
                MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isAdvertising) 0.dp else 2.dp
        ),
        border = if (!isAdvertising)
            androidx.compose.foundation.BorderStroke(
                width = 1.dp,
                color = MaterialTheme.colorScheme.outlineVariant
            )
        else null
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .then(
                    if (isAdvertising) {
                        Modifier
                            .background(
                                brush = Brush.linearGradient(
                                    colors = listOf(
                                        Success,
                                        Color(0xFF30D158)
                                    )
                                )
                            )
                            .shadow(
                                elevation = 8.dp,
                                shape = RoundedCornerShape(16.dp),
                                spotColor = Success.copy(alpha = 0.3f)
                            )
                    } else {
                        Modifier
                    }
                )
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Icon container
                Box(
                    modifier = Modifier
                        .size(64.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .background(
                                color = if (isAdvertising)
                                    Color.White
                                else
                                    Primary.copy(alpha = 0.1f),
                                shape = RoundedCornerShape(16.dp)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            if (isAdvertising)
                                Icons.Default.BroadcastOnPersonal
                            else
                                Icons.Default.Bluetooth,
                            contentDescription = null,
                            tint = if (isAdvertising) Success else Primary,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    statusMessage,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = if (isAdvertising) Color.White else MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    if (isAdvertising) "其他设备可以扫描到此设备" else "点击开始启动BLE广播",
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (isAdvertising) Color.White.copy(alpha = 0.9f) else TextSecondary
                )
            }
        }
    }
}

@Composable
fun PlatformWarningCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            Color(0xFFFF9800).copy(alpha = 0.15f),
                            Color(0xFFFF9800).copy(alpha = 0.05f)
                        )
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
                .border(
                    width = 1.dp,
                    color = Color(0xFFFF9800).copy(alpha = 0.3f),
                    shape = RoundedCornerShape(12.dp)
                )
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Android,
                    contentDescription = null,
                    tint = Color(0xFFFF9800),
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        "Android 平台说明",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFFF9800)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "由于系统限制，广播时会显示设备的实际蓝牙名称，而非自定义名称。\n如需修改，请前往系统设置 → 蓝牙 → 修改设备名称。",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BroadcastSettingsCard(
    uuidInput: String,
    isAdvertising: Boolean,
    onUuidChange: (String) -> Unit,
    onToggleAdvertising: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                "广播设置",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 设备名称 (只读)
            ReadOnlyField(
                label = "设备名称",
                value = "Android 设备 (显示实际名称)",
                icon = Icons.Default.Bluetooth
            )

            Spacer(modifier = Modifier.height(16.dp))

            // 服务 UUID
            OutlinedTextField(
                value = uuidInput,
                onValueChange = onUuidChange,
                enabled = !isAdvertising,
                label = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Fingerprint,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("服务UUID")
                    }
                },
                placeholder = { Text("输入 128 位 UUID") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    disabledBorderColor = MaterialTheme.colorScheme.outlineVariant,
                    disabledTextColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                ),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(24.dp))

            // 开始/停止按钮
            Button(
                onClick = onToggleAdvertising,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isAdvertising) Error else Primary
                ),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(
                    if (isAdvertising) Icons.Default.Stop else Icons.Default.PlayArrow,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    if (isAdvertising) "停止广播" else "开始广播",
                    style = MaterialTheme.typography.titleSmall
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReadOnlyField(
    label: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Column {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
                tint = Primary
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                label,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.width(8.dp))
            // Android 标签
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = Color(0xFFFF9800).copy(alpha = 0.15f)
                ),
                shape = RoundedCornerShape(4.dp)
            ) {
                Text(
                    "Android",
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFFFF9800),
                    fontWeight = FontWeight.Bold
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = value,
            onValueChange = {},
            enabled = false,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp),
            colors = OutlinedTextFieldDefaults.colors(
                disabledBorderColor = MaterialTheme.colorScheme.outlineVariant,
                disabledTextColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            ),
            singleLine = true
        )
    }
}

@Composable
fun ErrorCard(
    message: String,
    onDismiss: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    color = Error.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(12.dp)
                )
                .border(
                    width = 1.dp,
                    color = Error.copy(alpha = 0.3f),
                    shape = RoundedCornerShape(12.dp)
                )
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Error,
                    contentDescription = null,
                    tint = Error,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Error,
                    modifier = Modifier.weight(1f)
                )
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "关闭",
                        tint = Error,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun TestGuideCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    color = Color.Blue.copy(alpha = 0.05f),
                    shape = RoundedCornerShape(12.dp)
                )
                .border(
                    width = 1.dp,
                    color = Color.Blue.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(12.dp)
                )
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Scanner,
                        contentDescription = null,
                        tint = Color.Blue,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "如何测试",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.Blue
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "1. 点击\"开始广播\"按钮\n" +
                    "2. 使用另一台设备打开 BLE 扫描功能\n" +
                    "3. 搜索包含 UUID \"0000FFF0\" 的设备\n" +
                    "4. 找到本设备后即可连接测试",
                    style = MaterialTheme.typography.bodySmall,
                    lineHeight = 18.sp,
                    color = TextSecondary
                )
            }
        }
    }
}
