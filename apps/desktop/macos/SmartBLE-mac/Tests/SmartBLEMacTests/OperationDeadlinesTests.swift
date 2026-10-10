import XCTest
import CoreBluetooth
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
        state.observe(uuid: "abcd", isNotifying: true, succeeded: false)
        XCTAssertFalse(state.contains("ABCD"))
        state.observe(uuid: "abcd", isNotifying: true, succeeded: true)
        XCTAssertTrue(state.contains("ABCD"))
        state.observe(uuid: "ABCD", isNotifying: false, succeeded: false)
        XCTAssertTrue(state.contains("abcd"), "failed disable must retain confirmed state")
        state.observe(uuid: "ABCD", isNotifying: false, succeeded: true)
        XCTAssertFalse(state.contains("abcd"))
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
