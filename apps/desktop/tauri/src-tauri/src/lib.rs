//
// SmartBLE Desktop - Tauri (Rust)
//

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use btleplug::api::{Central, Manager as _, Peripheral as _, Characteristic, WriteType};
use btleplug::platform::Manager;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::time::Duration;
use tauri::State;

// BLE State
struct BleState {
    manager: Option<Manager>,
    central: Option<btleplug::platform::Adapter>,
    connected_peripheral: Option<btleplug::platform::Peripheral>,
    scanning: bool,
    scan_handle: Option<tokio::task::JoinHandle<()>>,
    notify_handle: Option<tokio::task::JoinHandle<()>>,
}

// Write format
#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum WriteFormat {
    Hex,
    Utf8,
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
    value: Option<String>,
}

// Response wrapper
#[derive(Debug, Serialize)]
struct Response<T> {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    value: Option<String>,
}

// Tauri commands
#[tauri::command]
async fn init_ble(state: State<'_, Arc<Mutex<BleState>>>) -> Result<Response<String>, String> {
    let mut ble_state = state.lock().await;

    match Manager::new().await {
        Ok(manager) => {
            let adapters = manager.adapters().await.unwrap();
            if let Some(adapter) = adapters.first() {
                let central = adapter.clone();

                ble_state.manager = Some(manager);
                ble_state.central = Some(central.clone());

                Ok(Response {
                    success: true,
                    data: Some("BLE initialized".to_string()),
                    error: None,
                    value: None,
                })
            } else {
                Ok(Response {
                    success: false,
                    data: None,
                    error: Some("No Bluetooth adapter found".to_string()),
                    value: None,
                })
            }
        }
        Err(e) => Ok(Response {
            success: false,
            data: None,
            error: Some(format!("Failed to initialize BLE: {}", e)),
            value: None,
        }),
    }
}

#[tauri::command]
async fn start_scan(
    state: State<'_, Arc<Mutex<BleState>>>,
    window: tauri::Window,
) -> Result<Response<Vec<DeviceInfo>>, String> {
    let mut ble_state = state.lock().await;

    // Cancel any existing scan task
    if let Some(handle) = ble_state.scan_handle.take() {
        handle.abort();
    }

    let central = match &ble_state.central {
        Some(c) => c.clone(),
        None => {
            return Ok(Response {
                success: false,
                data: None,
                error: Some("BLE not initialized".to_string()),
                value: None,
            })
        }
    };

    let result = central.start_scan(btleplug::api::ScanFilter::default()).await;

    match result {
        Ok(_) => {
            ble_state.scanning = true;
            drop(ble_state);

            // Create a channel for stopping the scan loop
            let (_stop_tx, mut stop_rx) = tokio::sync::oneshot::channel::<()>();
            let on_discovered = window.clone();
            let central_clone = central.clone();

            // Start a task to collect discovered devices
            let handle = tokio::spawn(async move {
                let mut tick = tokio::time::interval(Duration::from_secs(1));
                tick.tick().await; // Skip first immediate tick

                loop {
                    tokio::select! {
                        _ = tick.tick() => {
                            let peripherals_result = central_clone.peripherals().await;
                            if let Ok(peripherals) = peripherals_result {
                                let mut devices = Vec::new();

                                for p in &peripherals {
                                    let is_connected = p.is_connected().await.unwrap_or(false);
                                    let props = p.properties().await.ok().flatten();

                                    let device = DeviceInfo {
                                        id: p.id().to_string(),
                                        name: props
                                            .as_ref()
                                            .and_then(|pr| pr.local_name.clone())
                                            .unwrap_or_else(|| "Unknown".to_string()),
                                        rssi: props.as_ref().and_then(|pr| pr.rssi).unwrap_or(0),
                                        connected: is_connected,
                                    };
                                    devices.push(device);
                                }

                                let _ = on_discovered.emit("device-discovered", devices);
                            }
                        }
                        _ = &mut stop_rx => {
                            // Stop signal received
                            break;
                        }
                    }
                }
            });

            // Store the handle and stop sender
            let mut ble_state = state.lock().await;
            ble_state.scan_handle = Some(handle);
            // We can't store stop_tx directly, so we'll use abort on stop_scan

            Ok(Response {
                success: true,
                data: Some(vec![]),
                error: None,
                value: None,
            })
        }
        Err(e) => Ok(Response {
            success: false,
            data: None,
            error: Some(format!("Scan failed: {}", e)),
            value: None,
        }),
    }
}

