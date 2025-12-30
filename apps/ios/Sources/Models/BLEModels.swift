//
// SmartBLE - BLE Models
//

import Foundation

// MARK: - BLE State
enum BLEState: String {
    case unknown = "未知"
    case resetting = "重置中"
    case unsupported = "不支持"
    case unauthorized = "未授权"
    case poweredOff = "已关闭"
    case poweredOn = "已开启"
}

// MARK: - Scan Result
struct ScanResult: Identifiable, Equatable {
    let id: String
    let name: String
    let rssi: Int
    let peripheral: CBPeripheral

    // Advertisement data
    var serviceUUIDs: [String] = []
    var serviceData: [String: Data] = [:]
    var manufacturerData: Data?
    var txPowerLevel: Int?
    var connectable: Bool = true

    static func == (lhs: ScanResult, rhs: ScanResult) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Service
struct BLEService: Identifiable, Equatable {
    let id: String
    let uuid: String
    let name: String
    var characteristics: [BLECharacteristic] = []

    var peripheralService: CBService?

    static func == (lhs: BLEService, rhs: BLEService) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Characteristic
struct BLECharacteristic: Identifiable, Equatable {
    let id: String
    let uuid: String
    let name: String
    let serviceUUID: String
    var properties: CharacteristicProperties
    var value: String?

    var peripheralCharacteristic: CBCharacteristic?

    static func == (lhs: BLECharacteristic, rhs: BLECharacteristic) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Characteristic Properties
struct CharacteristicProperties: OptionSet {
    let rawValue: UInt8

    static let read = CharacteristicProperties(rawValue: 1 << 0)
    static let write = CharacteristicProperties(rawValue: 1 << 1)
    static let writeWithoutResponse = CharacteristicProperties(rawValue: 1 << 2)
    static let notify = CharacteristicProperties(rawValue: 1 << 3)
    static let indicate = CharacteristicProperties(rawValue: 1 << 4)
    static let broadcast = CharacteristicProperties(rawValue: 1 << 5)
    static let authenticatedSignedWrites = CharacteristicProperties(rawValue: 1 << 6)
    static let extendedProperties = CharacteristicProperties(rawValue: 1 << 7)

    var description: [String] {
        var result: [String] = []
        if contains(.read) { result.append("Read") }
        if contains(.write) { result.append("Write") }
        if contains(.writeWithoutResponse) { result.append("Write Without Response") }
        if contains(.notify) { result.append("Notify") }
        if contains(.indicate) { result.append("Indicate") }
        if contains(.broadcast) { result.append("Broadcast") }
        return result
    }
}

// MARK: - Connection State
enum ConnectionState {
    case disconnected
    case connecting
    case connected
    case disconnecting
}

// MARK: - Log Entry
struct LogEntry: Identifiable {
    let id = UUID()
    let message: String
    let type: LogType
    let timestamp = Date()

    enum LogType {
        case info, success, error, receive, send
    }
}
