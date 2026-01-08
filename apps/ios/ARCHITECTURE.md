# SmartBLE iOS - Architecture Documentation

## Overview

SmartBLE iOS is a native iOS/macOS BLE (Bluetooth Low Energy) debugging tool built with SwiftUI and CoreBluetooth.

**Tech Stack:**
- **Language**: Swift
- **UI Framework**: SwiftUI
- **Architecture**: MVVM with Combine
- **BLE Framework**: CoreBluetooth
- **Platforms**: iOS 15+, macOS 12+

---

## Feature List

### Core Features
| Feature | iOS | macOS | Description |
|---------|-----|-------|-------------|
| BLE Initialization | ✅ | ✅ | Initialize BLE Central manager |
| Device Scanning | ✅ | ✅ | Scan for nearby BLE devices |
| Device Filtering | ✅ | ✅ | Filter by RSSI, name prefix, hide unnamed |
| Device Connection | ✅ | ✅ | Connect to discovered BLE peripherals |
| Service Discovery | ✅ | ✅ | Discover services and characteristics |
| Characteristic Read | ✅ | ✅ | Read values from characteristics |
| Characteristic Write | ✅ | ✅ | Write values (hex/string/bytes) |
| Characteristic Notify | ✅ | ✅ | Enable/disable notifications |
| Device Disconnection | ✅ | ✅ | Disconnect from connected device |
| BLE Broadcasting | ✅ | ✅ | Advertise as BLE peripheral |
| Log Panel | ✅ | ✅ | View operation logs |
| About Page | ✅ | ✅ | Show app info and version |

### UI Features
- Native SwiftUI with iOS/macOS adaptive layouts
- Real-time device list with signal indicators
- Expandable service/characteristic tree
- Filter panel with presets
- Loading states and animations
- Log panel with color-coded entries

---

## Architecture

### Directory Structure
```
ios/
├── Sources/
│   ├── SmartBLEApp.swift         # App entry point
│   ├── Models/
│   │   └── BLEModels.swift       # Data models
│   ├── Manager/
│   │   └── BLEManager.swift      # BLE manager (Central + Peripheral)
│   └── Views/
│       ├── ScanView.swift        # Device list & scan UI
│       ├── DeviceDetailView.swift # Service/char operations
│       ├── BroadcastView.swift   # Broadcasting UI
│       └── LogView.swift         # Log panel
└── Package.swift                 # Swift Package Manager config
```

### Data Models

```swift
// BLE State
enum BLEState {
    case unknown
    case unavailable
    case unauthorized
    case poweredOff
    case poweredOn
}

// Connection State
enum ConnectionState {
    case disconnected
    case connecting
    case connected
    case disconnecting
}

// Scan Result
struct ScanResult: Identifiable {
    let id: UUID              // Peripheral UUID
    let name: String?         // Device name
    let rssi: Int             // Signal strength
    let peripheral: CBPeripheral?
    var advertisementData: [String: Any]
}

// BLE Service
struct BLEService: Identifiable {
    let id: UUID              // Service UUID
    let uuid: CBUUID
    let characteristics: [BLECharacteristic]
    let isPrimary: Bool
}

// BLE Characteristic
struct BLECharacteristic: Identifiable {
    let id: UUID              // Characteristic UUID
    let uuid: CBUUID
    let properties: CBCharacteristicProperties
    var value: Data?
    var notifying: Bool
}
```

---

## Flow Diagrams

### 1. App Initialization Flow

```mermaid
flowchart TD
    A[App Launch] --> B[SmartBLEApp init]
    B --> C[Create BLEManager]
    C --> D[CBCentralManager init]
    D --> E[Wait for centralManagerDidUpdateState]
    E --> F{State == .poweredOn?}
    F -->|No| G[Set bluetoothState]
    F -->|Yes| H[Set bluetoothState = .poweredOn]
    G --> I[UI shows current state]
    H --> I
    I --> J[Ready for user interaction]
```

