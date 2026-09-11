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

        // 首卡为 SHID-9F3E2A1C（含 SmartHID 入口 + 连接）；「连接」打开 GATT 详情 sheet。
        // iOS 26 模拟器合成事件在应用启动窗口偶发不可命中/被吞（真实触摸不受影响）：
        // 先轮询等 hittable（tap 对不可命中元素会直接抛错），再带重试补 tap
        let connect = app.buttons["连接"].firstMatch
        XCTAssertTrue(connect.waitForExistence(timeout: 5), "P001 设备卡连接入口未出现")
        var sheetOpened = false
        for _ in 0..<3 where !sheetOpened {
            let deadline = Date().addingTimeInterval(4)
            while !connect.isHittable && Date() < deadline {
                Thread.sleep(forTimeInterval: 0.3)
            }
            if connect.isHittable {
                connect.tap()
                sheetOpened = app.staticTexts["设备信息"].waitForExistence(timeout: 2)
            }
        }
        XCTAssertTrue(sheetOpened, "3 次重试后设备信息段仍未出现")
        XCTAssertTrue(app.staticTexts["广播数据"].exists, "广播数据段缺失")
        XCTAssertTrue(app.staticTexts["服务 UUIDs"].exists, "服务 UUIDs 行缺失（fixture 含 UUID）")

        // R04：平台未提供的字段标注（fixture 无 Service Data/厂商数据；iOS 无整包 hex）
        let missing = app.staticTexts.matching(identifier: "本轮平台 API 未提供此字段")
        XCTAssertTrue(missing.firstMatch.waitForExistence(timeout: 2), "缺失字段标注行未出现")
        XCTAssertGreaterThanOrEqual(missing.count, 3, "缺失字段标注行不足：\(missing.count)")

        // R04：复制 → toast「已复制」+ 剪贴板内容落板（App 侧回显探针验证；
        // runner 进程直读 UIPasteboard 会触发 iOS 粘贴板隐私授权，套件环境必挂）
        let copyButtons = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "复制")).allElementsBoundByIndex
        XCTAssertGreaterThanOrEqual(copyButtons.count, 2, "复制按钮不足两个")
        copyButtons[copyButtons.count - 1].tap()
        XCTAssertTrue(app.staticTexts["已复制"].waitForExistence(timeout: 2), "复制 toast 未出现")

        let echo = app.buttons["回显剪贴板"]
        XCTAssertTrue(echo.waitForExistence(timeout: 2), "剪贴板回显探针未出现")
        echo.tap()
        let echoLabel = app.staticTexts["paste-echo"]
        XCTAssertTrue(echoLabel.waitForExistence(timeout: 2), "回显标签未出现")
        let pasted = echoLabel.label
        XCTAssertTrue(pasted.contains("SHID-9F3E2A1C"), "剪贴板缺少设备 ID：\(pasted.prefix(80))")
        XCTAssertTrue(pasted.contains("服务 UUIDs"), "剪贴板缺少服务 UUIDs 段")
        XCTAssertTrue(pasted.contains("本轮平台 API 未提供此字段"), "剪贴板缺少缺失字段标注")
    }
}
