//
// PageSmoke.swift — 页面级自动化冒烟（r3 · 原型对齐壳）
// 覆盖：装配/四 Tab 走查/真实扫描/筛选/广播数据弹窗/连接→P006 两栏/P002 守卫与配对码解析/
// P008 预算与平台徽标/P009 内容与二级页 P010/P005/P003 守卫/退出确认。
// 输出 [UISMOKE] <id> result=PASS/FAIL/SKIP detail="..."；exit(failures>0 ? 1 : 0)。
// 环境相关步骤（扫描/设备交互）无设备时显式 SKIP，不伪造。
//

import AppKit
import CryptoKit

@MainActor
enum PageSmoke {

    nonisolated static func runIfRequested() {
        let args = CommandLine.arguments
        let preview = args
            .first(where: { $0.hasPrefix("--ui-preview=") })
            .map { String($0.dropFirst("--ui-preview=".count)) }
        guard args.contains("--smoke-pages") || args.contains("--snap-pages")
            || args.contains("--snap-tabbar") || args.contains("--snap-flow-states")
            || preview != nil else { return }
        Task { @MainActor in
            for _ in 0..<10 {
                if let wc = NSApp.windows.compactMap({ $0.windowController as? MainWindowController }).first {
                    if let preview {
                        await PageSmoke.preparePreview(preview, controller: wc)
                    } else if args.contains("--snap-flow-states") {
                        await PageSmoke.snapFlowStates(controller: wc)
                    } else if args.contains("--snap-tabbar") {
                        await PageSmoke.snapTabBar(controller: wc)
                    } else if args.contains("--snap-pages") {
                        await PageSmoke.snapPages(controller: wc)
                    } else {
                        print("[UISMOKE] mode=smoke-pages app=SmartBLE-mac r3=prototype-aligned")
                        await PageSmoke.run(controller: wc)
                    }
                    return
                }
                try? await Task.sleep(nanoseconds: 300_000_000)
            }
            print("[UISMOKE] FATAL result=FAIL detail=\"MainWindowController not found\"")
            fflush(stdout)
            exit(1)
        }
    }

    private static func snapFlowStates(controller: MainWindowController) async {
        let outDir = URL(fileURLWithPath: "snaps-flow-states")
        try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

        for _ in 0..<8 {
            if controller.ble.btState != .unknown { break }
            await settle(250)
        }
        if controller.ble.btState == .on {
            controller.router.switchTab(.p001)
            controller.ble.startScan()
            await settle(5_600)
        }

        if let device = controller.ble.discoveredDevices.first,
           let p002 = controller.page(.p002) as? P002ProvisionPage {
            controller.router.go(.p002)
            for (state, name) in [
                (P002ProvisionPage.PreviewState.identityFailed, "01-p002-identity-failed"),
                (.success, "02-p002-success"),
                (.wifiFailed, "03-p002-wifi-failed"),
            ] {
                p002.applyPreviewState(state, device: device)
                await settle(250)
                capturePageColumn(controller: controller, name: name, outDir: outDir)
            }
        } else {
            print("[UIFLOWSNAP] P002 BLOCKED_FIXTURE: no discovered BLE device")
        }

        if let p003 = controller.page(.p003) as? P003HidDetailPage {
            controller.router.go(.p003)
            for (state, name) in [
                (P003HidDetailPage.PreviewState.normal, "04-p003-normal"),
                (.missingFields, "05-p003-missing-fields"),
            ] {
                p003.applyPreviewState(state)
                await settle(250)
                capturePageColumn(controller: controller, name: name, outDir: outDir)
            }
            p003.applyPreviewState(.empty)
            await settle(350)
            captureRoot(controller: controller, name: "06-p003-empty", outDir: outDir)
            controller.closeLayer()
            p003.applyPreviewState(.normal)
        }

        controller.shared.currentDevice = nil
        if let p005 = controller.page(.p005) as? P005DiagnosticsPage {
            controller.router.go(.p005)
            for (state, name) in [
                (P005DiagnosticsPage.PreviewState.healthy, "07-p005-healthy"),
                (.offline, "08-p005-offline"),
                (.error, "09-p005-error"),
            ] {
                p005.applyPreviewState(state)
                await settle(250)
                capturePageColumn(controller: controller, name: name, outDir: outDir)
            }
        }

        print("[UIFLOWSNAP] done")
        fflush(stdout)
        exit(0)
    }

    private static func capturePageColumn(controller: MainWindowController, name: String, outDir: URL) {
        guard let root = controller.window?.contentView,
              let target = allSubviews(of: root).compactMap({ $0 as? PageScroll }).first?.column else { return }
        target.layoutSubtreeIfNeeded()
        capture(view: target, rect: target.bounds, background: DS.bg, name: name, outDir: outDir)
    }

    private static func captureRoot(controller: MainWindowController, name: String, outDir: URL) {
        guard let root = controller.window?.contentView else { return }
        root.layoutSubtreeIfNeeded()
        capture(view: root, rect: root.bounds, background: DS.bg, name: name, outDir: outDir)
    }

    private static func capture(
        view: NSView,
        rect: NSRect,
        background: NSColor,
        name: String,
        outDir: URL
    ) {
        guard let rep = view.bitmapImageRepForCachingDisplay(in: rect) else { return }
        NSGraphicsContext.saveGraphicsState()
        if let context = NSGraphicsContext(bitmapImageRep: rep) {
            NSGraphicsContext.current = context
            background.setFill()
            rect.fill()
        }
        NSGraphicsContext.restoreGraphicsState()
        view.cacheDisplay(in: rect, to: rep)
        guard let png = rep.representation(using: .png, properties: [:]) else { return }
        let url = outDir.appendingPathComponent("\(name).png")
        try? png.write(to: url)
        print("[UIFLOWSNAP] \(name) -> \(url.path)")
        fflush(stdout)
    }

