// ObserverEvidenceTests.swift — F017 观察侧证据匹配（语义对齐 uniapp observer-evidence-adapter 正典）
import XCTest
@testable import SmartHidCore

final class ObserverEvidenceTests: XCTestCase {

    // MARK: - 事件类型门（type/t 别名）

    func testEventTypeGateAdvertisementAndObs() {
        let payload = BroadcastEvidencePayload(deviceName: "Dev")
        let adv = ObserverEvent(json: ["type": "advertisement", "name": "Dev"])
        XCTAssertTrue(ObserverEvidenceMatcher.match(adv, payload: payload).matched)

        let obs = ObserverEvent(json: ["t": "obs", "name": "Dev"])
        XCTAssertTrue(ObserverEvidenceMatcher.match(obs, payload: payload).matched)
    }

    func testNonAdvertisementEventNeverMatches() {
        let payload = BroadcastEvidencePayload(deviceName: "Dev")
        let gap = ObserverEvent(json: ["type": "gap", "name": "Dev"])
        let report = ObserverEvidenceMatcher.match(gap, payload: payload)
        XCTAssertFalse(report.matched)
        // 分检查通过但总判定被事件类型门拦截
        XCTAssertTrue(report.nameMatched)
    }

    // MARK: - 名称匹配（精确/包含/无约束/不匹配）

    func testNameMatching() {
        let payload = BroadcastEvidencePayload(deviceName: "LightBLE")
        XCTAssertTrue(ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true, name: "LightBLE-DevKit"), payload: payload).matched)
        XCTAssertTrue(ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true, name: "LightBLE"), payload: payload).matched)
        XCTAssertFalse(ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true, name: "Other"), payload: payload).matched)

        // 无约束：deviceName 为 nil → 恒真
        XCTAssertTrue(ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true, name: "Anything"), payload: .init()).nameMatched)
    }

    // MARK: - 服务 UUID 匹配（大小写/连字符不敏感；无约束恒真）

    func testServiceUuidMatchingCaseAndDashInsensitive() {
        let payload = BroadcastEvidencePayload(serviceUuid: "FFF0")
        let event = ObserverEvent(isAdvertisement: true, services: ["180A", "fFF0"])
        XCTAssertTrue(ObserverEvidenceMatcher.match(event, payload: payload).matched)

        // 与 JS 一致：比较是去连字符+小写后的整串相等（非子串）
        let fullUuid = "0000FFF0-0000-1000-8000-00805F9B34FB"
        let dashed = ObserverEvent(isAdvertisement: true, services: [fullUuid])
        XCTAssertTrue(ObserverEvidenceMatcher.match(
            dashed, payload: .init(serviceUuid: fullUuid.lowercased())).serviceMatched)
        // 16 位短码不等于 128 位全 UUID（JS 语义：不抹前缀）
        XCTAssertFalse(ObserverEvidenceMatcher.match(
            dashed, payload: .init(serviceUuid: "FFF0")).serviceMatched)

        // 观察端未上报任何服务 → 有约束时不匹配
        XCTAssertFalse(ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true), payload: payload).matched)
        // 无约束 → 恒真
        XCTAssertTrue(ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true), payload: .init()).serviceMatched)
    }

    // MARK: - 厂商 ID：小端/大端子串均命中

    func testManufacturerIdLittleAndBigEndian() {
        let payload = BroadcastEvidencePayload(manufacturerId: 0x9E45)
        let le = ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true, manufacturerRaw: "45 9E 01 FF"), payload: payload)
        XCTAssertTrue(le.manufacturerMatched)

        let be = ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true, manufacturerRaw: "9E4501FF"), payload: payload)
        XCTAssertTrue(be.manufacturerMatched)

        let wrong = ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true, manufacturerRaw: "1234"), payload: payload)
        XCTAssertFalse(wrong.manufacturerMatched)
        XCTAssertFalse(wrong.matched)
    }

    func testManufacturerDataUtf8HexContainment() {
        // "Hi" → 4869；厂商字段字节序 = idLE(0100) + data(4869)
        let ascii = ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true, manufacturerRaw: "01 00 48 69 FF"),
            payload: .init(manufacturerId: 1, manufacturerData: "Hi"))
        XCTAssertTrue(ascii.manufacturerMatched)

        // 非 ASCII：encodeURIComponent 路径等价于 UTF-8 字节（智 → e6 99 ba）；idBE(ffff) 前缀同样命中
        let cjk = ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true, manufacturerRaw: "FFFFE699BA"),
            payload: .init(manufacturerId: 0xFFFF, manufacturerData: "智"))
        XCTAssertTrue(cjk.manufacturerMatched)

        // id 命中但 data 不在串中 → 失败
        let miss = ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true, manufacturerRaw: "0100"),
            payload: .init(manufacturerId: 1, manufacturerData: "Hi"))
        XCTAssertFalse(miss.manufacturerMatched)
    }

    func testManufacturerUnconstrainedWithoutId() {
        // JS 口径：payload.manufacturer.id 缺省 → 厂商检查整体跳过（恒真）
        let report = ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true, manufacturerRaw: "随便什么"),
            payload: .init(manufacturerData: "Hi"))
        XCTAssertTrue(report.manufacturerMatched)
        XCTAssertTrue(report.matched)
    }

    // MARK: - JSON 别名解析 + 报告字段透传

    func testJsonAliasesAndReportPassthrough() {
        let json: [String: Any] = [
            "t": "obs",
            "name": "LightBLE-DevKit",
            "uuids": ["FFF0"],
            "mfg": "01 00 48 69",
            "rssi": -59,
            "ts": 1_754_500_000_000.0,
        ]
        let report = ObserverEvidenceMatcher.match(
            observerJson: json,
            payload: .init(deviceName: "LightBLE", serviceUuid: "fff0",
                           manufacturerId: 0x0001, manufacturerData: "Hi"),
            nowMs: 1)
        XCTAssertTrue(report.matched)
        XCTAssertTrue(report.nameMatched && report.serviceMatched && report.manufacturerMatched)
        XCTAssertEqual(report.rssi, -59)
        XCTAssertEqual(report.timestampMs, 1_754_500_000_000.0)

        // services/manufacturer 长别名同样可用
        let longForm: [String: Any] = [
            "type": "advertisement", "name": "X",
            "services": ["FFF0"], "manufacturer": "459E",
            "rssi": -70, "timestamp": 42.0,
        ]
        let longReport = ObserverEvidenceMatcher.match(observerJson: longForm, payload: .init(manufacturerId: 0x9E45))
        XCTAssertTrue(longReport.matched)
        XCTAssertEqual(longReport.timestampMs, 42.0)
    }

    func testTimestampFallsBackToNow() {
        let report = ObserverEvidenceMatcher.match(
            .init(isAdvertisement: true), payload: .init(), nowMs: nil)
        XCTAssertGreaterThan(report.timestampMs, 1_700_000_000_000)
    }

    // MARK: - 归一化助手

    func testNormalizeHelpers() {
        XCTAssertEqual(ObserverEvidenceMatcher.normalizeHex("AA:BB-cc 01"), "aabbcc01")
        XCTAssertEqual(ObserverEvidenceMatcher.utf8Hex("Hi 智"), "486920e699ba")
        XCTAssertTrue(ObserverEvidenceMatcher.sameUuid("0000FFF0-0000-1000-8000-00805F9B34FB",
                                                       "0000fff0-0000-1000-8000-00805f9b34fb"))
        XCTAssertFalse(ObserverEvidenceMatcher.sameUuid("FFF1", "fff0"))
    }
}
