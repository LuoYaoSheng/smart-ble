//
//  BleManager.swift
//  SmartBLE
//
//  BLE 核心管理器
//

import Foundation
import CoreBluetooth
import Combine

// MARK: - Bluetooth State

/// 蓝牙状态
enum BluetoothState {
    case unavailable
    case unauthorized
    case off
    case on
    case resetting
    case unknown
}

// MARK: - Characteristic Change Event

/// 特征值变化事件
struct CharacteristicChangeEvent {
    let serviceUuid: String
    let characteristicUuid: String
    let value: Data
}

// MARK: - BLE Manager

/// BLE 管理器
class BleManager: NSObject, ObservableObject {
    // MARK: - Published Properties

    @Published var bluetoothState: BluetoothState = .unknown
    @Published var scanResults: [ScanResult] = []
    @Published var isScanning: Bool = false
    @Published var connectionState: ConnectionState = .disconnected
    @Published var services: [BleService] = []
    @Published var errorMessage: String?

    // MARK: - Private Properties

    private var centralManager: CBCentralManager?
    private var connectedPeripheral: CBPeripheral?
    private var scanResultsMap: [String: ScanResult] = [:]

    private let characteristicChangeSubject = PassthroughSubject<CharacteristicChangeEvent, Never>()
    var characteristicChanges: AnyPublisher<CharacteristicChangeEvent, Never> {
        characteristicChangeSubject.eraseToAnyPublisher()
    }

    // MARK: - Services Map

    private var servicesMap: [String: BleService] = [:]
    private var characteristicsMap: [String: CBCharacteristic] = [:]

    // MARK: - Initialization

    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }

    // MARK: - Public Methods

    /// 开始扫描
    func startScan(serviceUuids: [CBUUID]? = nil) {
        guard let central = centralManager else {
            errorMessage = "蓝牙管理器未初始化"
            return
        }

        guard central.state == .poweredOn else {
            errorMessage = "蓝牙未开启"
            return
        }

        scanResultsMap.removeAll()
        scanResults = []

        central.scanForPeripherals(withServices: serviceUuids, options: [
            CBCentralManagerScanOptionAllowDuplicatesKey: true
        ])

        isScanning = true
        errorMessage = nil
    }

    /// 停止扫描
    func stopScan() {
        centralManager?.stopScan()
        isScanning = false
    }

    /// 连接设备
    func connect(deviceId: String) -> Bool {
        guard let central = centralManager else { return false }

        // 查找已发现的设备
        guard let result = scanResultsMap[deviceId],
              let peripheral = result.device.peripheral else {
            errorMessage = "设备未找到"
            return false
        }

        connectionState = .connecting
        central.connect(peripheral, options: nil)
        return true
    }

    /// 断开连接
    func disconnect() {
        guard let peripheral = connectedPeripheral else { return }

        connectionState = .disconnecting
        centralManager?.cancelPeripheralConnection(peripheral)
    }

    /// 发现服务
    func discoverServices() -> Bool {
        guard let peripheral = connectedPeripheral else { return false }
        peripheral.discoverServices(nil)
        return true
    }

    /// 读取特征值
    func readCharacteristic(serviceUuid: String, characteristicUuid: String) -> Bool {
        guard let peripheral = connectedPeripheral else { return false }

        // 查找服务
        guard let service = peripheral.services?.first(where: { $0.uuid.uuidString == serviceUuid }) else {
            return false
        }

        // 查找特征值
        guard let characteristic = service.characteristics?.first(where: { $0.uuid.uuidString == characteristicUuid }) else {
            return false
        }

        peripheral.readValue(for: characteristic)
        return true
    }

    /// 写入特征值
    func writeCharacteristic(serviceUuid: String, characteristicUuid: String, data: Data, withResponse: Bool = true) -> Bool {
        guard let peripheral = connectedPeripheral else { return false }

        // 查找服务
        guard let service = peripheral.services?.first(where: { $0.uuid.uuidString == serviceUuid }) else {
            return false
        }

        // 查找特征值
        guard let characteristic = service.characteristics?.first(where: { $0.uuid.uuidString == characteristicUuid }) else {
            return false
        }

        let type: CBCharacteristicWriteType = withResponse ? .withResponse : .withoutResponse
        peripheral.writeValue(data, for: characteristic, type: type)
        return true
    }

    /// 设置通知
    func setNotification(serviceUuid: String, characteristicUuid: String, enabled: Bool) -> Bool {
        guard let peripheral = connectedPeripheral else { return false }

        // 查找服务
        guard let service = peripheral.services?.first(where: { $0.uuid.uuidString == serviceUuid }) else {
            return false
        }

        // 查找特征值
        guard let characteristic = service.characteristics?.first(where: { $0.uuid.uuidString == characteristicUuid }) else {
            return false
        }

        peripheral.setNotifyValue(enabled, for: characteristic)
        return true
    }

    /// 读取 RSSI
    func readRSSI() -> Bool {
        guard let peripheral = connectedPeripheral else { return false }
        peripheral.readRSSI()
        return true
    }

    // MARK: - Private Methods

    private func updateScanResult(for peripheral: CBPeripheral, advertisementData: [String: Any], rssi: NSNumber) {
        let deviceId = peripheral.identifier.uuidString

        let device = BleDevice(
            id: deviceId,
            name: peripheral.name,
            rssi: rssi.intValue,
            state: .disconnected,
            peripheral: peripheral
        )

        let result = ScanResult(device: device, timestamp: Date())
        scanResultsMap[deviceId] = result
        scanResults = Array(scanResultsMap.values).sorted { $0.timestamp > $1.timestamp }
    }

    private func mapService(_ service: CBService) -> BleService {
        let bleService = BleService(
            id: service.uuid.uuidString,
            uuid: service.uuid.uuidString
        )

        guard let cbService = service as? CBService else { return bleService }

        var characteristics: [BleCharacteristic] = []

        if let cbCharacteristics = cbService.characteristics {
            for char in cbCharacteristics {
                let bleChar = mapCharacteristic(cbService.uuid.uuidString, char)
                characteristics.append(bleChar)
                characteristicsMap[char.uuid.uuidString] = char
            }
        }

        var updatedService = bleService
        updatedService.characteristics = characteristics
        return updatedService
    }

    private func mapCharacteristic(_ serviceUuid: String, _ characteristic: CBCharacteristic) -> BleCharacteristic {
        return BleCharacteristic(
            id: characteristic.uuid.uuidString,
            serviceUuid: serviceUuid,
            uuid: characteristic.uuid.uuidString,
            properties: characteristic.properties,
            value: characteristic.value,
            isNotifying: characteristic.isNotifying
        )
    }

    private func updateCharacteristicValue(serviceUuid: String, characteristicUuid: String, value: Data?) {
        if let index = services.firstIndex(where: { $0.uuid == serviceUuid }) {
            if let charIndex = services[index].characteristics.firstIndex(where: { $0.uuid == characteristicUuid }) {
                services[index].characteristics[charIndex].value = value
            }
        }
    }

    private func updateCharacteristicNotifying(serviceUuid: String, characteristicUuid: String, notifying: Bool) {
        if let index = services.firstIndex(where: { $0.uuid == serviceUuid }) {
            if let charIndex = services[index].characteristics.firstIndex(where: { $0.uuid == characteristicUuid }) {
                services[index].characteristics[charIndex].isNotifying = notifying
            }
        }
    }

    deinit {
        stopScan()
        disconnect()
    }
}

