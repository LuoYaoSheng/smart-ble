import Foundation
import XCTest
@testable import SmartHidCore

final class SmartHidCoreTests: XCTestCase {
    private typealias JSONObject = [String: Any]

    private lazy var root: JSONObject = {
        let testDirectory = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        let repositoryCore = testDirectory
            .deletingLastPathComponent() // Tests
            .deletingLastPathComponent() // SmartHidCore
            .deletingLastPathComponent() // apple
            .deletingLastPathComponent() // core
        let vectorURL = repositoryCore.appendingPathComponent("protocols/smart-hid-v1-vectors.json")
        guard let object = try? JSONSerialization.jsonObject(with: Data(contentsOf: vectorURL)),
              let root = object as? JSONObject else {
            XCTFail("Unable to load Smart HID vectors at \(vectorURL.path)")
            return [:]
        }
        return root
    }()

    func testCanonicalConstants() throws {
        let constants = try dictionary(root, "constants")
        let characteristics = try dictionary(constants, "characteristicUuids")
        let frame = try dictionary(constants, "frame")

        XCTAssertEqual(HidProtocol.serviceUuid, try string(constants, "serviceUuid"))
        XCTAssertEqual(HidProtocol.infoCharUuid, try string(characteristics, "info"))
        XCTAssertEqual(HidProtocol.inputCharUuid, try string(characteristics, "input"))
        XCTAssertEqual(HidProtocol.statusCharUuid, try string(characteristics, "status"))
        XCTAssertEqual(HidProtocol.namePrefix, try string(constants, "namePrefix"))
        XCTAssertEqual(HidProtocol.protocolVersion, try string(constants, "protocolVersion"))
        XCTAssertEqual(HidProtocol.candidateVersion, try integer(constants, "candidateVersion"))
        XCTAssertEqual(HidProtocol.deviceIdPattern, try string(constants, "deviceIdPattern"))
        XCTAssertEqual(HidProtocol.deviceNamePattern, try string(constants, "deviceNamePattern"))
        XCTAssertEqual(HidProtocol.tokenPattern, try string(constants, "tokenPattern"))
        XCTAssertEqual(HidProtocol.qrScheme, try string(constants, "qrScheme"))
        XCTAssertEqual(HidProtocol.defaultPairingPort, try integer(constants, "defaultPairingPort"))
        XCTAssertEqual(HidFraming.frameHeaderSize, try integer(frame, "headerSize"))
        XCTAssertEqual(HidFraming.maxChunkBytes, try integer(frame, "maxChunkBytes"))
        XCTAssertEqual(HidFraming.maxAssembledBytes, try integer(frame, "maxAssembledBytes"))
        XCTAssertEqual(HidFraming.maxFrames, try integer(frame, "maxFrames"))
        XCTAssertEqual(HidFraming.defaultAttMtu, try integer(frame, "defaultAttMtu"))
        XCTAssertEqual(HidProtocol.states, try strings(constants, "states"))
        XCTAssertEqual(HidProtocol.steps, try strings(constants, "steps"))
        XCTAssertEqual(HidProtocol.errorCodes, try strings(constants, "errorCodes"))
        XCTAssertEqual(HidProtocol.errorHints, try stringDictionary(constants, "errorHints"))
    }

    func testPairingQrVectors() throws {
        for item in try cases("qr") {
            let id = try string(item, "id")
            let expected = try dictionary(item, "expect")
            let result = HidProtocol.parsePairingQr(try string(item, "input"))
            if try boolean(expected, "ok") {
                let value = try XCTUnwrap(result, id)
                XCTAssertEqual(value.token, try string(expected, "token"), id)
                XCTAssertEqual(value.host, try string(expected, "host"), id)
                XCTAssertEqual(value.port, try integer(expected, "port"), id)
            } else {
                XCTAssertNil(result, id)
            }
        }
    }

    func testCandidateVectors() throws {
        for item in try cases("candidate") {
            let id = try string(item, "id")
            let input = try dictionary(item, "input")
            let expected = try dictionary(item, "expect")
            let operation = {
                try HidProtocol.buildCandidateJson(
                    ssid: try self.string(input, "wifi_ssid"),
                    password: try self.string(input, "wifi_password"),
                    hubHost: try self.string(input, "hub_host"),
                    hubPort: input["hub_port"] as? Int,
                    token: try self.string(input, "token")
                )
            }
            if try boolean(expected, "ok") {
                XCTAssertEqual(try operation(), try string(expected, "json"), id)
            } else {
                XCTAssertThrowsError(try operation(), id)
            }
        }
    }

    func testMtuVectors() throws {
        for item in try cases("framingMtu") {
            let id = try string(item, "id")
            XCTAssertEqual(
                HidFraming.chunkSize(forMtu: try integer(item, "mtu")),
                try integer(item, "expect"),
                id
            )
        }
    }