### 2. Device Scan Flow

```mermaid
flowchart TD
    A[User clicks Scan] --> B{Is scanning?}
    B -->|Yes| C[stopScan]
    B -->|No| D[Check BLE state]
    C --> D
    D --> E{State == .poweredOn?}
    E -->|No| F[Show error]
    E -->|Yes| G[centralManager.scanForPeripherals]
    G --> H[Set isScanning = true]
    H --> I[Start auto-stop timer]
    I --> J[didDiscover peripheral callback]
    J --> K{Peripheral exists?}
    K -->|Yes| L[Update RSSI & data]
    K -->|No| M[Add to scanResults]
    L --> N[Apply filters]
    M --> N
    N --> O[Update UI via @Published]
    O --> P{Auto-stop timer?}
    P -->|Yes| Q[stopScan]
    P -->|No| J
```

### 3. Connect Flow

```mermaid
flowchart TD
    A[User clicks Connect] --> B[stopScan]
    B --> C[Set connectionState = .connecting]
    C --> D[centralManager.connect]
    D --> E[didConnect peripheral callback]
    E --> F[peripheral.discoverServices]
    F --> G[didDiscoverServices callback]
    G --> H[Parse services & characteristics]
    H --> I[For each service: discoverCharacteristics]
    I --> J[didDiscoverCharacteristics callback]
    J --> K[Emit services via @Published]
    K --> L[peripheral.maximumWriteValueLength]
    L --> M[Set connectionState = .connected]
    M --> N[UI shows detail view]
```

### 4. Disconnect Flow

```mermaid
flowchart TD
    A[User clicks Disconnect] --> B[Set connectionState = .disconnecting]
    B --> C[peripheral.disconnect]
    C --> D[Cancel peripheral connection]
    D --> E[Clear connectedPeripheral]
    E --> F[Clear services]
    F --> G[Set connectionState = .disconnected]
    G --> H[UI returns to scan view]
```

### 5. Characteristic Notify Flow

```mermaid
flowchart TD
    A[User clicks Notify] --> B{Is notifying?}
    B -->|Yes| C[Stop notify]
    B -->|No| D[Start notify]
    C --> E[Set notify = false on descriptor]
    D --> F[Set notify = true on descriptor]
    E --> G[peripheral.writeDescriptor]
    F --> G
    G --> H[didWriteDescriptorFor callback]
    H --> I{Success?}
    I -->|No| J[Log error]
    I -->|Yes| K[Set characteristic.notifying = true]
    K --> L[didUpdateValueFor callback]
    L --> M[Emit value via @Published]
    M --> N{Continue?}
    N -->|Yes| L
    N -->|No| O[Stop on disconnect]
```

---

## Sequence Diagrams

### Complete Scan-Connect-Operate-Disconnect Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as SwiftUI View
    participant Mgr as BLEManager
    participant CB as CoreBluetooth

    User->>UI: Click Scan
    UI->>Mgr: startScan()
    Mgr->>CB: centralManager.scanForPeripherals()
    Mgr->>Mgr: isScanning = true
    Mgr->>Mgr: Start auto-stop timer

    loop Discovery
        CB-->>Mgr: didDiscover(peripheral, advertisementData, rssi)
        Mgr->>Mgr: Update scanResults array
        Mgr->>Mgr: Apply filters
        Mgr-->>UI: @Published scanResults triggers update
        UI->>UI: Re-render device list
    end

    User->>UI: Click Connect
    UI->>Mgr: connect(peripheral)
    Mgr->>Mgr: stopScan()
    Mgr->>Mgr: connectionState = .connecting
    Mgr->>CB: centralManager.connect(peripheral)
    CB-->>Mgr: didConnect(peripheral)
    Mgr->>CB: peripheral.discoverServices(nil)
    CB-->>Mgr: didDiscoverServices(services)
    Mgr->>CB: peripheral.discoverCharacteristics(nil)
    CB-->>Mgr: didDiscoverCharacteristics(characteristics)
    Mgr->>Mgr: Parse & store services
    Mgr-->>UI: @Published services triggers update
    UI->>UI: Navigate to detail view

    User->>UI: Click Read
    UI->>Mgr: readCharacteristic(characteristic)
    Mgr->>CB: peripheral.readValue(for)
    CB-->>Mgr: didUpdateValueFor(characteristic)
    Mgr-->>UI: @Published value triggers update

    User->>UI: Click Notify
    UI->>Mgr: enableNotify(characteristic)
    Mgr->>CB: peripheral.setNotifyValue(true, descriptor)
    CB-->>Mgr: didWriteDescriptorFor(descriptor)
    loop Notifications
        CB-->>Mgr: didUpdateValueFor(characteristic)
        Mgr-->>UI: @Published value triggers update
    end

    User->>UI: Click Disconnect
    UI->>Mgr: disconnect()
    Mgr->>CB: peripheral.disconnect()
    CB-->>Mgr: didDisconnect(peripheral)
    Mgr->>Mgr: connectionState = .disconnected
    Mgr-->>UI: @Published connectionState triggers update
    UI->>UI: Navigate back to scan view