// MARK: - CBCentralManagerDelegate

extension BleManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            bluetoothState = .on
        case .poweredOff:
            bluetoothState = .off
        case .unauthorized:
            bluetoothState = .unauthorized
        case .unsupported:
            bluetoothState = .unavailable
        case .resetting:
            bluetoothState = .resetting
        case .unknown:
            bluetoothState = .unknown
        @unknown default:
            bluetoothState = .unknown
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        updateScanResult(for: peripheral, advertisementData: advertisementData, rssi: RSSI)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        connectionState = .connected
        connectedPeripheral = peripheral
        peripheral.delegate = self

        // 自动发现服务
        peripheral.discoverServices(nil)
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        connectionState = .disconnected
        if let error = error {
            errorMessage = "连接失败: \(error.localizedDescription)"
        }
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        connectionState = .disconnected
        connectedPeripheral = nil
        services.removeAll()

        if let error = error {
            errorMessage = "断开连接: \(error.localizedDescription)"
        }
    }
}

// MARK: - CBPeripheralDelegate

extension BleManager: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            errorMessage = "发现服务失败: \(error.localizedDescription)"
            return
        }

        guard let services = peripheral.services else { return }

        var discoveredServices: [BleService] = []
        for service in services {
            let bleService = mapService(service)
            discoveredServices.append(bleService)

            // 发现特征值
            peripheral.discoverCharacteristics(nil, for: service)
        }

        self.services = discoveredServices
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error = error {
            errorMessage = "发现特征值失败: \(error.localizedDescription)"
            return
        }

        guard let characteristics = service.characteristics else { return }

        // 更新服务中的特征值
        if let index = services.firstIndex(where: { $0.uuid == service.uuid.uuidString }) {
            services[index].characteristics = characteristics.map { char in
                let bleChar = mapCharacteristic(service.uuid.uuidString, char)
                characteristicsMap[char.uuid.uuidString] = char
                return bleChar
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            errorMessage = "读取特征值失败: \(error.localizedDescription)"
            return
        }

        guard let service = characteristic.service else { return }

        updateCharacteristicValue(
            serviceUuid: service.uuid.uuidString,
            characteristicUuid: characteristic.uuid.uuidString,
            value: characteristic.value
        )

        // 如果是通知，发送事件
        if let value = characteristic.value, characteristic.isNotifying {
            characteristicChangeSubject.send(
                CharacteristicChangeEvent(
                    serviceUuid: service.uuid.uuidString,
                    characteristicUuid: characteristic.uuid.uuidString,
                    value: value
                )
            )
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            errorMessage = "写入特征值失败: \(error.localizedDescription)"
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            errorMessage = "设置通知失败: \(error.localizedDescription)"
            return
        }

        guard let service = characteristic.service else { return }

        updateCharacteristicNotifying(
            serviceUuid: service.uuid.uuidString,
            characteristicUuid: characteristic.uuid.uuidString,
            notifying: characteristic.isNotifying
        )
    }

    func peripheralDidUpdateRSSI(_ peripheral: CBPeripheral, error: Error?) {
        if let error = error {
            errorMessage = "读取RSSI失败: \(error.localizedDescription)"
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didReadRSSI RSSI: NSNumber, error: Error?) {
        // RSSI 更新
    }
}
