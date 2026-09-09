import Foundation
import SmartHidCore
import XCTest
@testable import SmartBLE

@MainActor
final class HidProvisionManagerTests: XCTestCase {
    private let validInfo = #"{"product":"smart-hid","protocol":"1.0","device_id":"HID-ABCD1234","firmware":"1.1.0","state":"unprovisioned","provisioned":false}"#
    private let token = "0123456789abcdef0123456789abcdef"

    func testProfileMatchingUsesStrongUuidBeforeWeakName() {
        XCTAssertEqual(
            SmartHidProfile.match(name: "Other", serviceUUIDs: [HidProtocol.serviceUuid.uppercased()]),
            .strong
        )
        XCTAssertEqual(SmartHidProfile.match(name: "SHID-ABC123", serviceUUIDs: []), .weak)
        XCTAssertNil(SmartHidProfile.match(name: "Keyboard", serviceUUIDs: []))
    }

    func testBeginVerifiesConnectedDeviceAndAcceptsCanonicalIdentity() {
        let transport = FakeHidProvisionTransport(connected: true)
        let manager = makeManager(transport)

        manager.begin(deviceId: "D1")
        XCTAssertEqual(manager.stage, .verifying)
        XCTAssertEqual(transport.notificationChanges.map(\.characteristicUUID), [
            HidProtocol.infoCharUuid, HidProtocol.statusCharUuid,
        ])
        XCTAssertEqual(transport.reads, [HidProtocol.infoCharUuid])

        transport.emitValue(deviceId: "D1", uuid: HidProtocol.infoCharUuid, text: validInfo)
        XCTAssertEqual(manager.stage, .verified)
        XCTAssertEqual(manager.deviceInfo?.deviceId, "HID-ABCD1234")
    }

    func testIdentityMismatchFailsAndDisconnectsOwnedSession() {
        let transport = FakeHidProvisionTransport(connected: false)
        let manager = makeManager(transport)

        manager.begin(deviceId: "D1")
        XCTAssertEqual(manager.stage, .connecting)
        transport.connected = true
        transport.emit(.connectionChanged(deviceId: "D1", connected: true))
        XCTAssertEqual(manager.stage, .verifying)

        let wrongInfo = #"{"product":"other","protocol":"1.0","device_id":"HID-ABCD1234"}"#
        transport.emitValue(deviceId: "D1", uuid: HidProtocol.infoCharUuid, text: wrongInfo)

        guard case .failed(let code, _, let recovery) = manager.stage else {
            return XCTFail("expected failed stage, got \(manager.stage)")
        }
        XCTAssertEqual(code, "identity_failed")
        XCTAssertEqual(recovery, "form")
        XCTAssertEqual(transport.disconnects, ["D1"])
    }

    func testSubmitWritesCanonicalFramesInOrderThenWaitsForStatus() async {
        let transport = FakeHidProvisionTransport(connected: true)
        transport.maximumWriteLength = 185
        let manager = makeManager(transport, frameIntervalNanoseconds: 0)
        manager.begin(deviceId: "D1")
        transport.emitValue(deviceId: "D1", uuid: HidProtocol.infoCharUuid, text: validInfo)
        XCTAssertNotNil(manager.acceptPairingQr("shid://pair?token=\(token)&host=hub.lan"))

        manager.submit(ssid: "Home", password: "pw", hubHost: "hub.lan", hubPort: 17_892, token: token)
        await settle()

        let json = try! HidProtocol.buildCandidateJson(
            ssid: "Home",
            password: "pw",
            hubHost: "hub.lan",
            hubPort: 17_892,
            token: token
        )
        let expected = try! HidFraming.buildFrames(Array(json.utf8), chunkSize: 128).map { Data($0) }
        XCTAssertEqual(transport.writes.map(\.data), expected)
        XCTAssertTrue(transport.writes.allSatisfy { $0.characteristicUUID == HidProtocol.inputCharUuid })
        XCTAssertEqual(manager.stage, .waiting)
        XCTAssertEqual(transport.reads.last, HidProtocol.statusCharUuid)
    }

    func testReadyStatusCompletesAndPreservesConnectedSession() async {
        let transport = FakeHidProvisionTransport(connected: true)
        let manager = makeVerifiedWaitingManager(transport)
        await settle()

        transport.emitValue(
            deviceId: "D1",
            uuid: HidProtocol.statusCharUuid,
            text: #"{"state":"ready","step":"ready","error":null}"#
        )

        XCTAssertEqual(manager.stage, .done)
        XCTAssertTrue(manager.rows.values.allSatisfy { $0 == "done" })
        XCTAssertTrue(transport.disconnects.isEmpty)
    }

    func testCanonicalErrorUsesCanonicalRecoveryAction() async {
        let transport = FakeHidProvisionTransport(connected: true)
        let manager = makeVerifiedWaitingManager(transport)
        await settle()

        transport.emitValue(
            deviceId: "D1",
            uuid: HidProtocol.statusCharUuid,
            text: #"{"state":"error","step":"mqtt_connecting","error":"mqtt_invalid"}"#
        )

        guard case .failed(let code, _, let recovery) = manager.stage else {
            return XCTFail("expected failed stage, got \(manager.stage)")
        }
        XCTAssertEqual(code, "mqtt_invalid")
        XCTAssertEqual(recovery, "diagnostics")
        XCTAssertEqual(manager.rows["conn"], "fail")

        manager.resumeConfiguration()
        XCTAssertEqual(manager.stage, .verified)
        XCTAssertTrue(manager.rows.values.allSatisfy { $0 == "pending" })
    }

