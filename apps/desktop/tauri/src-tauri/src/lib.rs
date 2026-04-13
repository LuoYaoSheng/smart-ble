//
// SmartBLE Desktop - Tauri (Rust)
// Multi-device concurrent connection support
//

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use btleplug::api::{Central, Manager as _, Peripheral as _, Characteristic, WriteType, ValueNotification};
use btleplug::platform::Manager;
use futures::stream::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::time::Duration;
use tauri::State;

// BLE State
struct BleState {
    manager: Option<Manager>,
    central: Option<btleplug::platform::Adapter>,
    /// Multi-device: deviceId -> Peripheral
    connected_peripherals: HashMap<String, btleplug::platform::Peripheral>,
    scanning: bool,
    scan_handle: Option<tokio::task::JoinHandle<()>>,
    /// Multi-device: deviceId -> notify task handle
    notify_handles: HashMap<String, tokio::task::JoinHandle<()>>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    service_uuids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    adv_data: Option<String>,
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
async fn init_ble(
    state: State<'_, Arc<Mutex<BleState>>>,
    window: tauri::Window,
) -> Result<Response<String>, String> {
    let mut ble_state = state.lock().await;

    match Manager::new().await {
        Ok(manager) => {
            let mut adapters = manager.adapters().await.unwrap_or_default();
            
            // Retry mechanism for Windows startup delay (Task 6)
            if adapters.is_empty() {
                println!("[BLE] No adapters found on first check. Retrying for up to 10 seconds...");
                for i in 1..=10 {
                    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                    adapters = manager.adapters().await.unwrap_or_default();
                    if !adapters.is_empty() {
                        println!("[BLE] Adapter discovered after {} retries.", i);
                        break;
                    }
                    println!("[BLE] Retry {}/10: Still no adapters found...", i);
                }
            }

            if let Some(adapter) = adapters.first() {
                let central = adapter.clone();

                ble_state.manager = Some(manager);
                ble_state.central = Some(central.clone());

                let central_events = central.clone();
                let window_clone = window.clone();
                let state_clone = Arc::clone(&state.inner());
                
                // Track BLE events in background to emit disconnection
                tokio::spawn(async move {
                    use btleplug::api::CentralEvent;
                    
                    if let Ok(mut events) = central_events.events().await {
                        while let Some(event) = events.next().await {
                            if let CentralEvent::DeviceDisconnected(id) = event {
                                eprintln!("[BLE] Device disconnected: {:?}", id);
                                
                                // Remove from connected_peripherals cleanly
                                let mut ble_state_lock = state_clone.lock().await;
                                ble_state_lock.connected_peripherals.remove(&id.to_string());
                                drop(ble_state_lock);
                                
                                let mut payload = std::collections::HashMap::new();
                                payload.insert("deviceId", id.to_string());
                                let _ = window_clone.emit("device-disconnected", payload);
                            }
                        }
                    }
                });

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
                    error: Some("No Bluetooth adapter found. On Windows, ensure Bluetooth is turned ON in settings.".to_string()),
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

    // If already scanning, just return success
    if ble_state.scanning {
        eprintln!("[BLE] Already scanning");
        return Ok(Response {
            success: true,
            data: Some(vec![]),
            error: None,
            value: None,
        });
    }

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

    eprintln!("[BLE] Starting scan...");

    let result = central.start_scan(btleplug::api::ScanFilter::default()).await;

    match result {
        Ok(_) => {
            eprintln!("[BLE] Scan started successfully");
            ble_state.scanning = true;
            drop(ble_state);

            let on_discovered = window.clone();
            let central_clone = central.clone();
            let state_clone = Arc::clone(state.inner());

            // Start a task to collect discovered devices
            let handle = tokio::spawn(async move {
                let mut tick = tokio::time::interval(Duration::from_secs(1));
                tick.tick().await; // Skip first immediate tick

                loop {
                    tick.tick().await;

                    // Check if still scanning BEFORE calling peripherals
                    let is_scanning = {
                        let ble_state = state_clone.lock().await;
                        ble_state.scanning
                    };

                    if !is_scanning {
                        eprintln!("[BLE] Scan stopped, exiting loop");
                        break;
                    }

                    // Use a timeout to avoid hanging
                    let peripherals_result = tokio::time::timeout(
                        Duration::from_secs(2),
                        central_clone.peripherals()
                    ).await;

                    match peripherals_result {
                        Ok(Ok(peripherals)) => {
                            eprintln!("[BLE] Found {} peripherals", peripherals.len());
                            let mut devices = Vec::new();

                            for p in peripherals {
                                let is_connected = p.is_connected().await.unwrap_or(false);
                                let props_result = p.properties().await;
                                let props = props_result.as_ref().ok().and_then(|p| p.as_ref());

                                // Extract service UUIDs from advertising data
                                let service_uuids: Option<Vec<String>> = props.as_ref().and_then(|pr| {
                                    if !pr.services.is_empty() {
                                        Some(pr.services.iter().map(|u| u.to_string()).collect())
                                    } else {
                                        None
                                    }
                                });

                                // Convert advertising data to hex string
                                let adv_data: Option<String> = props.as_ref().and_then(|pr| {
                                    pr.manufacturer_data.iter().next().map(|(company_id, data)| {
                                        let mut hex = format!("{:04X}", company_id);
                                        for byte in data {
                                            hex.push_str(&format!("{:02X}", byte));
                                        }
                                        hex
                                    })
                                });

                                let device = DeviceInfo {
                                    id: p.id().to_string(),
                                    name: props
                                        .as_ref()
                                        .and_then(|pr| pr.local_name.clone())
                                        .unwrap_or_else(|| "Unknown".to_string()),
                                    rssi: props.as_ref().and_then(|pr| pr.rssi).unwrap_or(0),
                                    connected: is_connected,
                                    service_uuids,
                                    adv_data,
                                };
                                eprintln!("[BLE] Device: {} - RSSI: {}", device.name, device.rssi);
                                devices.push(device);
                            }

                            let emit_result = on_discovered.emit("device-discovered", devices);
                            if let Err(e) = &emit_result {
                                eprintln!("[BLE] Failed to emit event: {:?}", e);
                            }
                        }
                        Ok(Err(e)) => {
                            eprintln!("[BLE] Failed to get peripherals: {:?}", e);
                        }
                        Err(_) => {
                            eprintln!("[BLE] Peripherals call timed out");
                        }
                    }
                }
            });

            // Store the handle
            let mut ble_state = state.lock().await;
            ble_state.scan_handle = Some(handle);

            Ok(Response {
                success: true,
                data: Some(vec![]),
                error: None,
                value: None,
            })
        }
        Err(e) => {
            eprintln!("[BLE] Scan failed: {:?}", e);
            Ok(Response {
                success: false,
                data: None,
                error: Some(format!("Scan failed: {}", e)),
                value: None,
            })
        }
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
                        // Store connected peripheral in HashMap (multi-device)
                        let mut state = state.lock().await;
                        state.connected_peripherals.insert(device_id.clone(), peripheral.clone());
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
#[allow(non_snake_case)]
async fn disconnect(
    deviceId: Option<String>,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<bool>, String> {
    let mut ble_state = state.lock().await;

    // Determine which device to disconnect
    let target_id = deviceId.or_else(|| ble_state.connected_peripherals.keys().next().cloned());

    if let Some(device_id) = target_id {
        // Abort ALL notification streams for this device (key format: "deviceId::charUuid")
        let prefix = format!("{}::", device_id);
        let notify_keys: Vec<String> = ble_state.notify_handles.keys()
            .filter(|k| k.starts_with(&prefix))
            .cloned()
            .collect();
        for key in notify_keys {
            if let Some(handle) = ble_state.notify_handles.remove(&key) {
                handle.abort();
            }
        }

        if let Some(peripheral) = ble_state.connected_peripherals.remove(&device_id) {
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
    // Look up the specific device's peripheral from HashMap
    let peripheral = {
        let ble_state = state.lock().await;
        ble_state.connected_peripherals.get(&deviceId).cloned()
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
    deviceId: String,
    serviceUuid: String,
    charUuid: String,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<Vec<CharacteristicInfo>>, String> {
    let service_uuid = serviceUuid;
    let char_uuid = charUuid;
    let ble_state = state.lock().await;

    if let Some(peripheral) = ble_state.connected_peripherals.get(&deviceId) {
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
    deviceId: String,
    serviceUuid: String,
    charUuid: String,
    data: String,
    format: WriteFormat,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<bool>, String> {
    let service_uuid = serviceUuid;
    let char_uuid = charUuid;
    let ble_state = state.lock().await;

    if let Some(peripheral) = ble_state.connected_peripherals.get(&deviceId) {
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

/// Write raw bytes (for OTA firmware transfer).
/// `data` is a byte array; `writeWithResponse` controls WriteType.
#[tauri::command]
#[allow(non_snake_case)]
async fn write_raw(
    deviceId: String,
    serviceUuid: String,
    charUuid: String,
    data: Vec<u8>,
    writeWithResponse: bool,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<bool>, String> {
    let service_uuid = serviceUuid;
    let char_uuid = charUuid;
    let ble_state = state.lock().await;

    if let Some(peripheral) = ble_state.connected_peripherals.get(&deviceId) {
        let characteristics = peripheral.characteristics();
        let characteristic = characteristics
            .iter()
            .find(|c| c.uuid.to_string() == char_uuid && c.service_uuid.to_string() == service_uuid);

        if let Some(char) = characteristic {
            let write_type = if writeWithResponse {
                WriteType::WithResponse
            } else {
                WriteType::WithoutResponse
            };
            let peripheral = peripheral.clone();
            drop(ble_state);

            match peripheral.write(&char, &data, write_type).await {
                Ok(_) => Ok(Response {
                    success: true,
                    data: Some(true),
                    error: None,
                    value: None,
                }),
                Err(e) => Ok(Response {
                    success: false,
                    data: None,
                    error: Some(format!("Write raw failed: {}", e)),
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
    deviceId: String,
    serviceUuid: String,
    charUuid: String,
    notify: bool,
    state: State<'_, Arc<Mutex<BleState>>>,
    window: tauri::Window,
) -> Result<Response<bool>, String> {
    let service_uuid = serviceUuid;
    let char_uuid = charUuid;
    let mut ble_state = state.lock().await;

    // Get the peripheral for this device from HashMap
    let peripheral = ble_state.connected_peripherals.get(&deviceId).cloned();

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
            let notify_key = format!("{}::{}", deviceId, char_uuid);
            if let Some(handle) = ble_state.notify_handles.remove(&notify_key) {
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
            // Subscribe and listen for BLE notification push via peripheral.notifications()
            let service_uuid_clone = service_uuid.clone();
            let char_uuid_clone = char_uuid.clone();
            let peripheral_ref = peripheral.as_ref().unwrap().clone();
            // char_uuid_filter: only forward notifications from the subscribed characteristic
            let char_uuid_filter = char_uuid.clone();
            drop(ble_state); // release lock before async subscribe

            match peripheral_ref.subscribe(&char).await {
                Ok(_) => {
                    // Get notification stream — btleplug pushes ValueNotification items here
                    match peripheral_ref.notifications().await {
                        Ok(mut notif_stream) => {
                            let handle = tokio::spawn(async move {
                                while let Some(ValueNotification { uuid, value }) = notif_stream.next().await {
                                    // Filter: only forward notifications for our subscribed char
                                    if uuid.to_string() != char_uuid_filter {
                                        continue;
                                    }
                                    if !value.is_empty() {
                                        let hex_value = hex::encode(&value);
                                        let formatted: String = hex_value
                                            .chars()
                                            .collect::<Vec<char>>()
                                            .chunks(2)
                                            .map(|c| c.iter().collect::<String>())
                                            .collect::<Vec<String>>()
                                            .join(" ");

                                        let payload = serde_json::json!({
                                            "deviceId": deviceId,
                                            "serviceUuid": service_uuid_clone,
                                            "charUuid": char_uuid_clone,
                                            "value": formatted
                                        });

                                        let _ = window.emit("notification-received", payload);
                                    }
                                }
                                // Stream ended (device disconnected or unsubscribed)
                                eprintln!("[BLE] Notification stream ended for char {}", char_uuid_clone);
                            });

                            // Store handle keyed by "deviceId::charUuid" (supports multi-char notify)
                            let notify_key = format!("{}::{}", deviceId, char_uuid);
                            let mut ble_state = state.lock().await;
                            ble_state.notify_handles.insert(notify_key, handle);

                            Ok(Response {
                                success: true,
                                data: Some(true),
                                error: None,
                                value: None,
                            })
                        }
                        Err(e) => {
                            Ok(Response {
                                success: false,
                                data: None,
                                error: Some(format!("Failed to get notification stream: {}", e)),
                                value: None,
                            })
                        }
                    }
                }
                Err(e) => {
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

// Advertising (Peripheral mode)
// Note: btleplug has limited peripheral mode support
// For production use, consider using the native macOS implementation instead
#[tauri::command]
#[allow(non_snake_case)]
async fn start_advertising(
    name: String,
    serviceUuids: Vec<String>,
    manufacturerId: Option<String>,
    manufacturerData: Option<String>,
    includeName: Option<bool>,
) -> Result<Response<bool>, String> {
    let _name = name;
    let _service_uuids = serviceUuids;
    let _manufacturer_id = manufacturerId;
    let _manufacturer_data = manufacturerData;
    let _include_name = includeName;

    #[cfg(target_os = "macos")]
    {
        // macOS: Requires CoreBluetooth peripheral mode (not exposed by btleplug)
        // Use the native macOS SmartBLE app for full peripheral support
        return Ok(Response {
            success: false,
            data: None,
            error: Some("Peripheral mode requires the native macOS app. btleplug library has limited peripheral support - use apps/desktop/macos for full broadcasting features.".to_string()),
            value: None,
        });
    }

    #[cfg(target_os = "windows")]
    {
        // Windows: BLE peripheral mode requires platform-specific implementation
        return Ok(Response {
            success: false,
            data: None,
            error: Some("Peripheral mode not yet supported on Windows. btleplug has limited peripheral support.".to_string()),
            value: None,
        });
    }

    #[cfg(target_os = "linux")]
    {
        // Linux: Requires BlueZ peripheral mode support
        return Ok(Response {
            success: false,
            data: None,
            error: Some("Peripheral mode not yet supported on Linux. Requires BlueZ peripheral mode.".to_string()),
            value: None,
        });
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    return Ok(Response {
        success: false,
        data: None,
        error: Some("Peripheral mode not supported on this platform.".to_string()),
        value: None,
    });

    // This line is only reached if none of the cfg blocks above matched,
    // which in practice cannot happen since all platforms are covered.
    #[allow(unreachable_code)]
    Ok(Response {
        success: false,
        data: None,
        error: Some("Peripheral mode not supported.".to_string()),
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

// T07: Helper functions - 中文名称（对齐 Android BleUuids）
fn get_service_name(uuid: &str) -> String {
    let uuid_upper = uuid.to_uppercase();
    let short = if uuid_upper.len() > 8 { &uuid_upper[4..8] } else { uuid_upper.as_str() };
    match short {
        "1800" => "通用访问",
        "1801" => "通用属性",
        "180A" => "设备信息",
        "180F" => "电池服务",
        "180D" => "心率服务",
        "1812" => "人机界面(HID)",
        "1809" => "健康温度计",
        "181C" => "用户数据",
        _ => {
            if uuid_upper.starts_with("4FAFC201") { "OTA 升级服务" } else { "未知服务" }
        }
    }.to_string()
}

fn get_characteristic_name(uuid: &str) -> String {
    let uuid_upper = uuid.to_uppercase();
    let short = if uuid_upper.len() > 8 { &uuid_upper[4..8] } else { uuid_upper.as_str() };
    match short {
        "2A00" => "设备名称",
        "2A01" => "外观",
        "2A02" => "隐私标志",
        "2A03" => "重连地址",
        "2A04" => "连接参数",
        "2A05" => "服务变更",
        "2A19" => "电池电量",
        "2A23" => "系统标识符",
        "2A24" => "型号",
        "2A25" => "序列号",
        "2A26" => "固件版本",
        "2A27" => "硬件版本",
        "2A28" => "软件版本",
        "2A29" => "制造商",
        "2A37" => "心率测量",
        "2A38" => "身体传感器位置",
        _ => {
            if uuid_upper.starts_with("BEB5") || uuid_upper.starts_with("BEB5483E") { "OTA 控制" } else { "未知特征值" }
        }
    }.to_string()
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
        connected_peripherals: HashMap::new(),
        scanning: false,
        scan_handle: None,
        notify_handles: HashMap::new(),
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
            write_raw,
            notify_characteristic,
            start_advertising,
            stop_advertising,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
