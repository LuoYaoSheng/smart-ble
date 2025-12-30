//
// SmartBLE - BLE Manager
//

import Foundation
import CoreBluetooth
import Combine

// MARK: - BLE Manager
@MainActor
class BLEManager: NSObject, ObservableObject {
    // MARK: - Published Properties
    @Published var bluetoothState: BLEState = .unknown
    @Published var scanResults: [ScanResult] = []
    @Published var filteredScanResults: [ScanResult] = []
    @Published var isScanning = false
    @Published var connectionState: ConnectionState = .disconnected
    @Published var connectedDevice: ScanResult?
    @Published var services: [BLEService] = []
    @Published var logs: [LogEntry] = []
    @Published var isAdvertising = false

    // MARK: - Filter Settings
    @Published var filterRSSI: Int = -100
    @Published var filterNamePrefix: String = ""
    @Published var hideNoNameDevices: Bool = false
    @Published var autoStopScanDuration: TimeInterval = 10.0  // seconds, 0 = no auto-stop
    @Published var maxDeviceCount: Int = 100

    // MARK: - CoreBluetooth Properties
    private var centralManager: CBCentralManager!
    private var peripheralManager: CBPeripheralManager!

    private var connectedPeripheral: CBPeripheral?
    private var discoveredPeripherals: [String: CBPeripheral] = [:]
    private var characteristicsMap: [String: CBCharacteristic] = [:]

    // MARK: - Timer
    private var autoStopTimer: Timer?

    // MARK: - Notify State Tracking
    private var notifyingCharacteristics: Set<String> = []  // "serviceUUID:characteristicUUID"

    // MARK: - UUID Helper
    private func getServiceName(for uuid: CBUUID) -> String {
        let services: [String: String] = [
            "1800": "Generic Access",
            "1801": "Generic Attribute",
            "180A": "Device Information",
            "180F": "Battery Service",
            "1812": "HID",
            "180D": "Heart Rate",
            "1809": "Health Thermometer",
            "181C": "User Data",
            "181A": "Automation IO",
            "181B": "Object Transfer"
        ]
        return services[uuid.uuidString.uppercased()] ?? "Unknown Service"
    }

    private func getCharacteristicName(for uuid: CBUUID) -> String {
        let characteristics: [String: String] = [
            "2A00": "Device Name",
            "2A01": "Appearance",
            "2A29": "Manufacturer Name",
            "2A24": "Model Number",
            "2A25": "Serial Number",
            "2A27": "Hardware Revision",
            "2A26": "Firmware Revision",
            "2A28": "Software Revision",
            "2A19": "Battery Level",
            "2A04": "PPP Central",
            "2A05": "PPP Peripheral"
        ]
        return characteristics[uuid.uuidString.uppercased()] ?? "Unknown Characteristic"
    }

    // MARK: - Initialization
    override init() {
        super.init()
        setupCentral()
        setupPeripheral()
    }

    private func setupCentral() {
        centralManager = CBCentralManager(delegate: self, queue: nil)
        log("BLE Manager initialized", type: .info)
    }

    private func setupPeripheral() {
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
    }

    // MARK: - Logging
    func log(_ message: String, type: LogEntry.LogType = .info) {
        let entry = LogEntry(message: message, type: type)
        logs.append(entry)
        print("[BLE] \(message)")
    }

    func clearLogs() {
        logs.removeAll()
    }

    // MARK: - Scanning
    func startScan() {
        guard centralManager.state == .poweredOn else {
            log("Bluetooth not ready", type: .error)
            return
        }

        scanResults.removeAll()
        filteredScanResults.removeAll()
        discoveredPeripherals.removeAll()

        centralManager.scanForPeripherals(withServices: nil, options: [
            CBCentralManagerScanOptionAllowDuplicatesKey: true
        ])

        isScanning = true
        log("Started scanning", type: .info)

        // Start auto-stop timer if duration > 0
        if autoStopScanDuration > 0 {
            autoStopTimer = Timer.scheduledTimer(withTimeInterval: autoStopScanDuration, repeats: false) { [weak self] _ in
                self?.stopScan()
                self?.log("Auto-stop scan after \(self?.autoStopScanDuration ?? 0)s", type: .info)
            }
        }
    }

    func stopScan() {
        autoStopTimer?.invalidate()
        autoStopTimer = nil

        centralManager.stopScan()
        isScanning = false
        log("Stopped scanning", type: .info)
    }

