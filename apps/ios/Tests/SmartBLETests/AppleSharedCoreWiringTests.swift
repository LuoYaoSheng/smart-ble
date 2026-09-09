import SmartHidCore
import XCTest

final class AppleSharedCoreWiringTests: XCTestCase {
    func testCanonicalCoreIsAvailableToNativeIOS() {
        XCTAssertEqual(HidProtocol.serviceUuid, "9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04")
        XCTAssertEqual(HidFraming.chunkSize(forMtu: 185), 128)
        XCTAssertEqual(HidProtocol.recoveryAction(forErrorCode: "mqtt_invalid"), "diagnostics")
    }
}
