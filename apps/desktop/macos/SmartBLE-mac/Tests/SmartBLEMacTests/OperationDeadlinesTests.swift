import XCTest
import CoreBluetooth
import SmartHidCore
@testable import SmartBLE_mac

@MainActor
final class OperationDeadlinesTests: XCTestCase {
    func testDuplicateUuidMustBeResolvedWithinItsService() {
        func service(_ id: String) -> BLEService {
            BLEService(id: id, uuid: id, name: id, characteristics: [
                BLECharacteristic(id: "FFE1", uuid: "FFE1", name: id, properties: .read)
            ])
        }
        let services = [service("FFE0"), service("FFE2")]
        XCTAssertNil(BLEManager.resolveCharacteristic("ffe1", in: services))
        XCTAssertEqual(BLEManager.resolveCharacteristic("ffe1", serviceUUID: "ffe2", in: services)?.name, "FFE2")
        XCTAssertNil(BLEManager.resolveCharacteristic("FFE1", serviceUUID: "missing", in: services))
    }

    func testOldCharacteristicObjectCannotBelongToNewServiceCache() {
        func characteristic() -> CBMutableCharacteristic {
            CBMutableCharacteristic(type: CBUUID(string: "FFE1"), properties: .read, value: nil, permissions: .readable)
        }
        let old = characteristic()
        let current = characteristic()
        let services = [BLEService(id: "FFE0", uuid: "FFE0", name: "current", characteristics: [
            BLECharacteristic(id: "FFE1", uuid: "FFE1", name: "current", properties: .read, peripheralCharacteristic: current)
        ])]
        XCTAssertTrue(BLEManager.ownsCharacteristic(current, in: services))
        XCTAssertFalse(BLEManager.ownsCharacteristic(old, in: services))
        XCTAssertFalse(BLEManager.ownsCharacteristic(current, in: []))
    }

    func testDisconnectAllUsesOriginalTargetsAfterSessionsHaveBeenRemoved() {
        let report = BLEManager.disconnectReport(targets: ["A": "removed session", "B": "timed out"], stillPending: ["B", "unrelated"])
        XCTAssertEqual(report.succeeded, ["removed session"])
        XCTAssertEqual(report.failed, ["timed out"])
    }

    func testNotificationIntentNeedsSuccessfulNativeConfirmation() {
        var state = NotificationConfirmation()
        let address = GattCharacteristicAddress(serviceUUID: "FFE0", characteristicUUID: "abcd")
        state.observe(address: address, isNotifying: true, succeeded: false)
        XCTAssertFalse(state.contains(address))
        state.observe(address: address, isNotifying: true, succeeded: true)
        XCTAssertTrue(state.contains(address))
        state.observe(address: address, isNotifying: false, succeeded: false)
        XCTAssertTrue(state.contains(address), "failed disable must retain confirmed state")
        state.observe(address: address, isNotifying: false, succeeded: true)
        XCTAssertFalse(state.contains(address))
    }

    func testSameUuidReadsAndNotificationsRemainServiceScoped() {
        let a = GattCharacteristicAddress(serviceUUID: "FFE0", characteristicUUID: "FFE1")
        let b = GattCharacteristicAddress(serviceUUID: "FFE2", characteristicUUID: "FFE1")
        let reads = OperationDeadlines()
        XCTAssertTrue(reads.begin(key: a.key, timeout: 1) { XCTFail("unexpected timeout A") })
        XCTAssertTrue(reads.begin(key: b.key, timeout: 1) { XCTFail("unexpected timeout B") })
        XCTAssertTrue(reads.complete(key: a.key))
        XCTAssertFalse(reads.complete(key: a.key))
        XCTAssertTrue(reads.complete(key: b.key), "A's receipt must not consume B's read")
        var notifications = NotificationConfirmation()
        notifications.observe(address: a, isNotifying: true, succeeded: true)
        XCTAssertTrue(notifications.contains(a))
        XCTAssertFalse(notifications.contains(b))
        notifications.observe(address: b, isNotifying: true, succeeded: true)
        notifications.observe(address: a, isNotifying: false, succeeded: true)
        XCTAssertFalse(notifications.contains(a))
        XCTAssertTrue(notifications.contains(b), "disabling A must retain B's subscription")
    }

