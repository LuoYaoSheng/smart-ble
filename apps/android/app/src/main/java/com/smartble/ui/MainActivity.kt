package com.smartble.ui

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.smartble.BuildConfig
import com.smartble.core.ble.BluetoothState
import com.smartble.ui.design.AppNavbar
import com.smartble.ui.design.AppTabBar
import com.smartble.ui.design.BtTone
import com.smartble.ui.design.DsBadge
import com.smartble.ui.design.DsBadgeTone
import com.smartble.ui.design.DsChip
import com.smartble.ui.screen.AboutContent
import com.smartble.ui.screen.BroadcastContent
import com.smartble.ui.screen.ConnectedDevicesContent
import com.smartble.ui.screen.DeviceDetailScreen
import com.smartble.ui.screen.DeviceListContent
import com.smartble.ui.screen.VersionsScreen
import com.smartble.ui.theme.SmartBLETheme
import com.smartble.ui.viewmodel.BroadcastViewModel
import com.smartble.ui.viewmodel.DeviceDetailViewModel
import com.smartble.ui.viewmodel.DeviceListViewModel

class MainActivity : ComponentActivity() {

    private val deviceListViewModel: DeviceListViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SmartBLETheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    SmartBLEApp(
                        deviceListViewModel = deviceListViewModel,
                        application = application
                    )
                }
            }
        }
    }
}

/**
 * 底部导航项（路由；图标/文案见 design.DsTabs —— 正典 TabBar 单一来源）
 */
sealed class BottomNavItem(val route: String) {
    data object Scan : BottomNavItem("scan")
    data object Connected : BottomNavItem("connected")
    data object Broadcast : BottomNavItem("broadcast")
    data object About : BottomNavItem("about")

    companion object {
        val entries: List<BottomNavItem> = listOf(Scan, Connected, Broadcast, About)
    }
}

