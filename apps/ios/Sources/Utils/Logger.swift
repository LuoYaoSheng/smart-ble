//
// SmartBLE - Logger
//

import Foundation
import Combine

@MainActor
class Logger: ObservableObject {
    static let shared = Logger()
    
    @Published var logs: [LogEntry] = []
    
    /// T05: Per-device 日志（deviceId -> [LogEntry]）
    @Published var logsByDevice: [String: [LogEntry]] = [:]

    private let maxHistorySize = 1000
    
    private init() {}

    /// 全局系统日志
    func log(_ message: String, type: LogEntry.LogType = .info) {
        let entry = LogEntry(message: message, type: type)
        logs.append(entry)
        if logs.count > maxHistorySize {
            logs.removeFirst()
        }
        print("[BLE] [\(type.rawValue)] \(message)")
    }

    /// 特指某个设备的通信日志
    func logForDevice(_ deviceId: String, _ message: String, type: LogEntry.LogType = .info) {
        let entry = LogEntry(message: message, type: type)
        if logsByDevice[deviceId] == nil {
            logsByDevice[deviceId] = []
        }
        logsByDevice[deviceId]!.insert(entry, at: 0)
        if logsByDevice[deviceId]!.count > maxHistorySize {
            logsByDevice[deviceId]!.removeLast()
        }
        
        // 同时同步至全局流
        log("[\(deviceId)] \(message)", type: type)
    }
    
    // MARK: - Convenience Methods
    func info(_ message: String, deviceId: String? = nil) {
        deviceId == nil ? log(message, type: .info) : logForDevice(deviceId!, message, type: .info)
    }
    func success(_ message: String, deviceId: String? = nil) {
        deviceId == nil ? log(message, type: .success) : logForDevice(deviceId!, message, type: .success)
    }
    func error(_ message: String, deviceId: String? = nil) {
        deviceId == nil ? log(message, type: .error) : logForDevice(deviceId!, message, type: .error)
    }
    func warning(_ message: String, deviceId: String? = nil) {
        deviceId == nil ? log(message, type: .warning) : logForDevice(deviceId!, message, type: .warning)
    }
    func receive(_ message: String, deviceId: String) {
        logForDevice(deviceId, message, type: .receive)
    }
    func send(_ message: String, deviceId: String) {
        logForDevice(deviceId, message, type: .send)
    }

    func clear() {
        logs.removeAll()
        logsByDevice.removeAll()
    }
    
    func clearForDevice(_ deviceId: String) {
        logsByDevice[deviceId]?.removeAll()
    }
}