```

---

## BLE Manager Implementation

### Key Components

```swift
@MainActor
class BLEManager: NSObject, ObservableObject {
    // Central & Peripheral Managers
    private var centralManager: CBCentralManager!
    private var peripheralManager: CBPeripheralManager!

    // Connection
    private var connectedPeripheral: CBPeripheral?

    // @Published Properties (Reactive)
    @Published var bluetoothState: BLEState = .unknown
    @Published var scanResults: [ScanResult] = []
    @Published var isScanning = false
    @Published var connectionState: ConnectionState = .disconnected
    @Published var connectedDevice: ScanResult?
    @Published var services: [BLEService] = []
    @Published var logs: [LogEntry] = []
    @Published var isAdvertising = false

    // Filter Settings
    @Published var filterRSSI: Int = -100
    @Published var filterNamePrefix: String = ""
    @Published var hideNoNameDevices: Bool = false

    // Public API
    func startScan()
    func stopScan()
    func connect(_ peripheral: CBPeripheral)
    func disconnect()
    func readCharacteristic(_ characteristic: CBCharacteristic)
    func writeCharacteristic(_ characteristic: CBCharacteristic, data: Data)
    func enableNotify(_ characteristic: CBCharacteristic)
    func disableNotify(_ characteristic: CBCharacteristic)
    func startAdvertising(name: String, serviceUUIDs: [String])
    func stopAdvertising()
}
```

### CBCentralManagerDelegate

```swift
extension BLEManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            bluetoothState = .poweredOn
        case .poweredOff:
            bluetoothState = .poweredOff
        case .unauthorized:
            bluetoothState = .unauthorized
        default:
            bluetoothState = .unavailable
        }
    }

    func centralManager(_ central: CBCentralManager,
                        didDiscover peripheral: CBPeripheral,
                        advertisementData: [String: Any],
                        rssi: NSNumber) {
        // Update or add to scanResults
        // Apply filters
        // UI updates automatically via @Published
    }

    func centralManager(_ central: CBCentralManager,
                        didConnect peripheral: CBPeripheral) {
        connectionState = .connected
        peripheral.discoverServices(nil)
    }

    func centralManager(_ central: CBCentralManager,
                        didDisconnectPeripheral peripheral: CBPeripheral,
                        error: Error?) {
        connectionState = .disconnected
    }
}
```

### CBPeripheralDelegate

```swift
extension BLEManager: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral,
                    didDiscoverServices error: Error?) {
        guard let services = peripheral.services else { return }
        for service in services {
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }

    func peripheral(_ peripheral: CBPeripheral,
                    didDiscoverCharacteristicsFor service: CBService,
                    error: Error?) {
        // Parse and store characteristics
        // Update @Published services
    }

    func peripheral(_ peripheral: CBPeripheral,
                    didUpdateValueFor characteristic: CBCharacteristic,
                    error: Error?) {
        // Update characteristic value
        // UI updates automatically via @Published
    }

    func peripheral(_ peripheral: CBPeripheral,
                    didWriteValueFor descriptor: CBDescriptor,
                    error: Error?) {
        // Handle descriptor write result (notify enable/disable)
    }
}
```

---

## SwiftUI Views

### ScanView

```swift
struct ScanView: View {
    @StateObject private var bleManager = BLEManager()

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter Panel
                FilterPanel(
                    rssi: $bleManager.filterRSSI,
                    namePrefix: $bleManager.filterNamePrefix,
                    hideUnnamed: $bleManager.hideNoNameDevices
                )

