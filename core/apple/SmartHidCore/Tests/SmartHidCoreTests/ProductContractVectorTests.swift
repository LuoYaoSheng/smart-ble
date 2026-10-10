//
//  ProductContractVectorTests.swift — 产品级跨语言向量消费者（Swift 线，MAC-008）
// 事实源：core/protocols/ble-product-v1-vectors.json 的 otaTargets / otaSemVer 套件。
// 约定：与 smart-hid 线一致，Swift 侧镜像消费向量用例（同 id）；per-platform
// 分歧用例（D-SEMVER-1/2）以 swift 侧期望断言，分歧本身在向量文件内登记。
//

import XCTest
@testable import SmartHidCore

final class ProductContractVectorTests: XCTestCase {

    // MARK: otaTargets（OtaStartPayload.isValidTarget）

    func testOtaTargetPeripheral() { XCTAssertTrue(OtaStartPayload.isValidTarget("lightble-peripheral")) }
    func testOtaTargetObserver() { XCTAssertTrue(OtaStartPayload.isValidTarget("lightble-observer")) }
    func testOtaTargetUnknownSuffix() { XCTAssertFalse(OtaStartPayload.isValidTarget("lightble-peripheral-x")) }
    func testOtaTargetEmpty() { XCTAssertFalse(OtaStartPayload.isValidTarget("")) }
    func testOtaTargetCaseSensitive() { XCTAssertFalse(OtaStartPayload.isValidTarget("LightBLE-Peripheral")) }

    // MARK: otaSemVer（OtaManifest.isSemVer）

    func testSemVerRelease() { XCTAssertTrue(OtaManifest.isSemVer("1.0.0")) }
    func testSemVerPatchZero() { XCTAssertTrue(OtaManifest.isSemVer("0.0.1")) }
    func testSemVerPrerelease() { XCTAssertTrue(OtaManifest.isSemVer("1.2.3-beta.1")) }
    func testSemVerTwoPart() { XCTAssertFalse(OtaManifest.isSemVer("1.0")) }
    func testSemVerVPrefix() { XCTAssertFalse(OtaManifest.isSemVer("v1.0.0")) }
    func testSemVerEmptyPrerelease() { XCTAssertFalse(OtaManifest.isSemVer("1.0.0-")) }

    // D-SEMVER-1：build-meta——JS 完整 SemVer 接受、Swift 不接受（分歧在册，向量 expect 分平台）
    func testSemVerBuildMetaDivergence() { XCTAssertFalse(OtaManifest.isSemVer("1.2.3+build.5")) }
    // D-SEMVER-2：前导零——JS 严格拒绝、Swift \d+ 接受（分歧在册）
    func testSemVerLeadingZeroDivergence() { XCTAssertTrue(OtaManifest.isSemVer("01.0.0")) }
}
