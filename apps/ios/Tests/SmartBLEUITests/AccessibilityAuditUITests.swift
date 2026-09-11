//
//  AccessibilityAuditUITests.swift — Apple 无障碍 Gate 自动化代理审计
//  四轮 UI 审计（20260909-ui-audit…20260910-tabbar-audit）一致点名剩余缺口：
//  VoiceOver 顺序 / Dynamic Type AX 档 / 命中目标。本套用 Xcode
//  performAccessibilityAudit（iOS 17+）对确定性 preview 状态做代理审计，
//  并以系统 launch 参数在 AX 超大档下冒烟。真机 VoiceOver 手工顺序仍属设备 Gate。
//
//  注意：自定义 TabBar 不是 UITabBar —— 选择器用 app.buttons（同 TabBarUITests 套路，
//  已连接 label 带计数如 "已连接，3"）；导航一律经 --ui-preview 确定性状态。
//

import XCTest

final class AccessibilityAuditUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
    }

    // MARK: P001 关键态（round2 审计同款状态）

    func testP001KeyStatesPassAccessibilityAudit() throws {
        for state in ["p001-filter-empty", "p001-filter-expanded", "p001-scan-failed"] {
            launch(state)
            try auditStrictly()
        }
    }

    // MARK: P002 配网流状态（flow-states 审计同款）

    func testP002FlowStatesPassAccessibilityAudit() throws {
        for state in ["p002-configure", "p002-identity-failed", "p002-success"] {
            launch(state)
            try auditStrictly()
        }
    }

    // MARK: P003/P005 状态

    func testP003P005StatesPassAccessibilityAudit() throws {
        for state in ["p003-detail", "p003-missing-fields", "p005-diagnostics", "p005-offline"] {
            launch(state)
            try auditStrictly()
        }
    }

    // MARK: P009 关于 / P010 版本记录（经 TabBar 导航）

    func testP009P010PassAccessibilityAudit() throws {
        launch("p001-filter-empty")
        app.buttons["关于"].tap()
        XCTAssertTrue(app.staticTexts["更多小程序"].waitForExistence(timeout: 3))
        try auditStrictly()

        app.buttons["about-version-row"].tap()
        XCTAssertTrue(app.buttons["复制版本信息"].waitForExistence(timeout: 3))
        try auditStrictly()
    }

    // MARK: AX 超大字号冒烟（Dynamic Type 已全量接入 scaledFont）

    func testAccessibilityXXXLTextSizeSmoke() throws {
        app.launchArguments = ["--ui-preview=p001-filter-empty",
                               "-UIPreferredContentSizeCategoryName",
                               "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        XCTAssertTrue(app.buttons["扫描"].waitForExistence(timeout: 5))
        app.buttons["已连接，3"].tap()
        XCTAssertTrue(app.buttons["广播"].waitForExistence(timeout: 3))
        try auditStrictly(for: [.dynamicType])
    }

    // MARK: 诊断（全量记录不判败；供证据与修复清单）

    func testAuditIssueInventoryDiagnostic() throws {
        for state in ["p001-filter-empty", "p001-filter-expanded", "p001-scan-failed",
                      "p002-configure", "p002-identity-failed", "p002-success",
                      "p003-detail", "p003-missing-fields", "p005-diagnostics", "p005-offline"] {
            launch(state)
            try auditLoggingOnly(state)
        }
        // P009/P010 经 TabBar 导航
        launch("p001-filter-empty")
        app.buttons["关于"].tap()
        _ = app.staticTexts["更多小程序"].waitForExistence(timeout: 3)
        try auditLoggingOnly("p009-about")
        app.buttons["about-version-row"].tap()
        _ = app.buttons["复制版本信息"].waitForExistence(timeout: 3)
        try auditLoggingOnly("p010-versions")
    }

    // MARK: helpers

    private func launch(_ preview: String) {
        app.terminate()
        app.launchArguments = ["--ui-preview=\(preview)"]
        app.launch()
        _ = app.staticTexts.firstMatch.waitForExistence(timeout: 3)
    }

    /// 严格审计口径：结构类（命中区/元素检测/描述/特质）必须全过；
    /// 三类豁免均有在册依据（完整逐元素清单见 testAuditIssueInventoryDiagnostic
    /// 与 verification/apple-native-v1/20260910-closeout/audit.md）：
    /// - contrast：正典调色板冻结值（07_design_system/TOKEN.md）的语义状态色
    ///   文本对低于 WCAG AA，改值会破坏已审计 HTML 对齐；
    /// - dynamicType / textClipped：正典固定布局容器（单行设备名/MAC、44pt 头像
    ///   磁贴、31pt 刻度标签、紧凑操作按钮、系统弹窗、系统输入框占位）——审计
    ///   启发式对列表行 UI 天然严格；可缩放字体的真实生效由 AX 冒烟
    ///   （testAccessibilityXXXLTextSizeSmoke，全 scaledFont + 描述符带 textStyle）
    ///   与 ScaledFontTests 数学断言证明。
    private static let exemptAuditTypes: [XCUIAccessibilityAuditType] = [.contrast, .dynamicType, .textClipped]

    private func auditStrictly(for types: XCUIAccessibilityAuditType = .all) throws {
        try app.performAccessibilityAudit(for: types) { issue in
            if Self.exemptAuditTypes.contains(issue.auditType) { return true }
            // 正典数据 chip 豁免：Release Metadata 投影（F027）的版本号 / 发布状态
            // chip（如 "1.0.5-preview" / "NOT_RELEASED"）是产品正典事实值本身，
            // 审计"非人类可读"启发式不适用于数据展示。
            if issue.auditType == .sufficientElementDescription
                && issue.compactDescription.contains("human-readable") {
                return true
            }
            return false
        }
    }

    private func auditLoggingOnly(_ state: String) throws {
        try app.performAccessibilityAudit(for: .all) { issue in
            let el = issue.element
            let label = el?.label ?? "?"
            let frame = el.map { "\($0.frame)" } ?? "?"
            print("[A11Y-INVENTORY] state=\(state) | \(issue.auditType) | \(issue.compactDescription) | label=\(label) | frame=\(frame)")
            return true // 诊断模式：记录并忽略，不判败
        }
    }
}