                // Device List
                List(bleManager.filteredScanResults) { device in
                    DeviceRow(device: device)
                        .onTapGesture {
                            bleManager.connect(device.peripheral)
                        }
                }
            }
            .navigationTitle("SmartBLE")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(bleManager.isScanning ? "Stop" : "Scan") {
                        bleManager.toggleScan()
                    }
                }
            }
        }
    }
}
```

### DeviceDetailView

```swift
struct DeviceDetailView: View {
    @StateObject private var bleManager = BLEManager()
    let device: ScanResult

    var body: some View {
        List {
            ForEach(bleManager.services) { service in
                Section(service.uuid.uuidString) {
                    ForEach(service.characteristics) { characteristic in
                        CharacteristicRow(characteristic: characteristic)
                            .onTapGesture {
                                if characteristic.properties.contains(.read) {
                                    bleManager.readCharacteristic(characteristic.cbCharacteristic)
                                }
                            }
                    }
                }
            }
        }
        .navigationTitle(device.name ?? "Unknown Device")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Disconnect") {
                    bleManager.disconnect()
                }
            }
        }
    }
}
```

---

## Permissions (Info.plist)

### iOS
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app needs Bluetooth access to scan for and connect to nearby devices.</string>

<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app needs Bluetooth peripheral access to advertise as a BLE device.</string>

<key>UIBackgroundModes</key>
<array>
    <string>bluetooth-central</string>
    <string>bluetooth-peripheral</string>
</array>
```

### macOS
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app needs Bluetooth access to scan for and connect to nearby devices.</string>
```

---

## Known Issues & Solutions

| Issue | Solution |
|-------|----------|
| Scan doesn't find devices | Check Bluetooth permission in Info.plist |
| Connection fails | Ensure device is not already connected |
| Services not discovered | Wait for didDiscoverServices callback |
| Notify doesn't work | Check if characteristic supports notify property |
| MTU negotiation | Some devices don't support, handle gracefully |
| Background scanning | Limited by iOS, may not work reliably |
| Pairing dialog | iOS may show pairing dialog automatically |

---

## Platform-Specific Notes

### iOS
- Requires NSBluetoothAlwaysUsageDescription in Info.plist
- Background scanning limited to ~10 seconds
- Location permission NOT required for BLE (unlike Android)
- Pairing handled automatically by iOS

### macOS
- Same permissions as iOS
- Background scanning more flexible
- May require user approval for Bluetooth access
- Supports multiple concurrent connections

### Cross-Platform
- CoreBluetooth API is the same for iOS and macOS
- Use conditional compilation for platform-specific code:
  ```swift
  #if os(iOS)
      // iOS-specific code
  #elseif os(macOS)
      // macOS-specific code
  #endif
  ```

---

## Testing Checklist

- [ ] Bluetooth permission approved
- [ ] Scan starts and finds devices
- [ ] Device list updates smoothly
- [ ] Filters work correctly
- [ ] Connection succeeds
- [ ] Services discovered
- [ ] Read operation works
- [ ] Write operation works
- [ ] Notify operation works
- [ ] Disconnect works cleanly
- [ ] Broadcast mode works
- [ ] Log panel captures operations
- [ ] No crashes during normal flow
