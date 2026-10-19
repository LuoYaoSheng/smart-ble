package com.smartble.ui.screen

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BluetoothDisabled
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartble.core.ble.AdvertisementParser
import com.smartble.core.model.BleDevice
import com.smartble.core.model.ConnectionState
import com.smartble.core.model.RssiLevel
import com.smartble.ui.design.AppEmpty
import com.smartble.ui.design.DsIcons
import com.smartble.ui.design.DsPrimaryButton
import com.smartble.ui.design.DsSoftButton
import com.smartble.ui.theme.Error
import com.smartble.ui.theme.Primary
import com.smartble.ui.theme.cFill
import com.smartble.ui.theme.cInk
import com.smartble.ui.theme.cInkText
import com.smartble.ui.theme.cCard
import com.smartble.ui.theme.cLine
import com.smartble.ui.theme.cLineSoft
import com.smartble.ui.theme.cMut
import com.smartble.ui.theme.cPrimary
import com.smartble.ui.theme.cSub
import com.smartble.ui.theme.cText
import com.smartble.ui.theme.RssiExcellent
import com.smartble.ui.theme.RssiFair
import com.smartble.ui.theme.RssiGood
import com.smartble.ui.theme.RssiWeak
import com.smartble.ui.theme.TextSecondary
import com.smartble.ui.viewmodel.DeviceListUiState
import com.smartble.ui.viewmodel.DeviceListViewModel
import com.smartble.ui.components.*
import kotlinx.coroutines.launch

