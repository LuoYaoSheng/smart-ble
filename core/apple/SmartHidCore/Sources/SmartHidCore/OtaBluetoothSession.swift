import Foundation
import CoreBluetooth

/// Apple transport shared by SwiftUI and AppKit. Delegate ownership stays with BLEManager.
/// Callers reserve the device's write lane before start and forward only matching callbacks.
@MainActor
public final class OtaBluetoothSession {
    public static let serviceUUID = "4FAFC201-1FB5-459E-8FCC-C5C9C331914D"
    public static let controlUUID = "BEB5483E-36E1-4688-B7F5-EA07361B26C0"
    public static let dataUUID = "BEB5483E-36E1-4688-B7F5-EA07361B26C1"
    public static let statusUUID = "BEB5483E-36E1-4688-B7F5-EA07361B26C2"
    public static let infoServiceUUID = "4FAFC201-1FB5-459E-8FCC-C5C9C331914B"
    public static let infoUUID = "BEB5483E-36E1-4688-B7F5-EA07361B26A8"
    public let deviceID: String
    public private(set) var transaction: OtaTransaction
    public var onChange: ((OtaTransaction) -> Void)?
    private let firmware: Data
    private let connection: () -> CBPeripheral?
    private let resolve: (String, String) -> CBCharacteristic?
    private let reconnect: () -> Void
    private let closeConnection: () -> Void
    private var timer: Timer?
    private var phaseStarted = Date()
    private var lastPhase: OtaTransaction.Phase = .idle
    private var actionSent = false
    private var chunkSize = 180
    private var lastWrite = Date.distantPast
    private var reconnectRequested = false
    private var pendingControlWrites = 0
    private var startSent = false
    private var flashCommitted = false
    private var notificationOwned = false
    private var cleanupStarted = false
    private var closeRequested = false

