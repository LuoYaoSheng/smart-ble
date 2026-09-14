//
// PageContractTests.swift — 页面契约测试（MAC-007）
// 锁定：9 页页面集（无 P004，2026-09-02 零持久化决策）、四 Tab、
// 路由栈语义（switchTab 清栈 / go+back 配对 / redirect 原位 / smartGo 复用栈内页）。
//

import XCTest
@testable import SmartBLE_mac

@MainActor
final class PageContractTests: XCTestCase {

    func testPageSetMatchesCanonNinePages() {
        let ids = Set(PageId.allCases.map(\.rawValue))
        XCTAssertEqual(ids, ["p001", "p002", "p003", "p005", "p006", "p007", "p008", "p009", "p010"])
        XCTAssertFalse(ids.contains("p004"), "P004 历史页已随零持久化决策移除，不得回流")
    }

    func testExactlyFourTabs() {
        let tabs = PageId.allCases.filter(\.isTab)
        XCTAssertEqual(tabs, [.p001, .p007, .p008, .p009])
        XCTAssertTrue(PageId.p001.isTab)
        XCTAssertFalse(PageId.p006.isTab)
    }

    func testTitlesCoverAllPages() {
        for page in PageId.allCases {
            XCTAssertFalse(page.title.isEmpty, "\(page.rawValue) 缺标题")
            XCTAssertEqual(page.num, "PAGE" + page.rawValue.dropFirst().uppercased())
        }
    }

    func testSwitchTabClearsStack() {
        let router = Router()
        router.go(.p006)
        router.go(.p010)
        router.switchTab(.p008)
        XCTAssertEqual(router.cur, .p008)
        XCTAssertTrue(router.stack.isEmpty, "switchTab 必须清空二级页栈")
    }

    func testGoAndBackPairing() {
        let router = Router()
        router.go(.p002)
        XCTAssertEqual(router.cur, .p002)
        XCTAssertEqual(router.back(), .p001, "返回取栈顶")
        XCTAssertEqual(router.back(), .p001, "空栈返回兜底首页")
    }

    func testRedirectKeepsStack() {
        let router = Router()
        router.go(.p003)
        router.redirect(.p005)
        XCTAssertEqual(router.cur, .p005)
        XCTAssertEqual(router.stack, [.p001], "redirect 只换当前页不动栈")
    }

    func testSmartGoReusesStackedPage() {
        let router = Router()
        router.go(.p003)
        router.go(.p005)
        router.smartGo(.p003)
        XCTAssertEqual(router.cur, .p003)
        XCTAssertEqual(router.stack, [.p001, .p003], "smartGo 裁剪目标页之上的叠页")
        XCTAssertEqual(router.stack.filter { $0 == .p003 }.count, 1, "不叠加重复实例")
    }
}
