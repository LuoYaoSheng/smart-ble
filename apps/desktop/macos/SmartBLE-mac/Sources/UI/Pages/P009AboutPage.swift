//
// P009AboutPage.swift — PAGE009 关于（F026 脱敏演示 / F027 版本元数据 / F029 分享；F028 推广跳转 2026-09-10 移除）
// 外链 = 系统浏览器 modal；分享 = 复制介绍文本（文件候选拦截）；应用信息卡含「操作系统」行（真实宿主 macOS · CoreBluetooth，
// 原型的三 OS 切换为评审演示装置，实机呈现真实宿主——分歧登记 integration-notes）+ 生态能力矩阵卡（macOS 行）。
//

import AppKit

// PseudoQRView（伪二维码）随 F028 推广区 2026-09-10 移除

@MainActor
final class P009AboutPage: NSViewController, PageProtocol {
    weak var host: PageHost?
    private var scroll: PageScroll!

    // F028 推广跳转（更多小程序卡）2026-09-10 移除——promos 配置与 promo 卡/sheet 随之退役

    /// 平台状态（Release Metadata 投影 · 产品口径）
    private let platformStatus: [(name: String, cap: String, rel: String)] = [
        ("微信小程序", "VERIFIED", "PREVIEW"),
        ("App · Android", "PREVIEW", "NOT_RELEASED"),
        ("App · iOS", "PREVIEW", "NOT_RELEASED"),
        ("H5 / Web", "UNSUPPORTED", "NOT_RELEASED"),
        ("桌面端", "REFERENCE", "NOT_RELEASED"),
    ]

    /// 生态能力矩阵（11_ecosystem · MAC 行，随真实宿主呈现）
    private let matrixRows: [(String, String, String)] = [
        ("蓝牙状态检测", "✅", ""),
        ("设备扫描", "✅", "Linux 依赖 BlueZ"),
        ("设备连接", "✅", ""),
        ("GATT 读写/Notify", "✅", ""),
        ("广播监听", "⚠️", "macOS 原始广播数据受限"),
        ("广播发送", "❌【待验证】", "冲突 C2：CoreBluetooth 外围能力公开存在，以 D2 实测为准"),
        ("多设备", "⚠️", ""),
        ("长连接", "✅", "常驻形态（§4）"),
        ("自动重连", "✅", ""),
        ("OTA", "✅", "现版 F025 BLOCKED 不变"),
    ]

    private let features = ["01 蓝牙扫描与筛选", "02 GATT 读写与监听", "03 多设备会话管理",
                            "04 BLE 广播发射", "05 Smart HID 配网", "06 固件升级（受限）"]