    // MARK: - Filtering
    func applyFilters() {
        // First apply filters
        let filtered = scanResults.filter { device in
            // RSSI filter - only filter if RSSI threshold is greater than minimum
            if filterRSSI > -100 && device.rssi < filterRSSI {
                return false
            }

            // Hide no name devices
            if hideNoNameDevices && (device.name.isEmpty || device.name == "Unknown Device") {
                return false
            }

            // Name prefix filter
            if !filterNamePrefix.isEmpty {
                return device.name.lowercased().hasPrefix(filterNamePrefix.lowercased())
            }

            return true
        }

        // Sort by discovery order (stable) - don't re-sort by RSSI to avoid jumping
        // New devices are appended to the end, maintaining stable positions
        filteredScanResults = filtered

        // Limit device count
        if filteredScanResults.count > maxDeviceCount {
            filteredScanResults = Array(filteredScanResults.prefix(maxDeviceCount))
        }
    }

    // MARK: - Connection
    func connect(to device: ScanResult) {
        guard centralManager.state == .poweredOn else {
            log("Bluetooth not ready", type: .error)
            return
        }

        connectionState = .connecting
        stopScan()

        centralManager.connect(device.peripheral, options: nil)
        log("Connecting to \(device.name)", type: .info)
    }

    func disconnect() {
        guard let peripheral = connectedPeripheral else {
            connectionState = .disconnected
            connectedDevice = nil
            services.removeAll()
            return
        }

        connectionState = .disconnecting
        centralManager.cancelPeripheralConnection(peripheral)
        log("Disconnecting...", type: .info)
    }

    // MARK: - Service Discovery
    func discoverServices() {
        guard let peripheral = connectedPeripheral else {
            log("No device connected", type: .error)
            return
        }

        log("Discovering services...", type: .info)
        peripheral.discoverServices(nil)
    }

    func discoverCharacteristics(for service: CBService) {
        guard let peripheral = connectedPeripheral else {
            log("No device connected", type: .error)
            return
        }

        log("Discovering characteristics for service: \(service.uuid)", type: .info)
        peripheral.discoverCharacteristics(nil, for: service)
    }

    // MARK: - Read Characteristic
    func readCharacteristic(serviceUUID: String, characteristicUUID: String) {
        guard let peripheral = connectedPeripheral,
              let service = peripheral.services?.first(where: { $0.uuid.uuidString == serviceUUID }),
              let characteristic = service.characteristics?.first(where: { $0.uuid.uuidString == characteristicUUID }) else {
            log("Characteristic not found", type: .error)
            return
        }
        log("Reading characteristic: \(characteristicUUID)", type: .send)
        peripheral.readValue(for: characteristic)
    }

    // MARK: - Write Characteristic
    func writeCharacteristic(serviceUUID: String, characteristicUUID: String, data: Data, withoutResponse: Bool = false) {
        guard let peripheral = connectedPeripheral,
              let service = peripheral.services?.first(where: { $0.uuid.uuidString == serviceUUID }),
              let characteristic = service.characteristics?.first(where: { $0.uuid.uuidString == characteristicUUID }) else {
            log("Characteristic not found", type: .error)
            return
        }
        log("Writing to characteristic: \(characteristicUUID)", type: .send)
        let type: CBCharacteristicWriteType = withoutResponse ? .withoutResponse : .withResponse
        peripheral.writeValue(data, for: characteristic, type: type)
    }

    // MARK: - Notify Characteristic
    func setNotification(serviceUUID: String, characteristicUUID: String, enabled: Bool) {
        guard let peripheral = connectedPeripheral,
              let service = peripheral.services?.first(where: { $0.uuid.uuidString == serviceUUID }),
              let characteristic = service.characteristics?.first(where: { $0.uuid.uuidString == characteristicUUID }) else {
            log("Characteristic not found", type: .error)
            return
        }
        let action = enabled ? "Enabling" : "Disabling"
        log("\(action) notifications for: \(characteristicUUID)", type: .info)
        peripheral.setNotifyValue(enabled, for: characteristic)

        // Track notify state
        let key = "\(serviceUUID):\(characteristicUUID)"
        if enabled {
            notifyingCharacteristics.insert(key)
        } else {
            notifyingCharacteristics.remove(key)
        }
    }

    // Check if a characteristic is currently notifying
    func isNotifying(serviceUUID: String, characteristicUUID: String) -> Bool {
        let key = "\(serviceUUID):\(characteristicUUID)"
        return notifyingCharacteristics.contains(key)
    }

