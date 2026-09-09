//
// MainWindowController.swift — 应用壳（对齐原型内核 app.js 形态）
// · 窗口 740×620（演示窗 740×600 + 底部 TabBar），标题 BLE Toolkit+
// · pagehost（滚动列）+ TabBar 四项（扫描/已连接/广播/关于）+ layer（modal/sheet）+ toasts
// · 导航语义 = Router（switchTab/go/back/redirect/smartGo）
// · 窗口关闭 → 退出确认（10_platform §4：常驻，退出确认；活动会话明示断开后果）
//

import Cocoa
import Combine

// MARK: - 页面协议

@MainActor
protocol PageProtocol: NSViewController {
    /// 依据 router/ble 当前状态整体重建视图（探针规模下全量重建，250ms 合并）
    func rebuild()
}

// MARK: - 页面宿主（向页面暴露的路由与反馈能力）

@MainActor
protocol PageHost: AnyObject {
    var router: Router { get }
    var ble: BLEManager { get }
    var shared: AppShared { get }
    func toast(_ text: String, ok: Bool)
    func showModal(title: String, content: String, confirmText: String, cancelText: String?,
                   hideCancel: Bool, onConfirm: (() -> Void)?, onCancel: (() -> Void)?)
    func showSheet(title: String, body: NSView)
    func closeLayer()
    /// 取（或创建）指定页控制器 —— 跨页装配用（如 P003 → P002.begin）
    func page(_ id: PageId) -> (NSViewController & PageProtocol)?
    /// 当前是否有 modal/sheet 弹层（页面收口用，如扫码会话停止）
    var layerVisible: Bool { get }
}

extension PageHost {
    func toast(_ text: String) { toast(text, ok: false) }
}

// MARK: - TabBar（原型 tabbar：四项 · icon+label · 已连接徽标）

@MainActor
private final class TabButton: NSButton {
    let page: PageId
    private var handler: (() -> Void)?
    private(set) var active = false
    let labelField: NSTextField
    let iconView: NSImageView
    private(set) var badgeLabel: NSTextField?
    private var badgeWidthConstraint: NSLayoutConstraint?