    func testCancelReturnsToVerifiedAndAbandonCancelsOwnedSession() async {
        let transport = FakeHidProvisionTransport(connected: false)
        let manager = makeManager(transport, frameIntervalNanoseconds: 0)
        manager.begin(deviceId: "D1")
        transport.connected = true
        transport.emit(.connectionChanged(deviceId: "D1", connected: true))
        transport.emitValue(deviceId: "D1", uuid: HidProtocol.infoCharUuid, text: validInfo)
        _ = manager.acceptPairingQr("shid://pair?token=\(token)&host=hub.lan")
        manager.submit(ssid: "Home", password: "pw", hubHost: "hub.lan", hubPort: nil, token: token)
        await settle()

        manager.cancelWait()
        XCTAssertEqual(manager.stage, .verified)
        manager.abandon(preserveConnection: false)
        XCTAssertEqual(manager.stage, .idle)
        XCTAssertEqual(transport.disconnects, ["D1"])
    }

    func testAbandonPreventsOldIdentityTimeoutFromChangingState() async {
        let transport = FakeHidProvisionTransport(connected: true)
        let manager = makeManager(transport, identityTimeoutNanoseconds: 1_000_000)
        manager.begin(deviceId: "D1")
        manager.abandon(preserveConnection: true)
        try? await Task.sleep(nanoseconds: 5_000_000)
        XCTAssertEqual(manager.stage, .idle)
    }

    private func makeVerifiedWaitingManager(_ transport: FakeHidProvisionTransport) -> HidProvisionManager {
        let manager = makeManager(transport, frameIntervalNanoseconds: 0)
        manager.begin(deviceId: "D1")
        transport.emitValue(deviceId: "D1", uuid: HidProtocol.infoCharUuid, text: validInfo)
        _ = manager.acceptPairingQr("shid://pair?token=\(token)&host=hub.lan")
        manager.submit(ssid: "Home", password: "pw", hubHost: "hub.lan", hubPort: nil, token: token)
        return manager
    }

    private func makeManager(
        _ transport: FakeHidProvisionTransport,
        identityTimeoutNanoseconds: UInt64 = 1_000_000_000,
        frameIntervalNanoseconds: UInt64 = 1_000_000,
        pollIntervalNanoseconds: UInt64 = 60_000_000_000
    ) -> HidProvisionManager {
        HidProvisionManager(
            transport: transport,
            identityTimeoutNanoseconds: identityTimeoutNanoseconds,
            frameIntervalNanoseconds: frameIntervalNanoseconds,
            pollIntervalNanoseconds: pollIntervalNanoseconds,
            pollTimeoutNanoseconds: 60_000_000_000
        )
    }

    private func settle() async {
        try? await Task.sleep(nanoseconds: 10_000_000)
    }
}

@MainActor
private final class FakeHidProvisionTransport: HidProvisionTransport {
    struct NotificationChange: Equatable {
        let characteristicUUID: String
        let enabled: Bool
    }

    struct Write: Equatable {
        let characteristicUUID: String
        let data: Data
    }

    var hidEventHandler: ((HidProvisionTransportEvent) -> Void)?
    var connected: Bool
    var maximumWriteLength = 185
    var availableCharacteristics: Set<String> = [
        HidProtocol.infoCharUuid,
        HidProtocol.inputCharUuid,
        HidProtocol.statusCharUuid,
    ]
    var connects: [String] = []
    var disconnects: [String] = []
    var reads: [String] = []
    var writes: [Write] = []
    var notificationChanges: [NotificationChange] = []
    var logs: [String] = []

    init(connected: Bool) {
        self.connected = connected
    }

    func connectForProvisioning(deviceId: String) -> Bool {
        connects.append(deviceId)
        return true
    }

    func disconnectForProvisioning(deviceId: String) {
        disconnects.append(deviceId)
        connected = false
    }

    func isProvisioningDeviceConnected(_ deviceId: String) -> Bool {
        connected
    }

    func hasProvisioningCharacteristic(deviceId: String, characteristicUUID: String) -> Bool {
        availableCharacteristics.contains(characteristicUUID.lowercased())
    }

    func setProvisioningNotification(deviceId: String, characteristicUUID: String, enabled: Bool) -> Bool {
        guard availableCharacteristics.contains(characteristicUUID.lowercased()) else { return false }
        notificationChanges.append(.init(characteristicUUID: characteristicUUID, enabled: enabled))
        return true
    }

    func readProvisioningCharacteristic(deviceId: String, characteristicUUID: String) -> Bool {
        guard availableCharacteristics.contains(characteristicUUID.lowercased()) else { return false }
        reads.append(characteristicUUID)
        return true
    }

    func writeProvisioningCharacteristic(deviceId: String, characteristicUUID: String, data: Data) -> Bool {
        guard availableCharacteristics.contains(characteristicUUID.lowercased()) else { return false }
        writes.append(.init(characteristicUUID: characteristicUUID, data: data))
        return true
    }

    func provisioningAttMtu(deviceId: String) -> Int {
        maximumWriteLength
    }

    func logProvisioning(_ message: String, deviceId: String, isError: Bool) {
        logs.append(message)
    }

    func emit(_ event: HidProvisionTransportEvent) {
        hidEventHandler?(event)
    }

    func emitValue(deviceId: String, uuid: String, text: String) {
        emit(.value(deviceId: deviceId, characteristicUUID: uuid, data: Data(text.utf8)))
    }
}
