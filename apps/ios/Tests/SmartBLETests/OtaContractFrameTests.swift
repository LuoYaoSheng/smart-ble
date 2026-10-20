import XCTest
import SmartHidCore
@testable import SmartBLE

final class OtaContractFrameTests: XCTestCase {
    func testStartFrameUsesVerifiedHardwareAndRealVersion() throws {
        let data = Data("firmware".utf8)
        let sha = OtaManifest.sha256Hex(data)
        let manifest = try OtaManifest.parse(["format_version": 1, "target": "lightble-peripheral", "hardware": "esp32c3",
            "firmware_version": "1.2.3", "size": data.count, "sha256": sha], fileSize: data.count, actualSha256: sha).get()
        let payload = OtaStartPayload.build(manifest: manifest, chunkSize: 180)
        XCTAssertEqual(payload["hardware"] as? String, "esp32c3")
        XCTAssertEqual(payload["target_version"] as? String, "1.2.3")
        XCTAssertEqual(payload.count, 7)
    }
    func testCommitFrameUsesContractOp() {
        XCTAssertEqual(String(data: OtaManager.commitFrame, encoding: .utf8), #"{"op":"commit"}"#)
    }
    func testActualOtaServiceMatchesFirmwareUUID() {
        XCTAssertEqual(OtaBluetoothSession.serviceUUID, "4FAFC201-1FB5-459E-8FCC-C5C9C331914D")
    }
    @MainActor func testInvalidFileSelectionClearsPreviouslySelectablePackage() {
        let manager = OtaManager(deviceId: "not-connected", bleManager: BLEManager())
        manager.selectFiles(urls: [])
        XCTAssertNil(manager.state.fileUrl)
        XCTAssertNotNil(manager.state.errorMessage)
        manager.startOta()
        XCTAssertFalse(manager.state.isInProgress)
    }
}