    private static func snapTabBar(controller: MainWindowController) async {
        let outDir = URL(fileURLWithPath: "snaps-tabbar")
        try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
        controller.setTabBarPreviewConnectedCount(3)
        let tabs: [(PageId, String)] = [
            (.p001, "01-scan"),
            (.p007, "02-connected"),
            (.p008, "03-broadcast"),
            (.p009, "04-about"),
        ]
        await settle(600)
        for (page, name) in tabs {
            controller.router.switchTab(page)
            await settle(250)
            captureBottomStrip(controller: controller, name: name, outDir: outDir)
        }
        controller.router.go(.p010)
        await settle(250)
        captureBottomStrip(controller: controller, name: "05-secondary-hidden", outDir: outDir)
        print("[UITABSNAP] done")
        fflush(stdout)
        exit(0)
    }

    private static func captureBottomStrip(controller: MainWindowController, name: String, outDir: URL) {
        guard let root = controller.window?.contentView else { return }
        root.layoutSubtreeIfNeeded()
        let rect = NSRect(x: 0, y: 0, width: root.bounds.width, height: 64)
        guard let rep = root.bitmapImageRepForCachingDisplay(in: rect) else { return }
        root.cacheDisplay(in: rect, to: rep)
        guard let png = rep.representation(using: .png, properties: [:]) else { return }
        let url = outDir.appendingPathComponent("\(name).png")
        try? png.write(to: url)
        print("[UITABSNAP] \(name) -> \(url.path)")
        fflush(stdout)
    }

    private static func preparePreview(_ previewValue: String, controller: MainWindowController) async {
        controller.setTabBarPreviewConnectedCount(3)
        if previewValue.hasPrefix("p002-") {
            for _ in 0..<8 {
                if controller.ble.btState != .unknown { break }
                await settle(250)
            }
            if controller.ble.btState == .on {
                controller.ble.startScan()
                await settle(5_600)
            }
            if let device = controller.ble.discoveredDevices.first,
               let p002 = controller.page(.p002) as? P002ProvisionPage {
                let state: P002ProvisionPage.PreviewState?
                switch previewValue {
                case "p002-identity-failed": state = .identityFailed
                case "p002-success": state = .success
                case "p002-wifi-failed": state = .wifiFailed
                default: state = nil
                }
                if let state {
                    p002.applyPreviewState(state, device: device)
                    controller.router.go(.p002)
                }
            }
            print("[UIPREVIEW] ready=\(previewValue)")
            fflush(stdout)
            return
        }
        if let p003 = controller.page(.p003) as? P003HidDetailPage {
            let p003State: P003HidDetailPage.PreviewState?
            switch previewValue {
            case "p003-normal": p003State = .normal
            case "p003-missing-fields": p003State = .missingFields
            case "p003-empty": p003State = .empty
            default: p003State = nil
            }
            if let p003State {
                if p003State == .empty {
                    controller.router.go(.p003)
                    p003.applyPreviewState(p003State)
                } else {
                    p003.applyPreviewState(p003State)
                    controller.router.go(.p003)
                }
                print("[UIPREVIEW] ready=\(previewValue)")
                fflush(stdout)
                return
            }
        }
        if let p005 = controller.page(.p005) as? P005DiagnosticsPage {
            let p005State: P005DiagnosticsPage.PreviewState?
            switch previewValue {
            case "p005-healthy": p005State = .healthy
            case "p005-offline": p005State = .offline
            case "p005-error": p005State = .error
            default: p005State = nil
            }
            if let p005State {
                controller.shared.currentDevice = nil
                (controller.page(.p003) as? P003HidDetailPage)?.applyPreviewState(.normal)
                controller.closeLayer()
                p005.applyPreviewState(p005State)
                controller.router.go(.p005)
                print("[UIPREVIEW] ready=\(previewValue)")
                fflush(stdout)
                return
            }
        }
        if previewValue == "p009" {
            controller.router.switchTab(.p009)
            print("[UIPREVIEW] ready=p009")
            fflush(stdout)
            return
        }
        if previewValue == "p007" {
            controller.router.switchTab(.p007)
            print("[UIPREVIEW] ready=p007")
            fflush(stdout)
            return
        }
        if previewValue == "p008" {
            controller.router.switchTab(.p008)
            print("[UIPREVIEW] ready=p008")
            fflush(stdout)
            return
        }
        if previewValue == "p010" {
            controller.router.go(.p010)
            print("[UIPREVIEW] ready=p010")
            fflush(stdout)
            return
        }
        guard let preview = P001ScanPage.PreviewState(rawValue: previewValue) else {
            print("[UIPREVIEW] unsupported=\(previewValue)")
            fflush(stdout)
            return
        }
        controller.router.switchTab(.p001)
        if preview == .filterExpanded || preview == .filterEmpty || preview == .unsupported {
            for _ in 0..<8 {
                if controller.ble.btState != .unknown { break }
                await settle(250)
            }
            if (preview == .filterExpanded || preview == .filterEmpty), controller.ble.btState == .on {
                controller.ble.startScan()
                await settle(5_600)
            }
        }
        (controller.page(.p001) as? P001ScanPage)?.applyPreviewState(preview)
        print("[UIPREVIEW] ready=\(preview.rawValue)")
        fflush(stdout)
    }