    init(page: PageId, iconAsset: String, label: String, handler: @escaping () -> Void) {
        self.page = page
        self.handler = handler
        self.labelField = makeLabel(label, size: 10, weight: .medium, color: DS.mut, align: .center)
        if let sourceIcon = bundledSVG(iconAsset, width: 23, height: 23, template: true) {
            self.iconView = sourceIcon
        } else {
            let fallback = NSImageView()
            fallback.image = NSImage(systemSymbolName: "circle", accessibilityDescription: nil)
            fallback.translatesAutoresizingMaskIntoConstraints = false
            fallback.widthAnchor.constraint(equalToConstant: 23).isActive = true
            fallback.heightAnchor.constraint(equalToConstant: 23).isActive = true
            self.iconView = fallback
        }

        super.init(frame: .zero)
        isBordered = false
        translatesAutoresizingMaskIntoConstraints = false
        focusRingType = .none
        target = self
        action = #selector(tapped)
        title = ""
        toolTip = label
        setAccessibilityLabel(label)

        let column = NSStackView(views: [iconView, labelField])
        column.orientation = .vertical
        column.spacing = 3
        column.alignment = .centerX
        column.translatesAutoresizingMaskIntoConstraints = false
        addSubview(column)
        NSLayoutConstraint.activate([
            column.centerXAnchor.constraint(equalTo: centerXAnchor),
            column.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    @objc private func tapped() { handler?() }

    func setActive(_ on: Bool) {
        active = on
        iconView.contentTintColor = on ? DS.primary : DS.mut
        labelField.textColor = on ? DS.primary : DS.mut
        labelField.font = DS.font(10, on ? .bold : .medium)
        needsDisplay = true
    }

    func setBadge(_ n: Int) {
        if n > 0 {
            if badgeLabel == nil {
                let b = NSTextField(labelWithString: "\(n)")
                b.font = DS.font(9, .bold)
                b.textColor = .white
                b.alignment = .center
                b.wantsLayer = true
                b.layer?.backgroundColor = DS.danger.cgColor
                b.layer?.cornerRadius = 8
                b.translatesAutoresizingMaskIntoConstraints = false
                addSubview(b)
                let width = b.widthAnchor.constraint(equalToConstant: n > 9 ? 24 : 16)
                NSLayoutConstraint.activate([
                    b.topAnchor.constraint(equalTo: topAnchor, constant: 2),
                    b.centerXAnchor.constraint(equalTo: centerXAnchor, constant: 13),
                    width,
                    b.heightAnchor.constraint(equalToConstant: 16),
                ])
                badgeLabel = b
                badgeWidthConstraint = width
            }
            badgeLabel?.stringValue = "\(n)"
            badgeWidthConstraint?.constant = n > 9 ? 24 : 16
            badgeLabel?.isHidden = false
        } else {
            badgeLabel?.isHidden = true
        }
    }
}

// MARK: - 主窗口控制器

@MainActor
final class MainWindowController: NSWindowController, NSWindowDelegate, PageHost {
    let router = Router()
    let ble = BLEManager()
    let shared = AppShared()

    private var cancellables = Set<AnyCancellable>()
    private var pageControllers: [PageId: NSViewController & PageProtocol] = [:]
    private var pageContainer: NSView!
    private var tabBar: NSView!
    private var pageBottomToTabConstraint: NSLayoutConstraint!
    private var pageBottomToContentConstraint: NSLayoutConstraint!
    private var tabButtons: [TabButton] = []
    private var layerMask: NSView?
    private var layerCard: NSView?
    private var layerIsSheet = false
    private var toastStack: NSStackView!
    private var rebuildScheduled = false
    private var quitConfirmed = false
    private var previewConnectedCountOverride: Int?

    // 冒烟辅助：外部只读访问当前页面
    var currentPage: (NSViewController & PageProtocol)? { pageControllers[router.cur] }

    // MARK: - Initialization
    override init(window: NSWindow?) {
        super.init(window: window)
        setupWindow()
        setupContent()
        bind()
        showPage()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupWindow()
        setupContent()
        bind()
        showPage()
    }

    private func setupWindow() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 740, height: 620),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "BLE Toolkit+"
        window.center()
        window.minSize = NSSize(width: 560, height: 540)
        window.backgroundColor = DS.bg
        window.titlebarAppearsTransparent = false
        window.delegate = self
        self.window = window
    }

    private func setupContent() {
        guard let window = window else { return }
        let content = NSView()
        content.wantsLayer = true
        content.layer?.backgroundColor = DS.bg.cgColor
        window.contentView = content

        // Toast 宿主（最顶层，z-toast）
        toastStack = NSStackView()
        toastStack.orientation = .vertical
        toastStack.alignment = .centerX
        toastStack.spacing = 6
        toastStack.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(toastStack)

        // TabBar（底部，--tabbar h64）
        tabBar = NSView()
        tabBar.wantsLayer = true
        tabBar.layer?.backgroundColor = NSColor.white.withAlphaComponent(0.96).cgColor
        tabBar.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(tabBar)
        let tabs: [(PageId, String, String)] = [
            (.p001, "tab-scan", "扫描"),
            (.p007, "tab-link", "已连接"),
            (.p008, "tab-cast", "广播"),
            (.p009, "tab-info", "关于"),
        ]
        for (page, iconAsset, label) in tabs {
            let btn = TabButton(page: page, iconAsset: iconAsset, label: label) { [weak self] in
                self?.router.switchTab(page)
            }
            tabButtons.append(btn)
            tabBar.addSubview(btn)
            btn.widthAnchor.constraint(greaterThanOrEqualToConstant: 88).isActive = true
            btn.heightAnchor.constraint(equalToConstant: 44).isActive = true
        }
        let tabRow = hstack(tabButtons, spacing: 4, alignment: .centerY)
        tabRow.distribution = .fillEqually
        tabBar.addSubview(tabRow)
        let topLine = NSView()
        topLine.wantsLayer = true
        topLine.layer?.backgroundColor = DS.lineSoft.cgColor
        topLine.translatesAutoresizingMaskIntoConstraints = false
        tabBar.addSubview(topLine)
        topLine.heightAnchor.constraint(equalToConstant: 1).isActive = true

        // 页面容器（pagehost）
        pageContainer = NSView()
        pageContainer.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(pageContainer)
        pageBottomToTabConstraint = pageContainer.bottomAnchor.constraint(equalTo: tabBar.topAnchor)
        pageBottomToContentConstraint = pageContainer.bottomAnchor.constraint(equalTo: content.bottomAnchor)

        NSLayoutConstraint.activate([
            pageContainer.topAnchor.constraint(equalTo: content.topAnchor),
            pageContainer.leadingAnchor.constraint(equalTo: content.leadingAnchor),
            pageContainer.trailingAnchor.constraint(equalTo: content.trailingAnchor),
            pageBottomToTabConstraint,
            tabBar.leadingAnchor.constraint(equalTo: content.leadingAnchor),
            tabBar.trailingAnchor.constraint(equalTo: content.trailingAnchor),
            tabBar.bottomAnchor.constraint(equalTo: content.bottomAnchor),
            tabBar.heightAnchor.constraint(equalToConstant: 64),
            tabRow.topAnchor.constraint(equalTo: tabBar.topAnchor, constant: 4),
            tabRow.leadingAnchor.constraint(equalTo: tabBar.leadingAnchor, constant: 8),
            tabRow.trailingAnchor.constraint(equalTo: tabBar.trailingAnchor, constant: -8),
            tabRow.bottomAnchor.constraint(equalTo: tabBar.bottomAnchor, constant: -16),
            topLine.topAnchor.constraint(equalTo: tabBar.topAnchor),
            topLine.leadingAnchor.constraint(equalTo: tabBar.leadingAnchor),
            topLine.trailingAnchor.constraint(equalTo: tabBar.trailingAnchor),
            toastStack.centerXAnchor.constraint(equalTo: content.centerXAnchor),
            toastStack.bottomAnchor.constraint(equalTo: content.bottomAnchor, constant: -80),
        ])
    }

    private func bind() {
        router.$cur
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.showPage() }
            .store(in: &cancellables)

        ble.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.scheduleRebuild() }
            .store(in: &cancellables)
    }

    /// 状态变化 → 当前页全量重建（250ms 合并，近似产品 1s 列表节流口径）
    private func scheduleRebuild() {
        guard !rebuildScheduled else { return }
        rebuildScheduled = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            guard let self else { return }
            self.rebuildScheduled = false
            self.currentPage?.rebuild()
            self.updateTabBar()
        }
    }

    // MARK: - 页面装配

    private func makePage(_ id: PageId) -> NSViewController & PageProtocol {
        switch id {
        case .p001: return P001ScanPage(host: self)
        case .p002: return P002ProvisionPage(host: self)
        case .p003: return P003HidDetailPage(host: self)
        case .p005: return P005DiagnosticsPage(host: self)
        case .p006: return P006GattPage(host: self)
        case .p007: return P007ConnectedPage(host: self)
        case .p008: return P008BroadcastPage(host: self)
        case .p009: return P009AboutPage(host: self)
        case .p010: return P010VersionsPage(host: self)
        }
    }

    private func showPage() {
        closeLayer()
        guard let page = self.page(router.cur) else { return }
        pageContainer.subviews.forEach { $0.removeFromSuperview() }
        // frame+autoresizing 挂载（页面根视图不走 autolayout，避免与滚动内容约束互扰）
        page.view.translatesAutoresizingMaskIntoConstraints = true
        page.view.frame = pageContainer.bounds
        page.view.autoresizingMask = [.width, .height]
        pageContainer.addSubview(page.view)
        page.rebuild()
        updateTabBar()
    }

    private func updateTabBar() {
        let isTab = router.cur.isTab
        tabBar.isHidden = !isTab
        pageBottomToTabConstraint.isActive = false
        pageBottomToContentConstraint.isActive = false
        (isTab ? pageBottomToTabConstraint : pageBottomToContentConstraint).isActive = true
        for btn in tabButtons {
            btn.setActive(btn.page == router.cur)
            // 徽标 = 通用连接会话数 + SHID 配网会话在线（正典 P001 计数口径；配网会话带标记计入）
            let connectedCount = previewConnectedCountOverride ?? ble.connectedCountForBadge
            let badge = btn.page == .p007 ? connectedCount : 0
            btn.setBadge(badge)
        }
    }

    func setTabBarPreviewConnectedCount(_ count: Int?) {
        previewConnectedCountOverride = count
        updateTabBar()
    }

    /// P002 配网会话在线（正典 P007：SHID 配网会话计入徽标但不含于通用列表）
    var provisioningOnline: Bool {
        ble.provisioningSessionOnline
    }

    // MARK: - PageHost 反馈

    func toast(_ text: String, ok: Bool = false) {
        let pill = NSView()
        pill.wantsLayer = true
        pill.layer?.backgroundColor = NSColor(white: 0.1, alpha: 0.88).cgColor
        pill.layer?.cornerRadius = 999
        pill.translatesAutoresizingMaskIntoConstraints = false
        let label = makeLabel((ok ? "✓ " : "") + text, size: 12, weight: .medium, color: .white)
        pill.addSubview(label)
        NSLayoutConstraint.activate([
            label.topAnchor.constraint(equalTo: pill.topAnchor, constant: 7),
            label.bottomAnchor.constraint(equalTo: pill.bottomAnchor, constant: -7),
            label.leadingAnchor.constraint(equalTo: pill.leadingAnchor, constant: 16),
            label.trailingAnchor.constraint(equalTo: pill.trailingAnchor, constant: -16),
        ])
        toastStack.addArrangedSubview(pill)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) { [weak pill] in
            if let pill {
                pill.removeFromSuperview()
            }
        }
    }

    func showModal(title: String, content: String, confirmText: String = "确定",
                   cancelText: String? = "取消", hideCancel: Bool = false,
                   onConfirm: (() -> Void)? = nil, onCancel: (() -> Void)? = nil) {
        closeLayer()
        guard let rootView = window?.contentView else { return }
        layerIsSheet = false

        let mask = NSView()
        mask.wantsLayer = true
        mask.layer?.backgroundColor = NSColor.black.withAlphaComponent(0.35).cgColor
        mask.translatesAutoresizingMaskIntoConstraints = false
        rootView.addSubview(mask)

        let card = NSView()
        card.wantsLayer = true
        card.layer?.backgroundColor = DS.card.cgColor
        card.layer?.cornerRadius = DS.rLg
        card.shadow = NSShadow()
        card.translatesAutoresizingMaskIntoConstraints = false
        mask.addSubview(card)

        let titleLabel = makeLabel(title, size: 17, weight: .bold, align: .center)
        let contentLabel = makeLabel(content, size: 13, color: DS.sub, align: .center)
        contentLabel.maximumNumberOfLines = 0

        var buttons: [NSView] = []
        if !hideCancel, let cancelText {
            buttons.append(DSButton(cancelText, tone: .soft, actionId: "modal-cancel") { [weak self] in
                self?.closeLayer()
                onCancel?()
            })
        }
        buttons.append(DSButton(confirmText, tone: .primary, actionId: "modal-ok") { [weak self] in
            self?.closeLayer()
            onConfirm?()
        })
        let btnRow = hstack(buttons, spacing: 9)
        btnRow.distribution = .fillEqually

        let column = vstack([titleLabel, contentLabel, btnRow], spacing: 14)
        column.alignment = .centerX
        card.addSubview(column)
        NSLayoutConstraint.activate([
            column.topAnchor.constraint(equalTo: card.topAnchor, constant: 20),
            column.bottomAnchor.constraint(lessThanOrEqualTo: card.bottomAnchor, constant: -20),
            column.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            column.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
            mask.topAnchor.constraint(equalTo: rootView.topAnchor),
            mask.bottomAnchor.constraint(equalTo: rootView.bottomAnchor),
            mask.leadingAnchor.constraint(equalTo: rootView.leadingAnchor),
            mask.trailingAnchor.constraint(equalTo: rootView.trailingAnchor),
            card.centerXAnchor.constraint(equalTo: mask.centerXAnchor),
            card.centerYAnchor.constraint(equalTo: mask.centerYAnchor),
            card.widthAnchor.constraint(equalToConstant: 340),
            buttons.first!.widthAnchor.constraint(greaterThanOrEqualToConstant: 120),
        ])
        layerMask = mask
        layerCard = card
    }

    func showSheet(title: String, body: NSView) {
        closeLayer()
        guard let content = window?.contentView else { return }
        layerIsSheet = true

        let mask = NSView()
        mask.wantsLayer = true
        mask.layer?.backgroundColor = NSColor.black.withAlphaComponent(0.35).cgColor
        mask.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(mask)
        let tap = NSClickGestureRecognizer(target: self, action: #selector(maskTapped))
        mask.addGestureRecognizer(tap)

        let card = NSView()
        card.wantsLayer = true
        card.layer?.backgroundColor = DS.card.cgColor
        card.layer?.cornerRadius = DS.rLg
        card.shadow = NSShadow()
        card.translatesAutoresizingMaskIntoConstraints = false
        mask.addSubview(card)

        let grip = NSView()
        grip.wantsLayer = true
        grip.layer?.backgroundColor = DS.line.cgColor
        grip.layer?.cornerRadius = 2.5
        grip.translatesAutoresizingMaskIntoConstraints = false
        grip.widthAnchor.constraint(equalToConstant: 36).isActive = true
        grip.heightAnchor.constraint(equalToConstant: 5).isActive = true
        card.addSubview(grip)

        let titleLabel = makeLabel(title, size: 16, weight: .bold)
        let closeButton = DSButton("✕", tone: .soft, small: true, actionId: "sheet-close") { [weak self] in
            self?.closeLayer()
        }
        let header = hstack([titleLabel, NSView(), closeButton], spacing: 8)
        header.translatesAutoresizingMaskIntoConstraints = false

        let column = vstack([header, body], spacing: 12)
        card.addSubview(column)
        NSLayoutConstraint.activate([
            grip.topAnchor.constraint(equalTo: card.topAnchor, constant: 8),
            grip.centerXAnchor.constraint(equalTo: card.centerXAnchor),
            column.topAnchor.constraint(equalTo: grip.bottomAnchor, constant: 10),
            column.bottomAnchor.constraint(lessThanOrEqualTo: card.bottomAnchor, constant: -18),
            column.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 18),
            column.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -18),
            mask.topAnchor.constraint(equalTo: content.topAnchor),
            mask.bottomAnchor.constraint(equalTo: content.bottomAnchor),
            mask.leadingAnchor.constraint(equalTo: content.leadingAnchor),
            mask.trailingAnchor.constraint(equalTo: content.trailingAnchor),
            card.leadingAnchor.constraint(equalTo: mask.leadingAnchor, constant: 22),
            card.trailingAnchor.constraint(equalTo: mask.trailingAnchor, constant: -22),
            card.bottomAnchor.constraint(equalTo: mask.bottomAnchor),
            body.widthAnchor.constraint(lessThanOrEqualToConstant: 620),
        ])
        layerMask = mask
        layerCard = card
    }

    @objc private func maskTapped() {
        // 原型口径：sheet 遮罩点击 = 关闭（sheet-close）；modal 只经按钮
        if layerIsSheet { closeLayer() }
    }

    func closeLayer() {
        layerMask?.removeFromSuperview()
        layerMask = nil
        layerCard = nil
    }

    func page(_ id: PageId) -> (NSViewController & PageProtocol)? {
        if let existing = pageControllers[id] { return existing }
        let p = makePage(id)
        pageControllers[id] = p
        return p
    }

    var layerVisible: Bool { layerMask != nil }

    // MARK: - 退出确认（§4 生命周期：常驻运行；关闭 → 退出确认）

    func requestQuit() {
        let busy = !ble.connectedDevices.isEmpty || ble.isAdvertising
        showModal(
            title: "退出确认",
            content: busy
                ? "有 BLE 会话正在运行（连接/广播）。\n确认退出将断开会话并停止监听。"
                : "桌面端为常驻运行。确认退出？\n（10_platform §4 生命周期：常驻，退出确认）",
            confirmText: "退出",
            cancelText: "继续使用",
            hideCancel: false,
            onConfirm: { [weak self] in
                guard let self else { return }
                if self.ble.isAdvertising {
                    self.ble.stopAdvertising()
                }
                self.ble.disconnectAll()
                self.ble.stopScan()
                self.quitConfirmed = true
                self.window?.close()
            },
            onCancel: { [weak self] in
                self?.toast("继续运行")
            }
        )
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if quitConfirmed { return true }
        requestQuit()
        return false
    }

    func windowWillClose(_ notification: Notification) {
        ble.disconnectAll()
        ble.stopScan()
    }
}
