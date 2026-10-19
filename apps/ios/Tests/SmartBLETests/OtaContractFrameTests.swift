//
//  OtaContractFrameTests.swift — iOS OTA 帧契约断言（R-1/R-2 对齐）
//  事实源：contracts/target/ota-package.schema.json + docs/specs/06_review/OTA_CONTRACT_R1_R2_DECISION.md
//

import XCTest
import SmartHidCore
@testable import SmartBLE

final class OtaContractFrameTests: XCTestCase {
    func testStartFrameSixContractKeys() {
        let sha = String(repeating: "a", count: 64)
        let p = OtaStartPayload.build(manifestTarget: "lightble-peripheral", manifestVersion: "1.2.3",
                                      fileSize: 1024, chunkSize: 180, sha256: sha)
        // 旧实现发 {"action":"start",...,"firmware_version":"iOS-build"} —— 键名与契约全不符
        XCTAssertEqual(p["op"] as? String, "start")
        XCTAssertEqual(p["target"] as? String, "lightble-peripheral")
        XCTAssertEqual(p["target_version"] as? String, "1.2.3")
        XCTAssertEqual(p["size"] as? Int, 1024)
        XCTAssertEqual(p["chunk_size"] as? Int, 180)
        XCTAssertEqual(p["sha256"] as? String, sha)
        XCTAssertEqual(p.count, 6)
    }

    func testCommitFrameUsesContractOp() {
        XCTAssertEqual(String(data: OtaManager.commitFrame, encoding: .utf8), #"{"op":"commit"}"#)
    }

    func testStatusClassifierRejectsAbortedFrame() {
        // R-2：旧实现 contains("fail") 漏检 aborted（固件 ota_server.cpp:280）
        if case .error = OtaStatusClassifier.classify(Data(#"{"type":"ota","status":"aborted"}"#.utf8)) {} else {
            XCTFail("aborted 帧应判错误")
        }
    }
}