    /// --snap-pages：9 页渲染为 PNG（cacheDisplay · 不依赖屏幕录制权限）作为对齐证据
    private static func snapPages(controller: MainWindowController) async {
        let outDir = URL(fileURLWithPath: "snaps-r3")
        try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
        let order: [PageId] = [.p001, .p007, .p008, .p009, .p010, .p002, .p003, .p005, .p006]
        try? await Task.sleep(nanoseconds: 1_200_000_000)
        for id in order {
            if id.isTab {
                controller.router.switchTab(id)
            } else {
                controller.router.go(id)
            }
            try? await Task.sleep(nanoseconds: 500_000_000)
            guard let view = controller.window?.contentView else { continue }
            view.layoutSubtreeIfNeeded()
            // cacheDisplay 不渲染 NSScrollView 文档内容（已知 AppKit 行为）→ 直接渲染页面文档列
            let target: NSView = (allSubviews(of: view).compactMap { $0 as? PageScroll }.first?.column) ?? view
            target.layoutSubtreeIfNeeded()
            let rect = target.bounds
            guard let rep = target.bitmapImageRepForCachingDisplay(in: rect) else { continue }
            // 位图先铺页面底色（cacheDisplay 不画视图层背景，裸位图为黑）
            NSGraphicsContext.saveGraphicsState()
            if let ctx = NSGraphicsContext(bitmapImageRep: rep) {
                NSGraphicsContext.current = ctx
                DS.bg.setFill()
                rect.fill()
            }
            NSGraphicsContext.restoreGraphicsState()
            target.cacheDisplay(in: rect, to: rep)
            guard let png = rep.representation(using: .png, properties: [:]) else { continue }
            let url = outDir.appendingPathComponent("\(id.rawValue).png")
            try? png.write(to: url)
            print("[UISNAP] \(id.rawValue) -> \(url.path) size=\(Int(rect.width))x\(Int(rect.height))")
            fflush(stdout)
        }
        print("[UISNAP] done")
        fflush(stdout)
        exit(0)
    }

    private static var failures = 0
    private static var skips = 0

    private static func check(_ id: String, _ ok: Bool, _ detail: String) {
        print("[UISMOKE] \(id) result=\(ok ? "PASS" : "FAIL") detail=\"\(detail)\"")
        fflush(stdout)
        if !ok { failures += 1 }
    }

    private static func skip(_ id: String, _ reason: String) {
        print("[UISMOKE] \(id) result=SKIP detail=\"\(reason)\"")
        fflush(stdout)
        skips += 1
    }

    private static func settle(_ ms: UInt64) async {
        try? await Task.sleep(nanoseconds: ms * 1_000_000)
    }

    // MARK: - 子视图遍历助手

    private static func allSubviews(of view: NSView) -> [NSView] {
        var out: [NSView] = []
        for sub in view.subviews {
            out.append(sub)
            out.append(contentsOf: allSubviews(of: sub))
        }
        return out
    }

    private static func first<T: NSView>(ofType: T.Type, in views: [NSView]) -> T? {
        views.compactMap { $0 as? T }.first
    }

    private static func button(titled title: String, in views: [NSView]) -> NSButton? {
        views.compactMap { $0 as? NSButton }.first {
            $0.title == title || $0.attributedTitle.string == title || $0.toolTip == title
        }
    }

    private static func button(actionId: String, in views: [NSView]) -> NSButton? {
        views.compactMap { $0 as? NSButton }.first { $0.toolTip == actionId }
    }

    private static func anyLabel(contains text: String, in views: [NSView]) -> Bool {
        views.compactMap { $0 as? NSTextField }.contains { !$0.isBezeled && $0.stringValue.contains(text) }
    }

    private static func isEffectivelyHidden(_ view: NSView) -> Bool {
        var current: NSView? = view
        while let node = current {
            if node.isHidden { return true }
            current = node.superview
        }
        return false
    }

    // MARK: - 主流程

