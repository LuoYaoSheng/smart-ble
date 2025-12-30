//
// SmartBLE Desktop - Tauri (Rust)
//

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use btleplug::api::{Central, Manager as _, Peripheral as _};
use btleplug::platform::Manager;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::State;

// BLE State
struct BleState {
    manager: Option<Manager>,
    central: Option<btleplug::platform::Adapter>,
    peripherals: HashMap<String, btleplug::platform::Peripheral>,
    scanning: bool,
}

// Device info
#[derive(Debug, Clone, Serialize)]
struct DeviceInfo {
    id: String,
    name: String,
    rssi: i16,
    connected: bool,
}

// Service info
#[derive(Debug, Clone, Serialize)]
struct ServiceInfo {
    uuid: String,
    name: String,
    characteristics: Vec<CharacteristicInfo>,
}

// Characteristic info
#[derive(Debug, Clone, Serialize)]
struct CharacteristicInfo {
    uuid: String,
    name: String,
    properties: Vec<String>,
}

// Response wrapper
#[derive(Debug, Serialize)]
struct Response<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

// Tauri commands
#[tauri::command]
async fn init_ble(state: State<'_, Arc<Mutex<BleState>>>) -> Result<Response<String>, String> {
    let mut ble_state = state.lock().unwrap();

    match Manager::new().await {
        Ok(manager) => {
            let adapters = manager.adapters().await.unwrap();
            if let Some(adapter) = adapters.first() {
                let central = manager.adapter(adapter).await.unwrap();

                ble_state.manager = Some(manager);
                ble_state.central = Some(central.clone());

                // Set up event handler
                let central_clone = central.clone();
                tokio::spawn(async move {
                    // Handle BLE events
                    loop {
                        tokio::time::sleep(Duration::from_millis(100)).await;
                        // Event handling would go here
                    }
                });

                Ok(Response {
                    success: true,
                    data: Some("BLE initialized".to_string()),
                    error: None,
                })
            } else {
                Ok(Response {
                    success: false,
                    data: None,
                    error: Some("No Bluetooth adapter found".to_string()),
                })
            }
        }
        Err(e) => Ok(Response {
            success: false,
            data: None,
            error: Some(format!("Failed to initialize BLE: {}", e)),
        }),
    }
}

#[tauri::command]
async fn start_scan(
    state: State<'_, Arc<Mutex<BleState>>>,
    window: tauri::Window,
) -> Result<Response<Vec<DeviceInfo>>, String> {
    let mut ble_state = state.lock().unwrap();

    if let Some(central) = &ble_state.central {
        ble_state.scanning = true;

        let on_discovered = window.clone();
        let mut peripherals_map = HashMap::new();

        let result = central.start_scan(bleplug::api::ScanFilter::default()).await;

        match result {
            Ok(_) => {
                // Start a task to collect discovered devices
                let central_clone = central.clone();
                tokio::spawn(async move {
                    loop {
                        tokio::time::sleep(Duration::from_secs(1)).await;

                        let peripherals = central_clone.peripherals().await;
                        let devices: Vec<DeviceInfo> = peripherals
                            .iter()
                            .map(|p| DeviceInfo {
                                id: p.id().to_string(),
                                name: p.properties()
                                    .map(|p| p.local_name.unwrap_or("Unknown".to_string()))
                                    .unwrap_or("Unknown".to_string()),
                                rssi: p.properties()
                                    .and_then(|p| p.rssi)
                                    .unwrap_or(0),
                                connected: p.is_connected().await.unwrap_or(false),
                            })
                            .collect();

                        // Emit event to frontend
                        let _ = on_discovered.emit("device-discovered", devices);
                    }
                });

                Ok(Response {
                    success: true,
                    data: Some(vec![]),
                    error: None,
                })
            }
            Err(e) => Ok(Response {
                success: false,
                data: None,
                error: Some(format!("Scan failed: {}", e)),
            }),
        }
    } else {
        Ok(Response {
            success: false,
            data: None,
            error: Some("BLE not initialized".to_string()),
        })
    }
}

