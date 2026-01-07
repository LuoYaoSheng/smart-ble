//
// SmartBLE Desktop for macOS - BLE Manager
//

import Foundation
import CoreBluetooth
import Combine

// MARK: - Connection State
enum ConnectionState {
    case disconnected
    case connecting
    case connected
    case disconnecting
}

// MARK: - BLE Models
struct BLEDevice: Identifiable, Hashable {
    let id: String
    let name: String
    let rssi: Int
    let peripheral: CBPeripheral
}

struct BLEService: Identifiable {
    let id: String
    let uuid: String
    let name: String
    var characteristics: [BLECharacteristic] = []
    var peripheralService: CBService?
}

struct BLECharacteristic: Identifiable {
    let id: String
    let uuid: String
    let name: String
    var properties: CharacteristicProperties
    var value: String?
    var peripheralCharacteristic: CBCharacteristic?
}

struct CharacteristicProperties: OptionSet {
    let rawValue: UInt8

    static let read = CharacteristicProperties(rawValue: 1 << 0)
    static let write = CharacteristicProperties(rawValue: 1 << 1)
    static let writeWithoutResponse = CharacteristicProperties(rawValue: 1 << 2)
    static let notify = CharacteristicProperties(rawValue: 1 << 3)
    static let indicate = CharacteristicProperties(rawValue: 1 << 4)
}

// MARK: - BLE Manager
@MainActor
class BLEManager: NSObject, ObservableObject {
    // MARK: - Published Properties
    @Published var isScanning = false
    @Published var isAdvertising = false
    @Published var discoveredDevices: [BLEDevice] = []
    @Published var connectedDevice: BLEDevice?
    @Published var connectionState: ConnectionState = .disconnected
    @Published var services: [BLEService] = []
    @Published var logs: [LogEntry] = []

    // MARK: - Filter Properties
    @Published var filterRSSI: Int = -100
    @Published var filterNamePrefix: String = ""
    @Published var hideNoNameDevices: Bool = false

    // MARK: - Computed Properties
    var filteredScanResults: [BLEDevice] {
        var result = discoveredDevices

        // Filter by RSSI
        if filterRSSI > -100 {
            result = result.filter { $0.rssi >= filterRSSI }
        }

        // Filter by name prefix
        if !filterNamePrefix.isEmpty {
            result = result.filter { $0.name.lowercased().hasPrefix(filterNamePrefix.lowercased()) }
        }

        // Hide devices without name
        if hideNoNameDevices {
            result = result.filter { !$0.name.isEmpty && $0.name != "Unknown Device" }
        }

        // Sort by RSSI (strongest first)
        return result.sorted { $0.rssi > $1.rssi }
    }

    // MARK: - Log Entry
    struct LogEntry {
        let message: String
        let type: LogType
        let timestamp: Date

        enum LogType {
            case info, success, error, warning
        }
    }

    // MARK: - Private Properties
    private var centralManager: CBCentralManager?
    private var peripheralManager: CBPeripheralManager?
    private var connectedPeripheral: CBPeripheral?

    // Notification tracking
    private var notifyingCharacteristics: Set<String> = []