    init(host: PageHost) {
        self.host = host
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func loadView() {
        scroll = PageScroll()
        view = scroll
        view.wantsLayer = true
        view.layer?.backgroundColor = DS.bg.cgColor
    }

    private var osVersionText: String {
        let v = ProcessInfo.processInfo.operatingSystemVersion
        return "macOS \(v.majorVersion).\(v.minorVersion)"
    }

    func rebuild() {
        guard host != nil else { return }
        var views: [NSView] = []
        views.append(navbar(kicker: "ABOUT", title: "关于", trailing: [
            makeLabel(DS.probeVersion, size: 10, weight: .semibold, color: DS.mut, mono: true),
        ]))

        let brandIcon = NSView()
        brandIcon.wantsLayer = true
        brandIcon.layer?.cornerRadius = 10
        brandIcon.layer?.backgroundColor = DS.primary.cgColor
        brandIcon.translatesAutoresizingMaskIntoConstraints = false
        let brandGlyph = bundledSVG("bt", width: 22, height: 22)
            ?? makeIcon("dot.radiowaves.left.and.right", color: .white, size: 20)
        brandIcon.addSubview(brandGlyph)
        NSLayoutConstraint.activate([
            brandIcon.widthAnchor.constraint(equalToConstant: 42),
            brandIcon.heightAnchor.constraint(equalToConstant: 42),
            brandGlyph.centerXAnchor.constraint(equalTo: brandIcon.centerXAnchor),
            brandGlyph.centerYAnchor.constraint(equalTo: brandIcon.centerYAnchor),
        ])
        let brandCard = Card(padding: 14)
        brandCard.setViews([
            hstack([
                brandIcon,
                vstack([
                    makeLabel("BLE Toolkit+", size: 15, weight: .bold),
                    makeLabel("v\(DS.probeVersion) · \(DS.probeChannel) · 零后端 · 零本地持久化", size: 10, color: DS.mut),
                ], spacing: 2),
                NSView(),
            ], spacing: 12, alignment: .centerY),
        ], spacing: 0)
        views.append(brandCard)

        views.append(sectionTitle("info.circle", "应用信息"))
        let infoCard = Card(padding: 14)
        let featureRow1 = makeLabel(features.prefix(3).joined(separator: "   "), size: 10, weight: .semibold, color: DS.primary)
        let featureRow2 = makeLabel(features.suffix(3).joined(separator: "   "), size: 10, weight: .semibold, color: DS.primary)
        let osRow = MenuRowButton(
            symbol: "slider.horizontal.3",
            title: "操作系统",
            subtitle: "macOS · CoreBluetooth · 点按查看",
            actionId: "dtk-ossheet"
        ) { [weak self] in
            self?.openOsSheet()
        }
        infoCard.setViews([
            kvRow("当前环境", "Desktop · \(osVersionText)"),
            osRow,
            kvRow("设备型号", Host.current().localizedName ?? "Mac"),
            kvRow("构建", "Release Metadata · \(DS.probeChannel)", mono: true),
            featureRow1,
            featureRow2,
        ], spacing: 5)
        views.append(infoCard)

        let statusRows = platformStatus.map { item -> NSView in
            hstack([
                makeLabel(item.name, size: 12, weight: .semibold),
                statusWord(item.cap),
                statusWord(item.rel),
                NSView(),
            ], spacing: 10)
        }
        let statusCard = Card(padding: 14)
        statusCard.setViews(statusRows, spacing: 4)
        views.append(statusCard)

        let menuCard = Card(padding: 0)
        menuCard.setViews([
            MenuRowButton(symbol: "arrow.up.right.square", title: "官方网站", actionId: "p009-openweb") { [weak self] in
                self?.openExternal("lightble.i2kai.com")
            },
            MenuRowButton(symbol: "paperplane", title: "问题反馈", actionId: "p009-feedback") { [weak self] in
                self?.openExternal("github.com/luoyaosheng/smart-ble/issues")
            },
            MenuRowButton(symbol: "doc", title: "版本记录", actionId: "p009-versions") { [weak self] in
                self?.host?.router.go(.p010)
            },
            MenuRowButton(symbol: "square.and.arrow.up", title: "分享应用", actionId: "p009-shareapp") { [weak self] in
                self?.shareApp()
            },
        ], spacing: 0)
        views.append(menuCard)

        let foot = makeLabel("日志全局脱敏：敏感凭据显示为 token=***\nBLE Toolkit+ · Smart BLE 产品家族 · 微信小程序 wxf6c58b1dcac4c82d", size: 10, color: DS.ph, align: .center)
        foot.maximumNumberOfLines = 0
        views.append(foot)

        scroll.setViews(views)
    }

    /// 容器：内容列决定尺寸（品牌卡渐变背景包裹）
    private func containerView(_ box: NSView, _ column: NSStackView) -> NSView {
        box.addSubview(column)
        NSLayoutConstraint.activate([
            column.topAnchor.constraint(equalTo: box.topAnchor, constant: 20),
            column.bottomAnchor.constraint(lessThanOrEqualTo: box.bottomAnchor, constant: -20),
            column.leadingAnchor.constraint(equalTo: box.leadingAnchor, constant: 20),
            column.trailingAnchor.constraint(lessThanOrEqualTo: box.trailingAnchor, constant: -20),
        ])
        return box
    }

    private func statusWord(_ w: String) -> NSView {
        let (bg, fg): (NSColor, NSColor)
        switch w {
        case "VERIFIED": (bg, fg) = (DS.successWeak, DS.successDeep)
        case "PREVIEW": (bg, fg) = (DS.primaryWeak, DS.primary)
        case "BLOCKED": (bg, fg) = (DS.warningWeak, DS.warningDeep)
        case "UNSUPPORTED": (bg, fg) = (DS.fill, DS.mut)
        default: (bg, fg) = (DS.dangerWeak, DS.danger)
        }
        let label = makeLabel(w, size: 10, weight: .bold, color: fg, mono: true, align: .center)
        let box = NSView()
        box.wantsLayer = true
        box.layer?.backgroundColor = bg.cgColor
        box.layer?.cornerRadius = 5
        box.translatesAutoresizingMaskIntoConstraints = false
        box.addSubview(label)
        NSLayoutConstraint.activate([
            box.widthAnchor.constraint(equalToConstant: max(24, label.intrinsicContentSize.width + 14)),
            box.heightAnchor.constraint(equalToConstant: 22),
            label.topAnchor.constraint(equalTo: box.topAnchor, constant: 1),
            label.bottomAnchor.constraint(equalTo: box.bottomAnchor, constant: -1),
            label.leadingAnchor.constraint(equalTo: box.leadingAnchor, constant: 7),
            label.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: -7),
        ])
        return box
    }

