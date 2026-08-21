package com.smartble.ui.screen

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Architecture
import androidx.compose.material.icons.filled.BluetoothSearching
import androidx.compose.material.icons.filled.BroadcastOnPersonal
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.ConnectWithoutContact
import androidx.compose.material.icons.filled.DeveloperBoard
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Memory
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.PhoneIphone
import androidx.compose.material.icons.filled.DesktopWindows
import androidx.compose.material.icons.filled.LaptopMac
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.R
import com.smartble.ui.theme.Primary
import com.smartble.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen() {
    Scaffold(
        topBar = { TopAppBar(title = { Text("关于") }) }
    ) { paddingValues ->
        AboutContent(Modifier.padding(paddingValues))
    }
}

@Composable
fun AboutContent(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(20.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        HeroCard()
        Spacer(modifier = Modifier.height(20.dp))
        SectionCard(title = "产品定位") {
            Text(
                "Smart BLE 是跨平台 BLE 控制台与统一协议内核，不是单一端上的小工具。",
                style = MaterialTheme.typography.bodyLarge.copy(
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    lineHeight = 24.sp,
                )
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                "它把扫描、连接、读写特征值、通知监听、广播模式和硬件联动收进同一套工作流里，既适合现场调试，也适合作为多平台 BLE 参考实现。",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = TextSecondary,
                    lineHeight = 22.sp,
                )
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        SectionCard(title = "核心能力") {
            FeatureItem(
                icon = Icons.Default.BluetoothSearching,
                title = "设备扫描",
                description = "快速发现附近 BLE 设备并实时展示 RSSI 状态"
            )
            FeatureItem(
                icon = Icons.Default.ConnectWithoutContact,
                title = "连接与服务发现",
                description = "建立会话后查看服务树和特征值层级"
            )
            FeatureItem(
                icon = Icons.Default.EditNote,
                title = "读写与监听",
                description = "支持 HEX / UTF-8 写入、读取和通知订阅"
            )
            FeatureItem(
                icon = Icons.Default.BroadcastOnPersonal,
                title = "广播模式",
                description = "验证设备名称、UUID 与广播载荷的配置效果"
            )
            FeatureItem(
                icon = Icons.Default.Memory,
                title = "硬件联动",
                description = "与 ESP32 / 固件示例配套使用，形成协议验证闭环"
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        SectionCard(title = "平台矩阵") {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                PlatformChip(name = "Android", icon = Icons.Default.PhoneAndroid)
                PlatformChip(name = "iOS", icon = Icons.Default.PhoneIphone)
                PlatformChip(name = "macOS", icon = Icons.Default.LaptopMac)
                PlatformChip(name = "Windows", icon = Icons.Default.DesktopWindows)
                PlatformChip(name = "UniApp", icon = Icons.Default.DeveloperBoard)
                PlatformChip(name = "Hardware", icon = Icons.Default.Memory)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        LinkSection()

        Spacer(modifier = Modifier.height(28.dp))

        Text(
            "© 2026 Smart BLE\nReleased under MIT License",
            style = MaterialTheme.typography.bodySmall.copy(
                color = TextSecondary.copy(alpha = 0.72f),
                lineHeight = 18.sp,
            ),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun HeroCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 10.dp)
    ) {
        Column {
            Image(
                painter = painterResource(id = R.drawable.brand_about_hero),
                contentDescription = "Smart BLE Hero",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp),
                contentScale = ContentScale.Crop
            )

            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.brand_icon),
                        contentDescription = "Smart BLE Icon",
                        modifier = Modifier
                            .size(68.dp)
                            .clip(RoundedCornerShape(20.dp))
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(
                            "Smart BLE",
                            style = MaterialTheme.typography.headlineSmall.copy(
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Android 原生运行面",
                            style = MaterialTheme.typography.labelLarge.copy(
                                color = Primary,
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MetaChip("Version 2.0.0")
                    MetaChip("Compose")
                    MetaChip("Kotlin")
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    "跨平台 BLE 控制台与统一协议内核，用原生 Android 体验承接扫描、连接、广播和设备调试。",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        color = TextSecondary,
                        lineHeight = 22.sp,
                    )
                )
            }
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold
                )
            )
            Spacer(modifier = Modifier.height(16.dp))
            content()
        }
    }
}

@Composable
private fun FeatureItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    description: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 14.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(42.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Primary.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Primary,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column {
            Text(
                title,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.SemiBold
                )
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                description,
                style = MaterialTheme.typography.bodySmall.copy(
                    color = TextSecondary,
                    lineHeight = 18.sp,
                )
            )
        }
    }
}

@Composable
private fun PlatformChip(
    name: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Primary.copy(alpha = 0.08f))
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = Primary
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                name,
                style = MaterialTheme.typography.labelMedium.copy(
                    color = Primary,
                    fontWeight = FontWeight.SemiBold
                )
            )
        }
    }
}

@Composable
private fun MetaChip(text: String) {
    Box(
        modifier = Modifier
            .clip(CircleShape)
            .background(Primary.copy(alpha = 0.08f))
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(
            text,
            style = MaterialTheme.typography.labelMedium.copy(
                color = Primary,
                fontWeight = FontWeight.SemiBold
            )
        )
    }
}

@Composable
private fun LinkSection() {
    val context = LocalContext.current

    SectionCard(title = "相关链接") {
        LinkItem(
            icon = Icons.Default.Language,
            title = "项目主页",
            subtitle = "查看平台矩阵、下载入口与架构说明",
            onClick = {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://lightble.i2kai.com/")))
            }
        )
        LinkItem(
            icon = Icons.Default.Architecture,
            title = "架构白皮书",
            subtitle = "统一协议内核、组件拆分与交互流规范",
            onClick = {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://lightble.i2kai.com/MASTER_ARCHITECTURE")))
            }
        )
        LinkItem(
            icon = Icons.Default.Code,
            title = "源码仓库",
            subtitle = "查看全部平台实现与共享资产生成器",
            onClick = {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/luoyaosheng/smart-ble")))
            }
        )
        LinkItem(
            icon = Icons.Default.BugReport,
            title = "问题反馈",
            subtitle = "提交 issue 或查看已知问题",
            onClick = {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/luoyaosheng/smart-ble/issues")))
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LinkItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp),
        shape = RoundedCornerShape(16.dp),
        onClick = onClick
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = Primary, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = TextSecondary,
                        lineHeight = 18.sp
                    )
                )
            }
            Spacer(modifier = Modifier.width(10.dp))
            Icon(
                Icons.Default.OpenInNew,
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                tint = TextSecondary
            )
        }
    }
}
