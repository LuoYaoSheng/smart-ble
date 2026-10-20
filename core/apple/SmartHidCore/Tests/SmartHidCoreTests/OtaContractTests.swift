import XCTest
@testable import SmartHidCore

final class OtaContractTests: XCTestCase {
    private let firmware = Data("firmware".utf8)
    private func json() -> [String: Any] {
        ["format_version": 1, "target": "lightble-peripheral", "hardware": "esp32c3",
         "firmware_version": "1.2.3", "size": firmware.count, "sha256": OtaManifest.sha256Hex(firmware)]
    }
    private func parse(_ json: [String: Any]) -> Result<OtaManifestInfo, OtaManifestError> {
        OtaManifest.parse(json, fileSize: firmware.count, actualSha256: OtaManifest.sha256Hex(firmware))
    }
    func testRequiresEveryManifestFieldAndRejectsLegacyAndExtras() {
        for key in json().keys {
            var missing = json(); missing.removeValue(forKey: key)
            XCTAssertEqual(parse(missing), .failure(.invalidFields), key)
        }
        var extra = json(); extra["version"] = "1.2.3"
        XCTAssertEqual(parse(extra), .failure(.invalidFields))
    }
    func testStrictFieldTypesAndActualContent() {
        var invalid = json(); invalid["format_version"] = true
        XCTAssertEqual(parse(invalid), .failure(.invalidFormatVersion))
        invalid = json(); invalid["size"] = true
        XCTAssertEqual(parse(invalid), .failure(.invalidSize))
        invalid = json(); invalid["size"] = 1.5
        XCTAssertEqual(parse(invalid), .failure(.invalidSize))
        invalid = json(); invalid["size"] = firmware.count + 1
        XCTAssertEqual(parse(invalid), .failure(.sizeMismatch(manifest: firmware.count + 1, actual: firmware.count)))
        invalid = json(); invalid["sha256"] = String(repeating: "0", count: 64)
        XCTAssertEqual(parse(invalid), .failure(.hashMismatch))
        invalid = json(); invalid["sha256"] = String(repeating: "A", count: 64)
        XCTAssertEqual(parse(invalid), .failure(.invalidHash))
        invalid = json(); invalid["hardware"] = " "
        XCTAssertEqual(parse(invalid), .failure(.invalidHardware))
        invalid = json(); invalid["target"] = "other"
        XCTAssertEqual(parse(invalid), .failure(.invalidTarget("other")))
    }
    func testValidatedStartContainsHardwareAndRealVersion() throws {
        let manifest = try parse(json()).get()
        let frame = OtaStartPayload.build(manifest: manifest, chunkSize: 180)
        XCTAssertEqual(frame.count, 7)
        XCTAssertEqual(frame["hardware"] as? String, "esp32c3")
        XCTAssertEqual(frame["target_version"] as? String, "1.2.3")
        XCTAssertEqual(frame["sha256"] as? String, OtaManifest.sha256Hex(firmware))
    }
    func testStatusUsesExactTypedStatusAndErrorPriority() {
        func classify(_ text: String) -> OtaDeviceEvent? { OtaStatusClassifier.classify(Data(text.utf8)) }
        XCTAssertEqual(classify(#"{"type":"ota","status":"ready","max_chunk":180}"#), .ready)
        XCTAssertEqual(classify(#"{"type":"ota","status":"success"}"#), .success)
        guard case .error = classify(#"{"type":"ota","status":"error","detail":"already ready success ok"}"#) else { return XCTFail("error details must not cause ready/success") }
        XCTAssertNil(classify(#"{"type":"system_info","status":"success"}"#))
        XCTAssertNil(classify("ok")); XCTAssertNil(classify("1.2.3"))
        XCTAssertNil(classify(#"{"type":"ota","status":"not_ready"}"#))
    }
    func testSemVerMatchesFrozenManifestSchema() {
        XCTAssertTrue(OtaManifest.isSemVer("1.2.3-rc.1+build.7"))
        XCTAssertFalse(OtaManifest.isSemVer("01.2.3"))
        XCTAssertFalse(OtaManifest.isSemVer("v1.2.3"))
        XCTAssertFalse(OtaManifest.isSemVer("1.2.3\n"))
    }
    func testLocalPackageRequiresExplicitlySelectedSameFolderManifest() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let bin = root.appendingPathComponent("firmware.bin")
        let manifest = root.appendingPathComponent("manifest.json")
        try firmware.write(to: bin)
        try JSONSerialization.data(withJSONObject: json()).write(to: manifest)
        XCTAssertThrowsError(try OtaLocalPackage.load(urls: [bin]))
        let package = try OtaLocalPackage.load(urls: [manifest, bin])
        XCTAssertEqual(package.firmware, firmware)
        XCTAssertEqual(package.manifest.version, "1.2.3")
        let alternate = root.appendingPathComponent("firmware.manifest.json")
        try JSONSerialization.data(withJSONObject: json()).write(to: alternate)
        XCTAssertThrowsError(try OtaLocalPackage.load(urls: [bin, alternate]))
        let subdir = root.appendingPathComponent("other")
        try FileManager.default.createDirectory(at: subdir, withIntermediateDirectories: true)
        let otherManifest = subdir.appendingPathComponent("manifest.json")
        try JSONSerialization.data(withJSONObject: json()).write(to: otherManifest)
        XCTAssertThrowsError(try OtaLocalPackage.load(urls: [bin, otherManifest]))
        let handle = try FileHandle(forWritingTo: bin)
        try handle.truncate(atOffset: UInt64(OtaLocalPackage.maximumFirmwareSize + 1))
        try handle.close()
        XCTAssertThrowsError(try OtaLocalPackage.load(urls: [bin, manifest])) { error in
            XCTAssertEqual(error as? OtaManifestError, .fileTooLarge)
        }
    }
}

final class OtaTransactionTests: XCTestCase {
    private func transaction() throws -> OtaTransaction {
        let data = Data("test".utf8)
        let manifest = try OtaManifest.parse(["format_version": 1, "target": "lightble-peripheral", "hardware": "esp32c3",
            "firmware_version": "1.2.3", "size": data.count, "sha256": OtaManifest.sha256Hex(data)],
            fileSize: data.count, actualSha256: OtaManifest.sha256Hex(data)).get()
        return OtaTransaction(manifest: manifest)
    }
    private func info(_ version: String, hardware: String = "esp32c3", target: String = "lightble-peripheral") -> Data {
        try! JSONSerialization.data(withJSONObject: ["type": "system_info", "target": target, "hardware": hardware, "firmware_version": version])
    }
    private let ready = Data(#"{"type":"ota","status":"ready","max_chunk":180}"#.utf8)
    private let success = Data(#"{"type":"ota","status":"success","rebooting":true}"#.utf8)
    private func transferring() throws -> OtaTransaction {
        var transaction = try transaction(); transaction.begin(); transaction.receiveInfo(info("1.2.2"))
        transaction.notificationConfirmed(); transaction.sentStart(); transaction.receiveStatus(ready)
        return transaction
    }
    func testFullTransactionRequiresRealRebootThenActualRunningVersion() throws {
        var transaction = try transferring()
        transaction.receiveStatus(success)
        XCTAssertEqual(transaction.phase, .transferring)
        transaction.wroteChunk(4)
        XCTAssertEqual(transaction.phase, .committing)
        transaction.receiveStatus(success)
        XCTAssertEqual(transaction.phase, .committing, "stale success before commit write must be ignored")
        transaction.sentCommit()
        transaction.receiveStatus(success)
        XCTAssertEqual(transaction.phase, .waitingReboot)
        transaction.receiveInfo(info("1.2.3"))
        XCTAssertEqual(transaction.phase, .waitingReboot, "pre-reboot info cannot prove the image started")
        transaction.disconnected()
        XCTAssertEqual(transaction.phase, .verifying)
        transaction.receiveInfo(info("1.2.3"))
        XCTAssertEqual(transaction.phase, .success)
    }
    func testMismatchAndRevertedFirmwareFailAfterReboot() throws {
        var transaction = try transferring(); transaction.wroteChunk(4); transaction.sentCommit(); transaction.receiveStatus(success); transaction.disconnected()
        transaction.receiveInfo(info("1.2.2"))
        XCTAssertEqual(transaction.phase, .failed)
        var wrongHardware = try self.transaction(); wrongHardware.begin(); wrongHardware.receiveInfo(info("1.2.2", hardware: "esp32"))
        XCTAssertEqual(wrongHardware.phase, .failed)
        var wrongTarget = try self.transaction(); wrongTarget.begin(); wrongTarget.receiveInfo(info("1.2.2", target: "lightble-observer"))
        XCTAssertEqual(wrongTarget.phase, .failed)
    }
    func testAlreadyInstalledVersionCannotBeReportedAsUpgrade() throws {
        var transaction = try self.transaction(); transaction.begin(); transaction.receiveInfo(info("1.2.3"))
        XCTAssertEqual(transaction.phase, .failed)
    }
    func testUnexpectedDisconnectAbortAndCancellationAreTerminal() throws {
        var transaction = try transferring(); transaction.disconnected()
        XCTAssertEqual(transaction.phase, .failed)
        transaction.receiveStatus(success); XCTAssertEqual(transaction.phase, .failed)
        transaction = try transferring(); transaction.receiveStatus(Data(#"{"type":"ota","status":"aborted"}"#.utf8))
        XCTAssertEqual(transaction.phase, .failed)
        transaction = try transferring(); transaction.cancel(); transaction.wroteChunk(4); transaction.receiveStatus(success)
        XCTAssertEqual(transaction.phase, .cancelled)
        XCTAssertEqual(transaction.sentBytes, 0)
    }
    func testNoDataBeforeDeviceReadyAndNoCommitBeforeAllBytes() throws {
        var transaction = try self.transaction(); transaction.begin(); transaction.wroteChunk(4)
        XCTAssertEqual(transaction.sentBytes, 0)
        transaction.receiveStatus(ready); XCTAssertEqual(transaction.phase, .checkingDevice)
        transaction.receiveInfo(info("1.2.2")); transaction.notificationConfirmed()
        transaction.receiveStatus(ready); XCTAssertEqual(transaction.phase, .waitingReady, "stale ready before start write")
        transaction.sentStart(); transaction.receiveStatus(ready)
        transaction.wroteChunk(2); XCTAssertEqual(transaction.phase, .transferring)
        transaction.receiveStatus(success); XCTAssertEqual(transaction.phase, .transferring)
        transaction.wroteChunk(2); XCTAssertEqual(transaction.phase, .committing)
    }
}
