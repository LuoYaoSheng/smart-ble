package com.smartble.ui

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.google.accompanist.permissions.shouldShowRationale
import com.smartble.ui.screen.DeviceDetailScreen
import com.smartble.ui.screen.DeviceListScreen
import com.smartble.ui.theme.SmartBLETheme
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
                    SmartBLEApp(deviceListViewModel = deviceListViewModel)
                }
            }
        }
    }
}

@Composable
fun SmartBLEApp(
    deviceListViewModel: DeviceListViewModel
) {
    val navController = rememberNavController()
    var startDestination by remember { mutableStateOf("device_list") }

    // Check permissions
    PermissionsWrapper(
        onPermissionsGranted = {
            MainNavHost(
                navController = navController,
                startDestination = startDestination,
                deviceListViewModel = deviceListViewModel
            )
        }
    )
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun PermissionsWrapper(
    onPermissionsGranted: @Composable () -> Unit
) {
    val permissions = mutableListOf<String>()

    // Bluetooth permissions
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        permissions.add(Manifest.permission.BLUETOOTH_SCAN)
        permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
    } else {
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    // Location permission (always needed for BLE scanning)
    if (!permissions.contains(Manifest.permission.ACCESS_FINE_LOCATION)) {
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    val permissionsState = rememberMultiplePermissionsState(permissions)

    LaunchedEffect(permissionsState.allPermissionsGranted) {
        if (!permissionsState.allPermissionsGranted && !permissionsState.shouldShowRationale) {
            permissionsState.launchMultiplePermissionRequest()
        }
    }

    if (permissionsState.allPermissionsGranted) {
        onPermissionsGranted()
    } else {
        PermissionRequestScreen(
            permissionsState = permissionsState,
            onRequestPermissions = { permissionsState.launchMultiplePermissionRequest() }
        )
    }
}

@Composable
fun PermissionRequestScreen(
    permissionsState: com.google.accompanist.permissions.MultiplePermissionsState,
    onRequestPermissions: () -> Unit
) {
    // For now, just request permissions and show the app anyway
    // The user will see errors when trying to scan if permissions are not granted
    onRequestPermissions()
}

@Composable
fun MainNavHost(
    navController: NavHostController,
    startDestination: String,
    deviceListViewModel: DeviceListViewModel
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable("device_list") {
            DeviceListScreen(
                viewModel = deviceListViewModel,
                onDeviceClick = { deviceId, deviceName ->
                    navController.navigate("device_detail/$deviceId/$deviceName")
                }
            )
        }

        composable(
            route = "device_detail/{deviceId}/{deviceName}",
            arguments = listOf(
                navArgument("deviceId") { type = NavType.StringType },
                navArgument("deviceName") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val deviceId = backStackEntry.arguments?.getString("deviceId") ?: return@composable
            val deviceName = backStackEntry.arguments?.getString("deviceName") ?: return@composable

            // Create ViewModel factory for DeviceDetailViewModel
            val factory = DeviceDetailViewModelFactory(deviceId, deviceName)
            val viewModel: DeviceDetailViewModel by androidx.lifecycle.viewmodel.compose.viewModel(
                factory = factory
            )

            DeviceDetailScreen(
                deviceId = deviceId,
                deviceName = deviceName,
                viewModel = deviceListViewModel,
                onBack = { navController.popBackStack() }
            )
        }
    }
}

// Factory for creating DeviceDetailViewModel with arguments
class DeviceDetailViewModelFactory(
    private val deviceId: String,
    private val deviceName: String
) : androidx.lifecycle.viewmodel.ViewModelFactory.Provider {

    @Suppress("UNCHECKED_CAST")
    override fun <T : androidx.lifecycle.ViewModel> create(
        modelClass: Class<T>,
        extras: androidx.lifecycle.viewmodel.CreationExtras
    ): T {
        val application = (extras[androidx.lifecycle.viewmodel.AndroidViewModelFactory.APPLICATION_KEY] as android.app.Application)
        return DeviceDetailViewModel(application, deviceId, deviceName) as T
    }

    override val factory: androidx.lifecycle.viewmodel.ViewModelProvider.Factory
        get() = object : androidx.lifecycle.viewmodel.ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(
                modelClass: Class<T>,
                extras: androidx.lifecycle.viewmodel.CreationExtras
            ): T {
                val application = (extras[androidx.lifecycle.viewmodel.AndroidViewModelFactory.APPLICATION_KEY] as android.app.Application)
                return DeviceDetailViewModel(application, deviceId, deviceName) as T
            }
        }
}
