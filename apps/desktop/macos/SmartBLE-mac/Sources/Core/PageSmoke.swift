//
// SmartBLE Desktop for macOS - Page Smoke Runner
//
// `--smoke-pages` 驱动三个页面（扫描页 / 设备详情页 / 日志页）的真实代码路径：
// 按钮 action、Combine 绑定、FilterPanel 委托、设备表格选择联动、工具栏动作。
// 不截屏，通过读取 UI 控件状态输出结构化 [UISMOKE] 日志；
// 进程退出码 = 失败步骤数（0 = 全部通过，SKIP 不计失败）。
//

import Cocoa

@MainActor
final class PageSmoke {
    private let controller: MainWindowController
    private var failures = 0
    private var skips = 0

    private init(controller: MainWindowController) {
        self.controller = controller
    }

    /// 入口：main.swift 在窗口显示后调用；非 --smoke-pages 启动时无副作用
    nonisolated static func runIfRequested() {
        guard CommandLine.arguments.contains("--smoke-pages") else { return }
        print("[UISMOKE] mode=smoke-pages app=SmartBLE-mac")
        Task { @MainActor in
            var windowController: MainWindowController?
            for _ in 0..<10 {
                windowController = NSApp.windows
                    .compactMap { $0.windowController as? MainWindowController }
                    .first
                if windowController != nil { break }
                try? await Task.sleep(nanoseconds: 100_000_000)
            }
            guard let windowController = windowController else {
                print("[UISMOKE] FATAL result=FAIL detail=\"MainWindowController not found\"")
                fflush(stdout)
                exit(2)
            }
            await PageSmoke(controller: windowController).runSequence()
        }
    }

    // MARK: - Structured output

    private func check(_ id: String, _ ok: Bool, _ detail: String) {
        if ok {
            print("[UISMOKE] \(id) result=PASS detail=\"\(detail)\"")
        } else {
            failures += 1
            print("[UISMOKE] \(id) result=FAIL detail=\"\(detail)\"")
        }
    }

    private func skip(_ id: String, _ reason: String) {
        skips += 1
        print("[UISMOKE] \(id) result=SKIP reason=\"\(reason)\"")
    }

    private func settle(_ ms: UInt64 = 350) async {
        try? await Task.sleep(nanoseconds: ms * 1_000_000)
    }

    // MARK: - View traversal helpers

    private var contentView: NSView? { controller.window?.contentView }

    private func allSubviews(of view: NSView) -> [NSView] {
        var result: [NSView] = []
        for sub in view.subviews {
            result.append(sub)
            result.append(contentsOf: allSubviews(of: sub))
        }
        return result
    }

    private func first<T: NSView>(ofType type: T.Type) -> T? {
        guard let content = contentView else { return nil }
        return allSubviews(of: content).compactMap { $0 as? T }.first
    }

    private func button(titled title: String) -> NSButton? {
        guard let content = contentView else { return nil }
        return allSubviews(of: content)
            .compactMap { $0 as? NSButton }
            .first { $0.title == title }
    }

    private func label(where predicate: (NSTextField) -> Bool) -> NSTextField? {
        guard let content = contentView else { return nil }
        return allSubviews(of: content)
            .compactMap { $0 as? NSTextField }
            .first { $0 != nil && predicate($0) }
    }

    private var manager: BLEManager? { controller.bleManager }

    // MARK: - Step sequence