    func testFrameVectors() throws {
        for item in try cases("frames") {
            let id = try string(item, "id")
            let expected = try dictionary(item, "expect")
            let payload: [UInt8]
            if let payloadHex = item["payloadHex"] as? String {
                payload = try bytes(hex: payloadHex)
            } else {
                let fill = try dictionary(item, "fill")
                let byte = try XCTUnwrap(UInt8(try string(fill, "byte"), radix: 16), id)
                payload = [UInt8](repeating: byte, count: try integer(fill, "length"))
            }
            let operation = {
                try HidFraming.buildFrames(payload, chunkSize: try self.integer(item, "chunkSize"))
                    .map(self.hex)
            }
            if try boolean(expected, "ok") {
                XCTAssertEqual(try operation(), try strings(expected, "frames"), id)
            } else {
                XCTAssertThrowsError(try operation(), id)
            }
        }
    }

    func testDeviceInfoVectors() throws {
        for item in try cases("deviceInfo") {
            let id = try string(item, "id")
            let expected = try dictionary(item, "expect")
            let result = HidProtocol.parseDeviceInfo(try string(item, "input"))
            if try boolean(expected, "ok") {
                let value = try XCTUnwrap(result, id)
                XCTAssertEqual(value.product, try string(expected, "product"), id)
                XCTAssertEqual(value.protocolVersion, try string(expected, "protocol"), id)
                XCTAssertEqual(value.deviceId, try string(expected, "device_id"), id)
                XCTAssertEqual(value.firmware, try string(expected, "firmware"), id)
                XCTAssertEqual(value.state, try string(expected, "state"), id)
                XCTAssertEqual(value.provisioned, try boolean(expected, "provisioned"), id)
            } else {
                XCTAssertNil(result, id)
            }
        }
    }

    func testStatusVectors() throws {
        for item in try cases("status") {
            let id = try string(item, "id")
            let expected = try dictionary(item, "expect")
            let result = HidProtocol.parseProvisionStatus(try string(item, "input"))
            if try boolean(expected, "ok") {
                let value = try XCTUnwrap(result, id)
                XCTAssertEqual(value.state, try string(expected, "state"), id)
                XCTAssertEqual(value.step, try string(expected, "step"), id)
                XCTAssertEqual(value.error, expected["error"] as? String, id)
            } else {
                XCTAssertNil(result, id)
            }
        }
    }

    func testRecoveryVectors() throws {
        for item in try cases("errorRecovery") {
            let id = try string(item, "id")
            XCTAssertEqual(
                HidProtocol.recoveryAction(forErrorCode: try string(item, "code")),
                try string(item, "expect"),
                id
            )
        }
    }

    func testStatusRowsCoverTerminalAndFailureStates() {
        XCTAssertEqual(HidProtocol.mapRows(state: "ready", step: "ready", error: nil), [
            "wifi": "done", "hub": "done", "conn": "done", "usb": "done",
        ])
        XCTAssertEqual(HidProtocol.mapRows(state: "provisioning", step: "pairing", error: nil)["hub"], "active")
        XCTAssertEqual(HidProtocol.mapRows(state: "error", step: "connecting_wifi", error: "wifi_failed")["wifi"], "fail")
        XCTAssertEqual(HidProtocol.mapRows(state: "error", step: "", error: "mqtt_invalid")["conn"], "fail")
        XCTAssertEqual(HidProtocol.mapRows(state: "error", step: "", error: "storage_failed")["usb"], "fail")
    }

    private func cases(_ suite: String) throws -> [JSONObject] {
        let suites = try dictionary(root, "suites")
        let suiteObject = try dictionary(suites, suite)
        return try XCTUnwrap(suiteObject["cases"] as? [JSONObject], suite)
    }

    private func dictionary(_ object: JSONObject, _ key: String) throws -> JSONObject {
        try XCTUnwrap(object[key] as? JSONObject, key)
    }

    private func string(_ object: JSONObject, _ key: String) throws -> String {
        try XCTUnwrap(object[key] as? String, key)
    }

    private func integer(_ object: JSONObject, _ key: String) throws -> Int {
        try XCTUnwrap(object[key] as? Int, key)
    }

    private func boolean(_ object: JSONObject, _ key: String) throws -> Bool {
        try XCTUnwrap(object[key] as? Bool, key)
    }

    private func strings(_ object: JSONObject, _ key: String) throws -> [String] {
        try XCTUnwrap(object[key] as? [String], key)
    }

    private func stringDictionary(_ object: JSONObject, _ key: String) throws -> [String: String] {
        try XCTUnwrap(object[key] as? [String: String], key)
    }

    private func bytes(hex: String) throws -> [UInt8] {
        guard hex.count.isMultiple(of: 2) else { throw VectorError.invalidHex(hex) }
        return try stride(from: 0, to: hex.count, by: 2).map { offset in
            let start = hex.index(hex.startIndex, offsetBy: offset)
            let end = hex.index(start, offsetBy: 2)
            guard let byte = UInt8(hex[start..<end], radix: 16) else { throw VectorError.invalidHex(hex) }
            return byte
        }
    }

    private func hex(_ bytes: [UInt8]) -> String {
        bytes.map { String(format: "%02x", $0) }.joined()
    }

    private enum VectorError: Error {
        case invalidHex(String)
    }
}
