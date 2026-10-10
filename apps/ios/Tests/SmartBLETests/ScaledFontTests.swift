//
//  ScaledFontTests.swift — Dynamic Type 缩放数学断言（无障碍 Gate）
//  默认档逐点相等（UI 审计基线不回归）+ AX 档放大 + 大小写档缩小。
//

import XCTest
#if canImport(UIKit)
import UIKit

final class ScaledFontTests: XCTestCase {
    private func scaled(_ size: CGFloat, _ style: UIFont.TextStyle,
                        _ category: UIContentSizeCategory) -> CGFloat {
        UIFontMetrics(forTextStyle: style).scaledValue(
            for: size,
            compatibleWith: UITraitCollection(preferredContentSizeCategory: category))
    }

    func testDefaultSizeUnchanged() {
        // 默认档（.large）下 HTML 令牌字号逐点相等——四轮 UI 审计的默认态基线
        for size in [10, 11, 12, 13, 14, 15, 17, 20, 22, 24, 28] {
            XCTAssertEqual(scaled(CGFloat(size), .body, .large), CGFloat(size))
            XCTAssertEqual(scaled(CGFloat(size), .caption1, .large), CGFloat(size))
            XCTAssertEqual(scaled(CGFloat(size), .title2, .large), CGFloat(size))
        }
    }

    func testScaledFontDescriptorKeepsDefaultPointSize() {
        // ScaledFontModifier 实际路径：scaledFont 桥接后默认档 pointSize 不变
        let base = UIFont.systemFont(ofSize: 14, weight: .semibold)
        let f = UIFontMetrics(forTextStyle: .body).scaledFont(
            for: base,
            compatibleWith: UITraitCollection(preferredContentSizeCategory: .large))
        XCTAssertEqual(f.pointSize, 14)
        let mono = UIFont.monospacedSystemFont(ofSize: 11, weight: .regular)
        let fm = UIFontMetrics(forTextStyle: .caption1).scaledFont(
            for: mono,
            compatibleWith: UITraitCollection(preferredContentSizeCategory: .large))
        XCTAssertEqual(fm.pointSize, 11)
        XCTAssertEqual(fm.fontName, mono.fontName, "等宽设计保持")
    }

    func testAccessibilitySizesScaleUp() {
        for size in [11.0, 13.0, 17.0, 28.0] {
            let ax = scaled(size, .body, .accessibilityExtraExtraExtraLarge)
            XCTAssertGreaterThan(ax, size, "AX 档必须放大 \(size)pt")
        }
    }

    func testSmallerSizesScaleDown() {
        let small = scaled(17.0, .body, .extraSmall)
        XCTAssertLessThan(small, 17.0, "最小档允许缩小（系统曲线）")
        XCTAssertGreaterThan(small, 0)
    }

    func testCaptionCurveIsSteeperAtAXThanBody() {
        // UIKit 标准行为：同一基础字号下 caption 曲线在 AX 档放大倍率高于 body
        // （弱文字随系统 caption 语义同步放大，与系统应用一致）
        let body = scaled(12.0, .body, .accessibilityLarge)
        let caption = scaled(12.0, .caption1, .accessibilityLarge)
        XCTAssertGreaterThan(caption, body)
        XCTAssertGreaterThan(body, 12.0)
    }
}
#endif