    private func runSequence() async {
        // UIS-01 三页装配：窗口 + 扫描页(FilterPanel/NSTableView) + 详情页(ServicePanel) + 日志页(LogPanel)
        let filterPanel = first(ofType: FilterPanel.self)
        let tableView = first(ofType: NSTableView.self)
        let servicePanel = first(ofType: ServicePanel.self)
        let logPanel = first(ofType: LogPanel.self)
        let windowVisible = controller.window?.isVisible ?? false
        check(
            "UIS-01",
            windowVisible && filterPanel != nil && tableView != nil && servicePanel != nil && logPanel != nil,
            "windowVisible=\(windowVisible) filterPanel=\(filterPanel != nil) tableView=\(tableView != nil) servicePanel=\(servicePanel != nil) logPanel=\(logPanel != nil)")

        // 等待 CBCentralManager 进入 poweredOn（应用启动即创建，r1 实测 <1s）
        try? await Task.sleep(nanoseconds: 700_000_000)

        // UIS-02 扫描页-真实按钮 action：点击 Start Scan → manager.startScan → isScanning 绑定回按钮
        let scanButton = button(titled: "Start Scan")
        scanButton?.performClick(nil)
        await settle()
        let stopButton = button(titled: "Stop Scan")
        let scanningLabel = label { $0.stringValue == "Scanning..." }
        check(
            "UIS-02",
            stopButton != nil && scanningLabel != nil && (manager?.isScanning ?? false),
            "buttonTitle=\(stopButton?.title ?? "nil") status=\(scanningLabel?.stringValue ?? "nil") managerIsScanning=\(manager?.isScanning ?? false)")

        // 等待 5s 自动停止（与 UniApp 对齐的行为）+ 余量
        try? await Task.sleep(nanoseconds: 6_000_000_000)

        // UIS-03 扫描页-自动停止：按钮回到 Start Scan，状态 Ready
        let resumedButton = button(titled: "Start Scan")
        let readyLabel = label { $0.stringValue == "Ready" }
        let scanned = manager?.discoveredDevices ?? []
        check(
            "UIS-03",
            resumedButton != nil && readyLabel != nil && !(manager?.isScanning ?? true),
            "buttonTitle=\(resumedButton?.title ?? "nil") status=\(readyLabel?.stringValue ?? "nil") scannedDevices=\(scanned.count)")

        // UIS-04a FilterPanel 展开切换（真实点击无标题的图标按钮）
        let filterToggle = contentView.flatMap { content in
            allSubviews(of: content)
                .compactMap { $0 as? NSButton }
                .first { !$0.isBordered && $0.image != nil && $0.target != nil }
        }
        filterToggle?.performClick(nil)
        await settle(250)
        let panelShown = first(ofType: FilterPanel.self).map { !$0.isHidden } ?? false
        check("UIS-04a", panelShown, "filterPanelVisible=\(panelShown)")

        // UIS-04b RSSI 预设 "-70"：FilterPanel 委托 → manager.filterRSSI → 计数联动
        button(titled: "-70")?.performClick(nil)
        await settle(250)
        let rssiAfterPreset = manager?.filterRSSI ?? 999
        check("UIS-04b", rssiAfterPreset == -70, "managerFilterRSSI=\(rssiAfterPreset)")

        // UIS-04c 隐藏无名设备 checkbox：委托 → manager.hideNoNameDevices
        button(titled: "Hide devices without name")?.performClick(nil)
        await settle(250)
        let hideAfterToggle = manager?.hideNoNameDevices ?? false
        check("UIS-04c", hideAfterToggle, "managerHideNoName=\(hideAfterToggle)")

        // UIS-04d Reset：委托 → manager.resetFilters() 全部还原
        button(titled: "Reset")?.performClick(nil)
        await settle(250)
        let rssiAfterReset = manager?.filterRSSI ?? 999
        let hideAfterReset = manager?.hideNoNameDevices ?? true
        check("UIS-04d", rssiAfterReset == -100 && !hideAfterReset, "filterRSSI=\(rssiAfterReset) hideNoName=\(hideAfterReset)")

        // UIS-05 表格选择 → MainWindowController 委托 → manager.connect（真实联动）
        if let tableView, tableView.numberOfRows > 0, let manager, !manager.discoveredDevices.isEmpty {
            tableView.selectRowIndexes(IndexSet(integer: 0), byExtendingSelection: false)
            try? await Task.sleep(nanoseconds: 1_200_000_000)
            let connectLogged = manager.logs.contains { $0.message.hasPrefix("Connecting to") }
            let stateTouched = connectLogged || manager.connectionState != .disconnected
            check("UIS-05", stateTouched, "connectLog=\(connectLogged) connectionState=\(manager.connectionState)")
            // 连接尝试会改变管理器状态，回到干净基线
            manager.disconnect()
            await settle(250)
        } else {
            skip("UIS-05", "scan found no devices in this environment")
        }

        // UIS-06a 日志页绑定：扫描/连接事件已进入 LogPanel，计数与 manager.logs 一致
        // （先等 UIS-05 的连接尝试失败事件落地，避免其异步回填干扰 Clear 校验）
        try? await Task.sleep(nanoseconds: 2_500_000_000)
        if let manager, !manager.logs.isEmpty {
            let entriesText = label { $0.stringValue.hasSuffix(" entries") || $0.stringValue == "0 entries" }?.stringValue ?? "nil"
            let shownCount = Int(entriesText.split(separator: " ").first ?? "-1") ?? -1
            let textViewFilled = !(first(ofType: NSTextView.self)?.string.isEmpty ?? true)
            check(
                "UIS-06a",
                shownCount == manager.logs.count && textViewFilled,
                "label=\(entriesText) managerLogs=\(manager.logs.count) logPanelHasText=\(textViewFilled)")

            // UIS-06b 日志页 Clear 按钮：真实点击 → logs 清空 → 计数归零
            button(titled: "Clear")?.performClick(nil)
            await settle(200)
            let zeroLabel = label { $0.stringValue == "0 entries" }
            let textViewCleared = first(ofType: NSTextView.self)?.string.isEmpty ?? false
            check(
                "UIS-06b",
                manager.logs.isEmpty && zeroLabel != nil && textViewCleared,
                "managerLogsEmpty=\(manager.logs.isEmpty) label=\(zeroLabel?.stringValue ?? "nil") panelCleared=\(textViewCleared)")
        } else {
            skip("UIS-06a", "no log entries produced")
            skip("UIS-06b", "no log entries produced")
        }

        // UIS-07 工具栏：三项齐全 + Logs 动作可派发（日志分栏折叠切换）
        let identifiers = (controller.window?.toolbar?.items ?? []).map { $0.itemIdentifier.rawValue }
        let hasAll = ["scanToggle", "disconnect", "logs"].allSatisfy { identifiers.contains($0) }
        var logsActionDispatched = false
        if let logsItem = controller.window?.toolbar?.items.first(where: { $0.itemIdentifier.rawValue == "logs" }),
           let action = logsItem.action, let target = logsItem.target {
            logsActionDispatched = NSApp.sendAction(action, to: target, from: logsItem)
        }
        check("UIS-07", hasAll && logsActionDispatched, "identifiers=\(identifiers.joined(separator: ",")) logsAction=\(logsActionDispatched)")

        print("[UISMOKE] SUMMARY failures=\(failures) skips=\(skips)")
        fflush(stdout)
        exit(failures > 0 ? 1 : 0)
    }
}
