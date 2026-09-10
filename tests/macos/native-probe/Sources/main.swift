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
//
// All output lines are structured: [PROBE] key=value ...
// Exit code 0 = expected milestones reached; non-zero = failure/timeout.

import CoreBluetooth
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

    var finishAfter: (() -> Void)?

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
        if mode == "connect", services.contains(where: { $0 == targetService }), pendingPeripheral == nil {
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
        peripheral.discoverServices([targetService])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        fail("connect failed err=\(error.map { "\($0)" } ?? "nil")")
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
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
        guard error == nil, let svc = peripheral.services?.first else {
            fail("service discovery failed err=\(error.map { "\($0)" } ?? "nil")")
        }
        log("EVENT=service_discovered uuid=\(svc.uuid.uuidString)")
        peripheral.discoverCharacteristics(nil, for: svc)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard error == nil else { fail("characteristic discovery failed") }
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
        guard error == nil else { fail("read/notify failed") }
        let data = characteristic.value ?? Data()
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
            if noWrite { log("NOTE=notify_subscribe_error（环境设备限制 · 如实记录）"); return }
            fail("subscribe notify failed")
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
            let payload = Data("ping-from-native".utf8)
            peripheral.writeValue(payload, for: w, type: .withResponse)
            log("EVENT=write_sent bytes=\(payload.count)")
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        guard error == nil else { fail("write failed") }
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
