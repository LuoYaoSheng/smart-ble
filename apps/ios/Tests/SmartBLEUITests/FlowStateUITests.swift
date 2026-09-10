import XCTest

final class FlowStateUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
    }

    func testP002IdentitySuccessAndWifiFailureStates() {
        launch("p002-identity-failed")
        XCTAssertTrue(app.buttons["重新连接"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["返回设备列表"].exists)

        launch("p002-success")
        XCTAssertTrue(app.staticTexts["配置成功 · 设备 READY"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["查看设备"].exists)

        launch("p002-wifi-failed")
        XCTAssertTrue(app.staticTexts["wifi_failed"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["返回表单修改"].exists)
    }

    func testP003SnapshotMissingFieldsAndMissingRecordStates() {
        launch("p003-detail")
        XCTAssertTrue(app.staticTexts["设备身份"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["重新配置"].exists)

        launch("p003-missing-fields")
        XCTAssertTrue(app.staticTexts["协议未记录"].waitForExistence(timeout: 3))

        launch("p003-empty")
        XCTAssertTrue(app.staticTexts["设备记录不存在"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.alerts["提示"].buttons["知道了"].exists)
    }

    func testP005HealthyOfflineAndFailureStates() {
        launch("p005-diagnostics")
        XCTAssertTrue(app.staticTexts["实时检测完成"].waitForExistence(timeout: 3))

        launch("p005-offline")
        XCTAssertTrue(app.staticTexts["设备未连接"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.staticTexts["待检测"].firstMatch.exists)

        launch("p005-error")
        XCTAssertTrue(app.staticTexts["检测失败"].waitForExistence(timeout: 3))
        XCTAssertTrue(app.buttons["显示错误码（详细信息）"].exists)
    }

    private func launch(_ preview: String) {
        app.terminate()
        app.launchArguments = ["--ui-preview=\(preview)"]
        app.launch()
    }
}
