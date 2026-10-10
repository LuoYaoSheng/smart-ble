//
// SmartBLE - 息屏后台 BLE 存活自测（launch argument: --ble-bg-selftest）
//
// 目标：验证 iPhone 锁屏（息屏）后，App 依托 Info.plist 的
// UIBackgroundModes=bluetooth-central 是否仍能 (a) 收到设备 notify (b) 向设备发起写。
//
// 链路设计：自动扫描/连接/订阅 ESP32 夹具 SVC-01 的 StatusNotify；每收到一条
// notify 就回写 {"cmd":"led","value":"on/off"} 到 Control。Mac 侧 native-probe
// --mode echo-trigger 周期写 FF01 触发，观察 "command":"led" 回声——证据闭环
// 全部落在 Mac 日志，不依赖锁屏期间的手机端取证。
//
// 自激防护：固件会把写响应 notify 给所有 StatusNotify 订阅者（含本机），因此
// command=="led" 的响应直接跳过，并叠加 >=1.2s 节流，避免自己触发自己形成回声风暴。
//

import Foundation
import CoreBluetooth

@MainActor
enum BackgroundSelfTest {
    static let launchArgument = "--ble-bg-selftest"
    static let isEnabled = ProcessInfo.processInfo.arguments.contains(launchArgument)

    /// 夹具 SVC-01（扫描按此服务过滤，广播名兜底 BLEToolkit-Server）
    static let fixtureServiceUUID = "4FAFC201-1FB5-459E-8FCC-C5C9C331914B"

    static func isFixtureAdvertisement(serviceUUIDs: [String], name: String) -> Bool {
        if serviceUUIDs.contains(where: { $0.uppercased().contains("4FAFC201") }) {
            return true
        }
        return name.uppercased().contains("BLETOOLKIT")
    }

    static func isControlCharacteristic(_ uuid: String) -> Bool {
        uuid.uppercased().hasSuffix("26A8")
    }

    static func isStatusNotifyCharacteristic(_ uuid: String) -> Bool {
        uuid.uppercased().hasSuffix("26A9")
    }

    /// 回声负载：on/off 交替，Mac 侧按 "command":"led" 识别为 iPhone 回声
    static func echoPayload(echoCounter: Int) -> Data {
        let value = echoCounter % 2 == 1 ? "on" : "off"
        return Data("{\"cmd\":\"led\",\"value\":\"\(value)\"}".utf8)
    }

    /// 自激防护：command=="led" 的 notify 是本机（或对端 app）的回声响应，跳过
    static func isSelfEcho(_ data: Data) -> Bool {
        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let command = obj["command"] as? String else {
            return false
        }
        return command.caseInsensitiveCompare("led") == .orderedSame
    }

    /// 在已连接外设的 SVC-01 里定位 Control(26A8) 与 StatusNotify(26A9)
    static func locateFixtureCharacteristics(in peripheral: CBPeripheral)
        -> (serviceUUID: String, control: CBCharacteristic, statusNotify: CBCharacteristic)? {
        for service in peripheral.services ?? []
        where service.uuid.uuidString.uppercased().contains("4FAFC201") {
            var control: CBCharacteristic?
            var statusNotify: CBCharacteristic?
            for c in service.characteristics ?? [] {
                let u = c.uuid.uuidString
                if isControlCharacteristic(u) { control = c }
                if isStatusNotifyCharacteristic(u) { statusNotify = c }
            }
            if let control, let statusNotify {
                return (service.uuid.uuidString, control, statusNotify)
            }
        }
        return nil
    }

    // MARK: - 文件日志（Documents/bg-selftest.log）
    // 锁屏期间手机端无取证通道；devicectl 可在锁屏态经 USB 直接拉取本文件。
    static func appendLog(_ line: String) {
        let df = DateFormatter()
        df.dateFormat = "HH:mm:ss.SSS"
        let text = "\(df.string(from: Date())) \(line)\n"
        let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("bg-selftest.log")
        if let handle = try? FileHandle(forWritingTo: url) {
            defer { try? handle.close() }
            handle.seekToEndOfFile()
            handle.write(Data(text.utf8))
        } else {
            try? Data(text.utf8).write(to: url)
        }
    }
}