// === Content without Scaffold ===
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceListContent(
    viewModel: DeviceListViewModel,
    onDeviceClick: (String, String) -> Unit,
    modifier: Modifier = Modifier,
    onProfileAction: (BleDevice) -> Unit = {},
    onToggleScan: (() -> Unit)? = null,
    onEnableBluetooth: (() -> Unit)? = null,
) {
    val uiState by viewModel.uiState.collectAsState()
    val filteredScanResults by viewModel.filteredScanResults.collectAsState()
    val isScanning by viewModel.isScanning.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    // Filter state
    val filterRSSI by viewModel.filterRSSI.collectAsState()
    val filterNamePrefix by viewModel.filterNamePrefix.collectAsState()
    val hideUnnamed by viewModel.hideUnnamed.collectAsState()
    var filterExpanded by remember { mutableStateOf(false) }

    // 广播数据弹层（正典 p001-advdlg / advertisement-dialog.vue）：
    // ModalBottomSheet 独立 sheet 窗口——全屏遮罩 rgba(15,29,48,.5)（盖住
    // AppNavbar/TabBar，点遮罩即关）+ 返回键 + 下滑拖关 + 内置滑入滑出；
    // 最高 78vh、顶部 20dp 圆角；关闭钮 = 「关闭」文字软钮（canon soft-btn）
    var selectedDevice by remember { mutableStateOf<BleDevice?>(null) }
    var sheetOpen by remember { mutableStateOf(false) }
    val currentSheetDevice = selectedDevice?.let { selected ->
        filteredScanResults.find { it.deviceId == selected.deviceId } ?: selected
    }

    Column(modifier = modifier.fillMaxSize()) {
                // Error message
                errorMessage?.let { message ->
                    ErrorMessageCard(message = message, onDismiss = { viewModel.clearError() })
                }

                // Bluetooth state
                when (uiState) {
                    is DeviceListUiState.Initializing -> ConnectingCard(message = "正在初始化蓝牙...")
                    is DeviceListUiState.BluetoothOff -> BluetoothOffCard(
                        onEnableClick = { (onEnableBluetooth ?: viewModel::enableBluetooth).invoke() }
                    )
                    is DeviceListUiState.BluetoothUnavailable -> BluetoothUnavailableCard()
                    is DeviceListUiState.BluetoothUnauthorized -> BluetoothUnauthorizedCard()
                    is DeviceListUiState.Ready -> {
                        // 正典 P001（PAGE_LAYOUT_CONTRACT §4）：整页单列滚动
                        // scantool → 组标题「附近设备」 → 筛选面板(展开) → 设备列表 / 空态
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(bottom = 24.dp)
                        ) {
                            item {
                                ScanTool(
                                    isScanning = isScanning,
                                    foundCount = filteredScanResults.size,
                                    onToggleScan = { (onToggleScan ?: viewModel::toggleScan).invoke() }
                                )
                            }
                            item {
                                SectionTitle(
                                    count = filteredScanResults.size,
                                    filterOpen = filterExpanded,
                                    onToggleFilter = { filterExpanded = !filterExpanded }
                                )
                            }
                            if (filterExpanded) {
                                item {
                                    FilterPanel(
                                        filterRSSI = filterRSSI,
                                        onFilterRSSIChange = { viewModel.setFilterRSSI(it) },
                                        filterNamePrefix = filterNamePrefix,
                                        onFilterNamePrefixChange = { viewModel.setFilterNamePrefix(it) },
                                        hideUnnamed = hideUnnamed,
                                        onHideUnnamedChange = { viewModel.setHideUnnamed(it) },
                                        onReset = { viewModel.resetFilters() }
                                    )
                                }
                            }
                            if (filteredScanResults.isEmpty()) {
                                item {
                                    AppEmpty(
                                        title = "还没有扫描结果",
                                        desc = "点上方按钮开始扫描附近 BLE 设备",
                                        action = if (isScanning) null else {
                                            {
                                                DsSoftButton(
                                                    label = "开始扫描",
                                                    icon = DsIcons.Scan,
                                                    onClick = { (onToggleScan ?: viewModel::toggleScan).invoke() }
                                                )
                                            }
                                        }
                                    )
                                }
                            } else {
                                items(filteredScanResults, key = { it.deviceId }) { device ->
                                    val isSmartHid = com.smartble.core.profile.SmartHidMatcher.isSmartHid(device)
                                    DeviceCard(
                                        device = device,
                                        onDeviceClick = { d ->
                                            selectedDevice = d
                                            sheetOpen = true
                                        },
                                        onAction = { target ->
                                            onDeviceClick(target.deviceId, target.displayName)
                                        },
                                        profileLabel = if (isSmartHid) "配置 Smart HID" else null,
                                        onProfileAction = if (isSmartHid) {
                                            { target -> onProfileAction(target) }
                                        } else null,
                                    )
                                }
                            }
                        }
                    }
                }
            }

    if (sheetOpen && currentSheetDevice != null) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        val scope = rememberCoroutineScope()
        // 统一走 hide() 滑出动画再撤窗（关闭钮/遮罩/返回键三路一致）
        val closeSheet: () -> Unit = {
            scope.launch {
                sheetState.hide()
            }.invokeOnCompletion { sheetOpen = false }
        }
        ModalBottomSheet(
            onDismissRequest = closeSheet,
            sheetState = sheetState,
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
            containerColor = cCard,
            scrimColor = Color(0x800F1D30),
            dragHandle = null
        ) {
            currentSheetDevice?.let { device ->
                DeviceDetailSheet(
                    device = device,
                    onConnect = {
                        sheetOpen = false
                        onDeviceClick(device.deviceId, device.displayName)
                    },
                    onDismiss = closeSheet
                )
            }
        }
    }
}

@Composable
fun ConnectingCard() {
    ConnectingCard(message = "正在连接设备...")
}

@Composable
fun ConnectingCard(message: String) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(
            containerColor = Primary.copy(alpha = 0.1f)
        )
    ) {
    Row(
        modifier = Modifier.padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(20.dp),
            color = Primary
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            message,
            style = MaterialTheme.typography.bodyMedium,
            color = Primary
        )
    }
    }
}

@Composable
fun BluetoothUnauthorizedCard() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Error.copy(alpha = 0.1f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                "蓝牙权限未授权",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = Error
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "请在系统设置中授予蓝牙扫描和连接权限后重试。",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
        }
    }
}

