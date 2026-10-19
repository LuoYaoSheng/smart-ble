import SmartHidCore
import XCTest
@testable import SmartBLE

@MainActor
final class NativePageContractTests: XCTestCase {
    func testReleaseMetadataIsBundledFromCanonicalManifest() {
        let metadata = ReleaseMetadata.load()
        XCTAssertEqual(metadata.appVersion, "1.0.5")
        XCTAssertEqual(metadata.channel, "preview")
        XCTAssertEqual(metadata.overallStatus, "PREVIEW")
        XCTAssertTrue(metadata.artifacts.isEmpty)
        XCTAssertEqual(metadata.publicSurfaces["ios"]?.releaseStatus, "NOT_RELEASED")
    }

    func testReadyStatusProducesFiveHealthyDiagnosticRows() {
        let info = HidProtocol.DeviceInfo(
            product: "smart-hid",
            protocolVersion: "1.0",
            deviceId: "HID-ABCD1234",
            firmware: "1.1.0",
            state: "ready",
            provisioned: true
        )
        let status = HidProtocol.ProvisionStatus(state: "ready", step: "ready", error: nil)
        let rows = HidDiagnosticAssessment.rows(connected: true, info: info, status: status)
        XCTAssertEqual(rows.count, 5)
        XCTAssertTrue(rows.allSatisfy { $0.state == .ok })
    }

    /// F012 重连退避钉住冻结契约（API_SPEC C-8 / SM §2：1s/3s/5s ×3），
    /// 防止再次漂移到页面层 composable 的 2s/4s/6s（uniapp use-device-session / Flutter 线口径）
    func testReconnectBackoffScheduleMatchesFrozenContract() {
        XCTAssertEqual(BLEManager.reconnectBackoffSchedule, [1.0, 3.0, 5.0])
    }
}
