//
// SmartBLE - BLE Manager
// Multi-device concurrent connection support

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
    @Published var isAdvertising = false
    @Published var logs: [LogEntry] = []
    /// T05: Per-device 日志（deviceId -> [LogEntry]）
    @Published var logsByDevice: [String: [LogEntry]] = [:]

    // MARK: - Multi-device connection state
    /// Per-device connection state (deviceId -> ConnectionState)
    @Published var connectionStates: [String: ConnectionState] = [:]
    /// Per-device connected info (deviceId -> ScanResult)
    @Published var connectedDevices: [String: ScanResult] = [:]
    /// Per-device services (deviceId -> [BLEService])
    @Published var servicesByDevice: [String: [BLEService]] = [:]

    // MARK: - Backward compatibility (single-device convenience)
    /// Returns the first connected device (for views that only show one)
    var connectedDevice: ScanResult? {
        connectedDevices.values.first
    }

    /// Returns the connection state of the first connected (or connecting) device
    var connectionState: ConnectionState {
        if let connecting = connectionStates.first(where: { $0.value == .connecting }) {
            return connecting.value
        }
        if let connected = connectionStates.first(where: { $0.value == .connected }) {
            return connected.value
        }
        if let disconnecting = connectionStates.first(where: { $0.value == .disconnecting }) {
            return disconnecting.value
        }
        return .disconnected
    }

    /// Returns services of the first connected device
    var services: [BLEService] {
        if let first = connectedDevices.keys.first {
            return servicesByDevice[first] ?? []
        }
        return []
    }

    /// All connected device IDs
    var connectedDeviceIds: [String] {
        connectionStates.filter { $0.value == .connected }.map { $0.key }
    }

    /// Check if a specific device is connected
    func isDeviceConnected(_ deviceId: String) -> Bool {
        connectionStates[deviceId] == .connected
    }

    // MARK: - Filter Settings
    @Published var filterRSSI: Int = -100
    @Published var filterNamePrefix: String = ""
    @Published var hideNoNameDevices: Bool = false
    @Published var autoStopScanDuration: TimeInterval = 5.0  // seconds, 0 = no auto-stop - aligned with UniApp
    @Published var maxDeviceCount: Int = 100

    // MARK: - CoreBluetooth Properties
    private var centralManager: CBCentralManager!
    private var peripheralManager: CBPeripheralManager!

    /// Per-device peripheral references (deviceId -> CBPeripheral)
    private var connectedPeripherals: [String: CBPeripheral] = [:]
    private var discoveredPeripherals: [String: CBPeripheral] = [:]
    /// Per-device characteristics cache (deviceId:serviceUUID:charUUID -> CBCharacteristic)
    private var characteristicsMap: [String: CBCharacteristic] = [:]

    // MARK: - Timer
    private var autoStopTimer: Timer?

    // MARK: - T06: Auto-Reconnect (aligned with Flutter: max 3 attempts, exponential backoff)
    private let maxReconnectAttempts = 3
    private var reconnectAttempts: [String: Int] = [:]     // deviceId -> attempt count
    private var reconnectTimers: [String: Timer] = [:]     // deviceId -> pending timer
    private var userInitiatedDisconnects: Set<String> = [] // do NOT reconnect these
    var autoReconnectEnabled = true

    // MARK: - Notify State Tracking
    /// "deviceId:serviceUUID:characteristicUUID" -> Bool
    private var notifyingCharacteristics: Set<String> = []

    // MARK: - UUID Helper
    // T07: 服务 UUID 中文名称表（对齐 Android BleUuids）
    private func getServiceName(for uuid: CBUUID) -> String {
        return BLEUuids.getServiceName(for: uuid)
    }

    // T07: 特征値 UUID 中文名称表（对齐 Android BleUuids）
    private func getCharacteristicName(for uuid: CBUUID) -> String {
        return BLEUuids.getCharacteristicName(for: uuid)
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
        if logs.count > 100 { logs.removeFirst() }
        print("[BLE] \(message)")
    }

    /// T05: Per-device 日志
    func logForDevice(_ deviceId: String, _ message: String, type: LogEntry.LogType = .info) {
        let entry = LogEntry(message: message, type: type)
        if logsByDevice[deviceId] == nil {
            logsByDevice[deviceId] = []
        }
        logsByDevice[deviceId]!.insert(entry, at: 0)
        if (logsByDevice[deviceId]?.count ?? 0) > 100 {
            logsByDevice[deviceId]?.removeLast()
        }
        // 同步到全局日志
        log(message, type: type)
    }

    func clearLogs() {
        logs.removeAll()
    }

    /// T05: 清空指定设备日志
    func clearDeviceLogs(_ deviceId: String) {
        logsByDevice[deviceId] = []
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
            let duration = autoStopScanDuration
            autoStopTimer = Timer.scheduledTimer(withTimeInterval: duration, repeats: false) { [weak self] _ in
                Task { @MainActor in
                    guard let self else { return }
                    self.stopScan()
                    self.log("Auto-stop scan after \(duration)s", type: .info)
                }
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

    // MARK: - Connection (Multi-device)
    func connect(to device: ScanResult) {
        guard centralManager.state == .poweredOn else {
            log("Bluetooth not ready", type: .error)
            return
        }

        // T06: 标记为用户主动连接，允许自动重连
        userInitiatedDisconnects.remove(device.id)
        reconnectAttempts[device.id] = 0
        cancelReconnect(deviceId: device.id)

        connectionStates[device.id] = .connecting
        stopScan()

        centralManager.connect(device.peripheral, options: nil)
        log("Connecting to \(device.name)", type: .info)
    }

    /// Disconnect a specific device by ID
    func disconnect(deviceId: String) {
        guard let peripheral = connectedPeripherals[deviceId] else {
            connectionStates.removeValue(forKey: deviceId)
            connectedDevices.removeValue(forKey: deviceId)
            servicesByDevice.removeValue(forKey: deviceId)
            return
        }

        // T06: 标记用户主动断开，不触发自动重连
        userInitiatedDisconnects.insert(deviceId)
        cancelReconnect(deviceId: deviceId)
        reconnectAttempts.removeValue(forKey: deviceId)

        connectionStates[deviceId] = .disconnecting
        centralManager.cancelPeripheralConnection(peripheral)
        log("Disconnecting from \(deviceId)...", type: .info)
    }

    /// Disconnect all connected devices
    func disconnectAll() {
        for deviceId in connectedPeripherals.keys {
            disconnect(deviceId: deviceId)
        }
    }

    /// Backward-compatible disconnect (disconnects first connected device)
    func disconnect() {
        if let first = connectedPeripherals.keys.first {
            disconnect(deviceId: first)
        } else {
            // Fallback: clear all state
            connectionStates.removeAll()
            connectedDevices.removeAll()
            servicesByDevice.removeAll()
        }
    }

    // MARK: - Service Discovery
    func discoverServices(for deviceId: String) {
        guard let peripheral = connectedPeripherals[deviceId] else {
            log("Device \(deviceId) not connected", type: .error)
            return
        }

        log("Discovering services for \(deviceId)...", type: .info)
        peripheral.discoverServices(nil)
    }

    /// Backward-compatible: discover services for first connected device
    func discoverServices() {
        if let first = connectedPeripherals.keys.first {
            discoverServices(for: first)
        } else {
            log("No device connected", type: .error)
        }
    }

    func discoverCharacteristics(for service: CBService) {
        guard let peripheral = service.peripheral else {
            log("No peripheral for service", type: .error)
            return
        }

        log("Discovering characteristics for service: \(service.uuid)", type: .info)
        peripheral.discoverCharacteristics(nil, for: service)
    }

    // MARK: - Read Characteristic (Multi-device)
    func readCharacteristic(deviceId: String, serviceUUID: String, characteristicUUID: String) {
        guard let peripheral = connectedPeripherals[deviceId],
              let service = peripheral.services?.first(where: { $0.uuid.uuidString == serviceUUID }),
              let characteristic = service.characteristics?.first(where: { $0.uuid.uuidString == characteristicUUID }) else {
            log("Characteristic not found", type: .error)
            return
        }
        log("Reading characteristic: \(characteristicUUID)", type: .send)
        peripheral.readValue(for: characteristic)
    }

    /// Backward-compatible read (uses first connected device)
    func readCharacteristic(serviceUUID: String, characteristicUUID: String) {
        if let first = connectedPeripherals.keys.first {
            readCharacteristic(deviceId: first, serviceUUID: serviceUUID, characteristicUUID: characteristicUUID)
        } else {
            log("No device connected", type: .error)
        }
    }

    // MARK: - Write Characteristic (Multi-device)
    func writeCharacteristic(deviceId: String, serviceUUID: String, characteristicUUID: String, data: Data, withoutResponse: Bool = false) {
        guard let peripheral = connectedPeripherals[deviceId],
              let service = peripheral.services?.first(where: { $0.uuid.uuidString == serviceUUID }),
              let characteristic = service.characteristics?.first(where: { $0.uuid.uuidString == characteristicUUID }) else {
            log("Characteristic not found", type: .error)
            return
        }
        log("Writing to characteristic: \(characteristicUUID)", type: .send)
        let type: CBCharacteristicWriteType = withoutResponse ? .withoutResponse : .withResponse
        peripheral.writeValue(data, for: characteristic, type: type)
    }

    /// Backward-compatible write (uses first connected device)
    func writeCharacteristic(serviceUUID: String, characteristicUUID: String, data: Data, withoutResponse: Bool = false) {
        if let first = connectedPeripherals.keys.first {
            writeCharacteristic(deviceId: first, serviceUUID: serviceUUID, characteristicUUID: characteristicUUID, data: data, withoutResponse: withoutResponse)
        } else {
            log("No device connected", type: .error)
        }
    }

    // MARK: - Notify Characteristic (Multi-device)
    func setNotification(deviceId: String, serviceUUID: String, characteristicUUID: String, enabled: Bool) {
        guard let peripheral = connectedPeripherals[deviceId],
              let service = peripheral.services?.first(where: { $0.uuid.uuidString == serviceUUID }),
              let characteristic = service.characteristics?.first(where: { $0.uuid.uuidString == characteristicUUID }) else {
            log("Characteristic not found", type: .error)
            return
        }
        let action = enabled ? "Enabling" : "Disabling"
        log("\(action) notifications for: \(characteristicUUID)", type: .info)
        peripheral.setNotifyValue(enabled, for: characteristic)

        // Track notify state (per-device)
        let key = "\(deviceId):\(serviceUUID):\(characteristicUUID)"
        if enabled {
            notifyingCharacteristics.insert(key)
        } else {
            notifyingCharacteristics.remove(key)
        }
    }

    /// Backward-compatible setNotification (uses first connected device)
    func setNotification(serviceUUID: String, characteristicUUID: String, enabled: Bool) {
        if let first = connectedPeripherals.keys.first {
            setNotification(deviceId: first, serviceUUID: serviceUUID, characteristicUUID: characteristicUUID, enabled: enabled)
        } else {
            log("No device connected", type: .error)
        }
    }

    // Check if a characteristic is currently notifying (per-device)
    func isNotifying(deviceId: String, serviceUUID: String, characteristicUUID: String) -> Bool {
        let key = "\(deviceId):\(serviceUUID):\(characteristicUUID)"
        return notifyingCharacteristics.contains(key)
    }

    /// Backward-compatible isNotifying (uses first connected device)
    func isNotifying(serviceUUID: String, characteristicUUID: String) -> Bool {
        if let first = connectedPeripherals.keys.first {
            return isNotifying(deviceId: first, serviceUUID: serviceUUID, characteristicUUID: characteristicUUID)
        }
        return false
    }

    // Clear all notify states for a specific device
    private func clearNotifyStates(for deviceId: String) {
        notifyingCharacteristics = notifyingCharacteristics.filter { !$0.hasPrefix("\(deviceId):") }
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
        let deviceId = peripheral.identifier.uuidString

        guard let services = peripheral.services else {
            servicesByDevice[deviceId] = []
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

                    // Store for quick access (per-device key)
                    characteristicsMap["\(deviceId):\(service.uuid.uuidString):\(characteristic.uuid.uuidString)"] = characteristic
                }
            }

            result.append(serviceModel)
        }

        servicesByDevice[deviceId] = result
        log("Discovered \(result.count) services for device \(deviceId.prefix(8))...", type: .success)
    }

    private func dataToHexString(_ data: Data) -> String {
        return data.map { String(format: "%02x", $0) }.joined(separator: " ").uppercased()
    }

    // MARK: - T06: Auto-Reconnect helpers
    private func attemptReconnect(deviceId: String, peripheral: CBPeripheral) {
        guard autoReconnectEnabled, !userInitiatedDisconnects.contains(deviceId) else { return }

        let attempts = reconnectAttempts[deviceId] ?? 0
        guard attempts < maxReconnectAttempts else {
            log("Device \(deviceId.prefix(8))... reached max reconnect attempts (\(maxReconnectAttempts)), giving up", type: .error)
            reconnectAttempts.removeValue(forKey: deviceId)
            return
        }

        let nextAttempt = attempts + 1
        reconnectAttempts[deviceId] = nextAttempt
        // 指数退避：2s, 4s, 6s
        let delay = Double(nextAttempt * 2)
        log("Will reconnect to \(deviceId.prefix(8))... in \(Int(delay))s (attempt \(nextAttempt)/\(maxReconnectAttempts))", type: .info)

        cancelReconnect(deviceId: deviceId)
        reconnectTimers[deviceId] = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.log("Reconnecting to \(deviceId.prefix(8))... (attempt \(nextAttempt))", type: .info)
                self.connectionStates[deviceId] = .connecting
                self.centralManager.connect(peripheral, options: nil)
            }
        }
    }

    private func cancelReconnect(deviceId: String) {
        reconnectTimers[deviceId]?.invalidate()
        reconnectTimers.removeValue(forKey: deviceId)
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
extension BLEManager: @preconcurrency CBCentralManagerDelegate {
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
        let deviceId = peripheral.identifier.uuidString

        connectedPeripherals[deviceId] = peripheral
        connectionStates[deviceId] = .connected

        // CRITICAL: Set delegate to receive peripheral callbacks
        peripheral.delegate = self

        let device = scanResults.first { $0.id == deviceId }
        if let device = device {
            connectedDevices[deviceId] = device
        }

        log("Connected to \(peripheral.name ?? "Unknown Device"), discovering services...", type: .success)

        // Auto-discover services immediately after connection
        peripheral.discoverServices(nil)
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        let deviceId = peripheral.identifier.uuidString
        connectionStates[deviceId] = .disconnected
        if let error = error {
            log("Failed to connect: \(error.localizedDescription)", type: .error)
        }
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        let deviceId = peripheral.identifier.uuidString

        connectedPeripherals.removeValue(forKey: deviceId)
        connectionStates.removeValue(forKey: deviceId)
        connectedDevices.removeValue(forKey: deviceId)
        servicesByDevice.removeValue(forKey: deviceId)
        clearNotifyStates(for: deviceId)

        if let error = error {
            log("Disconnected from \(deviceId.prefix(8))...: \(error.localizedDescription)", type: .error)
            // T06: 异常断开 → 触发自动重连
            attemptReconnect(deviceId: deviceId, peripheral: peripheral)
        } else {
            log("Disconnected from \(deviceId.prefix(8))...", type: .info)
        }
    }
}