// p001-advdlg 口径（20260924 手机端重建）：标题行 + kv 行 + 深色 ad-sec 分段
// （Service UUIDs / AD 结构真值逐段 + 整包 hex / Manufacturer Data / Service Data）
// + 复制数据。对齐 uniapp components/scan/advertisement-dialog.vue 与桌面五壳
// AdvertisementSheet；Android 侧独有优势 = ScanRecord 原始字节真值逐段解析
// （core/ble/AdvertisementParser），非「平台解析字段重建」。
// 呈现层 = 模态弹层：遮罩 rgba(15,29,48,.5) 点击关闭 + 底部滑入（顶部 20dp
// 圆角、最高 78vh）+「关闭」文字软钮（canon soft-btn）+ 返回键关闭。
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceDetailSheet(
    device: BleDevice,
    onConnect: () -> Unit,
    onDismiss: () -> Unit
) {
    val record = device.scanRecord
    val uuids = record?.serviceUuids.orEmpty()
    val manufacturerData = record?.manufacturerData.orEmpty()
    val serviceData = record?.serviceData.orEmpty()
    val rawBytes = record?.rawBytes
    val segments = remember(record) { AdvertisementParser.parse(rawBytes) }
    val clipboard = LocalClipboardManager.current
    val context = LocalContext.current
    val connecting = device.state == ConnectionState.Connecting
    val connected = device.state == ConnectionState.Connected

    val sheetMaxHeight = (LocalConfiguration.current.screenHeightDp * 0.78f).dp

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(max = sheetMaxHeight)
            .background(cCard, RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            // sheet 对话框窗口延伸到手势条下方但 navigationBars inset 报 0
            // （EMUI 实测按钮蓝底到 y2297 侵入手势区），固定底衬抬出操作行
            .padding(bottom = 24.dp)
    ) {
        // Grip（canon .grip：36×4dp）
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 10.dp, bottom = 4.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .width(36.dp)
                    .height(4.dp)
                    .background(cLine, RoundedCornerShape(2.dp))
            )
        }

        // 标题行：广播数据 · 名称 + 「关闭」软钮（canon soft-btn）
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "广播数据 · ${device.displayName}",
                fontSize = 17.sp,
                fontWeight = FontWeight.W700,
                color = cText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            DsSoftButton(
                label = "关闭",
                onClick = onDismiss,
                small = true
            )
        }

        // 弹层主体（kv + 深色分段），超高滚动
        Column(
            modifier = Modifier
                .weight(1f, fill = false)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 4.dp)
        ) {
            AdvKv("设备 ID", device.deviceId, mono = true)
            AdvKv("名称", device.name ?: "（未命名）")
            AdvKv("RSSI", "${device.rssi} dBm", mono = true)
            AdvKv("profileMatch", AdvertisementParser.profileMatchText(device), mono = true)
            AdvKv("设备状态", when (device.state) {
                ConnectionState.Connected -> "已连接"
                ConnectionState.Connecting -> "连接中..."
                ConnectionState.Disconnected -> "未连接"
                ConnectionState.Disconnecting -> "断开中..."
            })

            AdvSection(
                "Service UUIDs",
                if (uuids.isEmpty()) "—" else "${uuids.size} 项"
            ) {
                if (uuids.isEmpty()) AdvMiss()
                else uuids.forEach { AdvHexLine(it) }
            }

            AdvSection(
                "AD 结构 · 逐段",
                if (rawBytes == null) "—" else "原始字节解析 · 整包 ${rawBytes.size} B"
            ) {
                segments.forEachIndexed { index, seg ->
                    AdvSegHeader(
                        left = "%02X · %s".format(seg.type, seg.name) + if (seg.truncated) " · 截断" else "",
                        right = "${seg.frameLength} B",
                        first = index == 0
                    )
                    AdvHexLine(seg.frameHexSpaced())
                    seg.decoded?.let { decoded ->
                        Text(
                            "→ $decoded",
                            fontSize = 11.sp,
                            color = cInkText.copy(alpha = 0.55f),
                            modifier = Modifier.padding(top = 1.dp)
                        )
                    }
                }
                if (segments.isEmpty()) AdvMiss()
                AdvSegHeader("整包 hex", if (rawBytes == null) "—" else "${rawBytes.size} B", first = segments.isEmpty())
                if (rawBytes == null) AdvMiss()
                else AdvHexLine(AdvertisementParser.hexSpaced(rawBytes))
            }

            AdvSection(
                "Manufacturer Data",
                if (manufacturerData.isEmpty()) "—" else "${manufacturerData.size} 项"
            ) {
                if (manufacturerData.isEmpty()) AdvMiss()
                else manufacturerData.entries.forEachIndexed { index, (id, data) ->
                    AdvSegHeader("0x%04X".format(id), "${data.size} B", first = index == 0)
                    AdvHexLine(AdvertisementParser.hexSpaced(data))
                }
            }

            AdvSection(
                "Service Data",
                if (serviceData.isEmpty()) "—" else "${serviceData.size} 项"
            ) {
                if (serviceData.isEmpty()) AdvMiss()
                else serviceData.entries.forEachIndexed { index, (uuid, data) ->
                    AdvSegHeader(uuid, "${data.size} B", first = index == 0)
                    AdvHexLine(AdvertisementParser.hexSpaced(data))
                }
            }
        }

        // 操作行：复制数据 + 连接并进入
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            DsSoftButton(
                label = "复制数据",
                icon = DsIcons.Copy,
                onClick = {
                    clipboard.setText(AnnotatedString(AdvertisementParser.buildAdvCopyText(device)))
                    Toast.makeText(context, "已复制", Toast.LENGTH_SHORT).show()
                },
                modifier = Modifier.weight(1f)
            )
            DsPrimaryButton(
                label = when {
                    connecting -> "连接中..."
                    connected -> "已连接"
                    else -> "连接并进入"
                },
                icon = when {
                    connected -> Icons.Default.CheckCircle
                    else -> Icons.Default.Link
                },
                onClick = onConnect,
                modifier = Modifier.weight(1f),
                enabled = !connecting && !connected,
                loading = connecting
            )
        }
    }
}

