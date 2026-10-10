//
// SmartBLE Desktop - Tauri (Rust)
// Multi-device concurrent connection support
//

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use btleplug::api::{
    Central, Characteristic, Manager as _, Peripheral as _, ValueNotification, WriteType,
};
use btleplug::platform::Manager;
use futures::stream::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::State;
use tokio::sync::Mutex;
mod write_queue;
use write_queue::{WriteQueue, CONNECT_TIMEOUT, READ_TIMEOUT, WRITE_TIMEOUT};

// Win32 广播边车（WIN-BRIDGE 同构，2026-09-24 广播模板复制轮；仅厂商块 0xFF）
#[cfg(any(target_os = "windows", test))]
mod powershell_command;
#[cfg(target_os = "windows")]
mod win_bridge;

// BLE State
struct BleState {
    manager: Option<Manager>,
    central: Option<btleplug::platform::Adapter>,
    /// Multi-device: deviceId -> Peripheral
    connected_peripherals: HashMap<String, Arc<BleSession>>,
    scanning: bool,
    scan_handle: Option<tokio::task::JoinHandle<()>>,
    /// Multi-device: deviceId -> notify task handle
    notify_handles: HashMap<String, tokio::task::JoinHandle<()>>,
    event_handle: Option<tokio::task::JoinHandle<()>>,
    connection_locks: HashMap<String, Arc<Mutex<()>>>,
    connecting: HashMap<String, Arc<AtomicBool>>,
    scan_io: Arc<Mutex<()>>,
}

struct BleSession {
    peripheral: btleplug::platform::Peripheral,
    writes: WriteQueue,
}

impl<T> Response<T> {
    fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            value: None,
        }
    }
    fn fail(error: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error.into()),
            value: None,
        }
    }
}

fn retire_session(state: &mut BleState, device_id: &str) -> Option<Arc<BleSession>> {
    let session = state.connected_peripherals.remove(device_id);
    if let Some(session) = &session {
        session.writes.close();
    }
    let prefix = format!("{}::", device_id);
    let keys: Vec<_> = state
        .notify_handles
        .keys()
        .filter(|key| key.starts_with(&prefix))
        .cloned()
        .collect();
    for key in keys {
        if let Some(handle) = state.notify_handles.remove(&key) {
            handle.abort();
        }
    }
    session
}

fn matches_uuid(a: &str, b: &str) -> bool {
    fn normalized(value: &str) -> String {
        let value = value.to_lowercase().replace('-', "");
        match value.len() {
            4 => format!("0000{}00001000800000805f9b34fb", value),
            8 => format!("{}00001000800000805f9b34fb", value),
            _ => value,
        }
    }
    normalized(a) == normalized(b)
}

fn find_characteristic(session: &BleSession, service: &str, uuid: &str) -> Option<Characteristic> {
    session.peripheral.characteristics().into_iter().find(|c| {
        matches_uuid(&c.uuid.to_string(), uuid)
            && matches_uuid(&c.service_uuid.to_string(), service)
    })
}