#[tauri::command]
async fn stop_scan(state: State<'_, Arc<Mutex<BleState>>>) -> Result<Response<bool>, String> {
    let mut ble_state = state.lock().await;

    // Abort the scan task
    if let Some(handle) = ble_state.scan_handle.take() {
        handle.abort();
    }

    ble_state.scanning = false;

    if let Some(central) = &ble_state.central {
        match central.stop_scan().await {
            Ok(_) => Ok(Response {
                success: true,
                data: Some(true),
                error: None,
                value: None,
            }),
            Err(e) => Ok(Response {
                success: false,
                data: None,
                error: Some(format!("Stop scan failed: {}", e)),
                value: None,
            }),
        }
    } else {
        Ok(Response {
            success: false,
            data: None,
            error: Some("BLE not initialized".to_string()),
            value: None,
        })
    }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn connect(
    deviceId: String,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<bool>, String> {
    let device_id = deviceId;
    let ble_state = state.lock().await;

    if let Some(central) = &ble_state.central {
        let peripherals_result = central.peripherals().await;

        if let Ok(peripherals) = peripherals_result {
            if let Some(peripheral) = peripherals.iter().find(|p| p.id().to_string() == device_id) {
                drop(ble_state);
                match peripheral.connect().await {
                    Ok(_) => {
                        // Store connected peripheral
                        let mut state = state.lock().await;
                        state.connected_peripheral = Some(peripheral.clone());
                        Ok(Response {
                            success: true,
                            data: Some(true),
                            error: None,
                            value: None,
                        })
                    }
                    Err(e) => Ok(Response {
                        success: false,
                        data: None,
                        error: Some(format!("Connect failed: {}", e)),
                        value: None,
                    }),
                }
            } else {
                Ok(Response {
                    success: false,
                    data: None,
                    error: Some("Device not found".to_string()),
                    value: None,
                })
            }
        } else {
            Ok(Response {
                success: false,
                data: None,
                error: Some("Failed to get peripherals".to_string()),
                value: None,
            })
        }
    } else {
        Ok(Response {
            success: false,
            data: None,
            error: Some("BLE not initialized".to_string()),
            value: None,
        })
    }
}

#[tauri::command]
async fn disconnect(
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<bool>, String> {
    let mut ble_state = state.lock().await;

    // Abort notification stream
    if let Some(handle) = ble_state.notify_handle.take() {
        handle.abort();
    }

    if let Some(peripheral) = &ble_state.connected_peripheral {
        let peripheral = peripheral.clone();
        ble_state.connected_peripheral = None;

        match peripheral.disconnect().await {
            Ok(_) => Ok(Response {
                success: true,
                data: Some(true),
                error: None,
                value: None,
            }),
            Err(e) => Ok(Response {
                success: false,
                data: None,
                error: Some(format!("Disconnect failed: {}", e)),
                value: None,
            }),
        }
    } else {
        Ok(Response {
            success: true,
            data: Some(true),
            error: None,
            value: None,
        })
    }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn discover_services(
    deviceId: String,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<Vec<ServiceInfo>>, String> {
    let _device_id = deviceId; // Currently unused
    // Clone the peripheral before dropping the lock
    let peripheral = {
        let ble_state = state.lock().await;
        ble_state.connected_peripheral.clone()
    };

    if let Some(peripheral) = peripheral {
        match peripheral.discover_services().await {
            Ok(_) => {
                let characteristics = peripheral.characteristics();
                let services = peripheral.services();

                let service_infos: Vec<ServiceInfo> = services
                    .iter()
                    .map(|s| {
                        let chars: Vec<CharacteristicInfo> = characteristics
                            .iter()
                            .filter(|c| c.service_uuid == s.uuid)
                            .map(|c| CharacteristicInfo {
                                uuid: c.uuid.to_string(),
                                name: get_characteristic_name(&c.uuid.to_string()),
                                properties: get_properties(c),
                                value: None,
                            })
                            .collect();

                        ServiceInfo {
                            uuid: s.uuid.to_string(),
                            name: get_service_name(&s.uuid.to_string()),
                            characteristics: chars,
                        }
                    })
                    .collect();

                Ok(Response {
                    success: true,
                    data: Some(service_infos),
                    error: None,
                    value: None,
                })
            }
            Err(e) => Ok(Response {
                success: false,
                data: None,
                error: Some(format!("Discover services failed: {}", e)),
                value: None,
            }),
        }
    } else {
        Ok(Response {
            success: false,
            data: None,
            error: Some("No device connected".to_string()),
            value: None,
        })
    }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn read_characteristic(
    serviceUuid: String,
    charUuid: String,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<Vec<CharacteristicInfo>>, String> {
    let service_uuid = serviceUuid;
    let char_uuid = charUuid;
    let ble_state = state.lock().await;

    if let Some(peripheral) = &ble_state.connected_peripheral {
        let characteristics = peripheral.characteristics();

        let characteristic = characteristics
            .iter()
            .find(|c| c.uuid.to_string() == char_uuid && c.service_uuid.to_string() == service_uuid);

        if let Some(char) = characteristic {
            let peripheral = peripheral.clone();
            drop(ble_state);

            match peripheral.read(&char).await {
                Ok(data) => {
                    let hex_value = hex::encode(&data);
                    let formatted: String = hex_value
                        .chars()
                        .collect::<Vec<char>>()
                        .chunks(2)
                        .map(|c| c.iter().collect::<String>())
                        .collect::<Vec<String>>()
                        .join(" ");

                    Ok(Response {
                        success: true,
                        data: Some(vec![]),
                        error: None,
                        value: Some(formatted),
                    })
                }
                Err(e) => Ok(Response {
                    success: false,
                    data: None,
                    error: Some(format!("Read failed: {}", e)),
                    value: None,
                }),
            }
        } else {
            Ok(Response {
                success: false,
                data: None,
                error: Some("Characteristic not found".to_string()),
                value: None,
            })
        }
    } else {
        Ok(Response {
            success: false,
            data: None,
            error: Some("No device connected".to_string()),
            value: None,
        })
    }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn write_characteristic(
    serviceUuid: String,
    charUuid: String,
    data: String,
    format: WriteFormat,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<bool>, String> {
    let service_uuid = serviceUuid;
    let char_uuid = charUuid;
    let ble_state = state.lock().await;

    if let Some(peripheral) = &ble_state.connected_peripheral {
        let characteristics = peripheral.characteristics();

        let characteristic = characteristics
            .iter()
            .find(|c| c.uuid.to_string() == char_uuid && c.service_uuid.to_string() == service_uuid);

        if let Some(char) = characteristic {
            let bytes = match format {
                WriteFormat::Hex => {
                    let clean = data.replace(" ", "").replace("-", "");
                    hex::decode(&clean).map_err(|e| format!("Invalid hex: {}", e))?
                }
                WriteFormat::Utf8 => data.into_bytes(),
            };

            let peripheral = peripheral.clone();
            drop(ble_state);

            // Determine write type based on characteristic properties
            let write_type = if char.properties.contains(btleplug::api::CharPropFlags::WRITE_WITHOUT_RESPONSE) {
                WriteType::WithoutResponse
            } else {
                WriteType::WithResponse
            };

            match peripheral.write(&char, &bytes, write_type).await {
                Ok(_) => Ok(Response {
                    success: true,
                    data: Some(true),
                    error: None,
                    value: None,
                }),
                Err(e) => Ok(Response {
                    success: false,
                    data: None,
                    error: Some(format!("Write failed: {}", e)),
                    value: None,
                }),
            }
        } else {
            Ok(Response {
                success: false,
                data: None,
                error: Some("Characteristic not found".to_string()),
                value: None,
            })
        }
    } else {
        Ok(Response {
            success: false,
            data: None,
            error: Some("No device connected".to_string()),
            value: None,
        })
    }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn notify_characteristic(
    serviceUuid: String,
    charUuid: String,
    notify: bool,
    state: State<'_, Arc<Mutex<BleState>>>,
    window: tauri::Window,
) -> Result<Response<bool>, String> {
    let service_uuid = serviceUuid;
    let char_uuid = charUuid;
    let mut ble_state = state.lock().await;

    // Get the peripheral we need
    let peripheral = ble_state.connected_peripheral.clone();

    // Find the characteristic
    let char_option = peripheral.as_ref().and_then(|p| {
        let characteristics = p.characteristics();
        characteristics
            .iter()
            .find(|c| c.uuid.to_string() == char_uuid && c.service_uuid.to_string() == service_uuid)
            .cloned()
    });

    if let Some(char) = char_option {
        // Cancel existing notification stream if stopping
        if !notify {
            if let Some(handle) = ble_state.notify_handle.take() {
                handle.abort();
            }
            drop(ble_state);

            if let Some(peripheral) = peripheral {
                match peripheral.unsubscribe(&char).await {
                    Ok(_) => Ok(Response {
                        success: true,
                        data: Some(true),
                        error: None,
                        value: None,
                    }),
                    Err(e) => Ok(Response {
                        success: false,
                        data: None,
                        error: Some(format!("Unsubscribe failed: {}", e)),
                        value: None,
                    }),
                }
            } else {
                Ok(Response {
                    success: false,
                    data: None,
                    error: Some("No device connected".to_string()),
                    value: None,
                })
            }
        } else {
            // Subscribe and start polling for notifications
            let service_uuid_clone = service_uuid.clone();
            let char_uuid_clone = char_uuid.clone();

            match peripheral.as_ref().unwrap().subscribe(&char).await {
                Ok(_) => {
                    // Start a task to poll for notification values
                    let handle = tokio::spawn(async move {
                        let mut tick = tokio::time::interval(Duration::from_millis(500));
                        tick.tick().await; // Skip first tick

                        loop {
                            tick.tick().await;

                            // Try to read the characteristic value (this is how btleplug exposes notifications)
                            if let Some(peripheral) = &peripheral {
                                match peripheral.read(&char).await {
                                    Ok(data) => {
                                        if !data.is_empty() {
                                            let hex_value = hex::encode(&data);
                                            let formatted: String = hex_value
                                                .chars()
                                                .collect::<Vec<char>>()
                                                .chunks(2)
                                                .map(|c| c.iter().collect::<String>())
                                                .collect::<Vec<String>>()
                                                .join(" ");

                                            let payload = serde_json::json!({
                                                "serviceUuid": service_uuid_clone,
                                                "charUuid": char_uuid_clone,
                                                "value": formatted
                                            });

                                            let _ = window.emit("notification-received", payload);
                                        }
                                    }
                                    Err(_) => {
                                        // Read might fail if device disconnected or not notifying
                                        break;
                                    }
                                }
                            } else {
                                break;
                            }
                        }
                    });

                    // Store the handle
                    ble_state.notify_handle = Some(handle);
                    drop(ble_state);

                    Ok(Response {
                        success: true,
                        data: Some(true),
                        error: None,
                        value: None,
                    })
                }
                Err(e) => {
                    drop(ble_state);
                    Ok(Response {
                        success: false,
                        data: None,
                        error: Some(format!("Subscribe failed: {}", e)),
                        value: None,
                    })
                }
            }
        }
    } else {
        drop(ble_state);
        Ok(Response {
            success: false,
            data: None,
            error: Some("Characteristic not found".to_string()),
            value: None,
        })
    }
}

// Advertising (Peripheral mode) - placeholder
#[tauri::command]
#[allow(non_snake_case)]
async fn start_advertising(
    name: String,
    serviceUuids: Vec<String>,
) -> Result<Response<bool>, String> {
    let _name = name;
    let _service_uuids = serviceUuids;
    Ok(Response {
        success: false,
        data: None,
        error: Some("Advertising not yet supported in Tauri version".to_string()),
        value: None,
    })
}

#[tauri::command]
async fn stop_advertising() -> Result<Response<bool>, String> {
    Ok(Response {
        success: true,
        data: Some(true),
        error: None,
        value: None,
    })
}

// Helper functions
fn get_service_name(uuid: &str) -> String {
    if uuid.len() > 8 {
        match &uuid[4..8] {
            "1800" => "Generic Access",
            "1801" => "Generic Attribute",
            "180A" => "Device Information",
            "180F" => "Battery Service",
            "180D" => "Heart Rate",
            "1812" => "HID",
            "181C" => "User Data",
            "1819" => "Location",
            _ => "Unknown Service",
        }.to_string()
    } else {
        "Unknown Service".to_string()
    }
}

fn get_characteristic_name(uuid: &str) -> String {
    if uuid.len() > 8 {
        match &uuid[4..8] {
            "2A00" => "Device Name",
            "2A01" => "Appearance",
            "2A29" => "Manufacturer Name",
            "2A24" => "Model Number",
            "2A25" => "Serial Number",
            "2A27" => "Hardware Revision",
            "2A26" => "Firmware Revision",
            "2A28" => "Software Revision",
            "2A19" => "Battery Level",
            "2A04" => "PPP Central",
            "2A05" => "PPP Peripheral",
            "2A37" => "Heart Rate Measurement",
            "2A38" => "Body Sensor Location",
            "2A3D" => "Alert Level",
            _ => "Unknown Characteristic",
        }.to_string()
    } else {
        "Unknown Characteristic".to_string()
    }
}

fn get_properties(char: &Characteristic) -> Vec<String> {
    let mut props = Vec::new();

    let char_props = char.properties;
    if char_props.contains(btleplug::api::CharPropFlags::READ) {
        props.push("read".to_string());
    }
    if char_props.contains(btleplug::api::CharPropFlags::WRITE) {
        props.push("write".to_string());
    }
    if char_props.contains(btleplug::api::CharPropFlags::WRITE_WITHOUT_RESPONSE) {
        props.push("writeWithoutResponse".to_string());
    }
    if char_props.contains(btleplug::api::CharPropFlags::NOTIFY) {
        props.push("notify".to_string());
    }
    if char_props.contains(btleplug::api::CharPropFlags::INDICATE) {
        props.push("indicate".to_string());
    }

    props
}

// Run the app
pub fn run() {
    let ble_state = Arc::new(Mutex::new(BleState {
        manager: None,
        central: None,
        connected_peripheral: None,
        scanning: false,
        scan_handle: None,
        notify_handle: None,
    }));

    tauri::Builder::default()
        .manage(ble_state)
        .invoke_handler(tauri::generate_handler![
            init_ble,
            start_scan,
            stop_scan,
            connect,
            disconnect,
            discover_services,
            read_characteristic,
            write_characteristic,
            notify_characteristic,
            start_advertising,
            stop_advertising,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