    // Clear all notify states on disconnect
    private func clearNotifyStates() {
        notifyingCharacteristics.removeAll()
    }

    // MARK: - Advertising (Peripheral Mode)
    func startAdvertising(name: String, serviceUUIDs: [String]) {
        guard peripheralManager.state == .poweredOn else {
            log("Peripheral not ready for advertising", type: .error)
            return
        }

        let uuids = serviceUUIDs.map { CBUUID(string: $0) }

        let advertisementData: [String: Any] = [
            CBAdvertisementDataLocalNameKey: name,
            CBAdvertisementDataServiceUUIDsKey: uuids
        ]

        peripheralManager.startAdvertising(advertisementData)
        log("Starting advertising as \(name)", type: .info)
    }

    func stopAdvertising() {
        peripheralManager.stopAdvertising()
        log("Stopped advertising", type: .info)
    }

    // MARK: - Parse RSSI
    func getRSSIClass(rssi: Int) -> String {
        if rssi >= -50 { return "excellent" }
        if rssi >= -70 { return "good" }
        if rssi >= -85 { return "fair" }
        return "weak"
    }

    func getSignalBars(rssi: Int) -> Int {
        if rssi >= -50 { return 4 }
        if rssi >= -70 { return 3 }
        if rssi >= -85 { return 2 }
        return 1
    }

    func getRssiText(rssi: Int) -> String {
        if rssi >= -50 { return "极佳" }
        if rssi >= -70 { return "良好" }
        if rssi >= -85 { return "一般" }
        return "微弱"
    }

    // MARK: - Helper Methods
    private func updateServices(for peripheral: CBPeripheral) {
        guard let services = peripheral.services else {
            self.services = []
            return
        }

        var result: [BLEService] = []

        for service in services {
            var serviceModel = BLEService(
                id: service.uuid.uuidString,
                uuid: service.uuid.uuidString,
                name: getServiceName(for: service.uuid)
            )
            serviceModel.peripheralService = service

            if let characteristics = service.characteristics {
                for characteristic in characteristics {
                    var charModel = BLECharacteristic(
                        id: characteristic.uuid.uuidString,
                        uuid: characteristic.uuid.uuidString,
                        name: getCharacteristicName(for: characteristic.uuid),
                        serviceUUID: service.uuid.uuidString,
                        properties: CharacteristicProperties(rawValue: UInt8(truncatingIfNeeded: characteristic.properties.rawValue))
                    )
                    charModel.peripheralCharacteristic = characteristic

                    if let value = characteristic.value {
                        charModel.value = String(data: value, encoding: .utf8) ?? dataToHexString(value)
                    }

                    serviceModel.characteristics.append(charModel)

                    // Store for quick access
                    characteristicsMap["\(service.uuid.uuidString):\(characteristic.uuid.uuidString)"] = characteristic
                }
            }

            result.append(serviceModel)
        }

        self.services = result
        log("Discovered \(result.count) services", type: .success)
    }

    private func dataToHexString(_ data: Data) -> String {
        return data.map { String(format: "%02x", $0) }.joined(separator: " ").uppercased()
    }

    private func hexStringToData(_ hex: String) -> Data {
        let cleanHex = hex.replacingOccurrences(of: " ", with: "")
        guard cleanHex.count % 2 == 0 else { return Data() }

        var data = Data()
        var index = cleanHex.startIndex

        while index < cleanHex.endIndex {
            let nextIndex = cleanHex.index(index, offsetBy: 2)
            let byteString = String(cleanHex[index..<nextIndex])
            guard let byte = UInt8(byteString, radix: 16) else { return Data() }
            data.append(byte)
            index = nextIndex
        }

        return data
    }
}

