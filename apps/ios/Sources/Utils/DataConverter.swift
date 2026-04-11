//
// SmartBLE - Data Converter
//

import Foundation

enum DataFormat {
    case utf8
    case hex
    case base64
}

class DataConverter {
    
    /// 字节数据转十六进制字符串
    static func bytesToHex(_ data: Data, separator: Bool = true) -> String {
        let hex = data.map { String(format: "%02X", $0) }
        return hex.joined(separator: separator ? " " : "")
    }

    /// 十六进制字符串转字节数据
    static func hexToBytes(_ hex: String) -> Data {
        let clean = hex.replacingOccurrences(of: "[^0-9A-Fa-f]", with: "", options: .regularExpression)
        var data = Data()
        var startIndex = clean.startIndex
        while startIndex < clean.endIndex {
            let endIndex = clean.index(startIndex, offsetBy: 2, limitedBy: clean.endIndex) ?? clean.endIndex
            if let byte = UInt8(clean[startIndex..<endIndex], radix: 16) {
                data.append(byte)
            }
            startIndex = endIndex
        }
        return data
    }
    
    /// 字节数据转 UTF-8 字符串
    static func bytesToString(_ data: Data) -> String {
        return String(data: data, encoding: .utf8) ?? bytesToHex(data)
    }
    
    /// 字符串转字节数据
    static func stringToBytes(_ str: String) -> Data {
        return str.data(using: .utf8) ?? Data()
    }
    
    /// 验证是否是合法的十六进制输入
    static func isValidHex(_ hex: String) -> Bool {
        let clean = hex.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: " ", with: "")
        if clean.isEmpty || clean.count % 2 != 0 { return false }
        let regex = try? NSRegularExpression(pattern: "^[0-9A-Fa-f]+$")
        let range = NSRange(location: 0, length: clean.utf16.count)
        return regex?.firstMatch(in: clean, options: [], range: range) != nil
    }
}
