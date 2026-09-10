//
// SmartBLE - BLE Manager
// Multi-device concurrent connection support

import Foundation
@preconcurrency import CoreBluetooth
import Combine
import SmartHidCore

// MARK: - BLE Manager
@MainActor
class BLEManager: NSObject, ObservableObject {
    // MARK: - Published Properties
    @Published var bluetoothState: BLEState = .unknown
    @Published var scanResults: [ScanResult] = []
    @Published var filteredScanResults: [ScanResult] = []
    @Published var isScanning = false
    @Published var isAdvertising = false


    // MARK: - Multi-device connection state
    /// Per-device connection state (deviceId -> ConnectionState)
    @Published var connectionStates: [String: ConnectionState] = [:]
    /// Per-device connected info (deviceId -> ScanResult)
    @Published var connectedDevices: [String: ScanResult] = [:]
    /// Per-device services (deviceId -> [BLEService])
    @Published var servicesByDevice: [String: [BLEService]] = [:]
    /// Session-only Smart HID snapshots. Never persisted to disk (F023 removal / zero persistence).
    @Published private(set) var hidSessionSnapshots: [String: HidSessionSnapshot] = [:]

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

    func saveHidSessionSnapshot(_ snapshot: HidSessionSnapshot) {
        hidSessionSnapshots[snapshot.deviceId] = snapshot
    }

    func clearHidSessionSnapshot(deviceId: String) {
        hidSessionSnapshots.removeValue(forKey: deviceId)
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

    #if DEBUG
    private var previewBluetoothStateLock: BLEState?

    func lockBluetoothStateForPreview(_ state: BLEState) {
        previewBluetoothStateLock = state
        bluetoothState = state
    }
    #endif

    // MARK: - T06: Auto-Reconnect（冻结契约 API_SPEC C-8 / SM §2：backoff 1s/3s/5s ×3；用户主动断开永不重连）
    static let reconnectBackoffSchedule: [TimeInterval] = [1.0, 3.0, 5.0]
    private let maxReconnectAttempts = 3
    private var reconnectAttempts: [String: Int] = [:]     // deviceId -> attempt count
    private var reconnectTimers: [String: Timer] = [:]     // deviceId -> pending timer
    private var userInitiatedDisconnects: Set<String> = [] // do NOT reconnect these
    var autoReconnectEnabled = true

    // MARK: - Notify State Tracking
    /// "deviceId:serviceUUID:characteristicUUID" -> Bool
    private var notifyingCharacteristics: Set<String> = []

    // MARK: - 息屏后台自测状态（--ble-bg-selftest，见 BackgroundSelfTest.swift）
    private var bgEchoDeviceId: String?
    private var bgControlServiceUUID = ""
    private var bgControlCharUUID = ""
    private var bgStatusNotifyCharUUID = ""
    private var bgEchoCounter = 0
    private var bgLastEchoAt: Date?
    private var bgSubscribeDone = false
    private var bgKeepAliveTimer: Timer?

    /// BGT 事件双写：文件（devicectl 锁屏可拉）+ 应用内日志
    private func bgLog(_ line: String) {
        BackgroundSelfTest.appendLog(line)
        log("BGT \(line)", type: .info)
    }

    // MARK: - Smart HID native adapter
    var hidEventHandler: ((HidProvisionTransportEvent) -> Void)?
    lazy var hidProvisionManager = HidProvisionManager(transport: self)

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
        if BackgroundSelfTest.isEnabled {
            bgLog("armed：息屏后台存活自测启动（--ble-bg-selftest）")
        }
    }

    private func setupCentral() {
        centralManager = CBCentralManager(delegate: self, queue: nil)
        log("BLE Manager initialized", type: .info)
    }

    private func setupPeripheral() {
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
    }

    // MARK: - Logging (Delegated to Logger Bus)
    func log(_ message: String, type: LogEntry.LogType = .info) {
        switch type {
        case .info: Logger.shared.info(message)
        case .success: Logger.shared.success(message)
        case .error: Logger.shared.error(message)
        case .warning: Logger.shared.warning(message)
        case .receive: break // Usually targeted
        case .send: break
        }
    }

    /// T05: Per-device 日志
    func logForDevice(_ deviceId: String, _ message: String, type: LogEntry.LogType = .info) {
        switch type {
        case .info: Logger.shared.info(message, deviceId: deviceId)
        case .success: Logger.shared.success(message, deviceId: deviceId)
        case .error: Logger.shared.error(message, deviceId: deviceId)
        case .warning: Logger.shared.warning(message, deviceId: deviceId)
        case .receive: Logger.shared.receive(message, deviceId: deviceId)
        case .send: Logger.shared.send(message, deviceId: deviceId)
        }
    }