// MARK: - CBCentralManagerDelegate
extension BLEManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .unknown:
            bluetoothState = .unknown
            log("Bluetooth state: Unknown", type: .info)
        case .resetting:
            bluetoothState = .resetting
            log("Bluetooth state: Resetting", type: .info)
        case .unsupported:
            bluetoothState = .unsupported
            log("Bluetooth state: Unsupported", type: .error)
        case .unauthorized:
            bluetoothState = .unauthorized
            log("Bluetooth state: Unauthorized", type: .error)
        case .poweredOff:
            bluetoothState = .poweredOff
            log("Bluetooth state: Powered Off", type: .info)
        case .poweredOn:
            bluetoothState = .poweredOn
            log("Bluetooth state: Powered On", type: .success)
        @unknown default:
            bluetoothState = .unknown
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? peripheral.name ?? "Unknown Device"

        let serviceUUIDs = (advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID])?.map { $0.uuidString } ?? []

        var serviceData: [String: Data] = [:]
        if let data = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data] {
            for (uuid, data) in data {
                serviceData[uuid.uuidString] = data
            }
        }

        let manufacturerData = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data
        let txPowerLevel = advertisementData[CBAdvertisementDataTxPowerLevelKey] as? NSNumber
        let connectable = advertisementData[CBAdvertisementDataIsConnectable] as? Bool ?? true

        // Create scan result
        let result = ScanResult(
            id: peripheral.identifier.uuidString,
            name: name,
            rssi: RSSI.intValue,
            peripheral: peripheral,
            serviceUUIDs: serviceUUIDs,
            serviceData: serviceData,
            manufacturerData: manufacturerData,
            txPowerLevel: txPowerLevel?.intValue,
            connectable: connectable
        )

        // Update or add to scan results immediately
        if let index = scanResults.firstIndex(where: { $0.id == result.id }) {
            scanResults[index] = result
        } else {
            scanResults.append(result)
        }

        // Store peripheral for connection
        if discoveredPeripherals[peripheral.identifier.uuidString] == nil {
            discoveredPeripherals[peripheral.identifier.uuidString] = peripheral
        }

        // Apply filters and update UI immediately
        applyFilters()
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        connectedPeripheral = peripheral
        connectionState = .connected

        // CRITICAL: Set delegate to receive peripheral callbacks
        peripheral.delegate = self

        let device = scanResults.first { $0.id == peripheral.identifier.uuidString }
        connectedDevice = device

        log("Connected to \(peripheral.name ?? "Unknown Device"), discovering services...", type: .success)

        // Auto-discover services immediately after connection
        peripheral.discoverServices(nil)
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        connectionState = .disconnected
        if let error = error {
            log("Failed to connect: \(error.localizedDescription)", type: .error)
        }
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        connectedPeripheral = nil
        connectionState = .disconnected
        connectedDevice = nil
        services.removeAll()
        clearNotifyStates()  // Clear notify tracking

        if let error = error {
            log("Disconnected: \(error.localizedDescription)", type: .error)
        } else {
            log("Disconnected", type: .info)
        }
    }
}

// MARK: - CBPeripheralDelegate
extension BLEManager: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            log("Service discovery failed: \(error.localizedDescription)", type: .error)
            return
        }

        updateServices(for: peripheral)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error = error {
            log("Characteristic discovery failed for service \(service.uuid): \(error.localizedDescription)", type: .error)
            return
        }

        updateServices(for: peripheral)
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            log("Failed to update value: \(error.localizedDescription)", type: .error)
            return
        }

        let value = characteristic.value ?? Data()
        let hexString = dataToHexString(value)
        log("Received: \(hexString)", type: .receive)

        // Update service/characteristic in UI
        updateServices(for: peripheral)
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            log("Write failed: \(error.localizedDescription)", type: .error)
        } else {
            log("Write success", type: .success)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            log("Notification update failed: \(error.localizedDescription)", type: .error)
        } else {
            let state = characteristic.isNotifying ? "enabled" : "disabled"
            log("Notifications \(state)", type: .success)
        }
    }

    func peripheralDidUpdateName(_ peripheral: CBPeripheral) {
        if let index = scanResults.firstIndex(where: { $0.id == peripheral.identifier.uuidString }) {
            // Update will trigger refresh
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didReadRSSI RSSI: NSNumber, error: Error?) {
        if let index = scanResults.firstIndex(where: { $0.id == peripheral.identifier.uuidString }) {
            // Update RSSI
        }
    }
}

// MARK: - CBPeripheralManagerDelegate
extension BLEManager: CBPeripheralManagerDelegate {
    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        switch peripheral.state {
        case .unknown:
            log("Peripheral state: Unknown", type: .info)
        case .unsupported:
            log("Peripheral state: Unsupported", type: .error)
        case .unauthorized:
            log("Peripheral state: Unauthorized", type: .error)
        case .poweredOff:
            log("Peripheral state: Powered Off", type: .info)
        case .poweredOn:
            log("Peripheral state: Powered On (ready for advertising)", type: .success)
        case .resetting:
            log("Peripheral state: Resetting", type: .info)
        @unknown default:
            break
        }
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        if let error = error {
            isAdvertising = false
            log("Advertising failed: \(error.localizedDescription)", type: .error)
        } else {
            isAdvertising = true
            log("Advertising started", type: .success)
        }
    }
}