    func testSameUuidWriteReceiptCannotCompleteOtherServiceItem() {
        let a = WriteQueueItem(itemId: "a", characteristicUuid: "FFE1", data: Data([1]), display: "01", withoutResponse: false, serviceUuid: "FFE0")
        let b = WriteQueueItem(itemId: "b", characteristicUuid: "FFE1", data: Data([2]), display: "02", withoutResponse: false, serviceUuid: "FFE2")
        XCTAssertTrue(a.matchesReceipt(serviceUUID: "ffe0", characteristicUUID: "ffe1"))
        XCTAssertFalse(a.matchesReceipt(serviceUUID: "FFE2", characteristicUUID: "FFE1"))
        XCTAssertTrue(b.matchesReceipt(serviceUUID: "FFE2", characteristicUUID: "FFE1"))
        XCTAssertFalse(b.matchesReceipt(serviceUUID: "FFE0", characteristicUUID: "FFE1"))
    }

    func testStandardUuidAliasesShareAddressButDifferentServicesDoNot() {
        let short = GattCharacteristicAddress(serviceUUID: "180A", characteristicUUID: "2A26")
        let full = GattCharacteristicAddress(serviceUUID: "0000180a-0000-1000-8000-00805f9b34fb", characteristicUUID: "00002a26-0000-1000-8000-00805f9b34fb")
        XCTAssertEqual(short, full)
        XCTAssertNotEqual(short, GattCharacteristicAddress(serviceUUID: "180F", characteristicUUID: "2A26"))
    }

    func testHidValueRequiresProfileServiceAndAcceptsNativeUuidCase() {
        XCTAssertTrue(BLEManager.isHidValue(serviceUUID: HidProtocol.serviceUuid.uppercased(), characteristicUUID: HidProtocol.infoCharUuid.uppercased()))
        XCTAssertTrue(BLEManager.isHidValue(serviceUUID: HidProtocol.serviceUuid, characteristicUUID: HidProtocol.statusCharUuid))
        XCTAssertFalse(BLEManager.isHidValue(serviceUUID: "FFE0", characteristicUUID: HidProtocol.infoCharUuid))
    }

    func testHidVerificationWaitsForItsProfileCharacteristicsToBeDiscovered() {
        func characteristic(_ uuid: String) -> BLECharacteristic {
            BLECharacteristic(id: uuid, uuid: uuid, name: uuid, properties: [.read, .notify])
        }
        let pending = BLEService(id: "HID", uuid: HidProtocol.serviceUuid.uppercased(), name: "HID")
        XCTAssertFalse(HidProvisionManager.provisioningCharacteristicsReady(in: [pending]))
        let wrong = BLEService(id: "other", uuid: "FFE0", name: "other", characteristics: [characteristic(HidProtocol.infoCharUuid)])
        let half = BLEService(id: "HID", uuid: HidProtocol.serviceUuid, name: "HID", characteristics: [characteristic(HidProtocol.statusCharUuid)])
        XCTAssertFalse(HidProvisionManager.provisioningCharacteristicsReady(in: [wrong, half]))
        let ready = BLEService(id: "HID", uuid: HidProtocol.serviceUuid.uppercased(), name: "HID", characteristics: [characteristic(HidProtocol.infoCharUuid.uppercased()), characteristic(HidProtocol.statusCharUuid.uppercased())])
        XCTAssertTrue(HidProvisionManager.provisioningCharacteristicsReady(in: [ready]))
    }

    func testMissingReceiptActuallyExpires() async throws {
        let deadlines = OperationDeadlines()
        var expired = 0
        XCTAssertTrue(deadlines.begin(key: "service:read", timeout: 0.02) { expired += 1 })
        XCTAssertFalse(deadlines.begin(key: "service:read", timeout: 0.02) { XCTFail("duplicate read") })
        try await Task.sleep(nanoseconds: 80_000_000)
        XCTAssertEqual(expired, 1)
        XCTAssertFalse(deadlines.complete(key: "service:read"))
    }

    func testCancellationCannotExpireReplacementWithSameKey() async throws {
        let deadlines = OperationDeadlines()
        var expired: [String] = []
        deadlines.begin(key: "same", timeout: 0.02) { expired.append("old") }
        deadlines.cancelAll()
        deadlines.begin(key: "same", timeout: 1) { expired.append("new") }
        try await Task.sleep(nanoseconds: 80_000_000)
        XCTAssertTrue(expired.isEmpty)
        XCTAssertTrue(deadlines.complete(key: "same"))
    }

    func testDeviceDeadlinesRemainIndependentAndReceiptsCancelTimers() async throws {
        let a = OperationDeadlines()
        let b = OperationDeadlines()
        var expired: [String] = []
        a.begin(key: "same-characteristic", timeout: 0.02) { expired.append("A") }
        b.begin(key: "same-characteristic", timeout: 0.02) { expired.append("B") }
        XCTAssertTrue(b.complete(key: "same-characteristic"))
        try await Task.sleep(nanoseconds: 80_000_000)
        XCTAssertEqual(expired, ["A"])
    }
}
