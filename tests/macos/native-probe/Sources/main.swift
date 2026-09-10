// native-probe — CoreBluetooth capability probe for the Smart BLE macOS spike.
//
// Modes (first CLI argument):
//   env       report central + peripheral manager state transitions, then exit
//   scan      scan for --duration seconds (default 12), dedup devices, log RSSI,
//             optionally flag --expect-uuid when that service UUID is advertised
//   advertise run a GATT server (read/write/notify characteristics under --uuid,
//             default 0000FD6A-...) and advertise as --name (default SmartBLE-Native)
//             for --duration seconds (default 20)
//   connect   scan for --uuid, connect, discover services/characteristics,
//             read once, collect 2 notifications, write once, disconnect
//   ota       对 LightBLE 夹具走十步 OTA 正典（contracts/target/ble-fixture-target.json）：
//             发现 4FAFC201 广播 → 连接 → system_info 读回 → manifest 六项预检 →
//             订阅 OTA STATUS → CTRL start → DATA 分包(无响应·按序) → CTRL commit →
//             等 success/rebooting → 重连读回 firmware_version 与 target 比对
//             （--ota-file 固件包 · --ota-manifest 清单 · 端到端结论仍受 P-03 约束）
//
// All output lines are structured: [PROBE] key=value ...
// Exit code 0 = expected milestones reached; non-zero = failure/timeout.

import CoreBluetooth
import CryptoKit
import Foundation

setbuf(stdout, nil)

func log(_ line: String) {
    let ts = Date().timeIntervalSince1970
    print("[PROBE] t=\(String(format: "%.3f", ts)) \(line)")
}

func fail(_ reason: String) -> Never {
    log("RESULT=FAIL reason=\(reason)")
    exit(1)
}

// ---- argument parsing -------------------------------------------------------

var args = Array(CommandLine.arguments.dropFirst())
var mode = "env"
var duration: Double = 12
var localName = "SmartBLE-Native"
var serviceUUIDString = "0000FD6A-7263-4F1E-A1C2-8F5D3B2A1001"
var expectUUIDString = ""
var noWrite = false
var writeHex = ""   // 自定义写入负载（hex），空则用默认 ping 负载
var triggerInterval = 8.0   // echo-trigger 模式：触发间隔秒
var deviceUUIDString = ""   // echo-trigger 模式：已知外设 UUID（夹具被连停广播时免扫描直连）
var otaFilePath = ""
var otaManifestPath = ""

func nextArg(_ label: String) -> String {
    guard !args.isEmpty else { fail("missing \(label) value") }
    return args.removeFirst()
}

while !args.isEmpty {
    let a = args.removeFirst()
    switch a {
    case "--mode": mode = nextArg("--mode")
    case "--duration": duration = Double(nextArg("--duration")) ?? 12
    case "--name": localName = nextArg("--name")
    case "--uuid": serviceUUIDString = nextArg("--uuid")
    case "--expect-uuid": expectUUIDString = nextArg("--expect-uuid")
    case "--no-write": noWrite = true
    case "--write-hex": writeHex = nextArg("--write-hex")
    case "--interval": triggerInterval = Double(nextArg("--interval")) ?? 8
    case "--device-uuid": deviceUUIDString = nextArg("--device-uuid")
    case "--ota-file": otaFilePath = nextArg("--ota-file")
    case "--ota-manifest": otaManifestPath = nextArg("--ota-manifest")
    default: fail("unknown argument \(a)")
    }
}
log("MODE=\(mode) DURATION=\(duration) NAME=\(localName) UUID=\(serviceUUIDString)")

// ---- probe ------------------------------------------------------------------

final class Probe: NSObject, CBCentralManagerDelegate, CBPeripheralManagerDelegate, CBPeripheralDelegate {
    var central: CBCentralManager!
    var peripheralManager: CBPeripheralManager!

    // scan state
    var seen = [UUID: (name: String, rssi: Int, updates: Int)]()
    var advServices = [UUID: [String]]()
    var expectedSeen = false

    // connect state
    var targetService: CBUUID!
    var pendingPeripheral: CBPeripheral?
    var readCharacteristic: CBCharacteristic?
    var notifyCharacteristic: CBCharacteristic?
    var writeCharacteristic: CBCharacteristic?
    var notificationsReceived = 0
    var wroteDone = false
    var nowriteKick = false
    var readDone = false
    var discoveredDone = false
    var notifySubscribed = false

    // peripheral/GATT-server state
    var advertisedService: CBMutableService!
    var gattRead: CBMutableCharacteristic!
    var gattWrite: CBMutableCharacteristic!
    var gattNotify: CBMutableCharacteristic!
    var notifySubscribers = [UUID: CBCentral]()
    var notifyCounter = 0
    var notifyTimer: Timer?