    // MARK: - Initialization
    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
    }

    // MARK: - Logging
    func log(_ message: String, type: LogEntry.LogType = .info) {
        let entry = LogEntry(message: message, type: type, timestamp: Date())
        logs.insert(entry, at: 0)
        if logs.count > 500 {
            logs.removeLast()
        }
        print("[BLE] \(message)")
    }

    // MARK: - Scan Methods
    func startScan() {
        guard let centralManager = centralManager,
              centralManager.state == .poweredOn else {
            log("Bluetooth not ready", type: .error)
            return
        }

        discoveredDevices.removeAll()
        isScanning = true
        log("Starting scan...", type: .info)

        centralManager.scanForPeripherals(withServices: nil, options: [
            CBCentralManagerScanOptionAllowDuplicatesKey: true
        ])
    }

    func stopScan() {
        centralManager?.stopScan()
        isScanning = false
        log("Scan stopped")
    }

    // MARK: - Connection Methods
    func connect(device: BLEDevice) {
        guard let centralManager = centralManager,
              centralManager.state == .poweredOn else {
            log("Bluetooth not ready", type: .error)
            return
        }

        stopScan()
        connectionState = .connecting
        connectedDevice = device
        log("Connecting to \(device.name)...")

        centralManager.connect(device.peripheral, options: nil)
    }

    func disconnect() {
        guard let peripheral = connectedPeripheral else {
            connectionState = .disconnected
            connectedDevice = nil
            services.removeAll()
            return
        }

        connectionState = .disconnecting
        log("Disconnecting...")
        centralManager?.cancelPeripheralConnection(peripheral)
    }

    // MARK: - Service Discovery
    func discoverServices(for peripheralService: CBService? = nil) {
        guard let peripheral = connectedPeripheral else {
            log("No connected peripheral", type: .error)
            return
        }

        log("Discovering services...")
        peripheral.discoverServices(nil)
    }

    func discoverCharacteristics(for service: CBService) {
        guard let peripheral = connectedPeripheral else { return }
        log("Discovering characteristics for service \(service.uuid)")
        peripheral.discoverCharacteristics(nil, for: service)
    }

    // MARK: - Characteristic Operations
    func readCharacteristic(serviceUUID: String, characteristicUUID: String) {
        guard let peripheral = connectedPeripheral else {
            log("No connected peripheral", type: .error)
            return
        }

        guard let service = services.first(where: { $0.uuid == serviceUUID }),
              let peripheralService = service.peripheralService else {
            log("Service not found: \(serviceUUID)", type: .error)
            return
        }

        guard let characteristic = service.characteristics.first(where: { $0.uuid == characteristicUUID }),
              let peripheralChar = characteristic.peripheralCharacteristic else {
            log("Characteristic not found: \(characteristicUUID)", type: .error)
            return
        }

        log("Reading characteristic \(characteristicUUID)")
        peripheral.readValue(for: peripheralChar)
    }

    func writeCharacteristic(serviceUUID: String, characteristicUUID: String, data: Data) {
        guard let peripheral = connectedPeripheral else {
            log("No connected peripheral", type: .error)
            return
        }

        guard let service = services.first(where: { $0.uuid == serviceUUID }),
              let peripheralService = service.peripheralService else {
            log("Service not found: \(serviceUUID)", type: .error)
            return
        }

        guard let characteristic = service.characteristics.first(where: { $0.uuid == characteristicUUID }),
              let peripheralChar = characteristic.peripheralCharacteristic else {
            log("Characteristic not found: \(characteristicUUID)", type: .error)
            return
        }

        let hexString = data.map { String(format: "%02X", $0) }.joined(separator: " ")
        log("Writing to characteristic \(characteristicUUID): \(hexString)")

        let writeType: CBCharacteristicWriteType =
            characteristic.properties.contains(.writeWithoutResponse) ? .withoutResponse : .withResponse

        peripheral.writeValue(data, for: peripheralChar, type: writeType)
    }

    func setNotification(serviceUUID: String, characteristicUUID: String, enabled: Bool) {
        guard let peripheral = connectedPeripheral else {
            log("No connected peripheral", type: .error)
            return
        }

        guard let service = services.first(where: { $0.uuid == serviceUUID }),
              let peripheralService = service.peripheralService else {
            log("Service not found: \(serviceUUID)", type: .error)
            return
        }

        guard let characteristic = service.characteristics.first(where: { $0.uuid == characteristicUUID }),
              let peripheralChar = characteristic.peripheralCharacteristic else {
            log("Characteristic not found: \(characteristicUUID)", type: .error)
            return
        }

        log("\(enabled ? "Enabling" : "Disabling") notification on \(characteristicUUID)")

        peripheral.setNotifyValue(enabled, for: peripheralChar)

        let key = "\(serviceUUID):\(characteristicUUID)"
        if enabled {
            notifyingCharacteristics.insert(key)
        } else {
            notifyingCharacteristics.remove(key)
        }
    }

    func isNotifying(serviceUUID: String, characteristicUUID: String) -> Bool {
        let key = "\(serviceUUID):\(characteristicUUID)"
        return notifyingCharacteristics.contains(key)
    }

    // MARK: - Peripheral/Advertising Methods
    func startAdvertising(name: String, serviceUUIDs: [String]) {
        guard let peripheralManager = peripheralManager,
              peripheralManager.state == .poweredOn else {
            log("Peripheral not ready", type: .error)
            return
        }

        stopScan()

        let uuids = serviceUUIDs.compactMap { CBUUID(string: $0) }

        let advertisement: [String: Any] = [
            CBAdvertisementDataLocalNameKey: name,
            CBAdvertisementDataServiceUUIDsKey: uuids
        ]

        log("Starting advertising as \(name)")

        peripheralManager.startAdvertising(advertisement)
    }

    func stopAdvertising() {
        peripheralManager?.stopAdvertising()
        isAdvertising = false
        log("Advertising stopped")
    }

    // MARK: - Filter Methods
    func resetFilters() {
        filterRSSI = -100
        filterNamePrefix = ""
        hideNoNameDevices = false
    }

    func getRssiText(rssi: Int) -> String {
        switch rssi {
        case -50...0: return "Excellent"
        case -70..<(-50): return "Good"
        case -90..<(-70): return "Fair"
        default: return "Weak"
        }
    }

    func getSignalBars(rssi: Int) -> Int {
        switch rssi {
        case -50...0: return 4
        case -60..<(-50): return 3
        case -70..<(-60): return 2
        case -90..<(-70): return 1
        default: return 0
        }
    }
}