#[tauri::command]
async fn stop_scan(state: State<'_, Arc<Mutex<BleState>>>) -> Result<Response<bool>, String> {
    let ble_state = state.lock().unwrap();

    if let Some(central) = &ble_state.central {
        match central.stop_scan().await {
            Ok(_) => Ok(Response {
                success: true,
                data: Some(true),
                error: None,
            }),
            Err(e) => Ok(Response {
                success: false,
                data: None,
                error: Some(format!("Stop scan failed: {}", e)),
            }),
        }
    } else {
        Ok(Response {
            success: false,
            data: None,
            error: Some("BLE not initialized".to_string()),
        })
    }
}

#[tauri::command]
async fn connect(
    device_id: String,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<bool>, String> {
    let ble_state = state.lock().unwrap();

    if let Some(central) = &ble_state.central {
        let peripherals = central.peripherals().await;
        let peripheral = peripherals.iter().find(|p| p.id().to_string() == device_id);

        if let Some(peripheral) = {
            match peripheral.connect().await {
                Ok(_) => Ok(Response {
                    success: true,
                    data: Some(true),
                    error: None,
                }),
                Err(e) => Ok(Response {
                    success: false,
                    data: None,
                    error: Some(format!("Connect failed: {}", e)),
                }),
            }
        } else {
            Ok(Response {
                success: false,
                data: None,
                error: Some("Device not found".to_string()),
            })
        }
    } else {
        Ok(Response {
            success: false,
            data: None,
            error: Some("BLE not initialized".to_string()),
        })
    }
}

#[tauri::command]
async fn disconnect(
    device_id: String,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<bool>, String> {
    let ble_state = state.lock().unwrap();

    if let Some(central) = &ble_state.central {
        let peripherals = central.peripherals().await;
        let peripheral = peripherals.iter().find(|p| p.id().to_string() == device_id);

        if let Some(peripheral) = {
            match peripheral.disconnect().await {
                Ok(_) => Ok(Response {
                    success: true,
                    data: Some(true),
                    error: None,
                }),
                Err(e) => Ok(Response {
                    success: false,
                    data: None,
                    error: Some(format!("Disconnect failed: {}", e)),
                }),
            }
        } else {
            Ok(Response {
                success: false,
                data: None,
                error: Some("Device not found".to_string()),
            })
        }
    } else {
        Ok(Response {
            success: false,
            data: None,
            error: Some("BLE not initialized".to_string()),
        })
    }
}

#[tauri::command]
async fn discover_services(
    device_id: String,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<Vec<ServiceInfo>>, String> {
    let ble_state = state.lock().unwrap();

    if let Some(central) = &ble_state.central {
        let peripherals = central.peripherals().await;
        let peripheral = peripherals.iter().find(|p| p.id().to_string() == device_id);

        if let Some(peripheral) = {
            match peripheral.discover_services().await {
                Ok(_) => {
                    let services = peripheral.services().await.unwrap_or_default();
                    let service_infos: Vec<ServiceInfo> = services
                        .iter()
                        .map(|s| ServiceInfo {
                            uuid: s.uuid.to_string(),
                            name: get_service_name(&s.uuid.to_string()),
                            characteristics: vec![],
                        })
                        .collect();

                    Ok(Response {
                        success: true,
                        data: Some(service_infos),
                        error: None,
                    })
                }
                Err(e) => Ok(Response {
                    success: false,
                    data: None,
                    error: Some(format!("Discover services failed: {}", e)),
                }),
            }
        } else {
            Ok(Response {
                success: false,
                data: None,
                error: Some("Device not found".to_string()),
            })
        }
    } else {
        Ok(Response {
            success: false,
            data: None,
            error: Some("BLE not initialized".to_string()),
        })
    }
}

// Helper function to get service name
fn get_service_name(uuid: &str) -> String {
    let short_uuid = if uuid.len() > 8 {
        &uuid[4..8]
    } else {
        uuid
    };

    match short_uuid {
        "1800" => "Generic Access",
        "1801" => "Generic Attribute",
        "180A" => "Device Information",
        "180F" => "Battery Service",
        "1812" => "HID",
        _ => "Unknown Service",
    }
    .to_string()
}

// Run the app
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ble_state = Arc::new(Mutex::new(BleState {
        manager: None,
        central: None,
        peripherals: HashMap::new(),
        scanning: false,
    }));

    tauri::Builder::default()
        .manage(ble_state)
        .invoke_handler(tauri::generate_handler![
            init_ble,
            start_scan,
            stop_scan,
            connect,
            disconnect,
            discover_services
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
