package com.smartble.ui

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Android
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.BluetoothSearching
import androidx.compose.material.icons.filled.BroadcastOnPersonal
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.DevicesOther
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.outlined.DevicesOther
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.smartble.ui.screen.AboutScreen
import com.smartble.ui.screen.AboutContent
import com.smartble.ui.screen.BroadcastScreen
import com.smartble.ui.screen.BroadcastContent
import com.smartble.ui.screen.BluetoothStateIndicator
import com.smartble.ui.screen.DeviceDetailScreen
import com.smartble.ui.screen.DeviceListContent
import com.smartble.ui.screen.DeviceListScreen
import com.smartble.ui.screen.ConnectedDevicesContent
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
 * 底部导航项
 */
sealed class BottomNavItem(
    val route: String,
    val icon: ImageVector,
    val iconSelected: ImageVector,
    val label: String
) {
    data object Scan : BottomNavItem("scan", Icons.Default.BluetoothSearching, Icons.Default.Bluetooth, "扫描")
    data object Connected : BottomNavItem("connected", Icons.Outlined.DevicesOther, Icons.Default.DevicesOther, "连接")
    data object Broadcast : BottomNavItem("broadcast", Icons.Outlined.Campaign, Icons.Default.BroadcastOnPersonal, "广播")
    data object About : BottomNavItem("about", Icons.Outlined.Info, Icons.Default.Info, "关于")

    companion object {
        val entries: List<BottomNavItem> = listOf(Scan, Connected, Broadcast, About)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
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
    val showBottomBar = currentRoute != "device_detail/{deviceId}/{deviceName}"

    Scaffold(
        topBar = {
            if (showBottomBar) {
                TopAppBar(
                    title = { Text(getTitle(selectedItem)) },
                    actions = {
                        when (selectedItem) {
                            0 -> {
                                // Scan tab actions
                                val bluetoothState by deviceListViewModel.bluetoothState.collectAsState()
                                BluetoothStateIndicator(bluetoothState)
                            }
                            else -> {}
                        }
                    }
                )
            }
        },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    BottomNavItem.entries.forEachIndexed { index, item ->
                        NavigationBarItem(
                            selected = selectedItem == index,
                            onClick = {
                                selectedItem = index
                                if (navController.currentDestination?.route != item.route) {
                                    navController.navigate(item.route) {
                                        popUpTo(navController.graph.startDestinationId) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = {
                                Icon(
                                    if (selectedItem == index) item.iconSelected else item.icon,
                                    contentDescription = item.label
                                )
                            },
                            label = { Text(item.label) }
                        )
                    }
                }
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
                    }
                )
            }

            // Broadcast tab
            composable(BottomNavItem.Broadcast.route) {
                val factory = ViewModelProvider.AndroidViewModelFactory(application)
                val viewModel: BroadcastViewModel = androidx.lifecycle.viewmodel.compose.viewModel(
                    factory = factory
                )
                BroadcastContent(viewModel = viewModel)
            }

            // About tab
            composable(BottomNavItem.About.route) {
                AboutContent()
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

fun getTitle(selectedItem: Int): String {
    return when (selectedItem) {
        0 -> "BLE Toolkit+"
        1 -> "已连接设备"
        2 -> "BLE 广播"
        3 -> "关于"
        else -> "BLE Toolkit+"
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
