import XCTest

final class TabBarUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-preview=p001-filter-empty"]
        app.launch()
    }

    func testFourTabsSwitchWithoutConnectionStateHijackingSelection() {
        XCTAssertTrue(app.buttons["扫描"].waitForExistence(timeout: 3))

        app.buttons["已连接，3"].tap()
        XCTAssertTrue(app.staticTexts["还没有连接中的设备"].waitForExistence(timeout: 2))

        app.buttons["广播"].tap()
        XCTAssertTrue(app.staticTexts["ADV 负载预算"].waitForExistence(timeout: 2))

        app.buttons["关于"].tap()
        XCTAssertTrue(app.staticTexts["应用信息"].waitForExistence(timeout: 2)) // F028 移除后锚点改应用信息

        app.buttons["扫描"].tap()
        XCTAssertTrue(app.staticTexts["附近设备"].waitForExistence(timeout: 2))
    }

    func testSecondaryPageCoversTabBar() {
        app.buttons["关于"].tap()
        let versionRow = app.buttons["about-version-row"]
        XCTAssertTrue(versionRow.waitForExistence(timeout: 2))
        versionRow.tap()
        XCTAssertTrue(app.buttons["复制版本信息"].waitForExistence(timeout: 3))
        XCTAssertFalse(app.buttons["扫描"].isHittable)
        XCTAssertFalse(app.buttons["已连接，3"].isHittable)
    }
}
