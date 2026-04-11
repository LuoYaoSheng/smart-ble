//
// SmartBLE - BLE Uuids Mapping
//

import Foundation
import CoreBluetooth

struct BLEUuids {
    static let serviceGenericAccess = "00001800-0000-1000-8000-00805F9B34FB"
    static let serviceGenericAttribute = "00001801-0000-1000-8000-00805F9B34FB"
    static let serviceDeviceInformation = "0000180A-0000-1000-8000-00805F9B34FB"
    static let serviceBattery = "0000180F-0000-1000-8000-00805F9B34FB"
    static let serviceHumanInterfaceDevice = "00001812-0000-1000-8000-00805F9B34FB"
    static let serviceHeartRate = "0000180D-0000-1000-8000-00805F9B34FB"
    static let serviceHealthThermometer = "00001809-0000-1000-8000-00805F9B34FB"
    static let serviceOta = "4FAFC201-1FB5-459E-8FCC-C5C9C331914D"

    private static let serviceNames: [String: String] = [
        "1800": "通用访问",
        "1801": "通用属性",
        "180A": "设备信息",
        "180F": "电池服务",
        "1812": "人机界面(HID)",
        "180D": "心率服务",
        "1809": "健康温度计",
        "181C": "用户数据",
        "4FAFC201": "OTA 升级服务"
    ]

    private static let characteristicNames: [String: String] = [
        "2A00": "设备名称",
        "2A01": "外观",
        "2A02": "隐私标志",
        "2A03": "重连地址",
        "2A04": "连接参数",
        "2A05": "服务变更",
        "2A19": "电池电量",
        "2A23": "系统标识符",
        "2A24": "型号",
        "2A25": "序列号",
        "2A26": "固件版本",
        "2A27": "硬件版本",
        "2A28": "软件版本",
        "2A29": "制造商",
        "BEB5483E": "OTA 控制"
    ]

    static func getServiceName(for uuid: CBUUID) -> String {
        let short = uuid.uuidString.uppercased()
        let shortId = short.count == 4 ? short : String(short.prefix(4))
        if let name = serviceNames[shortId] ?? serviceNames[short] {
            return name
        }
        // Handle full 128-bit custom match
        if short.hasPrefix("4FAFC201") {
            return serviceNames["4FAFC201"]!
        }
        return "未知服务"
    }

    static func getCharacteristicName(for uuid: CBUUID) -> String {
        let short = uuid.uuidString.uppercased()
        let shortId = short.count == 4 ? short : String(short.prefix(4))
        if let name = characteristicNames[shortId] ?? characteristicNames[short] {
            return name
        }
        // Handle 128-bit known characteristics location
        if short.count >= 8 {
            let start = short.index(short.startIndex, offsetBy: 4)
            let end = short.index(start, offsetBy: 4)
            let charId = String(short[start..<end])
            if let name = characteristicNames[charId] {
                return name
            }
        }
        if short.hasPrefix("BEB5") || short.hasPrefix("BEB5483E") {
            return "OTA 控制"
        }
        return "未知特征值"
    }
}
