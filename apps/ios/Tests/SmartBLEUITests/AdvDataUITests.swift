import XCTest

/// F004 广播数据查看（R04）：设备详情广播数据完整展示 + 缺失字段标注 + 复制写入剪贴板
final class AdvDataUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
    }

    func testP001DeviceDetailShowsAdvertisementDataAndCopies() {
        app.launchArguments = ["--ui-preview=p001-filter-expanded", "--ui-test-echo-pasteboard"]
        app.launch()

        let connect = app.buttons["连接"].firstMatch
        XCTAssertTrue(connect.waitForExistence(timeout: 5), "P001 设备卡连接入口未出现")
        XCTAssertTrue(waitUntilHittable(connect), "设备连接入口不可点击")
        connect.tap()
        XCTAssertTrue(app.staticTexts["设备信息"].waitForExistence(timeout: 5), "设备信息段未出现")
        XCTAssertTrue(app.staticTexts["广播数据"].exists, "广播数据段缺失")
        XCTAssertTrue(app.staticTexts["服务 UUIDs"].exists, "服务 UUIDs 行缺失（fixture 含 UUID）")

        // R04：平台未提供的字段标注（fixture 无 Service Data/厂商数据；iOS 无整包 hex）
        let missing = app.staticTexts.matching(identifier: "本轮平台 API 未提供此字段")
        XCTAssertTrue(missing.firstMatch.waitForExistence(timeout: 2), "缺失字段标注行未出现")
        XCTAssertGreaterThanOrEqual(missing.count, 3, "缺失字段标注行不足：\(missing.count)")

        // Product feedback is tied to a verified clipboard write and remains
        // visible on the exact copy button. The transient toast is not the oracle.
        let copy = app.buttons["advertisement-copy"]
        XCTAssertTrue(copy.waitForExistence(timeout: 3))
        XCTAssertTrue(waitUntilHittable(copy), "广播数据复制入口不可点击")
        let screen = app.frame
        XCTAssertGreaterThanOrEqual(copy.frame.minX, screen.minX)
        XCTAssertLessThanOrEqual(copy.frame.maxX, screen.maxX, "复制按钮超出手机可见宽度")
        copy.tap()
        let confirmed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "label == %@", "广播数据已复制"), object: copy)
        XCTAssertEqual(XCTWaiter.wait(for: [confirmed], timeout: 5), .completed, "复制动作未得到已写入反馈")
        // Identical content is a successful copy too; do not require a changed
        // system revision count. The echo below reads back this second copy.
        copy.tap()
        XCTAssertEqual(copy.label, "广播数据已复制", "重复复制相同内容不得显示失败")

        let echo = app.buttons["回显剪贴板"]
        XCTAssertTrue(echo.waitForExistence(timeout: 2), "剪贴板回显探针未出现")
        XCTAssertTrue(bringIntoView(echo), "剪贴板回显探针不可点击")
        echo.tap()
        let echoLabel = app.staticTexts["paste-echo"]
        XCTAssertTrue(echoLabel.waitForExistence(timeout: 2), "回显标签未出现")
        let pasted = echoLabel.label
        XCTAssertTrue(pasted.contains("SHID-9F3E2A1C"), "剪贴板缺少设备 ID：\(pasted.prefix(80))")
        XCTAssertTrue(pasted.contains("服务 UUIDs"), "剪贴板缺少服务 UUIDs 段")
        XCTAssertTrue(pasted.contains("本轮平台 API 未提供此字段"), "剪贴板缺少缺失字段标注")
    }
    private func bringIntoView(_ element: XCUIElement) -> Bool {
        for _ in 0..<4 {
            if element.isHittable { return true }
            let scroll = app.scrollViews.matching(NSPredicate(format: "hittable == true")).firstMatch
            guard scroll.exists else { return false }
            scroll.swipeUp()
        }
        return waitUntilHittable(element)
    }

    private func waitUntilHittable(_ element: XCUIElement) -> Bool {
        let ready = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true AND hittable == true"), object: element)
        return XCTWaiter.wait(for: [ready], timeout: 5) == .completed
    }

}