    func clearLogs() {
    }

    /// T05: 清空指定设备日志
    func clearDeviceLogs(_ deviceId: String) {
    }

    // MARK: - Scanning
    @discardableResult
    func startScan() -> Bool {
        guard centralManager.state == .poweredOn else {
            log("Bluetooth not ready", type: .error)
            return false
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
        return true
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
        guard let peripheral = device.peripheral else {
            log("Device preview has no CoreBluetooth peripheral", type: .error)
            return
        }

        // T06: 标记为用户主动连接，允许自动重连
        userInitiatedDisconnects.remove(device.id)
        reconnectAttempts[device.id] = 0
        cancelReconnect(deviceId: device.id)

        connectionStates[device.id] = .connecting
        stopScan()

        centralManager.connect(peripheral, options: nil)
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
        guard let (peripheral, characteristic) = findCharacteristic(
            deviceId: deviceId,
            serviceUUID: serviceUUID,
            characteristicUUID: characteristicUUID
        ) else {
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
        guard let (peripheral, characteristic) = findCharacteristic(
            deviceId: deviceId,
            serviceUUID: serviceUUID,
            characteristicUUID: characteristicUUID
        ) else {
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
        guard let (peripheral, characteristic) = findCharacteristic(
            deviceId: deviceId,
            serviceUUID: serviceUUID,
            characteristicUUID: characteristicUUID
        ) else {
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
                        charModel.value = DataConverter.bytesToString(value)
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

    private func findCharacteristic(
        deviceId: String,
        serviceUUID: String,
        characteristicUUID: String
    ) -> (CBPeripheral, CBCharacteristic)? {
        guard let peripheral = connectedPeripherals[deviceId],
              let service = peripheral.services?.first(where: {
                  $0.uuid.uuidString.caseInsensitiveCompare(serviceUUID) == .orderedSame
              }),
              let characteristic = service.characteristics?.first(where: {
                  $0.uuid.uuidString.caseInsensitiveCompare(characteristicUUID) == .orderedSame
              }) else {
            return nil
        }
        return (peripheral, characteristic)
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
        // 冻结契约 C-8：1s/3s/5s ×3（对齐 macOS 端与 uniapp ble-runtime reconnect-policy）
        let delay = Self.reconnectBackoffSchedule[nextAttempt - 1]
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

    // MARK: - 息屏后台自测回声（--ble-bg-selftest）
    /// 保活写：每 10s 写一次 led on/off（自产 notify = 接收证据；ack = 下发证据）
    private func bgKeepAliveTick() {
        guard BackgroundSelfTest.isEnabled,
              let deviceId = bgEchoDeviceId,
              isDeviceConnected(deviceId),
              !bgControlServiceUUID.isEmpty else { return }
        bgEchoCounter += 1
        let payload = BackgroundSelfTest.echoPayload(echoCounter: bgEchoCounter)
        BackgroundSelfTest.appendLog("timer_write #\(bgEchoCounter) \(String(bytes: payload, encoding: .utf8) ?? "-")")
        writeCharacteristic(
            deviceId: deviceId,
            serviceUUID: bgControlServiceUUID,
            characteristicUUID: bgControlCharUUID,
            data: payload,
            withoutResponse: false
        )
    }

    private func handleBackgroundSelfTestNotify(deviceId: String, value: Data) {
        let text = String(bytes: value, encoding: .utf8) ?? "-"
        guard !BackgroundSelfTest.isSelfEcho(value) else {
            logForDevice(deviceId, "BGT notify（自身回声 · 跳过）\(text.prefix(80))", type: .info)
            return
        }
        // 节流：>=1.2s 才回声一次（双保险防自激）
        let now = Date()
        if let last = bgLastEchoAt, now.timeIntervalSince(last) < 1.2 {
            logForDevice(deviceId, "BGT notify（节流窗口内 · 跳过）\(text.prefix(80))", type: .info)
            return
        }
        bgLastEchoAt = now
        bgEchoCounter += 1
        let payload = BackgroundSelfTest.echoPayload(echoCounter: bgEchoCounter)
        logForDevice(deviceId, "BGT notify #\(bgEchoCounter) → echo \(String(bytes: payload, encoding: .utf8) ?? "-")", type: .receive)
        writeCharacteristic(
            deviceId: deviceId,
            serviceUUID: bgControlServiceUUID,
            characteristicUUID: bgControlCharUUID,
            data: payload,
            withoutResponse: false
        )
    }
}

// MARK: - CBCentralManagerDelegate
extension BLEManager: @preconcurrency CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        #if DEBUG
        if let previewBluetoothStateLock {
            // 幂等写：@Published 赋值即使同值也会发 objectWillChange，
            // 启动期这次多余重渲染会取消进行中的合成触摸（UI 测试偶发吞 tap）
            if bluetoothState != previewBluetoothStateLock {
                bluetoothState = previewBluetoothStateLock
            }
            return
        }
        #endif
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
            if BackgroundSelfTest.isEnabled {
                centralManager.scanForPeripherals(
                    withServices: [CBUUID(string: BackgroundSelfTest.fixtureServiceUUID)],
                    options: nil
                )
                bgLog("scan_start service=…914B（等待夹具 BLEToolkit-Server）")
            }
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

        // BGT：发现夹具即自动连接（只连第一个，一次）
        if BackgroundSelfTest.isEnabled, bgEchoDeviceId == nil,
           BackgroundSelfTest.isFixtureAdvertisement(serviceUUIDs: serviceUUIDs, name: name) {
            bgLog("fixture_discovered name=\(name) rssi=\(RSSI.intValue) → connect")
            connect(to: result)
            return
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

        hidEventHandler?(.connectionChanged(deviceId: deviceId, connected: true))

        if BackgroundSelfTest.isEnabled, bgEchoDeviceId == nil {
            bgEchoDeviceId = deviceId
            bgLog("connected device=\(deviceId.prefix(8))… 服务发现中")
        }

        log("Connected to \(peripheral.name ?? "Unknown Device"), discovering services...", type: .success)

        // Auto-discover services immediately after connection
        peripheral.discoverServices(nil)
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        let deviceId = peripheral.identifier.uuidString
        connectionStates[deviceId] = .disconnected
        hidEventHandler?(.connectionChanged(deviceId: deviceId, connected: false))
        if let error = error {
            log("Failed to connect: \(error.localizedDescription)", type: .error)
        }
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        let deviceId = peripheral.identifier.uuidString

        hidEventHandler?(.connectionChanged(deviceId: deviceId, connected: false))

        connectedPeripherals.removeValue(forKey: deviceId)
        connectionStates.removeValue(forKey: deviceId)
        connectedDevices.removeValue(forKey: deviceId)
        servicesByDevice.removeValue(forKey: deviceId)
        clearNotifyStates(for: deviceId)

        // BGT：夹具断链 → 复位订阅标记；无错误路径也强制走自动重连（锁屏期间链路必须自愈）
        if BackgroundSelfTest.isEnabled, deviceId == bgEchoDeviceId {
            bgSubscribeDone = false
            bgKeepAliveTimer?.invalidate()
            bgKeepAliveTimer = nil
            if error == nil {
                attemptReconnect(deviceId: deviceId, peripheral: peripheral)
            }
            bgLog("disconnected err=\(error.map { "\($0)" } ?? "nil")（重连接管）")
        }

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
        for service in peripheral.services ?? [] {
            peripheral.discoverCharacteristics(nil, for: service)
        }
        hidEventHandler?(.servicesChanged(deviceId: peripheral.identifier.uuidString))
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error = error {
            log("Characteristic discovery failed for service \(service.uuid): \(error.localizedDescription)", type: .error)
            return
        }

        updateServices(for: peripheral)
        hidEventHandler?(.servicesChanged(deviceId: peripheral.identifier.uuidString))

        // BGT：特征就绪即订阅夹具 StatusNotify（断线重连后 bgSubscribeDone 已复位，会重新订阅）
        if BackgroundSelfTest.isEnabled, !bgSubscribeDone,
           peripheral.identifier.uuidString == bgEchoDeviceId,
           let fixture = BackgroundSelfTest.locateFixtureCharacteristics(in: peripheral) {
            bgSubscribeDone = true
            bgControlServiceUUID = fixture.serviceUUID
            bgControlCharUUID = fixture.control.uuid.uuidString
            bgStatusNotifyCharUUID = fixture.statusNotify.uuid.uuidString
            setNotification(
                deviceId: peripheral.identifier.uuidString,
                serviceUUID: fixture.serviceUUID,
                characteristicUUID: fixture.statusNotify.uuid.uuidString,
                enabled: true
            )
            bgLog("subscribe StatusNotify …\(bgStatusNotifyCharUUID.suffix(4)) + 保活写定时器启动（10s）")
            bgKeepAliveTimer?.invalidate()
            bgKeepAliveTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.bgKeepAliveTick()
                }
            }
            bgKeepAliveTick()
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            log("Failed to update value: \(error.localizedDescription)", type: .error)
            return
        }

        let value = characteristic.value ?? Data()
        let deviceId = peripheral.identifier.uuidString
        hidEventHandler?(.value(
            deviceId: deviceId,
            characteristicUUID: characteristic.uuid.uuidString,
            data: value
        ))

        // BGT：夹具 StatusNotify → 记录 + 回声（自身回声跳过，见 BackgroundSelfTest 自激防护）
        if BackgroundSelfTest.isEnabled,
           deviceId == bgEchoDeviceId,
           !bgStatusNotifyCharUUID.isEmpty,
           characteristic.uuid.uuidString.caseInsensitiveCompare(bgStatusNotifyCharUUID) == .orderedSame {
            BackgroundSelfTest.appendLog("notify \(String(bytes: value, encoding: .utf8) ?? value.map { String(format: "%02x", $0) }.joined())")
            handleBackgroundSelfTestNotify(deviceId: deviceId, value: value)
        }
        // T03+T05: HEX + TEXT 双行格式，嵌入 per-device 日志
        let hexString = DataConverter.bytesToHex(value)
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
        // BGT：写结果入文件日志（锁屏取证通道）
        if BackgroundSelfTest.isEnabled, deviceId == bgEchoDeviceId {
            BackgroundSelfTest.appendLog(error == nil
                ? "write_acked char=…\(characteristic.uuid.uuidString.suffix(4))"
                : "write_failed err=\(error.map { "\($0.localizedDescription)" } ?? "?")")
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

// MARK: - Smart HID provisioning transport
extension BLEManager: HidProvisionTransport {
    func connectForProvisioning(deviceId: String) -> Bool {
        if isDeviceConnected(deviceId) {
            hidEventHandler?(.connectionChanged(deviceId: deviceId, connected: true))
            return true
        }
        guard let device = scanResults.first(where: { $0.id == deviceId }) else { return false }
        connect(to: device)
        return true
    }

    func disconnectForProvisioning(deviceId: String) {
        disconnect(deviceId: deviceId)
    }

    func isProvisioningDeviceConnected(_ deviceId: String) -> Bool {
        isDeviceConnected(deviceId)
    }

    func hasProvisioningCharacteristic(deviceId: String, characteristicUUID: String) -> Bool {
        findCharacteristic(
            deviceId: deviceId,
            serviceUUID: HidProtocol.serviceUuid,
            characteristicUUID: characteristicUUID
        ) != nil
    }

    func setProvisioningNotification(deviceId: String, characteristicUUID: String, enabled: Bool) -> Bool {
        guard hasProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: characteristicUUID) else {
            return false
        }
        setNotification(
            deviceId: deviceId,
            serviceUUID: HidProtocol.serviceUuid,
            characteristicUUID: characteristicUUID,
            enabled: enabled
        )
        return true
    }

    func readProvisioningCharacteristic(deviceId: String, characteristicUUID: String) -> Bool {
        guard hasProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: characteristicUUID) else {
            return false
        }
        readCharacteristic(
            deviceId: deviceId,
            serviceUUID: HidProtocol.serviceUuid,
            characteristicUUID: characteristicUUID
        )
        return true
    }

    func writeProvisioningCharacteristic(deviceId: String, characteristicUUID: String, data: Data) -> Bool {
        guard hasProvisioningCharacteristic(deviceId: deviceId, characteristicUUID: characteristicUUID) else {
            return false
        }
        writeCharacteristic(
            deviceId: deviceId,
            serviceUUID: HidProtocol.serviceUuid,
            characteristicUUID: characteristicUUID,
            data: data,
            withoutResponse: false
        )
        return true
    }

    func provisioningAttMtu(deviceId: String) -> Int {
        (connectedPeripherals[deviceId]?.maximumWriteValueLength(for: .withResponse) ?? 20) + 3
    }

    func logProvisioning(_ message: String, deviceId: String, isError: Bool) {
        logForDevice(deviceId, message, type: isError ? .error : .info)
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