    // ota state（十步正典 · P-03：相位全部可测可记录，端到端结论不越权）
    var otaFile = Data()
    var otaManifest: [String: Any] = [:]
    var otaFileSha = ""
    var sysInfoChar: CBCharacteristic?      // SVC-01 Control（读 system_info）
    var otaCtrl: CBCharacteristic?          // SVC-03 26C0
    var otaDataChar: CBCharacteristic?      // SVC-03 26C1
    var otaStatusChar: CBCharacteristic?    // SVC-03 26C2
    var otaPhase = "scan"                   // scan→connect→discover→checks→subscribed→starting→receiving→committing→reboot→verify→done
    var otaMaxChunk = 180
    var otaSentBytes = 0
    var otaLastLoggedPct = -1
    var otaVersionBefore = "?"
    var otaTargetVersion = "?"
    var otaChecksDone = false
    var otaStatusSubscribed = false

    var finishAfter: (() -> Void)?

    // echo-trigger state（息屏后台回声触发器：周期写 FF01，观察 "command":"led" 回声）
    var echoPhase = "scan"        // scan→connect→discover→armed→running→done
    var echoControl: CBCharacteristic?        // SVC-01 26A8 Control
    var echoStatusNotify: CBCharacteristic?   // SVC-01 26A9 StatusNotify
    var echoTriggerTimer: Timer?
    var echoRound = 0
    var echoTriggerResponses = 0
    var echoResponses = 0         // "command":"led" = iPhone 回声（锁屏存活证明）
    var echoLastTriggerAt: Date?
    var echoEchoLatencies: [Double] = []
    var echoRoundsWithEcho = Set<Int>()
    var echoGraceEcho = 0         // 订阅标记等触发前回声

    // MARK: lifecycle

