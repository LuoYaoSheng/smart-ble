//
// AppRouter.swift — 页面路由（语义对齐原型内核 app.js：switchTab / go / back / redirect / smartGo）
// 四 Tab = p001/p007/p008/p009；二级页入栈；返回取栈顶。页面集 9 页（无 P004，2026-09-02 决策）。
//

import Foundation
import Combine

enum PageId: String, CaseIterable {
    case p001, p002, p003, p005, p006, p007, p008, p009, p010

    var num: String {
        switch self {
        case .p001: return "PAGE001"
        case .p002: return "PAGE002"
        case .p003: return "PAGE003"
        case .p005: return "PAGE005"
        case .p006: return "PAGE006"
        case .p007: return "PAGE007"
        case .p008: return "PAGE008"
        case .p009: return "PAGE009"
        case .p010: return "PAGE010"
        }
    }

    var title: String {
        switch self {
        case .p001: return "扫描"
        case .p002: return "配置 Smart HID"
        case .p003: return "Smart HID 设备详情"
        case .p005: return "SHID 诊断"
        case .p006: return "GATT 调试"
        case .p007: return "已连接"
        case .p008: return "广播"
        case .p009: return "关于"
        case .p010: return "版本记录"
        }
    }

    /// kind=tab 的页面显示 TabBar（正典 0.1：TabBar 四项）
    var isTab: Bool { self == .p001 || self == .p007 || self == .p008 || self == .p009 }
}

@MainActor
final class Router: ObservableObject {
    @Published private(set) var cur: PageId = .p001
    private(set) var stack: [PageId] = []

    func switchTab(_ id: PageId) {
        stack.removeAll()
        cur = id
    }

    func go(_ id: PageId) {
        stack.append(cur)
        cur = id
    }

    func redirect(_ id: PageId) {
        cur = id
    }

    @discardableResult
    func back() -> PageId {
        cur = stack.popLast() ?? .p001
        return cur
    }

    /// 页面栈感知导航（正典 0.1：目标页已在栈中时复用，避免叠加实例）
    func smartGo(_ id: PageId) {
        if let i = stack.firstIndex(of: id) {
            stack.removeSubrange((i + 1)...)
            cur = id
        } else {
            go(id)
        }
    }
}