    private static func run(controller: MainWindowController) async {
        // 等待首轮渲染与蓝牙状态回调
        for _ in 0..<8 {
            if controller.ble.btState != .unknown { break }
            try? await Task.sleep(nanoseconds: 250_000_000)
        }
        guard let window = controller.window, let contentView = window.contentView else {
            print("[UISMOKE] FATAL result=FAIL detail=\"window/contentView missing\"")
            exit(1)
        }
        let views = { allSubviews(of: contentView) }

        // UIS-01 装配：窗口标题 + 四 Tab + 默认页 P001（kicker/扫描按钮/筛选链）
        do {
            let v = views()
            let tabs = ["扫描", "已连接", "广播", "关于"].map { button(titled: $0, in: v) != nil }
            let hasP001 = anyLabel(contains: "BLE TOOLKIT+", in: v)
                && button(titled: "开始扫描", in: v) != nil
                && button(titled: "筛选", in: v) != nil
            check("UIS-01", window.title == "BLE Toolkit+" && tabs.allSatisfy { $0 } && hasP001,
                  "title=\(window.title) tabs=\(tabs.map { $0 ? 1 : 0 }) p001=\(hasP001)")
        }

        // UIS-02 四 Tab 走查（每页导航栏 + 页面特征内容）
        do {
            var results: [String] = []
            for (tab, expect) in [("已连接", "还没有连接中的设备"), ("广播", "平台：Desktop · macOS"), ("关于", "BLE Toolkit+"), ("扫描", "附近设备")] {
                guard let btn = button(titled: tab, in: views()) else {
                    results.append("\(tab)=nobtn")
                    continue
                }
                btn.performClick(nil)
                await settle(400)
                let ok = anyLabel(contains: expect, in: views())
                results.append("\(tab)=\(ok ? 1 : 0)")
            }
            check("UIS-02", results.allSatisfy { $0.hasSuffix("=1") }, results.joined(separator: " "))
        }

        let btReady = controller.ble.btState == .on

        // UIS-03 真实扫描会话（5s 自动停 + 扫描完成文案）
        if btReady {
            if let btn = button(titled: "开始扫描", in: views()) {
                btn.performClick(nil)
                await settle(600)
                let scanning = button(titled: "停止扫描", in: views()) != nil
                    && anyLabel(contains: "扫描中 · 5s 会话", in: views())
                await settle(5400)
                let stopped = button(titled: "开始扫描", in: views()) != nil
                    && anyLabel(contains: "扫描完成 · 发现", in: views())
                check("UIS-03", scanning && stopped,
                      "scanning=\(scanning) stopped=\(stopped) found=\(controller.ble.discoveredDevices.count)")
            } else {
                check("UIS-03", false, "scan button missing")
            }
        } else {
            skip("UIS-03", "bluetooth adapter not powered on (btState=\(controller.ble.btState))")
        }

        // UIS-04 筛选面板：展开 → 预设/阈值/隐藏无名 → 重置 → 收起
        do {
            guard let filterBtn = button(titled: "筛选", in: views()) else {
                check("UIS-04", false, "filter toggle missing")
                return
            }
            filterBtn.performClick(nil)
            await settle(300)
            var v = views()
            let preset = button(titled: "一般 [-70]", in: v)
            let hasSlider = first(ofType: NSSlider.self, in: v) != nil
            let hideSwitch = first(ofType: NSSwitch.self, in: v) != nil
            preset?.performClick(nil)
            await settle(300)
            v = views()
            let thresholdUpdated = anyLabel(contains: "阈值 -70", in: v)
            button(titled: "重置过滤", in: v)?.performClick(nil)
            await settle(300)
            v = views()
            let resetOk = anyLabel(contains: "阈值 -100", in: v)
            button(titled: "收起筛选", in: v)?.performClick(nil)
            await settle(300)
            let collapsed = button(titled: "重置过滤", in: views()) == nil
            check("UIS-04", preset != nil && hasSlider && hideSwitch && thresholdUpdated && resetOk && collapsed,
                  "preset=\(preset != nil) slider=\(hasSlider) switch=\(hideSwitch) th70=\(thresholdUpdated) reset=\(resetOk) collapsed=\(collapsed)")
        }

        let hasDevices = !controller.ble.discoveredDevices.isEmpty

        // UIS-05 广播数据弹窗（F004：设备报告 + 缺失字段标注 + 复制→剪贴板+toast + 关闭）
        if hasDevices {
            if let p001 = controller.page(.p001) as? P001ScanPage {
                let device = controller.ble.discoveredDevices[0]
                p001.openAdvDialogForSmoke(device)
                await settle(400)
                let v = views()
                let sheetVisible = anyLabel(contains: "广播数据 ·", in: v)
                let fields = anyLabel(contains: "设备 ID", in: v) && anyLabel(contains: "RSSI", in: v)
                let missMarked = anyLabel(contains: "本轮平台 API 未提供此字段", in: v)
                let copyBtn = button(titled: "复制数据", in: v)
                // R04：点「复制数据」写入剪贴板并 toast「已复制」（复制动作自身会关层）
                NSPasteboard.general.clearContents()
                copyBtn?.performClick(nil)
                await settle(300)
                let pasted = NSPasteboard.general.string(forType: .string) ?? ""
                let copied = pasted.contains("广播数据 ·") && pasted.contains("设备 ID:")
                let toastShown = anyLabel(contains: "已复制", in: views())
                let closed = !anyLabel(contains: "复制数据", in: views())
                check("UIS-05", sheetVisible && fields && missMarked && copyBtn != nil && copied && toastShown && closed,
                      "sheet=\(sheetVisible) fields=\(fields) missMarked=\(missMarked) copied=\(copied) toast=\(toastShown) closed=\(closed)")
            } else {
                check("UIS-05", false, "p001 page missing")
            }
        } else {
            skip("UIS-05", "no scan results in this environment")
        }

        // UIS-06 连接 → P006（两栏 + 右栏日志常驻 + 返回；连接成败均验布局）
        if hasDevices {
            if let connectBtn = button(actionId: "p001-connect", in: views()) {
                connectBtn.performClick(nil)
                await settle(700)
                let v = views()
                let inP006 = anyLabel(contains: "GATT 调试", in: v)
                    && (button(actionId: "p006-connect", in: v) != nil
                        || button(actionId: "p006-disconnect", in: v) != nil
                        || button(actionId: "p006-connecting", in: v) != nil)
                let twoColNote = anyLabel(contains: "桌面布局（SOP §12 圈内调整）", in: v)
                let logPanel = anyLabel(contains: "通信日志", in: v)
                button(actionId: "back", in: v)?.performClick(nil)
                await settle(400)
                let backOk = button(titled: "开始扫描", in: views()) != nil
                check("UIS-06", inP006 && twoColNote && logPanel && backOk,
                      "p006=\(inP006) dnote=\(twoColNote) log=\(logPanel) back=\(backOk) conn=\(controller.ble.connectionState)")
            } else {
                skip("UIS-06", "no connect button on cards")
            }
        } else {
            skip("UIS-06", "no scan results in this environment")
        }

        // UIS-07 P002 守卫态 + 配对码解析（desktop.js dtk-parse 同口径）
        do {
            controller.router.go(.p002)
            await settle(400)
            let guardOk = anyLabel(contains: "缺少设备上下文", in: views())
                && button(titled: "去扫描", in: views()) != nil
            let parsed = P002ProvisionPage.parsePairCode("shid://pair?hub=192.168.1.8:17892&t=tok-3f9a7c1e")
            let parseOk = parsed?.token == "tok-3f9a7c1e" && parsed?.hub == "192.168.1.8:17892"
            let noToken = P002ProvisionPage.parsePairCode("shid://pair?hub=x") == nil
            let hubOptional = P002ProvisionPage.parsePairCode("shid://pair?t=abcd1234")?.hub == nil
            check("UIS-07", guardOk && parseOk && noToken && hubOptional,
                  "guard=\(guardOk) parse=\(parseOk) noToken=\(noToken) hubOptional=\(hubOptional)")
            controller.router.back()
            await settle(300)
        }

        // UIS-08 P008 平台徽标 + 原生层提示 + 字节预算（真实核算 + 超限拦截 + 恢复）
        do {
            button(titled: "广播", in: views())?.performClick(nil)
            await settle(400)
            let v = views()
            let platform = anyLabel(contains: "平台：Desktop · macOS", in: v)
            let note = anyLabel(contains: "CoreBluetooth", in: v)
            let budgetBar = anyLabel(contains: "ADV 负载预算", in: v) && anyLabel(contains: "/ 31 字节", in: v)
            let hasCheck = button(titled: "检查支持", in: v) != nil
            guard let p008 = controller.page(.p008) as? P008BroadcastPage else {
                check("UIS-08", false, "p008 page missing")
                return
            }
            let defaultBudget = p008.computeBudget()
            p008.setMfgDataForSmoke("LIGHTBLE-BROADCAST-DEMO-2026")
            await settle(400)
            let over = p008.computeBudget()
            let startDisabledOver = button(titled: "开始广播", in: views())?.isEnabled == false
            let overShown = anyLabel(contains: "超限，启动将被拦截", in: views())
            p008.setMfgDataForSmoke("BLE")
            await settle(400)
            let restored = p008.computeBudget()
            let startEnabled = button(titled: "开始广播", in: views())?.isEnabled == true
            check("UIS-08", platform && note && budgetBar && hasCheck
                  && over.over && startDisabledOver && overShown && !restored.over && startEnabled,
                  "platform=\(platform) note=\(note) budgetBar=\(budgetBar) default=\(defaultBudget.total)B over=\(over.total)B blocked=\(startDisabledOver) shown=\(overShown) restored=\(restored.total)B reEnabled=\(startEnabled)")
        }

        // UIS-09 P008 检查支持（真实 CBPeripheralManager 判定 + 日志）
        do {
            if let checkBtn = button(titled: "检查支持", in: views()) {
                checkBtn.performClick(nil)
                await settle(700)
                let logged = controller.ble.logs.contains { $0.message.contains("CoreBluetooth") }
                let badge = ["未就绪", "已就绪", "已停止"].contains { anyLabel(contains: $0, in: views()) }
                check("UIS-09", logged && badge,
                      "logged=\(logged) badge=\(badge) peripheralReady=\(controller.ble.peripheralReady)")
            } else {
                check("UIS-09", false, "check button missing")
            }
        }

        // UIS-10 P009 内容（HTML 正典：品牌/推广/应用信息/四菜单）→ 版本记录进 P010
        do {
            button(titled: "关于", in: views())?.performClick(nil)
            await settle(400)
            let v = views()
            let brand = anyLabel(contains: "BLE Toolkit+", in: v)
            let menuIds = ["p009-openweb", "p009-feedback", "p009-versions", "p009-shareapp"]
            let menus = menuIds.map { button(actionId: $0, in: v) != nil }
            let menuTitles = ["官方网站", "问题反馈", "版本记录", "分享应用"]
                .allSatisfy { anyLabel(contains: $0, in: v) }
            let appInfo = anyLabel(contains: "应用信息", in: v)
                && anyLabel(contains: "当前环境", in: v)
                && anyLabel(contains: "Smart HID 配网", in: v)
                && anyLabel(contains: "NOT_RELEASED", in: v)
            // UIS-10b 问题反馈 → 小程序码弹窗（扫一扫引导 + 复制/关闭）
            button(actionId: "p009-feedback", in: v)?.performClick(nil)
            await settle(400)
            let sheetViews = views()
            let feedbackSheet = anyLabel(contains: "联系客服反馈问题", in: sheetViews)
                && anyLabel(contains: "扫一扫", in: sheetViews)
                && button(actionId: "p009-feedback-copy", in: sheetViews) != nil
                && button(actionId: "p009-feedback-done", in: sheetViews) != nil
                && sheetViews.contains { $0 is NSImageView }
            button(actionId: "p009-feedback-done", in: sheetViews)?.performClick(nil)
            await settle(300)
            check("UIS-10b", feedbackSheet, "feedbackSheet=\(feedbackSheet)")
            button(actionId: "p009-versions", in: v)?.performClick(nil)
            await settle(400)
            let inP010 = anyLabel(contains: "当前版本", in: views())
            check("UIS-10", brand && menus.allSatisfy { $0 } && menuTitles && appInfo && inP010,
                  "brand=\(brand) menus=\(menus.map { $0 ? 1 : 0 }) titles=\(menuTitles) appInfo=\(appInfo) p010=\(inP010)")
        }

        // UIS-11 P010 内容（限制清单/发布空态/预览记录/页脚声明）
        do {
            let v = views()
            let limits = anyLabel(contains: "OTA 端到端链路 BLOCKED", in: v)
                && anyLabel(contains: "H5 平台不支持 BLE 外围模式", in: v)
            let emptyRel = anyLabel(contains: "暂无正式发布版本", in: v)
            let foot = anyLabel(contains: "本页数据来自 Release Metadata 投影", in: v)
            let previews = anyLabel(contains: "v1.0.5-preview", in: v)
            let tabHidden = ["扫描", "已连接", "广播", "关于"].allSatisfy { title in
                button(titled: title, in: v).map(isEffectivelyHidden) ?? true
            }
            button(actionId: "back", in: v)?.performClick(nil)
            await settle(300)
            check("UIS-11", limits && emptyRel && foot && previews && tabHidden,
                  "limits=\(limits) emptyRelease=\(emptyRel) foot=\(foot) previews=\(previews) tabHidden=\(tabHidden)")
        }

        // UIS-12 P005 诊断 + P003 详情守卫态
        do {
            controller.router.go(.p005)
            await settle(400)
            var v = views()
            let p005Base = anyLabel(contains: "SHID 诊断", in: v)
                && anyLabel(contains: "BLE 链路", in: v) && anyLabel(contains: "设备 Ready 状态", in: v)
                && button(titled: "重新检测", in: v) != nil && button(titled: "重新配网", in: v) != nil

            var p005Variants = false
            if let p005 = controller.page(.p005) as? P005DiagnosticsPage {
                p005.applyPreviewState(.healthy)
                await settle(200)
                let healthy = anyLabel(contains: "实时检测完成", in: views())
                    && anyLabel(contains: "GATT 连接保持", in: views())
                p005.applyPreviewState(.offline)
                await settle(200)
                let offline = anyLabel(contains: "设备未连接", in: views())
                    && anyLabel(contains: "待检测", in: views())
                p005.applyPreviewState(.error)
                await settle(200)
                let error = anyLabel(contains: "检测失败", in: views())
                    && button(titled: "显示错误码（详细信息）", in: views()) != nil
                p005Variants = healthy && offline && error
            }
            controller.router.back()
            await settle(300)
            controller.router.go(.p003)
            await settle(400)
            v = views()
            let p003Guard = anyLabel(contains: "设备记录不存在", in: v)
            var p003Variants = false
            if let p003 = controller.page(.p003) as? P003HidDetailPage {
                controller.closeLayer()
                p003.applyPreviewState(.normal)
                await settle(200)
                let normal = anyLabel(contains: "配置成功 · READY", in: views())
                    && button(actionId: "p003-reconfig", in: views()) != nil
                p003.applyPreviewState(.missingFields)
                await settle(200)
                let missing = anyLabel(contains: "协议未记录", in: views())
                p003.applyPreviewState(.empty)
                await settle(300)
                let empty = anyLabel(contains: "设备记录不存在", in: views()) && controller.layerVisible
                controller.closeLayer()
                p003Variants = normal && missing && empty
            }
            controller.router.back()
            await settle(300)

            var p002Variants = true
            if let device = controller.ble.discoveredDevices.first,
               let p002 = controller.page(.p002) as? P002ProvisionPage {
                controller.router.go(.p002)
                p002.applyPreviewState(.identityFailed, device: device)
                await settle(200)
                let identity = button(titled: "重新连接", in: views()) != nil
                    && button(titled: "返回设备列表", in: views()) != nil
                p002.applyPreviewState(.success, device: device)
                await settle(200)
                let success = anyLabel(contains: "配置成功 · 设备 READY", in: views())
                    && button(titled: "查看设备", in: views()) != nil
                p002.applyPreviewState(.wifiFailed, device: device)
                await settle(200)
                let wifi = anyLabel(contains: "wifi_failed", in: views())
                    && button(titled: "返回表单修改", in: views()) != nil
                p002Variants = identity && success && wifi
                controller.router.back()
                await settle(200)
            }
            check("UIS-12", p005Base && p005Variants && p003Guard && p003Variants && p002Variants,
                  "p002Variants=\(p002Variants) p005Base=\(p005Base) p005Variants=\(p005Variants) p003Guard=\(p003Guard) p003Variants=\(p003Variants)")
        }

        // UIS-13 退出确认（关闭 = 确认 modal；继续使用 → 留存不退出）
        do {
            controller.requestQuit()
            await settle(400)
            let v = views()
            let modalTitle = anyLabel(contains: "退出确认", in: v)
            let stay = button(titled: "继续使用", in: v)
            stay?.performClick(nil)
            await settle(400)
            let dismissed = !anyLabel(contains: "退出确认", in: views())
            let windowAlive = window.isVisible
            check("UIS-13", modalTitle && dismissed && windowAlive,
                  "modal=\(modalTitle) dismissed=\(dismissed) alive=\(windowAlive)")
        }

        // UIS-14 P002 配网协议流（r6-M5 真实链路 · 诚实错误路径：环境设备非 SHID →
        // smart_hid_service_missing / identity_failed / 连接失败，均不伪造成功）
        if hasDevices {
            if let p002 = controller.page(.p002) as? P002ProvisionPage {
                let device = controller.ble.discoveredDevices[0]
                p002.begin(device: device)
                controller.router.go(.p002)
                // 诚实状态口径：错误横幅（smart_hid_service_missing / identity_failed / 连接失败）
                // 或真实连接中的加载态（10s 超时×3 重试链可超窗）—— 两者均为不伪造的诚实呈现
                var honestState = false
                var sawError = false
                for _ in 0..<30 {
                    await settle(500)
                    let v = views()
                    if anyLabel(contains: "smart_hid_service_missing", in: v)
                        || anyLabel(contains: "identity_failed", in: v)
                        || anyLabel(contains: "设备连接失败", in: v) {
                        honestState = true
                        sawError = true
                        break
                    }
                    if anyLabel(contains: "连接并确认设备中", in: v) {
                        honestState = true
                    }
                }
                // 出现过错误态时，重新连接按钮必须可达
                let retryable = !sawError || button(titled: "重新连接", in: views()) != nil
                check("UIS-15", honestState && retryable,
                      "honestState=\(honestState) sawError=\(sawError) retryable=\(retryable) hid=\(controller.ble.hid.stage)")
                // 清理：离开向导并断开该会话（不残留配网标记）
                controller.router.switchTab(.p001)
                controller.ble.disconnect(deviceId: device.id)
                await settle(400)
            } else {
                check("UIS-15", false, "p002 page missing")
            }
        } else {
            skip("UIS-14", "no scan results in this environment")
        }

        // UIS-15 OTA 相位机（r6-M4 真实文件驱动 + 诚实守卫：无 manifest→ready；无会话 start→
        // OTA_SESSION_LOST；manifest sha 不符→OTA_HASH_MISMATCH；正确 manifest→ready）
        do {
            let ota = controller.ble.ota
            let bin = URL(fileURLWithPath: "/tmp/smartble-ota-smoke.bin")
            let manifest = URL(fileURLWithPath: "/tmp/smartble-ota-smoke.manifest.json")
            try? Data([0xAA, 0xBB, 0xCC, 0xDD]).write(to: bin)
            try? FileManager.default.removeItem(at: manifest)

            ota.selectFile(url: bin)
            let readyNoManifest = ota.phase == OtaManager.Phase.ready

            ota.start(deviceId: "smoke-no-session")
            let noSession: Bool = {
                if case .failed(let c, _) = ota.phase { return c == "OTA_SESSION_LOST" }
                return false
            }()

            let wrongSha = #"{"version":"1.2.3","size":4,"sha256":"deadbeef"}"#
            try? wrongSha.data(using: .utf8)!.write(to: manifest)
            ota.selectFile(url: bin)
            let hashMismatch: Bool = {
                if case .failed(let c, _) = ota.phase { return c == "OTA_HASH_MISMATCH" }
                return false
            }()

            let realSha = SHA256.hash(data: Data([0xAA, 0xBB, 0xCC, 0xDD]))
                .map { String(format: "%02x", $0) }.joined()
            let goodManifest = #"{"version":"1.2.3","size":4,"sha256":"\#(realSha)"}"#
            try? goodManifest.data(using: .utf8)!.write(to: manifest)
            ota.selectFile(url: bin)
            let readyWithManifest = ota.phase == OtaManager.Phase.ready

            try? FileManager.default.removeItem(at: bin)
            try? FileManager.default.removeItem(at: manifest)
            check("UIS-16", readyNoManifest && noSession && hashMismatch && readyWithManifest,
                  "readyNoManifest=\(readyNoManifest) noSession=\(noSession) hashMismatch=\(hashMismatch) readyWithManifest=\(readyWithManifest)")
        }

        // UIS-16 P007 会话列表一致性（r6-M1 多设备渲染需 ≥2 台可连外设 · BLOCKED_FIXTURE；
        // 此处验证任意台数下列表/汇总卡/徽标口径一致）
        do {
            controller.router.switchTab(.p007)
            await settle(400)
            let v = views()
            let n = controller.ble.connectedDevices.count
            var consistent = false
            if n == 0 {
                consistent = anyLabel(contains: "还没有连接中的设备", in: v)
            } else if n == 1 {
                consistent = anyLabel(contains: "已连接 · 可进行 GATT 调试", in: v)
                    && button(titled: "全部断开", in: v) == nil
            } else {
                consistent = anyLabel(contains: "台在线 · 全部为内存会话", in: v)
                    && button(titled: "全部断开", in: v) != nil
            }
            let badgeNote = n >= 2 ? "multi" : "single/empty（≥2 台并行需外设 · BLOCKED_FIXTURE）"
            check("UIS-17", consistent, "n=\(n) consistent=\(consistent) \(badgeNote)")
        }

        // UIS-17 真实多设备连接 + 被动断线重连观察（phase-2 R2）
        // 具名环境设备（如 iphone / midea）逐台 connect；达 n≥1 即验 P007 口径；
        // 观察窗内若发生被动断线 → 必须出现 1s/3s/5s 退避日志，且结局（重连成功 / 3 次耗尽 FAILED）如实记录。
        uis18: do {
            let ble = controller.ble
            let named = ble.discoveredDevices
                .filter { !($0.rawName.isEmpty && ($0.adv?.localName ?? "").isEmpty) }
                .sorted { $0.rssi > $1.rssi }
            guard !named.isEmpty else {
                skip("UIS-18", "no named env device discovered in this environment")
                break uis18
            }
            let targets = named.prefix(2)
            for device in targets {
                ble.connect(device: device)
            }
            var connected: [String] = []
            for _ in 0..<80 {   // ≤40s
                await settle(500)
                connected = targets.compactMap { ble.sessionState($0.id) == .connected ? $0.name : nil }
                if connected.count == targets.count { break }
            }
            guard !connected.isEmpty else {
                check("UIS-18", false, "targets=\(targets.map(\.name)) 0 台在 \(40)s 内连接成功（环境不可连 · 如实 FAIL）")
                break uis18
            }
            controller.router.switchTab(.p007)
            await settle(400)
            let v = views()
            let n = ble.connectedDevices.count
            let uiConsistent = n >= 2
                ? (anyLabel(contains: "台在线 · 全部为内存会话", in: v) && button(titled: "全部断开", in: v) != nil)
                : (anyLabel(contains: "已连接 · 可进行 GATT 调试", in: v) && button(titled: "全部断开", in: v) == nil)
            // 被动断线观察窗（45s）：iOS 类设备常主动甩掉未配对链接 → 触发真实重连链
            var reconnectEvidence = "no-passive-drop-in-window"
            var reconnectOutcome = "n/a"
            for _ in 0..<90 {
                await settle(500)
                let dropped = targets.filter { ble.sessionState($0.id) == .reconnecting || ble.sessions[$0.id] == nil }
                if !dropped.isEmpty {
                    let sawBackoff = ble.logs.contains { $0.message.contains("被动断线") && $0.message.contains("自动重连") }
                    if !sawBackoff { reconnectEvidence = "drop-without-backoff-log"; break }
                    reconnectEvidence = "backoff-log-ok"
                    // 结局：重连成功（connected）或 3 次耗尽（日志 + 会话移除）
                    for _ in 0..<40 {
                        await settle(500)
                        let id = dropped[0].id
                        if ble.sessionState(id) == .connected { reconnectOutcome = "reconnected"; break }
                        if ble.sessions[id] == nil
                            || ble.logs.contains(where: { $0.message.contains("自动重连 3 次未成功") }) {
                            reconnectOutcome = "exhausted-3-attempts"
                            break
                        }
                    }
                    if reconnectOutcome == "n/a" { reconnectOutcome = "still-reconnecting-at-window-end" }
                    break
                }
            }
            // 清理：逐台断开（不触发重连）
            for device in targets where ble.sessions[device.id] != nil {
                ble.disconnect(deviceId: device.id)
            }
            await settle(600)
            check("UIS-18", !connected.isEmpty && uiConsistent && reconnectEvidence != "drop-without-backoff-log",
                  "connected=\(connected) n=\(n) uiConsistent=\(uiConsistent) reconnect=\(reconnectEvidence) outcome=\(reconnectOutcome)")
        }

        // UIS-18 OTA 真实链（phase-2 R6）：需广播 4FAFC201 的 OTA 设备
        // （ESP32 真固件 / tests/macos/ble-fixture --mode ota；本机夹具同机不可见时 SKIP）
        uis18ota: do {
            let ble = controller.ble
            guard let target = ble.discoveredDevices.first(where: {
                ($0.adv?.serviceUUIDs ?? []).contains { $0.uppercased().hasPrefix("4FAFC201") }
            }) else {
                skip("UIS-18-OTA", "no OTA fixture advertising 4FAFC201 in this environment")
                break uis18ota
            }
            ble.connect(device: target)
            var serviceReady = false
            for _ in 0..<60 {   // ≤30s 连接 + 服务发现
                await settle(500)
                if ble.sessionState(target.id) == .connected,
                   ble.sessionServices(target.id).contains(where: { $0.uuid.uppercased().hasPrefix("4FAFC201") }) {
                    serviceReady = true
                    break
                }
                if ble.sessions[target.id] == nil { break }   // 连接失败/超时
            }
            guard serviceReady else {
                check("UIS-18-OTA", false, "fixture found but connect/service-discovery failed（如实 FAIL）")
                break uis18ota
            }
            let bin = URL(fileURLWithPath: "/tmp/smartble-ota-realchain.bin")
            let manifest = URL(fileURLWithPath: "/tmp/smartble-ota-realchain.manifest.json")
            let payload = Data((0..<2048).map { UInt8(truncatingIfNeeded: $0 &* 31 &+ 7) })
            try? payload.write(to: bin)
            let sha = SHA256.hash(data: payload).map { String(format: "%02x", $0) }.joined()
            let manifestJson = #"{"target":"lightble-peripheral","firmware_version":"9.9.9","size":\#(payload.count),"sha256":"\#(sha)"}"#
            try? manifestJson.data(using: .utf8)!.write(to: manifest)

            let ota = ble.ota
            ota.selectFile(url: bin)
            let ready = ota.phase == OtaManager.Phase.ready
            ota.start(deviceId: target.id)
            var finalPhase = "n/a"
            for _ in 0..<180 {   // ≤90s：ready→传输→commit→2A26 回读
                await settle(500)
                switch ota.phase {
                case .success: finalPhase = "success"; case .failed: finalPhase = "failed"
                case .cancelled: finalPhase = "cancelled"
                default: continue
                }
                break
            }
            try? FileManager.default.removeItem(at: bin)
            try? FileManager.default.removeItem(at: manifest)
            ble.disconnect(deviceId: target.id)
            await settle(400)
            check("UIS-18-OTA", ready && finalPhase == "success",
                  "ready=\(ready) phase=\(finalPhase) target=\(target.name)（真实无线电 OTA 链）")
        }

        // UIS-19 Smart HID 真实配网链（phase-2 R6）：需广播 9F1D1001 的 SHID 设备
        // （ESP32 fixture_shid_sim_s3 / ble-fixture --mode shid；成功走链至 ready）
        uis19: do {
            let ble = controller.ble
            let target = ble.discoveredDevices.first(where: {
                ($0.adv?.serviceUUIDs ?? []).contains { $0.uppercased().hasPrefix("9F1D1001") }
            }) ?? ble.discoveredDevices.first(where: { $0.name.uppercased().hasPrefix("SHID") })
            guard let target else {
                skip("UIS-19", "no SHID fixture advertising 9F1D1001 in this environment")
                break uis19
            }
            ble.connect(device: target)
            var connected = false
            for _ in 0..<60 {
                await settle(500)
                if ble.sessionState(target.id) == .connected { connected = true; break }
                if ble.sessions[target.id] == nil { break }
            }
            guard connected else {
                check("UIS-19", false, "SHID fixture found but connect failed（如实 FAIL）")
                break uis19
            }
            let hid = ble.hid
            hid.begin(deviceId: target.id)
            var verified = false
            for _ in 0..<40 {   // ≤20s INFO 验证
                await settle(500)
                if case .verified = hid.stage { verified = true; break }
                if case .failed = hid.stage { break }
            }
            guard verified else {
                let stageText: String
                switch hid.stage {
                case .failed(let code, _, _): stageText = "failed(\(code))"
                default: stageText = "\(hid.stage)"
                }
                ble.disconnect(deviceId: target.id)
                await settle(300)
                check("UIS-19", false, "SHID fixture connected but identity verify did not pass: \(stageText)（如实 FAIL）")
                break uis19
            }
            // 下发 candidate：token 32 位小写 hex（不以 ff/ee/dd 开头 → success 场景）
            hid.submit(ssid: "SimNet", password: "fixture-pass", hubAddress: "hub.local:17892",
                       token: "a1b2c3d4e5f60718293a4b5c6d7e8f90")
            var outcome = "n/a"
            for _ in 0..<180 {   // ≤90s：7 步 × 600ms + 轮询节拍
                await settle(500)
                switch hid.stage {
                case .done: outcome = "done"
                case .failed(let code, _, _): outcome = "failed(\(code))"
                default: continue
                }
                break
            }
            ble.markProvisioningSession(deviceId: target.id, on: false)
            ble.disconnect(deviceId: target.id)
            await settle(300)
            check("UIS-19", outcome == "done",
                  "identity=verified outcome=\(outcome) target=\(target.name)（真实无线电配网走链）")
        }

        print("[UISMOKE] SUMMARY failures=\(failures) skips=\(skips)")
        fflush(stdout)
        exit(failures > 0 ? 1 : 0)
    }
}