// ---- p001-advdlg 弹层子组件（正典 .kv / .ad-sec / .hex / .miss 口径） ----------

@Composable
private fun AdvKv(k: String, v: String, mono: Boolean = false) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 10.dp),
            verticalAlignment = Alignment.Top
        ) {
            Text(
                k,
                fontSize = 12.sp,
                fontWeight = FontWeight.W600,
                color = cMut,
                modifier = Modifier.width(100.dp)
            )
            Text(
                v,
                fontSize = 13.sp,
                fontWeight = FontWeight.W500,
                color = cText,
                fontFamily = if (mono) FontFamily.Monospace else FontFamily.Default,
                modifier = Modifier.weight(1f)
            )
        }
        Divider(color = cLineSoft, thickness = 1.dp)
    }
}

@Composable
private fun AdvSection(title: String, right: String, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 12.dp)
            .background(cInk, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                title,
                fontSize = 11.sp,
                fontWeight = FontWeight.W600,
                color = cInkText.copy(alpha = 0.55f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f, fill = false)
            )
            Text(right, fontSize = 11.sp, fontWeight = FontWeight.W600, color = cInkText.copy(alpha = 0.55f))
        }
        content()
    }
}

@Composable
private fun AdvSegHeader(left: String, right: String, first: Boolean = false) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = if (first) 8.dp else 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            left,
            fontSize = 12.sp,
            fontWeight = FontWeight.W600,
            color = cInkText,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f, fill = false)
        )
        Text(right, fontSize = 11.sp, color = cInkText.copy(alpha = 0.55f))
    }
}

@Composable
private fun AdvHexLine(text: String) {
    Text(
        text,
        fontSize = 12.sp,
        lineHeight = 18.sp,
        fontFamily = FontFamily.Monospace,
        color = cInkText,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 3.dp)
    )
}

