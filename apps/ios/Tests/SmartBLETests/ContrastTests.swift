//
//  ContrastTests.swift — 正典 token WCAG 对比度断言（iOS 侧，与 macOS CoreUnit CU-67..73 同源口径）
//  达标项硬断言；正典硬约束对（success/warning）锁数值入档——改值须走正典变更。
//

import XCTest

final class ContrastTests: XCTestCase {
    private func wcag(_ fg: String, _ bg: String) -> Double {
        func lum(_ hex: String) -> Double {
            var c: [Double] = []
            var idx = hex.startIndex
            while idx < hex.endIndex {
                let v = Double(Int(hex[idx..<hex.index(idx, offsetBy: 2)], radix: 16)!) / 255.0
                c.append(v <= 0.04045 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4))
                idx = hex.index(idx, offsetBy: 2)
            }
            return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
        }
        let la = lum(fg), lb = lum(bg)
        return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
    }

    func testReadingPairsPassWCAGAA() {
        XCTAssertGreaterThanOrEqual(wcag("18222E", "FFFFFF"), 4.5, "text on card 16.07")
        XCTAssertGreaterThanOrEqual(wcag("18222E", "F8FBFF"), 4.5, "text on bg 15.48")
        XCTAssertGreaterThanOrEqual(wcag("42536A", "FFFFFF"), 4.5, "sub on card 7.84")
        XCTAssertGreaterThanOrEqual(wcag("42536A", "F8FBFF"), 4.5, "sub on bg 7.56")
        XCTAssertGreaterThanOrEqual(wcag("60758D", "FFFFFF"), 4.5, "mut on card 4.74")
        XCTAssertGreaterThanOrEqual(wcag("60758D", "F8FBFF"), 4.5, "mut on bg 4.57")
    }

    func testActionPairsPassLargeTextUIMinimum() {
        XCTAssertGreaterThanOrEqual(wcag("1B6DFF", "FFFFFF"), 3.0, "primary on white 4.49（小号正文差 0.01 AA——正典约束在案）")
        XCTAssertGreaterThanOrEqual(wcag("FFFFFF", "1B6DFF"), 3.0, "white on primary 4.49")
        XCTAssertGreaterThanOrEqual(wcag("F2555F", "FFFFFF"), 3.0, "danger on white 3.37")
        XCTAssertGreaterThanOrEqual(wcag("FFFFFF", "F2555F"), 3.0, "white on danger 3.37")
    }

    func testCanonConstraintPairsLocked() {
        // 正典硬约束（<3:1）：success/warning 仅作状态图标/语义色块，禁止正文——数值锁档防漂移
        XCTAssertEqual(wcag("17C7A8", "FFFFFF"), 2.15, accuracy: 0.02)
        XCTAssertEqual(wcag("FF9F43", "FFFFFF"), 2.04, accuracy: 0.02)
    }
}