    func run() {
        switch mode {
        case "env":
            central = CBCentralManager(delegate: self, queue: nil)
            peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
            // delegates report state; exit after both poweredOn or timeout
            DispatchQueue.main.asyncAfter(deadline: .now() + 8) {
                log("RESULT=ENV_DONE central_state=\(self.central.state.rawValue) peripheral_state=\(self.peripheralManager.state.rawValue)")
                exit(0)
            }
        case "scan":
            central = CBCentralManager(delegate: self, queue: nil)
        case "advertise":
            peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
        case "connect":
            targetService = CBUUID(string: serviceUUIDString)
            central = CBCentralManager(delegate: self, queue: nil)
        case "echo-trigger":
            targetService = CBUUID(string: serviceUUIDString)
            central = CBCentralManager(delegate: self, queue: nil)
            // 全程看门狗：duration + 30s（连接+发现余量）
            DispatchQueue.main.asyncAfter(deadline: .now() + duration + 30) {
                if self.echoPhase != "done" { fail("echo-trigger watchdog timeout phase=\(self.echoPhase)") }
            }
        case "ota":
            targetService = CBUUID(string: serviceUUIDString)
            guard !otaFilePath.isEmpty, !otaManifestPath.isEmpty else {
                fail("ota mode requires --ota-file and --ota-manifest")
            }
            otaFile = (try? Data(contentsOf: URL(fileURLWithPath: otaFilePath))) ?? Data()
            guard !otaFile.isEmpty else { fail("ota file unreadable/empty: \(otaFilePath)") }
            otaFileSha = SHA256.hash(data: otaFile).map { String(format: "%02x", $0) }.joined()
            guard let m = (try? JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: otaManifestPath)))) as? [String: Any] else {
                fail("ota manifest unreadable: \(otaManifestPath)")
            }
            otaManifest = m
            otaTargetVersion = (m["firmware_version"] as? String) ?? "?"
            central = CBCentralManager(delegate: self, queue: nil)
            // 全链看门狗：默认 240s
            DispatchQueue.main.asyncAfter(deadline: .now() + max(duration, 240)) {
                if self.otaPhase != "done" { fail("ota flow watchdog timeout phase=\(self.otaPhase) sent=\(self.otaSentBytes)/\(self.otaFile.count)") }
            }
        default:
            fail("unknown mode \(mode)")
        }
        RunLoop.main.run()
    }

    // MARK: CBCentralManagerDelegate

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        log("CENTRAL_STATE=\(central.state.rawValue)")
        guard central.state == .poweredOn else { return }
        switch mode {
        case "scan":
            log("EVENT=scan_start")
            central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
            DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                log("EVENT=scan_stop unique_devices=\(self.seen.count) total_updates=\(self.seen.values.reduce(0) { $0 + $1.updates }) expected_uuid_seen=\(self.expectedSeen)")
                central.stopScan()
                for (id, info) in self.seen.sorted(by: { $0.value.rssi > $1.value.rssi }) {
                    let uuids = self.advServices[id]?.joined(separator: ",") ?? "-"
                    log("DEVICE=\(id.uuidString) name=\(info.name.isEmpty ? "(none)" : info.name.replacingOccurrences(of: " ", with: "_")) rssi=\(info.rssi) updates=\(info.updates) uuids=\(uuids)")
                }
                log("RESULT=PASS")
                exit(0)
            }
        case "connect":
            log("EVENT=scan_start_filtered service=\(targetService.uuidString)")
            central.scanForPeripherals(withServices: [targetService], options: nil)
            DispatchQueue.main.asyncAfter(deadline: .now() + max(duration, 15)) {
                if self.pendingPeripheral == nil {
                    fail("target not discovered within timeout")
                }
                fail("connect flow did not complete within timeout")
            }
        case "echo-trigger":
            if !deviceUUIDString.isEmpty {
                // 夹具已被 iPhone 连接（停广播）→ 免扫描直连
                guard let known = UUID(uuidString: deviceUUIDString) else {
                    fail("invalid --device-uuid \(deviceUUIDString)")
                }
                let retrieved = central.retrievePeripherals(withIdentifiers: [known])
                guard let peripheral = retrieved.first else {
                    fail("retrievePeripherals returned nothing for \(deviceUUIDString)")
                }
                pendingPeripheral = peripheral
                peripheral.delegate = self
                log("EVENT=echo_retrieve_connect id=\(peripheral.identifier.uuidString) interval=\(triggerInterval)s duration=\(duration)s")
                central.connect(peripheral, options: nil)
                DispatchQueue.main.asyncAfter(deadline: .now() + 15) {
                    if self.pendingPeripheral?.state != .connected && self.echoPhase == "scan" {
                        fail("echo-trigger direct connect timeout")
                    }
                }
            } else {
                log("EVENT=echo_trigger_scan_start service=\(targetService.uuidString) interval=\(triggerInterval)s duration=\(duration)s")
                central.scanForPeripherals(withServices: [targetService], options: nil)
                DispatchQueue.main.asyncAfter(deadline: .now() + 20) {
                    if self.pendingPeripheral == nil {
                        fail("echo-trigger target not discovered within 20s")
                    }
                }
            }
        case "ota":
            log("EVENT=ota_scan_start service=\(targetService.uuidString) file_bytes=\(otaFile.count) target_version=\(otaTargetVersion) sha256=\(String(otaFileSha.prefix(12)))…")
            central.scanForPeripherals(withServices: [targetService], options: nil)
            DispatchQueue.main.asyncAfter(deadline: .now() + max(duration, 20)) {
                if self.pendingPeripheral == nil {
                    fail("ota target not discovered within timeout")
                }
            }
        default:
            break
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                        advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = (advertisementData[CBAdvertisementDataLocalNameKey] as? String) ?? peripheral.name ?? ""
        let isUpdate = seen[peripheral.identifier] != nil
        if let prev = seen[peripheral.identifier] {
            seen[peripheral.identifier] = (name.isEmpty ? prev.name : name, RSSI.intValue, prev.updates + 1)
        } else {
            seen[peripheral.identifier] = (name, RSSI.intValue, 1)
        }
        if !isUpdate {
            log("DISCOVERED=\(peripheral.identifier.uuidString) name=\(name.isEmpty ? "(none)" : name.replacingOccurrences(of: " ", with: "_")) rssi=\(RSSI.intValue)")
        }
        let services = (advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID]) ?? []
        if !services.isEmpty {
            let list = services.map { $0.uuidString }
            advServices[peripheral.identifier] = (advServices[peripheral.identifier] ?? []) + list.filter { !(advServices[peripheral.identifier] ?? []).contains($0) }
        }
        for s in services where s.uuidString.lowercased() == expectUUIDString.lowercased() {
            expectedSeen = true
        }
        if mode == "connect" || mode == "ota" || mode == "echo-trigger", services.contains(where: { $0 == targetService }), pendingPeripheral == nil {
            pendingPeripheral = peripheral
            peripheral.delegate = self
            log("EVENT=connect_to name=\(name.isEmpty ? "(none)" : name.replacingOccurrences(of: " ", with: "_")) id=\(peripheral.identifier.uuidString)")
            central.stopScan()
            central.connect(peripheral, options: nil)
            DispatchQueue.main.asyncAfter(deadline: .now() + 8) {
                if self.pendingPeripheral?.state != .connected {
                    fail("connect timeout")
                }
            }
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        log("EVENT=connected id=\(peripheral.identifier.uuidString)")
        if mode == "ota" {
            otaPhase = "discover"
            peripheral.discoverServices(nil)
            return
        }
        if mode == "echo-trigger" {
            echoPhase = "discover"
            peripheral.discoverServices(nil)
            return
        }
        peripheral.discoverServices([targetService])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        fail("connect failed err=\(error.map { "\($0)" } ?? "nil")")
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        if mode == "echo-trigger" {
            log("EVENT=echo_disconnected_unexpected round=\(echoRound) err=\(error.map { "\($0)" } ?? "nil")")
            log("SUMMARY_DISCONNECTED rounds=\(echoRound) trigger_responses=\(echoTriggerResponses) echo_responses=\(echoResponses)")
            fail("echo-trigger: fixture link dropped mid-run")
        }
        if mode == "ota" {
            // commit success 后设备 1.5s 内主动重启断链 = 正典第 7 步
            if otaPhase == "reboot" {
                log("EVENT=ota_reboot_disconnect（预期 · 设备重启）")
                pendingPeripheral = nil
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                    log("EVENT=ota_rescan_for_rebooted")
                    self.central.scanForPeripherals(withServices: [self.targetService], options: nil)
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 40) {
                    if self.otaPhase == "reboot" { fail("rebooted fixture not back within 40s") }
                }
                return
            }
            fail("ota disconnected unexpectedly phase=\(otaPhase) err=\(error.map { "\($0)" } ?? "nil")")
        }
        if noWrite {
            // 环境设备探测：发现 + 读 即达标；通知为加分项（计数入日志）
            if readDone && discoveredDone {
                log("EVENT=disconnected_clean nowrite=1 notifications=\(notificationsReceived)")
                log("RESULT=PASS")
                exit(0)
            }
            fail("disconnected before discovery/read completed err=\(error.map { "\($0)" } ?? "nil")")
        }
        if wroteDone && readDone && notificationsReceived >= 2 && discoveredDone {
            log("EVENT=disconnected_clean")
            log("RESULT=PASS")
            exit(0)
        }
        fail("disconnected before flow completed err=\(error.map { "\($0)" } ?? "nil")")
    }

    // MARK: CBPeripheralDelegate (client side of connect flow)

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard error == nil else {
            fail("service discovery failed err=\(error.map { "\($0)" } ?? "nil")")
        }
        if mode == "ota" {
            let wanted = peripheral.services ?? []
            log("EVENT=services_discovered count=\(wanted.count) uuids=\(wanted.map { $0.uuid.uuidString }.joined(separator: ","))")
            for svc in wanted {
                peripheral.discoverCharacteristics(nil, for: svc)
            }
            return
        }
        if mode == "echo-trigger" {
            let wanted = peripheral.services ?? []
            log("EVENT=echo_services_discovered count=\(wanted.count) uuids=\(wanted.map { $0.uuid.uuidString }.joined(separator: ","))")
            for svc in wanted {
                peripheral.discoverCharacteristics(nil, for: svc)
            }
            return
        }
        guard let svc = peripheral.services?.first else {
            fail("service discovery returned no service")
        }
        log("EVENT=service_discovered uuid=\(svc.uuid.uuidString)")
        peripheral.discoverCharacteristics(nil, for: svc)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard error == nil else { fail("characteristic discovery failed") }
        if mode == "ota" {
            for c in service.characteristics ?? [] {
                let u = c.uuid.uuidString.uppercased()
                log("OTA_CHAR=\(u) svc=\(service.uuid.uuidString.suffix(4)) props=\(c.properties.rawValue)")
                if u.hasSuffix("26A8") { sysInfoChar = c }
                if u.hasSuffix("26C0") { otaCtrl = c }
                if u.hasSuffix("26C1") { otaDataChar = c }
                if u.hasSuffix("26C2") { otaStatusChar = c }
            }
            // 特征齐全即开链：读 system_info（第 0 步包预检依据）+ 订阅 STATUS（正典第 1 步）
            if sysInfoChar != nil, otaCtrl != nil, otaDataChar != nil, otaStatusChar != nil, otaPhase == "discover" || otaPhase == "reboot" {
                if otaPhase == "reboot" {
                    // 重启后重连：正典第 8 步 → 第 9 步读 firmware_version
                    otaPhase = "verify"
                    log("EVENT=ota_reconnected（正典第 8 步 · 重启后重连成功）")
                    peripheral.readValue(for: sysInfoChar!)
                    return
                }
                otaPhase = "checks"
                let mtu = peripheral.maximumWriteValueLength(for: .withoutResponse)
                log("EVENT=ota_chars_ready mtu_write_limit=\(mtu)")
                peripheral.readValue(for: sysInfoChar!)
                peripheral.setNotifyValue(true, for: otaStatusChar!)
            }
            return
        }
        if mode == "echo-trigger" {
            for c in service.characteristics ?? [] {
                let u = c.uuid.uuidString.uppercased()
                if u.hasSuffix("26A8") { echoControl = c }
                if u.hasSuffix("26A9") { echoStatusNotify = c }
            }
            if echoControl != nil, echoStatusNotify != nil, echoPhase == "discover" {
                echoPhase = "armed"
                log("EVENT=echo_chars_ready control=…26A8 status_notify=…26A9")
                // 订阅 StatusNotify：与 iPhone 同一视角（设备 notify 广播给所有订阅者）
                peripheral.setNotifyValue(true, for: echoStatusNotify!)
                // 读一次 Control（system_info 存活快照）
                peripheral.readValue(for: echoControl!)
            }
            return
        }
        discoveredDone = true
        for c in service.characteristics ?? [] {
            log("CHAR=\(c.uuid.uuidString) props=\(c.properties.rawValue)")
            if c.properties.contains(.read) { readCharacteristic = c }
            if c.properties.contains(.notify) { notifyCharacteristic = c }
            if c.properties.contains(.write) || c.properties.contains(.writeWithoutResponse) { writeCharacteristic = c }
        }
        log("EVENT=characteristics_discovered count=\(service.characteristics?.count ?? 0)")
        if let r = readCharacteristic { peripheral.readValue(for: r) }
        if let n = notifyCharacteristic {
            peripheral.setNotifyValue(true, for: n)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard error == nil else {
            if mode == "ota" { fail("ota read/notify failed char=\(characteristic.uuid.uuidString.suffix(4)) err=\(error.map { "\($0)" } ?? "nil")") }
            fail("read/notify failed")
        }
        let data = characteristic.value ?? Data()
        if mode == "ota" {
            handleOtaValue(peripheral, characteristic, data)
            return
        }
        if mode == "echo-trigger" {
            handleEchoValue(peripheral, characteristic, data)
            return
        }
        let hex = data.map { String(format: "%02x", $0) }.joined()
        if characteristic == notifyCharacteristic {
            notificationsReceived += 1
            log("NOTIFY=#\(notificationsReceived) value=\(hex)")
        } else {
            readDone = true
            log("READ=\(hex)")
        }
        maybeWrite(peripheral)
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        guard error == nil else {
            if mode == "ota" { fail("ota subscribe failed char=\(characteristic.uuid.uuidString.suffix(4)) err=\(error.map { "\($0)" } ?? "nil")") }
            if noWrite { log("NOTE=notify_subscribe_error（环境设备限制 · 如实记录）"); return }
            fail("subscribe notify failed")
        }
        if mode == "ota", characteristic == otaStatusChar {
            otaStatusSubscribed = true
            log("EVENT=ota_status_subscribed（正典第 1 步）")
            maybeSendOtaStart(peripheral)
            return
        }
        if mode == "echo-trigger", characteristic == echoStatusNotify {
            echoPhase = "running"
            log("EVENT=echo_running interval=\(triggerInterval)s duration=\(duration)s")
            scheduleEchoTrigger()
            DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                self.finishEchoRun(peripheral)
            }
            return
        }
        notifySubscribed = true
        log("EVENT=notify_subscribed char=\(characteristic.uuid.uuidString)")
        maybeWrite(peripheral)
    }

    private func maybeWrite(_ peripheral: CBPeripheral) {
        if noWrite {
            // 读完成（且通知订阅结果已知或 3s 宽限）后主动断开，不写任何字节
            if readDone, !nowriteKick {
                nowriteKick = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    if self.notificationsReceived > 0 {
                        log("NOTE=notifications_seen=\(self.notificationsReceived)")
                    } else {
                        log("NOTE=no_notification_within_grace（设备无 notify 推送 · 如实记录）")
                    }
                    log("EVENT=client_disconnect")
                    self.central.cancelPeripheralConnection(peripheral)
                }
            }
            return
        }
        if readDone, notifySubscribed, !wroteDone, let w = writeCharacteristic {
            wroteDone = true
            // --write-hex：字节级自定义写入（如夹具 LED FF00..FF03）
            let payload = writeHex.isEmpty
                ? Data("ping-from-native".utf8)
                : Data(stride(from: 0, to: writeHex.count, by: 2).compactMap {
                    UInt8(writeHex[writeHex.index(writeHex.startIndex, offsetBy: $0)..<writeHex.index(writeHex.startIndex, offsetBy: min($0 + 2, writeHex.count))], radix: 16)
                })
            guard !payload.isEmpty else { fail("--write-hex 解析为空：\(writeHex)") }
            peripheral.writeValue(payload, for: w, type: .withResponse)
            log("EVENT=write_sent bytes=\(payload.count) hex=\(payload.map { String(format: "%02x", $0) }.joined())")
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        guard error == nil else {
            if mode == "ota" { fail("ota ctrl write failed err=\(error.map { "\($0)" } ?? "nil")") }
            fail("write failed")
        }
        if mode == "ota" {
            log("EVENT=ota_ctrl_acked op=\(otaPhase)")
            return
        }
        log("EVENT=write_acked char=\(characteristic.uuid.uuidString)")
        // wait for 2 notifications then disconnect
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            if self.notificationsReceived >= 2 {
                log("EVENT=client_disconnect")
                self.central.cancelPeripheralConnection(peripheral)
            } else {
                fail("expected 2 notifications, got \(self.notificationsReceived)")
            }
        }
    }

    // MARK: OTA 十步正典（probe 侧驱动）

    private func maybeSendOtaStart(_ peripheral: CBPeripheral) {
        guard otaChecksDone, otaStatusSubscribed, otaPhase == "checks" else { return }
        otaPhase = "starting"
        var start: [String: Any] = [
            "op": "start",
            "size": otaFile.count,
            "chunk_size": 180,
            "target_version": otaTargetVersion,
            "sha256": otaFileSha,
        ]
        start["target"] = (otaManifest["target"] as? String) ?? "lightble-peripheral"
        let json = (try? JSONSerialization.data(withJSONObject: start)) ?? Data()
        log("EVENT=ota_start_sent（正典第 2 步）json=\(String(data: json, encoding: .utf8) ?? "?")")
        peripheral.writeValue(json, for: otaCtrl!, type: .withResponse)
    }

    private func handleOtaValue(_ peripheral: CBPeripheral, _ characteristic: CBCharacteristic, _ data: Data) {
        let text = String(data: data, encoding: .utf8) ?? data.map { String(format: "%02x", $0) }.joined()
        guard let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            log("OTA_VALUE(raw) char=\(characteristic.uuid.uuidString.suffix(4)) text=\(text)")
            return
        }
        if characteristic == sysInfoChar {
            if otaPhase == "verify" {
                // 正典第 9/10 步：重连后读 firmware_version 与 target_version 比对
                let after = (obj["firmware_version"] as? String) ?? "?"
                let match = after == otaTargetVersion
                otaPhase = "done"
                peripheral.setNotifyValue(false, for: otaStatusChar!)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                    self.central.cancelPeripheralConnection(peripheral)
                    log("OTA_RESULT=version_before=\(self.otaVersionBefore) version_after=\(after) target=\(self.otaTargetVersion) match=\(match)")
                    log("NOTE=十步正典全部走通（真无线电 · 真包 · 真重启）；端到端成功宣称仍受 P-03/F025 约束")
                    log(match ? "RESULT=PASS" : "RESULT=FAIL reason=version_readback_mismatch")
                    exit(match ? 0 : 1)
                }
                return
            }
            // 第 0 步：包预检（manifest 六项 vs 设备 system_info/文件实测）
            otaVersionBefore = (obj["firmware_version"] as? String) ?? "?"
            let hardware = (obj["hardware"] as? String) ?? "?"
            let mTarget = (otaManifest["target"] as? String) ?? ""
            let mHardware = (otaManifest["hardware"] as? String) ?? ""
            let mSize = (otaManifest["size"] as? Int) ?? -1
            let mSha = (otaManifest["sha256"] as? String) ?? ""
            var problems = [String]()
            if mTarget != "lightble-peripheral" && mTarget != "lightble-observer" { problems.append("target_invalid(\(mTarget))") }
            if mHardware != hardware { problems.append("hardware_mismatch(manifest=\(mHardware) device=\(hardware))") }
            if mSize != otaFile.count { problems.append("size_mismatch(manifest=\(mSize) file=\(otaFile.count))") }
            if mSha.lowercased() != otaFileSha { problems.append("sha_mismatch") }
            if otaTargetVersion.isEmpty || otaTargetVersion == "?" { problems.append("missing_firmware_version") }
            log("OTA_PRECHECK version_before=\(otaVersionBefore) device_hardware=\(hardware) manifest=\(mTarget)/\(mHardware)/\(mSize)/\(String(mSha.prefix(12)))… problems=\(problems.isEmpty ? "none" : problems.joined(separator: ";"))")
            guard problems.isEmpty else { fail("ota package pre-check failed（第 0 步 · ERR-OTA-09..13 域）") }
            otaChecksDone = true
            maybeSendOtaStart(peripheral)
            return
        }
        if characteristic == otaStatusChar {
            let status = (obj["status"] as? String) ?? "?"
            let pct = (obj["percent"] as? Int) ?? -1
            log("OTA_STATUS status=\(status) received=\(obj["received"] ?? 0) total=\(obj["total"] ?? 0) percent=\(pct) code=\(obj["code"] ?? "-") detail=\(obj["detail"] ?? "-") rebooting=\(obj["rebooting"] ?? false)")
            switch status {
            case "ready":
                let deviceMax = (obj["max_chunk"] as? Int) ?? 180
                let mtuLimit = peripheral.maximumWriteValueLength(for: .withoutResponse)
                otaMaxChunk = min(deviceMax, mtuLimit)
                otaPhase = "receiving"
                log("EVENT=ota_ready（正典第 3 步）max_chunk_device=\(deviceMax) mtu_limit=\(mtuLimit) effective=\(otaMaxChunk)")
                pumpOtaChunks(peripheral)
            case "progress":
                break
            case "error":
                fail("ota device error code=\(obj["code"] ?? "?") detail=\(obj["detail"] ?? "?") phase=\(otaPhase)")
            case "success":
                guard otaPhase == "committing" || otaPhase == "receiving" else { return }
                otaPhase = "reboot"
                log("EVENT=ota_commit_success（正典第 6 步 · 设备即将重启）")
            default:
                break
            }
            return
        }
        log("OTA_VALUE(?) char=\(characteristic.uuid.uuidString.suffix(4)) text=\(text)")
    }

    private func pumpOtaChunks(_ peripheral: CBPeripheral) {
        guard otaPhase == "receiving", let dataChar = otaDataChar else { return }
        while otaSentBytes < otaFile.count {
            guard peripheral.canSendWriteWithoutResponse else { return } // 等 peripheralIsReady 续传
            let len = min(otaMaxChunk, otaFile.count - otaSentBytes)
            let chunk = otaFile.subdata(in: otaSentBytes..<otaSentBytes + len)
            peripheral.writeValue(chunk, for: dataChar, type: .withoutResponse)
            otaSentBytes += len
            let pct = otaFile.count == 0 ? 100 : otaSentBytes * 100 / otaFile.count
            if pct / 10 > otaLastLoggedPct / 10 || otaSentBytes == otaFile.count {
                otaLastLoggedPct = pct
                log("EVENT=ota_progress percent=\(pct) bytes=\(otaSentBytes)/\(otaFile.count)")
            }
        }
        // 全部到达（正典第 4 步完成）→ 第 5 步 commit
        otaPhase = "committing"
        log("EVENT=ota_all_data_sent bytes=\(otaFile.count)（正典第 4 步完成 · 严格按序）")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            let commit = #"{"op":"commit"}"#.data(using: .utf8)!
            log("EVENT=ota_commit_sent（正典第 5 步）")
            peripheral.writeValue(commit, for: self.otaCtrl!, type: .withResponse)
        }
    }

    func peripheralIsReady(toWriteSubscribers peripheral: CBPeripheral) {
        if mode == "ota" { pumpOtaChunks(peripheral) }
    }

    // MARK: echo-trigger helpers（息屏后台回声链：Mac 触发 → 设备 notify → iPhone 回写 → 设备 notify → Mac 观察回声）

    private func handleEchoValue(_ peripheral: CBPeripheral, _ characteristic: CBCharacteristic, _ data: Data) {
        // Control 上只发生读值（system_info）；写响应一律经 StatusNotify notify 到达
        if characteristic == echoControl {
            log("ECHO_SYSINFO=\(String(bytes: data, encoding: .utf8) ?? data.map { String(format: "%02x", $0) }.joined())")
            return
        }
        guard characteristic == echoStatusNotify else { return }
        guard let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let command = obj["command"] as? String else {
            let text = String(bytes: data, encoding: .utf8) ?? data.map { String(format: "%02x", $0) }.joined()
            log("NOTIFY_OTHER char=…\(characteristic.uuid.uuidString.suffix(4)) text=\(text.prefix(60))")
            return
        }
        if command.uppercased().hasPrefix("FF") {
            echoTriggerResponses += 1
            log("TRIGGER_RESPONSE command=\(command) round=\(echoRound) led_state=\(obj["led_state"] ?? "-")")
        } else {
            // "command":"led" = iPhone 回写产生的响应（锁屏存活直接证据）
            echoResponses += 1
            if let trigger = echoLastTriggerAt {
                let rtt = Date().timeIntervalSince(trigger)
                echoEchoLatencies.append(rtt)
                if echoRound > 0 { echoRoundsWithEcho.insert(echoRound) }
                log("ECHO_RESPONSE command=\(command) led_state=\(obj["led_state"] ?? "-") round=\(echoRound) rtt_since_trigger=\(String(format: "%.2f", rtt))s count=\(echoResponses)")
            } else {
                echoGraceEcho += 1
                log("ECHO_RESPONSE command=\(command) led_state=\(obj["led_state"] ?? "-") round=pre（订阅标记触发）count=\(echoResponses)")
            }
        }
    }

    private func scheduleEchoTrigger() {
        guard echoPhase == "running", let peripheral = pendingPeripheral, let control = echoControl else { return }
        echoRound += 1
        echoLastTriggerAt = Date()
        log("TRIGGER_ROUND=\(echoRound) write=FF01")
        peripheral.writeValue(Data([0xFF, 0x01]), for: control, type: .withResponse)
        echoTriggerTimer = Timer.scheduledTimer(withTimeInterval: triggerInterval, repeats: false) { [weak self] _ in
            self?.scheduleEchoTrigger()
        }
    }

    private func finishEchoRun(_ peripheral: CBPeripheral) {
        guard echoPhase != "done" else { return }
        echoPhase = "done"
        echoTriggerTimer?.invalidate()
        // 收尾：LED 复位关灯
        if let control = echoControl {
            peripheral.writeValue(Data([0xFF, 0x00]), for: control, type: .withResponse)
        }
        let roundsWithEcho = echoRoundsWithEcho.count
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            let lat = self.echoEchoLatencies
            log("SUMMARY rounds=\(self.echoRound) trigger_responses=\(self.echoTriggerResponses) echo_responses=\(self.echoResponses) rounds_with_echo=\(roundsWithEcho) grace_echos=\(self.echoGraceEcho) echo_rtt_min=\(lat.min().map { String(format: "%.2f", $0) } ?? "-")s echo_rtt_max=\(lat.max().map { String(format: "%.2f", $0) } ?? "-")s")
            // 判据：每一轮都有回声（首2轮宽限，容忍订阅标记时序）
            let graded = max(self.echoRound - 2, 0)
            let pass = self.echoResponses > 0 && roundsWithEcho >= graded
            log("RESULT=\(pass ? "PASS" : "ECHO_GAP") rounds_graded=\(graded) rounds_with_echo=\(roundsWithEcho)")
            self.central.cancelPeripheralConnection(peripheral)
            exit(pass ? 0 : 3)
        }
    }

    // MARK: CBPeripheralManagerDelegate (GATT server + advertising)

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        log("PERIPHERAL_STATE=\(peripheral.state.rawValue)")
        guard peripheral.state == .poweredOn, mode == "advertise" else { return }

        let svcUUID = CBUUID(string: serviceUUIDString)
        advertisedService = CBMutableService(type: svcUUID, primary: true)
        gattRead = CBMutableCharacteristic(type: CBUUID(string: "0000FD6B-7263-4F1E-A1C2-8F5D3B2A1001"),
                                           properties: [.read], value: Data("native-probe-read-v1".utf8), permissions: [.readable])
        gattWrite = CBMutableCharacteristic(type: CBUUID(string: "0000FD6C-7263-4F1E-A1C2-8F5D3B2A1001"),
                                            properties: [.write], value: nil, permissions: [.writeable])
        gattNotify = CBMutableCharacteristic(type: CBUUID(string: "0000FD6D-7263-4F1E-A1C2-8F5D3B2A1001"),
                                             properties: [.notify], value: nil, permissions: [.readable])
        advertisedService.characteristics = [gattRead, gattWrite, gattNotify]
        peripheralManager.add(advertisedService)
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
        guard error == nil else { fail("add service failed err=\(error.map { "\($0)" } ?? "nil")") }
        log("EVENT=service_added uuid=\(service.uuid.uuidString)")
        peripheralManager.startAdvertising([
            CBAdvertisementDataServiceUUIDsKey: [service.uuid],
            CBAdvertisementDataLocalNameKey: localName,
        ])
    }

    func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
        guard error == nil else { fail("advertising failed err=\(error.map { "\($0)" } ?? "nil")") }
        log("EVENT=advertising_started name=\(localName) service=\(serviceUUIDString)")
        notifyTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self, !self.notifySubscribers.isEmpty else { return }
            self.notifyCounter += 1
            var payload = Data("notify-\(self.notifyCounter)".utf8)
            _ = self.peripheralManager.updateValue(payload, for: self.gattNotify, onSubscribedCentrals: nil)
            log("NOTIFIED=subscribers=\(self.notifySubscribers.count) seq=\(self.notifyCounter) bytes=\(payload.count)")
            payload.removeAll()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
            self.notifyTimer?.invalidate()
            self.peripheralManager.stopAdvertising()
            log("EVENT=advertising_stopped subscribers=\(self.notifySubscribers.count) notify_sent=\(self.notifyCounter) writes_received=\(self.writeCount)")
            log("RESULT=PASS")
            exit(0)
        }
    }

    var writeCount = 0

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
        guard request.characteristic == gattRead else {
            peripheralManager.respond(to: request, withResult: .attributeNotFound)
            return
        }
        log("EVENT=gatt_read_request offset=\(request.offset)")
        let value = gattRead.value ?? Data()
        if request.offset > value.count {
            peripheralManager.respond(to: request, withResult: .invalidOffset)
            return
        }
        request.value = value.subdata(in: request.offset..<value.count)
        peripheralManager.respond(to: request, withResult: .success)
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        for req in requests {
            guard req.characteristic == gattWrite else {
                peripheralManager.respond(to: req, withResult: .attributeNotFound)
                return
            }
            writeCount += 1
            log("EVENT=gatt_write_received bytes=\(req.value?.count ?? 0) text=\(req.value.flatMap { String(data: $0, encoding: .utf8) } ?? "-") hex=\(req.value.map { $0.map { String(format: "%02x", $0) }.joined() } ?? "-")")
            gattWrite.value = req.value
        }
        peripheralManager.respond(to: requests[0], withResult: .success)
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) {
        notifySubscribers[central.identifier] = central
        log("EVENT=central_subscribed id=\(central.identifier.uuidString) char=\(characteristic.uuid.uuidString)")
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) {
        notifySubscribers.removeValue(forKey: central.identifier)
        log("EVENT=central_unsubscribed id=\(central.identifier.uuidString)")
    }
}

Probe().run()
