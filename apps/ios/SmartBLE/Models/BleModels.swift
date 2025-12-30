//
//  BleModels.swift
//  SmartBLE
//
//  BLE 数据模型
//

import Foundation
import CoreBluetooth

// MARK: - BLE Device

/// BLE 设备
struct BleDevice: Identifiable, Equatable {
    let id: String
    let name: String?
    let rssi: Int
    var state: ConnectionState = .disconnected
    var peripheral: CBPeripheral?

    var displayName: String {
        name ?? "未知设备"
    }

    var rssiLevel: RssiLevel {
        switch rssi {
        case -50...0: return .excellent
        case -70..<(-50): return .good
        case -90..<(-70): return .fair
        default: return .weak
        }
    }
}

// MARK: - Connection State

/// 连接状态
enum ConnectionState: Equatable {
    case disconnected
    case connecting
    case connected
    case disconnecting
}

// MARK: - RSSI Level

/// 信号强度等级
enum RssiLevel {
    case excellent
    case good
    case fair
    case weak

    var color: Color {
        switch self {
        case .excellent: return .green
        case .good: return .green
        case .fair: return .orange
        case .weak: return .red
        }
    }

    var iconName: String {
        switch self {
        case .excellent: return "wifi.excellent"
        case .good: return "wifi.high"
        case .fair: return "wifi.medium"
        case .weak: return "wifi.low"
        }
    }
}

// MARK: - BLE Service

/// BLE 服务
struct BleService: Identifiable, Equatable {
    let id: String
    let uuid: String
    var characteristics: [BleCharacteristic] = []

    var shortUuid: String {
        uuid.shortUuid
    }

    var displayName: String {
        BleUuids.serviceName(for: uuid)
    }
}

// MARK: - BLE Characteristic

/// BLE 特征值
struct BleCharacteristic: Identifiable, Equatable {
    let id: String
    let serviceUuid: String
    let uuid: String
    let properties: CBCharacteristicProperties
    var value: Data?
    var isNotifying: Bool = false

    var shortUuid: String {
        uuid.shortUuid
    }

    var displayName: String {
        BleUuids.characteristicName(for: uuid)
    }

    var canRead: Bool {
        properties.contains(.read)
    }

    var canWrite: Bool {
        properties.contains(.write) || properties.contains(.writeWithoutResponse)
    }

    var canNotify: Bool {
        properties.contains(.notify) || properties.contains(.indicate)
    }

    mutating func updateValue(_ newValue: Data?) -> BleCharacteristic {
        var updated = self
        updated.value = newValue
        return updated
    }

    mutating func updateNotifying(_ notifying: Bool) -> BleCharacteristic {
        var updated = self
        updated.isNotifying = notifying
        return updated
    }
}

// MARK: - BLE UUIDs

/// BLE UUID 常量
struct BleUuids {
    // 通用服务 UUID
    static let serviceGenericAccess = CBUUID(string: "1800")
    static let serviceGenericAttribute = CBUUID(string: "1801")
    static let serviceDeviceInformation = CBUUID(string: "180A")
    static let serviceBattery = CBUUID(string: "180F")
    static let serviceHID = CBUUID(string: "1812")

    // 通用特征值 UUID
    static let charDeviceName = CBUUID(string: "2A00")
    static let charAppearance = CBUUID(string: "2A01")
    static let charManufacturerName = CBUUID(string: "2A29")
    static let charModelNumber = CBUUID(string: "2A24")
    static let charSerialNumber = CBUUID(string: "2A25")
    static let charHardwareRevision = CBUUID(string: "2A27")
    static let charFirmwareRevision = CBUUID(string: "2A26")
    static let charSoftwareRevision = CBUUID(string: "2A28")
    static let charBatteryLevel = CBUUID(string: "2A19")

    private static let serviceNames: [String: String] = [
        "1800": "Generic Access",
        "1801": "Generic Attribute",
        "180A": "Device Information",
        "180F": "Battery Service",
        "1812": "HID",
    ]

    private static let characteristicNames: [String: String] = [
        "2A00": "Device Name",
        "2A01": "Appearance",
        "2A29": "Manufacturer Name",
        "2A24": "Model Number",
        "2A25": "Serial Number",
        "2A27": "Hardware Revision",
        "2A26": "Firmware Revision",
        "2A28": "Software Revision",
        "2A19": "Battery Level",
    ]

    static func serviceName(for uuid: String) -> String {
        let short = uuid.shortUuid
        return serviceNames[short] ?? "Unknown Service"
    }

    static func characteristicName(for uuid: String) -> String {
        let short = uuid.shortUuid
        return characteristicNames[short] ?? "Unknown Characteristic"
    }
}

// MARK: - UUID Extension

extension String {
    var shortUuid: String {
        if count == 36 {
            let index = index(startIndex, offsetBy: 4)
            let endIndex = index(index, offsetBy: 4)
            return String(self[index..<endIndex])
        }
        return self
    }
}

extension Data {
    var hexadecimal: String {
        return map { String(format: "%02X", $0) }.joined(separator: " ")
    }
}

extension String {
    var hexadecimalData: Data? {
        let clean = replacingOccurrences(of: " ", with: "")
        guard clean.count % 2 == 0 else { return nil }
        var data = Data()
        var index = clean.startIndex
        while index < clean.endIndex {
            let nextIndex = clean.index(index, offsetBy: 2)
            let byteString = String(clean[index..<nextIndex])
            guard let byte = UInt8(byteString, radix: 16) else { return nil }
            data.append(byte)
            index = nextIndex
        }
        return data
    }
}

// MARK: - Color (for previews)

enum Color {
    case green, orange, red, blue, gray
}

// MARK: - Scan Result

/// 扫描结果
struct ScanResult {
    let device: BleDevice
    let timestamp: Date
}