    public init(package: OtaLocalPackage, deviceID: String, connection: @escaping () -> CBPeripheral?,
                resolve: @escaping (String, String) -> CBCharacteristic?, reconnect: @escaping () -> Void,
                closeConnection: @escaping () -> Void) {
        self.firmware = package.firmware
        self.transaction = OtaTransaction(manifest: package.manifest)
        self.deviceID = deviceID
        self.connection = connection
        self.resolve = resolve
        self.reconnect = reconnect
        self.closeConnection = closeConnection
    }
    deinit { timer?.invalidate() }
    public var holdsWriteLane: Bool { isActive || pendingControlWrites > 0 }
    public var isActive: Bool { transaction.isActive }
    public func start() {
        transaction.begin()
        notifyChange()
        timer = Timer.scheduledTimer(withTimeInterval: 0.02, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
        tick()
    }
    public func cancel() {
        guard isActive else { return }
        transaction.cancel()
        notifyChange()
    }
    public func disconnected() {
        // The old link can no longer deliver ACKs. Never give one to a new write queue.
        pendingControlWrites = 0
        notificationOwned = false
        transaction.disconnected()
        notifyChange()
    }
    public func received(_ data: Data, serviceUUID: String, characteristicUUID: String, error: Error?) {
        guard isActive else { return }
        let isInfo = matches(serviceUUID, Self.infoServiceUUID) && matches(characteristicUUID, Self.infoUUID)
        let isStatus = matches(serviceUUID, Self.serviceUUID) && matches(characteristicUUID, Self.statusUUID)
        guard isInfo || isStatus else { return }
        if let error { transaction.fail(error.localizedDescription); notifyChange(); return }
        if isInfo { transaction.receiveInfo(data) }
        else {
            if transaction.phase == .waitingReady, startSent,
               let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
               json["type"] as? String == "ota", json["status"] as? String == "ready" {
                guard let maximum = json["max_chunk"] as? Int, maximum > 0, maximum <= 512 else {
                    transaction.fail("设备 ready 帧缺少合法 max_chunk"); notifyChange(); return
                }
                chunkSize = min(chunkSize, maximum)
            }
            transaction.receiveStatus(data)
            if transaction.phase == .waitingReboot { flashCommitted = true }
        }
        notifyChange()
    }
    /// Returns true when the ACK belongs to the reserved OTA control lane.
    public func wrote(serviceUUID: String, characteristicUUID: String, error: Error?) -> Bool {
        guard pendingControlWrites > 0, matches(serviceUUID, Self.serviceUUID), matches(characteristicUUID, Self.controlUUID) else { return false }
        pendingControlWrites -= 1
        if let error { transaction.fail("OTA 控制写入失败：\(error.localizedDescription)") }
        notifyChange()
        return true
    }
    private func matches(_ lhs: String, _ rhs: String) -> Bool { CBUUID(string: lhs) == CBUUID(string: rhs) }
    private func notifyChange() {
        if transaction.phase != lastPhase {
            phaseStarted = Date(); actionSent = false; lastPhase = transaction.phase
        }
        if !isActive, !cleanupStarted {
            cleanupStarted = true
            // Fail/timeout/cancel must not leave the device in receiving until its watchdog.
            // Abort is best-effort; queued control ACKs still belong to this transaction.
            if startSent && !flashCommitted && transaction.phase != .success {
                writeControl(Data(#"{"op":"abort"}"#.utf8))
            }
            if notificationOwned, let peripheral = connection(), peripheral.state == .connected,
               let status = resolve(Self.serviceUUID, Self.statusUUID), status.isNotifying {
                peripheral.setNotifyValue(false, for: status)
            }
            notificationOwned = false
        }
        if !holdsWriteLane { timer?.invalidate(); timer = nil }
        onChange?(transaction)
    }
    private func writeControl(_ data: Data) {
        guard let peripheral = connection(), peripheral.state == .connected,
              let characteristic = resolve(Self.serviceUUID, Self.controlUUID), characteristic.properties.contains(.write),
              data.count <= peripheral.maximumWriteValueLength(for: .withResponse) else {
            transaction.fail("OTA 控制通道不可写或帧长度超出设备能力"); return
        }
        pendingControlWrites += 1
        peripheral.writeValue(data, for: characteristic, type: .withResponse)
    }
    private func tick() {
        guard isActive else {
            if pendingControlWrites > 0, !closeRequested, Date().timeIntervalSince(phaseStarted) > 5 {
                closeRequested = true
                closeConnection()
            }
            return
        }
        let timeout: TimeInterval = [.waitingReady, .committing].contains(transaction.phase) ? 30 :
            [.waitingReboot, .verifying].contains(transaction.phase) ? 45 : 5
        if Date().timeIntervalSince(phaseStarted) > timeout {
            transaction.fail("OTA \(transaction.phase.rawValue) 超时"); notifyChange(); return
        }
        switch transaction.phase {
        case .checkingDevice, .verifying:
            if transaction.phase == .verifying, !reconnectRequested {
                reconnectRequested = true; reconnect()
            }
            if !actionSent, let peripheral = connection(), peripheral.state == .connected,
               let characteristic = resolve(Self.infoServiceUUID, Self.infoUUID), characteristic.properties.contains(.read) {
                actionSent = true
                peripheral.readValue(for: characteristic)
            }
        case .subscribing:
            guard let peripheral = connection(), peripheral.state == .connected,
                  let status = resolve(Self.serviceUUID, Self.statusUUID),
                  let control = resolve(Self.serviceUUID, Self.controlUUID), control.properties.contains(.write),
                  let data = resolve(Self.serviceUUID, Self.dataUUID), data.properties.contains(.writeWithoutResponse),
                  status.properties.contains(.notify) else {
                transaction.fail("设备未提供匹配的 OTA 服务/特征，不能升级任意 BLE 设备"); break
            }
            chunkSize = min(180, peripheral.maximumWriteValueLength(for: .withoutResponse))
            guard chunkSize > 0 else { transaction.fail("OTA 最大分包长度无效"); break }
            if status.isNotifying { transaction.notificationConfirmed() }
            else if !actionSent { actionSent = true; notificationOwned = true; peripheral.setNotifyValue(true, for: status) }
        case .waitingReady:
            if !actionSent {
                actionSent = true
                let payload = OtaStartPayload.build(manifest: transaction.manifest, chunkSize: chunkSize)
                if let data = try? JSONSerialization.data(withJSONObject: payload) {
                    writeControl(data)
                    if transaction.isActive { startSent = true; transaction.sentStart() }
                }
                else { transaction.fail("OTA start 编码失败") }
            }
        case .transferring:
            guard Date().timeIntervalSince(lastWrite) >= 0.02,
                  let peripheral = connection(), peripheral.state == .connected,
                  let characteristic = resolve(Self.serviceUUID, Self.dataUUID) else { break }
            // CoreBluetooth capacity is the ATT payload already; do not subtract 3 again.
            guard peripheral.canSendWriteWithoutResponse else { break }
            let offset = transaction.sentBytes
            let end = min(offset + chunkSize, firmware.count)
            peripheral.writeValue(firmware.subdata(in: offset..<end), for: characteristic, type: .withoutResponse)
            transaction.wroteChunk(end - offset)
            lastWrite = Date(); phaseStarted = Date()
        case .committing:
            if !actionSent {
                actionSent = true
                writeControl(Data(#"{"op":"commit"}"#.utf8))
                if transaction.isActive { transaction.sentCommit() }
            }
        default: break
        }
        notifyChange()
    }
}