@Composable
private fun AdvMiss() {
    Text(
        "本轮平台 API 未提供此字段",
        fontSize = 11.sp,
        color = cInkText.copy(alpha = 0.45f),
        modifier = Modifier.padding(top = 4.dp)
    )
}

@Composable
fun ErrorMessageCard(message: String, onDismiss: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Error.copy(alpha = 0.1f)
        ),
        border = CardDefaults.outlinedCardBorder()
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
            IconButton(onClick = onDismiss, modifier = Modifier.size(24.dp)) {
                Icon(
                    Icons.Default.Clear,
                    contentDescription = "关闭",
                    tint = Error,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
fun BluetoothOffCard(onEnableClick: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.BluetoothDisabled,
            contentDescription = null,
            tint = TextSecondary,
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "蓝牙未开启",
            style = MaterialTheme.typography.titleMedium,
            color = TextSecondary
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "请开启蓝牙以继续使用",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = onEnableClick) {
            Text("开启蓝牙")
        }
    }
}

@Composable
fun BluetoothUnavailableCard() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            Icons.Default.BluetoothDisabled,
            contentDescription = null,
            tint = Error,
            modifier = Modifier.size(64.dp)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "蓝牙不可用",
            style = MaterialTheme.typography.titleMedium,
            color = Error
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "您的设备不支持蓝牙低功耗(BLE)",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
    }
}

@Composable
fun ScanTool(
    isScanning: Boolean,
    foundCount: Int,
    onToggleScan: () -> Unit
) {
    // 正典 scantool（pages.css .scantool）：左标签三态 + 右主按钮
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.weight(1f)
        ) {
            if (isScanning) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .background(cPrimary, CircleShape)
                )
            }
            Text(
                if (isScanning) "扫描中 · 5s 会话"
                else if (foundCount > 0) "扫描完成 · 发现 $foundCount 台"
                else "待开始扫描",
                fontSize = 12.sp,
                color = cMut,
                fontWeight = FontWeight.W600
            )
        }
        DsPrimaryButton(
            label = if (isScanning) "停止扫描" else "开始扫描",
            icon = if (isScanning) DsIcons.Stop else DsIcons.Scan,
            danger = isScanning,
            onClick = onToggleScan
        )
    }
}

@Composable
fun SectionTitle(
    count: Int,
    filterOpen: Boolean,
    onToggleFilter: () -> Unit
) {
    // 正典 sec-t：chip 图标 + 「附近设备」 + 计数 chip + 「筛选」文字链
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 18.dp, end = 18.dp, top = 2.dp, bottom = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            DsIcons.Chip,
            contentDescription = null,
            modifier = Modifier.size(22.dp),
            tint = cPrimary
        )
        Spacer(modifier = Modifier.width(7.dp))
        Text(
            "附近设备",
            fontSize = 17.sp,
            fontWeight = FontWeight.W700,
            color = cText
        )
        if (count > 0) {
            Spacer(modifier = Modifier.width(7.dp))
            Text(
                "$count",
                fontSize = 11.sp,
                color = cSub,
                fontWeight = FontWeight.W600,
                modifier = Modifier
                    .background(cFill, RoundedCornerShape(999.dp))
                    .padding(horizontal = 9.dp, vertical = 2.dp)
            )
        }
        Spacer(modifier = Modifier.weight(1f))
        Text(
            if (filterOpen) "收起筛选" else "筛选",
            fontSize = 12.sp,
            color = cPrimary,
            fontWeight = FontWeight.W600,
            modifier = Modifier.clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onToggleFilter
            )
        )
    }
}

@Composable
fun DeviceList(
    devices: List<BleDevice>,
    onDeviceClick: (BleDevice) -> Unit,
    onConnectClick: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(devices) { device ->
            DeviceCard(
                device = device,
                onDeviceClick = onDeviceClick,
                onAction = { target -> onConnectClick(target.deviceId) },
            )
        }
    }
}
