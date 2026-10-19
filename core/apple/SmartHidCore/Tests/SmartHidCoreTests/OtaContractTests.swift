//
//  OtaContractTests.swift — OTA 契约共享逻辑测试（R-1/R-2）
//  事实源：contracts/target/ota-package.schema.json + ota_server.cpp notifyStatus/handleStart。
//

import XCTest
@testable import SmartHidCore

final class OtaContractTests: XCTestCase {
    private func data(_ s: String) -> Data { Data(s.utf8) }

    // MARK: R-2 状态帧分类（固件真实 status 帧）

    func testClassifierReadyFrame() {
        if case .ready = OtaStatusClassifier.classify(data(#"{"type":"ota","status":"ready","max_chunk":180}"#)) {} else {
            XCTFail("ready 帧应判 .ready")
        }
    }

    func testClassifierSuccessFrame() {
        if case .success = OtaStatusClassifier.classify(data(#"{"type":"ota","status":"success","rebooting":true}"#)) {} else {
            XCTFail("success 帧应判 .success")
        }
    }

    func testClassifierFailedFrame() {
        // R-2 核心：旧实现整值精确匹配漏检 "failed"
        if case .error = OtaStatusClassifier.classify(data(#"{"type":"ota","status":"failed","code":"OTA_ERR_STATE"}"#)) {} else {
            XCTFail("failed 帧应判 .error（R-2）")
        }
    }

    func testClassifierAbortedFrame() {
        // 固件 abort 通知（ota_server.cpp:280 notifyStatus("aborted")）
        if case .error = OtaStatusClassifier.classify(data(#"{"type":"ota","status":"aborted"}"#)) {} else {
            XCTFail("aborted 帧应判 .error")
        }
    }

    func testClassifierTextFallbackAndVersionString() {
        if case .ok = OtaStatusClassifier.classify(data("ok")) {} else { XCTFail("文本 ok") }
        if case .error = OtaStatusClassifier.classify(data("FAILED")) {} else { XCTFail("大写文本 FAILED") }
        XCTAssertNil(OtaStatusClassifier.classify(data("1.0.5")), "版本串不误判")
    }

    // MARK: R-1 start 帧（契约六键）

    func testStartPayloadContractKeys() {
        let sha = String(repeating: "a", count: 64)
        let p = OtaStartPayload.build(manifestTarget: "lightble-observer", manifestVersion: "2.0.1",
                                      fileSize: 2048, chunkSize: 180, sha256: sha)
        XCTAssertEqual(p["op"] as? String, "start")
        XCTAssertEqual(p["target"] as? String, "lightble-observer")
        XCTAssertEqual(p["target_version"] as? String, "2.0.1")
        XCTAssertEqual(p["size"] as? Int, 2048)
        XCTAssertEqual(p["chunk_size"] as? Int, 180)
        XCTAssertEqual(p["sha256"] as? String, sha)
        XCTAssertEqual(p.count, 6, "manifest 齐备时六键齐全")
    }

    func testStartPayloadOmitsUnknownContractFields() {
        let bare = OtaStartPayload.build(manifestTarget: nil, manifestVersion: nil,
                                         fileSize: 10, chunkSize: 20, sha256: "x")
        XCTAssertNil(bare["target"], "无 manifest 不伪造枚举")
        XCTAssertNil(bare["target_version"])
        XCTAssertEqual(bare["op"] as? String, "start")
    }

    func testTargetEnumValidation() {
        XCTAssertTrue(OtaStartPayload.isValidTarget("lightble-peripheral"))
        XCTAssertTrue(OtaStartPayload.isValidTarget("lightble-observer"))
        XCTAssertFalse(OtaStartPayload.isValidTarget("1.2.3"))
        XCTAssertFalse(OtaStartPayload.isValidTarget("lightble"))
        XCTAssertFalse(OtaStartPayload.isValidTarget(""))
    }

    // MARK: manifest 解析

    func testManifestParseContractFields() {
        let sha = String(repeating: "b", count: 64)
        let json: [String: Any] = ["format_version": 1, "target": "lightble-peripheral",
                                   "hardware": "esp32c3", "firmware_version": "1.2.3",
                                   "size": 100, "sha256": sha, "extra_key": "x"]
        let info = try! OtaManifest.parse(json, fileSize: 100, actualSha256: sha).get()
        XCTAssertEqual(info.target, "lightble-peripheral")
        XCTAssertEqual(info.version, "1.2.3")
        XCTAssertEqual(info.ignoredKeys, ["extra_key"])
    }

    func testManifestParseLegacyVersionKey() {
        let json: [String: Any] = ["version": "0.9.9"]
        let info = try! OtaManifest.parse(json, fileSize: 1, actualSha256: "z").get()
        XCTAssertEqual(info.version, "0.9.9")
    }

    func testManifestParseFailures() {
        XCTAssertEqual(OtaManifest.parse(["target": "1.2.3"], fileSize: 1, actualSha256: "z"),
                       .failure(.invalidTarget("1.2.3")))
        XCTAssertEqual(OtaManifest.parse(["firmware_version": "v1.2"], fileSize: 1, actualSha256: "z"),
                       .failure(.invalidSemVer(key: "firmware_version", value: "v1.2")))
        XCTAssertEqual(OtaManifest.parse(["size": 5], fileSize: 6, actualSha256: "z"),
                       .failure(.sizeMismatch(manifest: 5, actual: 6)))
        XCTAssertEqual(OtaManifest.parse(["sha256": String(repeating: "c", count: 64)], fileSize: 1, actualSha256: String(repeating: "d", count: 64)),
                       .failure(.hashMismatch))
    }

    func testSha256Hex() {
        XCTAssertEqual(OtaManifest.sha256Hex(Data("abc".utf8)),
                       "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    }

    func testSemVer() {
        XCTAssertTrue(OtaManifest.isSemVer("1.2.3"))
        XCTAssertTrue(OtaManifest.isSemVer("1.2.3-rc.1"))
        XCTAssertFalse(OtaManifest.isSemVer("1.2"))
        XCTAssertFalse(OtaManifest.isSemVer("v1.2.3"))
    }
}