    // MARK: - 操作系统 sheet（信息呈现：三系原生层口径 · 实机不切换）

    private func openOsSheet() {
        guard let host else { return }
        let oses: [(String, String, Bool)] = [
            ("macOS", "CoreBluetooth", true),
            ("Windows", "WinRT", false),
            ("Linux", "BlueZ", false),
        ]
        let rows = oses.map { n, layer, current in
            hstack([
                makeLabel("\(n)  原生层 \(layer)", size: 13, weight: current ? .bold : .regular, color: current ? DS.text : DS.sub),
                NSView(),
                current ? chip("当前宿主", tone: "primary") : NSView(),
            ], spacing: 8)
        }
        let body = vstack(rows + [
            noteBanner("info", "桌面操作系统区分原生 BLE 层（10_platform §2.4）：macOS CoreBluetooth / Windows WinRT / Linux BlueZ。本机为 macOS——原型的三 OS 切换为评审演示装置，实机呈现真实宿主。D2 技术选型 spike 进行中，能力细节不预判；Linux 广播外围受 BlueZ / 内核权限影响【待验证】。"),
        ], spacing: 10)
        host.showSheet(title: "操作系统（桌面宿主）", body: body)
    }

    // MARK: - 外链 / 分享（桌面覆写口径）

    private func openExternal(_ url: String) {
        guard let host else { return }
        host.showModal(title: "在系统浏览器打开", content: "\(url)\n（桌面端默认浏览器）",
                       confirmText: "打开", cancelText: "复制网址", hideCancel: false,
                       onConfirm: { [weak host] in
                           if let u = URL(string: "https://\(url)") {
                               NSWorkspace.shared.open(u)
                           }
                           host?.toast("已打开系统浏览器", ok: true)
                       },
                       onCancel: { [weak host] in
                           NSPasteboard.general.clearContents()
                           NSPasteboard.general.setString(url, forType: .string)
                           host?.toast("网址已复制", ok: true)
                       })
    }

    private func shareApp() {
        guard let host else { return }
        host.showModal(title: "分享应用（桌面）",
                       content: "桌面无社交分享面板 → 导出介绍文本。\n（导出文本文件为候选增强，未决策——10_platform §2.4）",
                       confirmText: "复制介绍文本", cancelText: "保存文本文件（候选）", hideCancel: false,
                       onConfirm: { [weak host] in
                           NSPasteboard.general.clearContents()
                           NSPasteboard.general.setString("BLE Toolkit+ · BLE 调试工具（桌面探针）", forType: .string)
                           host?.toast("介绍文本已复制", ok: true)
                       },
                       onCancel: { [weak host] in
                           host?.toast("候选能力：文本文件导出未决策，暂不提供")
                       })
    }
}