@Composable
fun SmartBLEApp(
    deviceListViewModel: DeviceListViewModel,
    application: android.app.Application
) {
    // Request permissions
    PermissionsWrapper()

    val navController = rememberNavController()
    var selectedItem by remember { mutableIntStateOf(0) }

    // Track current destination for hiding bottom bar on detail screen
    val currentRoute = navController.currentDestination?.route
    val showBottomBar = currentRoute != "device_detail/{deviceId}/{deviceName}" && currentRoute != "versions"

    // 广播 VM 提升到 App 级（导航栏 badge 与页面共享同一状态）
    val broadcastViewModel: BroadcastViewModel = androidx.lifecycle.viewmodel.compose.viewModel(
        factory = ViewModelProvider.AndroidViewModelFactory(application)
    )

    // 正典导航层：AppNavbar（各页 kicker + 右槽）/ AppTabBar（品牌蓝激活）
    val bluetoothState by deviceListViewModel.bluetoothState.collectAsState()
    val connectedDevices by deviceListViewModel.connectedDevices.collectAsState()
    val isAdvertising by broadcastViewModel.isAdvertising.collectAsState()
    val broadcastError by broadcastViewModel.errorMessage.collectAsState()
    val broadcastChecked by broadcastViewModel.checked.collectAsState()
    val broadcastSupported by broadcastViewModel.runtimeSupported.collectAsState()
    val broadcastStopped by broadcastViewModel.stopped.collectAsState()

    fun switchTab(index: Int) {
        selectedItem = index
        val item = BottomNavItem.entries[index]
        if (navController.currentDestination?.route != item.route) {
            navController.navigate(item.route) {
                popUpTo(navController.graph.startDestinationId) {
                    saveState = true
                }
                launchSingleTop = true
                restoreState = true
            }
        }
    }

    Scaffold(
        containerColor = com.smartble.ui.theme.cBg,
        topBar = {
            if (showBottomBar) {
                when (selectedItem) {
                    0 -> {
                        // null=VM 首帧未出（初始化中…瞬态，勿闪「平台不支持」）；Unauthorized 同未开启（对齐桌面壳）
                        val (tone, statusWord) = when (bluetoothState) {
                            BluetoothState.On -> BtTone.On to "蓝牙就绪"
                            BluetoothState.Off, BluetoothState.Unauthorized -> BtTone.Off to "蓝牙未开启"
                            BluetoothState.Unavailable -> null to "平台不支持"
                            null -> null to "初始化中…"
                        }
                        AppNavbar(title = "扫描", statusText = statusWord, statusTone = tone)
                    }
                    1 -> AppNavbar(
                        title = "已连接",
                        kicker = "SESSIONS",
                        trailing = { DsChip(text = "通用调试会话") },
                    )
                    2 -> {
                        val (badgeText, badgeTone) = when {
                            isAdvertising -> "广播中" to DsBadgeTone.On
                            broadcastError != null -> "失败" to DsBadgeTone.Err
                            broadcastStopped -> "已停止" to DsBadgeTone.Dim
                            broadcastChecked && broadcastSupported -> "已就绪" to DsBadgeTone.Warn
                            else -> "未就绪" to DsBadgeTone.Dim
                        }
                        AppNavbar(
                            title = "广播",
                            kicker = "PERIPHERAL",
                            trailing = {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    DsChip(text = "平台：Android")
                                    DsBadge(text = badgeText, tone = badgeTone)
                                }
                            },
                        )
                    }
                    else -> AppNavbar(
                        title = "关于",
                        kicker = "ABOUT",
                        trailing = { DsChip(text = "v${BuildConfig.VERSION_NAME}+${BuildConfig.VERSION_CODE}", mono = true) },
                    )
                }
            }
        },
        bottomBar = {
            if (showBottomBar) {
                AppTabBar(
                    activeIndex = selectedItem,
                    onSelect = ::switchTab,
                    connectedBadge = connectedDevices.size,
                )
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = BottomNavItem.Scan.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            // Scan tab - Device List (no inner Scaffold)
            composable(BottomNavItem.Scan.route) {
                DeviceListContent(
                    viewModel = deviceListViewModel,
                    onDeviceClick = { deviceId, deviceName ->
                        navController.navigate("device_detail/$deviceId/$deviceName")
                    }
                )
            }

            // Connected tab
            composable(BottomNavItem.Connected.route) {
                ConnectedDevicesContent(
                    viewModel = deviceListViewModel,
                    onDeviceClick = { deviceId, deviceName ->
                        navController.navigate("device_detail/$deviceId/$deviceName")
                    },
                    onGoScan = { switchTab(0) },
                )
            }

            // Broadcast tab
            composable(BottomNavItem.Broadcast.route) {
                BroadcastContent(viewModel = broadcastViewModel)
            }

            // About tab
            composable(BottomNavItem.About.route) {
                AboutContent(onOpenVersions = { navController.navigate("versions") })
            }

            // Versions (sub page, no bottom bar)
            composable("versions") {
                VersionsScreen(onBack = { navController.popBackStack() })
            }

            // Device detail (full screen, no bottom bar)
            composable(
                route = "device_detail/{deviceId}/{deviceName}",
                arguments = listOf(
                    navArgument("deviceId") { type = NavType.StringType },
                    navArgument("deviceName") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val deviceId = backStackEntry.arguments?.getString("deviceId") ?: return@composable
                val deviceName = backStackEntry.arguments?.getString("deviceName") ?: return@composable

                val factory = object : ViewModelProvider.Factory {
                    @Suppress("UNCHECKED_CAST")
                    override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                        return DeviceDetailViewModel(
                            application,
                            deviceId,
                            deviceName
                        ) as T
                    }
                }
                val viewModel: DeviceDetailViewModel = androidx.lifecycle.viewmodel.compose.viewModel(
                    factory = factory,
                    viewModelStoreOwner = androidx.lifecycle.viewmodel.compose.LocalViewModelStoreOwner.current!!,
                    key = "device_detail_$deviceId"
                )

                DeviceDetailScreen(
                    deviceId = deviceId,
                    deviceName = deviceName,
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun PermissionsWrapper() {
    val permissions = mutableListOf<String>()

    // Bluetooth permissions
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        permissions.add(Manifest.permission.BLUETOOTH_SCAN)
        permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
        permissions.add(Manifest.permission.BLUETOOTH_ADVERTISE)
    } else {
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    // Location permission (always needed for BLE scanning)
    if (!permissions.contains(Manifest.permission.ACCESS_FINE_LOCATION)) {
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    val permissionsState = rememberMultiplePermissionsState(permissions)

    // Request permissions on first launch
    LaunchedEffect(Unit) {
        if (!permissionsState.allPermissionsGranted) {
            permissionsState.launchMultiplePermissionRequest()
        }
    }
}