// MARK: - CBCentralManagerDelegate
extension BLEManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            log("Bluetooth is powered on", type: .success)
        case .poweredOff:
            log("Bluetooth is powered off", type: .warning)
            isScanning = false
        case .unauthorized:
            log("Bluetooth is unauthorized", type: .error)
        case .unknown, .resetting, .unsupported:
            log("Bluetooth state: \(central.state.rawValue)", type: .warning)
        @unknown default:
            log("Bluetooth state: \(central.state.rawValue)", type: .warning)
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                       advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? "Unknown Device"
        let id = peripheral.identifier.uuidString

        let device = BLEDevice(
            id: id,
            name: name,
            rssi: RSSI.intValue,
            peripheral: peripheral
        )

        // Update or add device
        if let index = discoveredDevices.firstIndex(where: { $0.id == id }) {
            discoveredDevices[index] = device
        } else {
            discoveredDevices.append(device)
            log("Discovered: \(name)")
        }

        // Keep delegate for connection
        peripheral.delegate = self
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        log("Connected to \(peripheral.name ?? "device")", type: .success)
        connectedPeripheral = peripheral
        connectionState = .connected

        // Discover services automatically
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.discoverServices()
        }
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral,
                       error: Error?) {
        connectedPeripheral = nil
        connectionState = .disconnected
        connectedDevice = nil
        services.removeAll()
        notifyingCharacteristics.removeAll()

        if let error = error {
            log("Disconnected with error: \(error.localizedDescription)", type: .error)
        } else {
            log("Disconnected", type: .info)
        }
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral,
                       error: Error?) {
        connectionState = .disconnected
        log("Failed to connect: \(error?.localizedDescription ?? "Unknown error")", type: .error)
    }
}