// MARK: - CBPeripheralDelegate
extension BLEManager: @preconcurrency CBPeripheralDelegate {
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
        let deviceId = peripheral.identifier.uuidString
        // T03+T05: HEX + TEXT 双行格式，嵌入 per-device 日志
        let hexString = dataToHexString(value)
        let textString = String(bytes: value, encoding: .utf8) ??
            value.map { $0 >= 32 && $0 <= 126 ? String(UnicodeScalar($0)) : "." }.joined()
        let msg = "HEX: \(hexString)\nTEXT: \(textString)"
        logForDevice(deviceId, msg, type: .receive)

        // Update service/characteristic in UI
        updateServices(for: peripheral)
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        let deviceId = peripheral.identifier.uuidString
        if let error = error {
            logForDevice(deviceId, "Write failed: \(error.localizedDescription)", type: .error)
        } else {
            logForDevice(deviceId, "Write success", type: .success)
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
        if scanResults.contains(where: { $0.id == peripheral.identifier.uuidString }) {
            // Update will trigger refresh
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didReadRSSI RSSI: NSNumber, error: Error?) {
        if scanResults.contains(where: { $0.id == peripheral.identifier.uuidString }) {
            // Update RSSI
        }
    }
}

// MARK: - CBPeripheralManagerDelegate
extension BLEManager: @preconcurrency CBPeripheralManagerDelegate {
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