async fn write_session(
    state: &Arc<Mutex<BleState>>,
    device_id: &str,
    session: Arc<BleSession>,
    characteristic: Characteristic,
    bytes: Vec<u8>,
    kind: WriteType,
    window: tauri::Window,
) -> Response<bool> {
    let result = session
        .writes
        .run(WRITE_TIMEOUT, async {
            session
                .peripheral
                .write(&characteristic, &bytes, kind)
                .await
                .map_err(|e| format!("Write failed: {}", e))
        })
        .await;
    if session.writes.is_closed() {
        let mut state = state.lock().await;
        // A stale timeout must never remove a replacement connection.
        if state
            .connected_peripherals
            .get(device_id)
            .map(|current| Arc::ptr_eq(current, &session))
            .unwrap_or(false)
        {
            retire_session(&mut state, device_id);
            let _ = window.emit(
                "device-disconnected",
                serde_json::json!({ "deviceId": device_id }),
            );
            let peripheral = session.peripheral.clone();
            tokio::spawn(async move {
                let _ = tokio::time::timeout(CONNECT_TIMEOUT, peripheral.disconnect()).await;
            });
        }
    }
    match result {
        Ok(_) => Response::ok(true),
        Err(error) => Response::fail(error),
    }
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
//
// N3：蓝牙无线电状态（正典 bt-chip 词表区分「蓝牙未开启」与「平台不支持」）。
// 返回 Some("BLUETOOTH_OFF: ...") = 蓝牙无线电存在但已关闭；None = 开启或查询失败
// （查询失败按原路径处理，不因新增检查误伤无无线电平台）。
#[cfg(target_os = "windows")]
async fn bluetooth_radio_off() -> Option<String> {
    use std::future::IntoFuture;
    use windows::Devices::Radios::{Radio, RadioKind, RadioState};

    let op = Radio::GetRadiosAsync().ok()?;
    let radios = op.into_future().await.ok()?;
    let bt = radios
        .into_iter()
        .find(|r| matches!(r.Kind(), Ok(RadioKind::Bluetooth)))?;
    if matches!(bt.State(), Ok(RadioState::Off)) {
        Some("BLUETOOTH_OFF: Bluetooth radio is turned off".to_string())
    } else {
        None
    }
}

#[cfg(not(target_os = "windows"))]
async fn bluetooth_radio_off() -> Option<String> {
    None
}

#[tauri::command]
async fn init_ble(
    state: State<'_, Arc<Mutex<BleState>>>,
    window: tauri::Window,
) -> Result<Response<String>, String> {
    if state.lock().await.central.is_some() {
        return Ok(Response::ok("BLE initialized".to_string()));
    }
    match Manager::new().await {
        Ok(manager) => {
            // N3：无线电关闭时以 BLUETOOTH_OFF 前缀失败，前端显示「蓝牙未开启」红点
            if let Some(err) = bluetooth_radio_off().await {
                eprintln!("[BLE] {}", err);
                return Ok(Response {
                    success: false,
                    data: None,
                    error: Some(err),
                    value: None,
                });
            }

            let mut adapters = manager.adapters().await.unwrap_or_default();

            // Retry mechanism for Windows startup delay (Task 6)
            if adapters.is_empty() {
                println!(
                    "[BLE] No adapters found on first check. Retrying for up to 10 seconds..."
                );
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

                let mut ble_state = state.lock().await;
                if ble_state.central.is_some() {
                    return Ok(Response::ok("BLE initialized".to_string()));
                }
                ble_state.manager = Some(manager);
                ble_state.central = Some(central.clone());

                let central_events = central.clone();
                let window_clone = window.clone();
                let state_clone = Arc::clone(&state.inner());

                // Track BLE events in background to emit disconnection
                ble_state.event_handle = Some(tokio::spawn(async move {
                    use btleplug::api::CentralEvent;

                    if let Ok(mut events) = central_events.events().await {
                        while let Some(event) = events.next().await {
                            if let CentralEvent::DeviceDisconnected(id) = event {
                                eprintln!("[BLE] Device disconnected: {:?}", id);

                                let device_id = id.to_string();
                                let session = state_clone
                                    .lock()
                                    .await
                                    .connected_peripherals
                                    .get(&device_id)
                                    .cloned();
                                let Some(session) = session else {
                                    continue;
                                };
                                if matches!(
                                    tokio::time::timeout(
                                        READ_TIMEOUT,
                                        session.peripheral.is_connected()
                                    )
                                    .await,
                                    Ok(Ok(true))
                                ) {
                                    continue;
                                }
                                let mut ble_state_lock = state_clone.lock().await;
                                if !ble_state_lock
                                    .connected_peripherals
                                    .get(&device_id)
                                    .map(|current| Arc::ptr_eq(current, &session))
                                    .unwrap_or(false)
                                {
                                    continue;
                                }
                                let was_session =
                                    retire_session(&mut ble_state_lock, &device_id).is_some();
                                drop(ble_state_lock);

                                if was_session {
                                    let mut payload = std::collections::HashMap::new();
                                    payload.insert("deviceId", device_id);
                                    let _ = window_clone.emit("device-disconnected", payload);
                                }
                            }
                        }
                    }
                }));

                drop(ble_state);
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
    let scan_io = state.lock().await.scan_io.clone();
    let _scan_guard = scan_io.lock().await;
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

    drop(ble_state);
    eprintln!("[BLE] Starting scan...");

    let result = tokio::time::timeout(
        READ_TIMEOUT,
        central.start_scan(btleplug::api::ScanFilter::default()),
    )
    .await;

    match result {
        Ok(Ok(_)) => {
            let mut ble_state = state.lock().await;
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
                    let peripherals_result =
                        tokio::time::timeout(Duration::from_secs(2), central_clone.peripherals())
                            .await;

                    match peripherals_result {
                        Ok(Ok(peripherals)) => {
                            eprintln!("[BLE] Found {} peripherals", peripherals.len());
                            let mut devices = Vec::new();

                            for p in peripherals {
                                let is_connected = p.is_connected().await.unwrap_or(false);
                                let props_result = p.properties().await;
                                let props = props_result.as_ref().ok().and_then(|p| p.as_ref());

                                // Extract service UUIDs from advertising data
                                let service_uuids: Option<Vec<String>> =
                                    props.as_ref().and_then(|pr| {
                                        if !pr.services.is_empty() {
                                            Some(
                                                pr.services.iter().map(|u| u.to_string()).collect(),
                                            )
                                        } else {
                                            None
                                        }
                                    });

                                // Convert advertising data to hex string
                                let adv_data: Option<String> = props.as_ref().and_then(|pr| {
                                    pr.manufacturer_data
                                        .iter()
                                        .next()
                                        .map(|(company_id, data)| {
                                            let mut hex = format!("{:04X}", company_id);
                                            for byte in data {
                                                hex.push_str(&format!("{:02X}", byte));
                                            }
                                            hex
                                        })
                                });

                                let device = DeviceInfo {
                                    id: p.id().to_string(),
                                    // F005 显示名批准链：name 投影广播 localName，空名保持空串
                                    // （渲染层批准链兜底，不在数据层污染为 "Unknown"）
                                    name: props
                                        .as_ref()
                                        .and_then(|pr| pr.local_name.clone())
                                        .unwrap_or_default(),
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
        Ok(Err(e)) => {
            eprintln!("[BLE] Scan failed: {:?}", e);
            Ok(Response {
                success: false,
                data: None,
                error: Some(format!("Scan failed: {}", e)),
                value: None,
            })
        }
        Err(_) => Ok(Response::fail("Start scan timed out")),
    }
}

#[tauri::command]
async fn stop_scan(state: State<'_, Arc<Mutex<BleState>>>) -> Result<Response<bool>, String> {
    let scan_io = state.lock().await.scan_io.clone();
    let _scan_guard = scan_io.lock().await;
    let central = {
        let mut state = state.lock().await;
        if let Some(handle) = state.scan_handle.take() {
            handle.abort();
        }
        state.scanning = false;
        state.central.clone()
    };
    match central {
        Some(central) => match tokio::time::timeout(READ_TIMEOUT, central.stop_scan()).await {
            Ok(Ok(_)) => Ok(Response::ok(true)),
            Ok(Err(e)) => Ok(Response::fail(format!("Stop scan failed: {}", e))),
            Err(_) => Ok(Response::fail("Stop scan timed out")),
        },
        None => Ok(Response::fail("BLE not initialized")),
    }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn connect(
    deviceId: String,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<bool>, String> {
    let (central, connection_lock) = {
        let mut state = state.lock().await;
        let Some(central) = state.central.clone() else {
            return Ok(Response::fail("BLE not initialized"));
        };
        let lock = state
            .connection_locks
            .entry(deviceId.clone())
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone();
        (central, lock)
    };
    // Serialize lifecycle for one device only. All native I/O is outside BleState.
    let cancelled = Arc::new(AtomicBool::new(false));
    let cleanup_peripheral = Arc::new(Mutex::new(None));
    let result = tokio::time::timeout(CONNECT_TIMEOUT, async {
        let _guard = connection_lock.lock().await;
        if state
            .lock()
            .await
            .connected_peripherals
            .contains_key(&deviceId)
        {
            return Ok(());
        }
        state
            .lock()
            .await
            .connecting
            .insert(deviceId.clone(), cancelled.clone());
        let mut found = central
            .peripherals()
            .await
            .map_err(|e| e.to_string())?
            .into_iter()
            .find(|p| p.id().to_string() == deviceId);
        if found.is_none() {
            // Short rescan rebuilds WinRT's cache. Its own lock coordinates scan
            // ownership without blocking connected devices' GATT transactions.
            let scan_io = state.lock().await.scan_io.clone();
            let _scan_guard = scan_io.lock().await;
            let was_scanning = state.lock().await.scanning;
            if !was_scanning {
                central
                    .start_scan(btleplug::api::ScanFilter::default())
                    .await
                    .map_err(|e| e.to_string())?;
            }
            for _ in 0..12 {
                if cancelled.load(Ordering::SeqCst) {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(250)).await;
                found = central
                    .peripherals()
                    .await
                    .map_err(|e| e.to_string())?
                    .into_iter()
                    .find(|p| p.id().to_string() == deviceId);
                if found.is_some() {
                    break;
                }
            }
            if !was_scanning {
                let _ = central.stop_scan().await;
            }
        }
        if cancelled.load(Ordering::SeqCst) {
            return Err("Connection cancelled".into());
        }
        let peripheral = found.ok_or_else(|| "Device not found".to_string())?;
        *cleanup_peripheral.lock().await = Some(peripheral.clone());
        if !peripheral.is_connected().await.unwrap_or(false) {
            let _ = peripheral.disconnect().await;
        }
        peripheral
            .connect()
            .await
            .map_err(|e| format!("Connect failed: {}", e))?;
        // Discovery is part of a usable connection, not best-effort success.
        if let Err(e) = peripheral.discover_services().await {
            let _ = peripheral.disconnect().await;
            return Err(format!("Discover services failed: {}", e));
        }
        if cancelled.load(Ordering::SeqCst) {
            let _ = peripheral.disconnect().await;
            return Err("Connection cancelled".into());
        }
        let mut ble_state = state.lock().await;
        if cancelled.load(Ordering::SeqCst) {
            drop(ble_state);
            let _ = peripheral.disconnect().await;
            return Err("Connection cancelled".into());
        }
        ble_state.connected_peripherals.insert(
            deviceId.clone(),
            Arc::new(BleSession {
                peripheral,
                writes: WriteQueue::new(),
            }),
        );
        Ok::<(), String>(())
    })
    .await;
    {
        let mut ble_state = state.lock().await;
        if ble_state
            .connecting
            .get(&deviceId)
            .map(|current| Arc::ptr_eq(current, &cancelled))
            .unwrap_or(false)
        {
            ble_state.connecting.remove(&deviceId);
        }
    }
    match result {
        Ok(Ok(_)) => Ok(Response::ok(true)),
        Ok(Err(error)) => Ok(Response::fail(error)),
        Err(_) => {
            cancelled.store(true, Ordering::SeqCst);
            // Cleanup only the peripheral actually attempted by this command;
            // timing out while waiting for another connect must not drop it.
            if let Some(peripheral) = cleanup_peripheral.lock().await.take() {
                tokio::spawn(async move {
                    let _guard = connection_lock.lock().await;
                    let _ = tokio::time::timeout(CONNECT_TIMEOUT, peripheral.disconnect()).await;
                });
            }
            Ok(Response::fail("Connect timed out"))
        }
    }
}

#[tauri::command]
#[allow(non_snake_case)]
async fn disconnect(
    deviceId: Option<String>,
    state: State<'_, Arc<Mutex<BleState>>>,
) -> Result<Response<bool>, String> {
    let session = {
        let mut state = state.lock().await;
        let target = deviceId.or_else(|| state.connected_peripherals.keys().next().cloned());
        target.and_then(|id| {
            if let Some(cancelled) = state.connecting.remove(&id) {
                cancelled.store(true, Ordering::SeqCst);
            }
            retire_session(&mut state, &id)
        })
    };
    let Some(session) = session else {
        return Ok(Response::ok(true));
    };
    match tokio::time::timeout(CONNECT_TIMEOUT, session.peripheral.disconnect()).await {
        Ok(Ok(_)) => Ok(Response::ok(true)),
        Ok(Err(e)) => Ok(Response::fail(format!("Disconnect failed: {}", e))),
        Err(_) => Ok(Response::fail("Disconnect timed out")),
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

    if let Some(session) = peripheral {
        let peripheral = &session.peripheral;
        match tokio::time::timeout(CONNECT_TIMEOUT, peripheral.discover_services()).await {
            Ok(Ok(_)) => {
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
            Ok(Err(e)) => Ok(Response {
                success: false,
                data: None,
                error: Some(format!("Discover services failed: {}", e)),
                value: None,
            }),
            Err(_) => Ok(Response::fail("Discover services timed out")),
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
    let session = state
        .lock()
        .await
        .connected_peripherals
        .get(&deviceId)
        .cloned();
    let Some(session) = session else {
        return Ok(Response::fail("No device connected"));
    };
    let Some(char) = find_characteristic(&session, &serviceUuid, &charUuid) else {
        return Ok(Response::fail("Characteristic not found"));
    };
    match tokio::time::timeout(READ_TIMEOUT, session.peripheral.read(&char)).await {
        Ok(Ok(data)) if !session.writes.is_closed() => Ok(Response {
            success: true,
            data: Some(vec![]),
            error: None,
            value: Some(
                data.iter()
                    .map(|b| format!("{:02x}", b))
                    .collect::<Vec<_>>()
                    .join(" "),
            ),
        }),
        Ok(Ok(_)) => Ok(Response::fail("Device disconnected")),
        Ok(Err(e)) => Ok(Response::fail(format!("Read failed: {}", e))),
        Err(_) => Ok(Response::fail("Read timed out")),
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
    window: tauri::Window,
) -> Result<Response<bool>, String> {
    let session = state
        .lock()
        .await
        .connected_peripherals
        .get(&deviceId)
        .cloned();
    let Some(session) = session else {
        return Ok(Response::fail("No device connected"));
    };
    let Some(char) = find_characteristic(&session, &serviceUuid, &charUuid) else {
        return Ok(Response::fail("Characteristic not found"));
    };
    let bytes = match format {
        WriteFormat::Hex => match hex::decode(
            data.chars()
                .filter(|c| !c.is_whitespace() && *c != '-')
                .collect::<String>(),
        ) {
            Ok(bytes) => bytes,
            Err(e) => return Ok(Response::fail(format!("Invalid hex: {}", e))),
        },
        WriteFormat::Utf8 => data.into_bytes(),
    };
    let kind = if char
        .properties
        .contains(btleplug::api::CharPropFlags::WRITE)
    {
        WriteType::WithResponse
    } else if char
        .properties
        .contains(btleplug::api::CharPropFlags::WRITE_WITHOUT_RESPONSE)
    {
        WriteType::WithoutResponse
    } else {
        return Ok(Response::fail("Characteristic is not writable"));
    };
    Ok(write_session(state.inner(), &deviceId, session, char, bytes, kind, window).await)
}

/// OTA writes share the same per-session queue as generic GATT writes.
#[tauri::command]
#[allow(non_snake_case)]
async fn write_raw(
    deviceId: String,
    serviceUuid: String,
    charUuid: String,
    data: Vec<u8>,
    writeWithResponse: bool,
    state: State<'_, Arc<Mutex<BleState>>>,
    window: tauri::Window,
) -> Result<Response<bool>, String> {
    let session = state
        .lock()
        .await
        .connected_peripherals
        .get(&deviceId)
        .cloned();
    let Some(session) = session else {
        return Ok(Response::fail("No device connected"));
    };
    let Some(char) = find_characteristic(&session, &serviceUuid, &charUuid) else {
        return Ok(Response::fail("Characteristic not found"));
    };
    let kind = if writeWithResponse {
        WriteType::WithResponse
    } else {
        WriteType::WithoutResponse
    };
    Ok(write_session(state.inner(), &deviceId, session, char, data, kind, window).await)
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
    let session = ble_state.connected_peripherals.get(&deviceId).cloned();
    let peripheral = session.as_ref().map(|session| session.peripheral.clone());

    // Find the characteristic
    let char_option = peripheral.as_ref().and_then(|p| {
        let characteristics = p.characteristics();
        characteristics
            .iter()
            .find(|c| {
                matches_uuid(&c.uuid.to_string(), &char_uuid)
                    && matches_uuid(&c.service_uuid.to_string(), &service_uuid)
            })
            .cloned()
    });

    if let Some(char) = char_option {
        // Cancel existing notification stream if stopping
        if !notify {
            let notify_key = format!("{}::{}::{}", deviceId, char.service_uuid, char.uuid);
            if let Some(handle) = ble_state.notify_handles.remove(&notify_key) {
                handle.abort();
            }
            drop(ble_state);

            if let Some(peripheral) = peripheral {
                match tokio::time::timeout(READ_TIMEOUT, peripheral.unsubscribe(&char)).await {
                    Ok(Ok(_)) => Ok(Response {
                        success: true,
                        data: Some(true),
                        error: None,
                        value: None,
                    }),
                    Ok(Err(e)) => Ok(Response {
                        success: false,
                        data: None,
                        error: Some(format!("Unsubscribe failed: {}", e)),
                        value: None,
                    }),
                    Err(_) => Ok(Response::fail("Unsubscribe timed out")),
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

            let stream_result =
                match tokio::time::timeout(READ_TIMEOUT, peripheral_ref.notifications()).await {
                    Ok(Ok(stream)) => stream,
                    Ok(Err(e)) => {
                        return Ok(Response::fail(format!("Notification stream failed: {}", e)))
                    }
                    Err(_) => return Ok(Response::fail("Notification stream timed out")),
                };
            match tokio::time::timeout(READ_TIMEOUT, peripheral_ref.subscribe(&char)).await {
                Ok(Ok(_)) => {
                    // Get notification stream — btleplug pushes ValueNotification items here
                    {
                        let mut notif_stream = stream_result;
                        {
                            let device_id_for_event = deviceId.clone();
                            let handle = tokio::spawn(async move {
                                while let Some(ValueNotification { uuid, value }) =
                                    notif_stream.next().await
                                {
                                    // Filter: only forward notifications for our subscribed char
                                    if !matches_uuid(&uuid.to_string(), &char_uuid_filter) {
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
                                            "deviceId": device_id_for_event,
                                            "serviceUuid": service_uuid_clone,
                                            "charUuid": char_uuid_clone,
                                            "value": formatted
                                        });

                                        let _ = window.emit("notification-received", payload);
                                    }
                                }
                                // Stream ended (device disconnected or unsubscribed)
                                eprintln!(
                                    "[BLE] Notification stream ended for char {}",
                                    char_uuid_clone
                                );
                            });

                            // Store handle keyed by "deviceId::charUuid" (supports multi-char notify)
                            let notify_key =
                                format!("{}::{}::{}", deviceId, char.service_uuid, char.uuid);
                            let mut ble_state = state.lock().await;
                            if session
                                .as_ref()
                                .map(|session| session.writes.is_closed())
                                .unwrap_or(true)
                            {
                                handle.abort();
                                return Ok(Response::fail("Device disconnected"));
                            }
                            if let Some(previous) =
                                ble_state.notify_handles.insert(notify_key, handle)
                            {
                                previous.abort();
                            }

                            Ok(Response {
                                success: true,
                                data: Some(true),
                                error: None,
                                value: None,
                            })
                        }
                    }
                }
                Ok(Err(e)) => Ok(Response {
                    success: false,
                    data: None,
                    error: Some(format!("Subscribe failed: {}", e)),
                    value: None,
                }),
                Err(_) => Ok(Response::fail("Subscribe timed out")),
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
#[allow(unused_variables)]
async fn start_advertising(
    name: String,
    serviceUuids: Vec<String>,
    manufacturerId: Option<String>,
    manufacturerData: Option<String>,
    includeName: Option<bool>,
) -> Result<Response<bool>, String> {
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
        // WIN-BRIDGE（2026-09-24 广播模板复制轮）：WinRT 仅厂商块 0xFF 可发
        // （LocalName/ServiceUuids 被平台拒绝——20260921-XDEV-BROADCAST 平台事实），
        // name/uuid 参数在此路径忽略；复用 E/G/Q 壳同一份边车 ps1。
        let id_str = manufacturerId
            .as_deref()
            .unwrap_or("0001")
            .trim()
            .trim_start_matches("0x")
            .trim_start_matches("0X");
        let company_id = u16::from_str_radix(id_str, 16).unwrap_or(1).max(1);
        let data = {
            let s = manufacturerData.as_deref().unwrap_or("");
            if s.is_empty() {
                b"BLE".to_vec()
            } else {
                s.as_bytes().to_vec()
            }
        };
        return match win_bridge::start(company_id, &data) {
            Ok(detail) => Ok(Response {
                success: true,
                data: Some(true),
                error: None,
                value: Some(detail.to_string()),
            }),
            Err(e) => Ok(Response {
                success: false,
                data: None,
                error: Some(e),
                value: None,
            }),
        };
    }

    #[cfg(target_os = "linux")]
    {
        // Linux: Requires BlueZ peripheral mode support
        return Ok(Response {
            success: false,
            data: None,
            error: Some(
                "Peripheral mode not yet supported on Linux. Requires BlueZ peripheral mode."
                    .to_string(),
            ),
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
    #[cfg(target_os = "windows")]
    {
        // WIN-BRIDGE 停播；未在播（边车未起）按幂等成功处理（E/G/Q 同口径）
        return match win_bridge::stop() {
            Ok(_) => Ok(Response {
                success: true,
                data: Some(true),
                error: None,
                value: None,
            }),
            Err(e) if e.contains("not running") => Ok(Response {
                success: true,
                data: Some(true),
                error: None,
                value: None,
            }),
            Err(e) => Ok(Response {
                success: false,
                data: None,
                error: Some(e),
                value: None,
            }),
        };
    }
    #[cfg(not(target_os = "windows"))]
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
    let short = if uuid_upper.len() > 8 {
        &uuid_upper[4..8]
    } else {
        uuid_upper.as_str()
    };
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
            if uuid_upper.starts_with("4FAFC201") {
                "OTA 升级服务"
            } else {
                "未知服务"
            }
        }
    }
    .to_string()
}

fn get_characteristic_name(uuid: &str) -> String {
    let uuid_upper = uuid.to_uppercase();
    let short = if uuid_upper.len() > 8 {
        &uuid_upper[4..8]
    } else {
        uuid_upper.as_str()
    };
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
            if uuid_upper.starts_with("BEB5") || uuid_upper.starts_with("BEB5483E") {
                "OTA 控制"
            } else {
                "未知特征值"
            }
        }
    }
    .to_string()
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

// 退出确认回执（10_platform §4 生命周期：常驻，退出确认）：前端模态「退出」→ 置旗并关窗
// （CloseRequested 见旗放行；「继续使用」不调本命令，直接关模态继续运行）
#[tauri::command]
async fn confirm_exit(
    quit: bool,
    window: tauri::Window,
    state: State<'_, Arc<AtomicBool>>,
    ble: State<'_, Arc<Mutex<BleState>>>,
) -> Result<(), String> {
    if quit {
        // dwin-quit 正典顺序：退出前先停广播（WIN-BRIDGE 边车）再放行关闭
        #[cfg(target_os = "windows")]
        win_bridge::shutdown();
        let (central, sessions) = {
            let mut ble = ble.lock().await;
            ble.scanning = false;
            if let Some(handle) = ble.scan_handle.take() {
                handle.abort();
            }
            if let Some(handle) = ble.event_handle.take() {
                handle.abort();
            }
            for cancelled in ble.connecting.values() {
                cancelled.store(true, Ordering::SeqCst);
            }
            let ids: Vec<_> = ble.connected_peripherals.keys().cloned().collect();
            let sessions: Vec<_> = ids
                .iter()
                .filter_map(|id| retire_session(&mut ble, id))
                .collect();
            (ble.central.clone(), sessions)
        };
        let cleanup = async move {
            let stop_scan = async {
                if let Some(central) = central {
                    let _ = central.stop_scan().await;
                }
            };
            let disconnects = sessions.into_iter().map(|session| async move {
                let _ = session.peripheral.disconnect().await;
            });
            tokio::join!(stop_scan, futures::future::join_all(disconnects));
        };
        let _ = tokio::time::timeout(READ_TIMEOUT, cleanup).await;
        state.store(true, Ordering::SeqCst);
        eprintln!("[APP] Exit confirmed by user -> closing");
        let _ = window.close();
    }
    Ok(())
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
        event_handle: None,
        connection_locks: HashMap::new(),
        connecting: HashMap::new(),
        scan_io: Arc::new(Mutex::new(())),
    }));
    // 退出确认旗：前端确认后置 true，放行下一次 CloseRequested（window.close 会再触发）
    let exit_confirmed = Arc::new(AtomicBool::new(false));
    let ble_state_for_close = Arc::clone(&ble_state);

    tauri::Builder::default()
        .manage(ble_state)
        .manage(exit_confirmed.clone())
        // 退出确认（10_platform §4；原型 desktop.js dwin-quit 同口径）：拦截关闭 → 通知前端弹应用内模态
        .on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event.event() {
                if exit_confirmed.load(Ordering::SeqCst) {
                    return; // 已确认退出，放行默认关闭
                }
                api.prevent_close();
                // 连接数读取用 try_lock：关闭瞬间恰有 BLE 命令持锁时按 0 处理（少报不误报会话）
                let connected = ble_state_for_close
                    .try_lock()
                    .map(|state| state.connected_peripherals.len())
                    .unwrap_or(0);
                eprintln!(
                    "[APP] Close requested -> exit confirm (connected={})",
                    connected
                );
                let mut payload = HashMap::new();
                payload.insert("connected", connected);
                let _ = event.window().emit("app-confirm-exit", payload);
            }
        })
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
            confirm_exit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