// MARK: - CBPeripheralDelegate
extension BLEManager: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            log("Service discovery failed: \(error.localizedDescription)", type: .error)
            return
        }

        guard let peripheralServices = peripheral.services else { return }

        log("Discovered \(peripheralServices.count) services", type: .success)

        services = peripheralServices.map { service in
            BLEService(
                id: service.uuid.uuidString,
                uuid: service.uuid.uuidString,
                name: getServiceName(service.uuid),
                peripheralService: service
            )
        }

        // Auto-discover characteristics for first service
        if let firstService = peripheralServices.first {
            discoverCharacteristics(for: firstService)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService,
                    error: Error?) {
        if let error = error {
            log("Characteristic discovery failed: \(error.localizedDescription)", type: .error)
            return
        }

        guard let characteristics = service.characteristics else { return }

        log("Service \(service.uuid): \(characteristics.count) characteristics", type: .success)

        if let index = services.firstIndex(where: { $0.uuid == service.uuid.uuidString }) {
            services[index].characteristics = characteristics.map { char in
                BLECharacteristic(
                    id: char.uuid.uuidString,
                    uuid: char.uuid.uuidString,
                    name: getCharacteristicName(char.uuid),
                    properties: getProperties(char.properties),
                    peripheralCharacteristic: char
                )
            }
        }

        // Discover next service's characteristics
        if let serviceIndex = services.firstIndex(where: { $0.peripheralService == service }),
           serviceIndex + 1 < services.count,
           let nextService = services[serviceIndex + 1].peripheralService {
            discoverCharacteristics(for: nextService)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic,
                    error: Error?) {
        if let error = error {
            log("Read failed: \(error.localizedDescription)", type: .error)
            return
        }

        guard let data = characteristic.value else { return }

        let hexString = data.map { String(format: "%02X", $0) }.joined(separator: " ")
        log("Read from \(characteristic.uuid): \(hexString)", type: .success)

        // Update characteristic value
        updateCharacteristicValue(characteristic.uuid.uuidString, value: hexString)

        // This is a notification - value updated above
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic,
                    error: Error?) {
        if let error = error {
            log("Write failed: \(error.localizedDescription)", type: .error)
        } else {
            log("Write successful", type: .success)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic,
                    error: Error?) {
        if let error = error {
            log("Notification state update failed: \(error.localizedDescription)", type: .error)
        } else {
            let state = characteristic.isNotifying ? "enabled" : "disabled"
            log("Notification \(state) for \(characteristic.uuid.uuidString)", type: .success)
        }
    }

    // MARK: - Helper Methods
    private func updateCharacteristicValue(_ uuid: String, value: String) {
        for serviceIndex in services.indices {
            if let charIndex = services[serviceIndex].characteristics.firstIndex(where: { $0.uuid == uuid }) {
                services[serviceIndex].characteristics[charIndex].value = value
                return
            }
        }
    }

    private func getProperties(_ props: CBCharacteristicProperties) -> CharacteristicProperties {
        var result: CharacteristicProperties = []
        if props.contains(.read) { result.insert(.read) }
        if props.contains(.write) { result.insert(.write) }
        if props.contains(.writeWithoutResponse) { result.insert(.writeWithoutResponse) }
        if props.contains(.notify) { result.insert(.notify) }
        if props.contains(.indicate) { result.insert(.indicate) }
        return result
    }

    private func getServiceName(_ uuid: CBUUID) -> String {
        switch uuid.uuidString {
        case "1800": return "Generic Access"
        case "1801": return "Generic Attribute"
        case "180A": return "Device Information"
        case "180F": return "Battery Service"
        case "180D": return "Heart Rate"
        case "1812": return "HID"
        case "181C": return "User Data"
        default:
            let uuidStr = uuid.uuidString
            if uuidStr.hasPrefix("0000") && uuidStr.count == 36,
               let index = uuidStr.index(uuidStr.startIndex, offsetBy: 4, limitedBy: uuidStr.endIndex),
               let endIndex = uuidStr.index(index, offsetBy: 4, limitedBy: uuidStr.endIndex) {
                return "Service (\(uuidStr[index..<endIndex]))"
            }
            return "Custom Service"
        }
    }

    private func getCharacteristicName(_ uuid: CBUUID) -> String {
        switch uuid.uuidString {
        case "2A00": return "Device Name"
        case "2A01": return "Appearance"
        case "2A29": return "Manufacturer Name"
        case "2A24": return "Model Number"
        case "2A25": return "Serial Number"
        case "2A27": return "Hardware Revision"
        case "2A26": return "Firmware Revision"
        case "2A28": return "Software Revision"
        case "2A19": return "Battery Level"
        case "2A37": return "Heart Rate Measurement"
        case "2A38": return "Body Sensor Location"
        default:
            let uuidStr = uuid.uuidString
            if uuidStr.hasPrefix("0000") && uuidStr.count == 36,
               let index = uuidStr.index(uuidStr.startIndex, offsetBy: 4, limitedBy: uuidStr.endIndex),
               let endIndex = uuidStr.index(index, offsetBy: 4, limitedBy: uuidStr.endIndex) {
                return "Characteristic (\(uuidStr[index..<endIndex]))"
            }
            return "Custom Characteristic"
        }
    }
}

// MARK: - CBPeripheralManagerDelegate
extension BLEManager: CBPeripheralManagerDelegate {
    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        switch peripheral.state {
        case .poweredOn:
            log("Peripheral is powered on", type: .success)
        case .poweredOff:
            log("Peripheral is powered off", type: .warning)
            isAdvertising = false
        case .unauthorized:
            log("Peripheral is unauthorized", type: .error)
        case .unknown, .resetting, .unsupported:
            log("Peripheral state: \(peripheral.state.rawValue)", type: .warning)
        @unknown default:
            log("Peripheral state: \(peripheral.state.rawValue)", type: .warning)
        }
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        if let error = error {
            log("Advertising failed: \(error.localizedDescription)", type: .error)
        } else {
            log("Advertising started successfully", type: .success)
            isAdvertising = true
        }
    }
}
