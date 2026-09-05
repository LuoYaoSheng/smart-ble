//
// P009AboutPage.swift — PAGE009 关于（F026 脱敏演示 / F027 版本元数据 / F028 推广跳转 / F029 分享）
// 桌面差异：推广卡 = 落地页（系统浏览器，真实 NSWorkspace）+ 小程序码示意；外链 = 系统浏览器 modal；
// 分享 = 复制介绍文本（文件候选拦截）；应用信息卡含「操作系统」行（真实宿主 macOS · CoreBluetooth，
// 原型的三 OS 切换为评审演示装置，实机呈现真实宿主——分歧登记 integration-notes）+ 生态能力矩阵卡（macOS 行）。
//

import AppKit

// 确定性伪二维码（desktop.js qrDemo 同算法 · FNV-1a 21×21 · 示意图形非真实可扫）
@MainActor
final class PseudoQRView: NSView {
    let seed: String
    init(seed: String, size: CGFloat = 128) {
        self.seed = seed
        super.init(frame: NSRect(x: 0, y: 0, width: size, height: size))
        translatesAutoresizingMaskIntoConstraints = false
        widthAnchor.constraint(equalToConstant: size).isActive = true
        heightAnchor.constraint(equalToConstant: size).isActive = true
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func draw(_ dirtyRect: NSRect) {
        NSColor.white.setFill()
        bounds.fill()
        var h: UInt32 = 2166136261
        for b in seed.utf8 {
            h ^= UInt32(b)
            h = h &* 16777619
        }
        func rnd() -> Double {
            h ^= h << 13; h &= 0xFFFFFFFF
            h ^= h >> 17
            h ^= h << 5; h &= 0xFFFFFFFF
            return Double(h) / 4294967296.0
        }
        let n = 21
        let c = bounds.width / CGFloat(n)
        NSColor(red: 0.07, green: 0.07, blue: 0.1, alpha: 1).setFill()
        func finder(_ x: Int, _ y: Int) {
            let r = NSRect(x: CGFloat(x) * c, y: bounds.height - CGFloat(y + 7) * c, width: 7 * c, height: 7 * c)
            r.fill()
            NSColor.white.setFill()
            NSRect(x: r.minX + c, y: r.minY + c, width: 5 * c, height: 5 * c).fill()
            NSColor(red: 0.07, green: 0.07, blue: 0.1, alpha: 1).setFill()
            NSRect(x: r.minX + 2 * c, y: r.minY + 2 * c, width: 3 * c, height: 3 * c).fill()
        }
        for y in 0..<n {
            for x in 0..<n {
                if (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8) { continue }
                if rnd() < 0.44 {
                    NSRect(x: CGFloat(x) * c, y: bounds.height - CGFloat(y + 1) * c, width: c, height: c).fill()
                }
            }
        }
        finder(0, 0); finder(n - 7, 0); finder(0, n - 7)
    }
}

@MainActor
final class P009AboutPage: NSViewController, PageProtocol {
    weak var host: PageHost?
    private var scroll: PageScroll!

    /// 推广卡静态配置（产品 RELATED_MINI_PROGRAMS 投影 · 脱敏演示域）
    private let promos: [(name: String, desc: String, abbr: String, land: String)] = [
        ("LightBLE 调试台", "同开发者桌面端 BLE 工具", "LB", "lightble.example.com"),
        ("ESP32 快速配网", "ESP32 设备配网演示小程序", "ES", "esp-config.example.com"),
    ]

    /// 平台状态（Release Metadata 投影 · 产品口径）
    private let platformStatus: [(name: String, cap: String, rel: String)] = [
        ("微信小程序", "VERIFIED", "PREVIEW"),
        ("App · Android", "PREVIEW", "NOT_RELEASED"),
        ("App · iOS", "UNSUPPORTED", "NOT_RELEASED"),
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
        guard let host else { return }
        var views: [NSView] = []
        views.append(navbar(kicker: "ABOUT", title: "关于", trailing: [chip("\(DS.probeVersion)", mono: true)]))

        // 品牌卡（渐变 · --c-primary→deep）
        let brand = NSView()
        brand.wantsLayer = true
        brand.layer?.cornerRadius = DS.rLg
        brand.layer?.backgroundColor = DS.primary.cgColor
        brand.translatesAutoresizingMaskIntoConstraints = false
        let gradient = CAGradientLayer()
        gradient.colors = [DS.primaryDeep.cgColor, DS.primary.cgColor, #colorLiteral(red: 0x3F/255, green: 0x86/255, blue: 0xFF/255, alpha: 1).cgColor]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint = CGPoint(x: 1, y: 1)
        gradient.cornerRadius = DS.rLg
        brand.layer?.addSublayer(gradient)
        let icon = makeIcon("dot.radiowaves.left.and.right", color: .white, size: 24)
        let iconBox = NSView()
        iconBox.wantsLayer = true
        iconBox.layer?.backgroundColor = NSColor.white.withAlphaComponent(0.18).cgColor
        iconBox.layer?.cornerRadius = 13
        iconBox.translatesAutoresizingMaskIntoConstraints = false
        iconBox.addSubview(icon)
        NSLayoutConstraint.activate([
            iconBox.widthAnchor.constraint(equalToConstant: 46),
            iconBox.heightAnchor.constraint(equalToConstant: 46),
            icon.centerXAnchor.constraint(equalTo: iconBox.centerXAnchor),
            icon.centerYAnchor.constraint(equalTo: iconBox.centerYAnchor),
        ])
        let lg = makeLabel("BLE Toolkit+", size: 24, weight: .heavy, color: .white)
        let vsChip = makeLabel("✓ v\(DS.probeVersion) · \(DS.probeChannel)", size: 11, weight: .semibold, color: .white)
        let desc = makeLabel("面向 UniApp、微信小程序与 ESP32 协同验证的 BLE 调试工具 · 零后端 · 零本地持久化", size: 12, color: NSColor.white.withAlphaComponent(0.85))
        desc.lineBreakMode = .byWordWrapping
        desc.maximumNumberOfLines = 0
        let brandColumn = vstack([
            hstack([iconBox, vstack([lg, vsChip], spacing: 4)], spacing: 12, alignment: .centerY),
            desc,
        ], spacing: 9)
        brand.addSubview(brandColumn)
        views.append(containerView(brand, brandColumn))

        // 更多小程序（F028 · 非微信渠道承接）
        views.append(sectionTitle("square.and.arrow.up.on.square", "更多小程序"))
        let promoCard = Card(padding: 6)
        promoCard.setViews(promos.map { p in
            let abbrBox = NSView()
            abbrBox.wantsLayer = true
            abbrBox.layer?.backgroundColor = DS.primaryWeak.cgColor
            abbrBox.layer?.cornerRadius = DS.rSm
            abbrBox.translatesAutoresizingMaskIntoConstraints = false
            abbrBox.addSubview(makeLabel(p.abbr, size: 15, weight: .heavy, color: DS.primary, align: .center))
            NSLayoutConstraint.activate([
                abbrBox.widthAnchor.constraint(equalToConstant: 38),
                abbrBox.heightAnchor.constraint(equalToConstant: 38),
            ])
            let go = DSButton("前往", tone: .soft, small: true, actionId: "p009-promo") { [weak self] in
                self?.openPromo(name: p.name, land: p.land)
            }
            let row = hstack([abbrBox, vstack([
                makeLabel(p.name, size: 13, weight: .semibold),
                makeLabel(p.desc, size: 11, color: DS.mut),
            ], spacing: 2), NSView(), go], spacing: 11, alignment: .centerY)
            row.translatesAutoresizingMaskIntoConstraints = false
            return row
        }, spacing: 4)
        views.append(promoCard)

        // 应用信息（真实环境）
        views.append(sectionTitle("info.circle", "应用信息"))
        let infoCard = Card()
        infoCard.setViews([
            kvRow("当前环境", "Desktop · \(osVersionText)"),
            kvRow("设备型号", Host.current().localizedName ?? "Mac"),
            kvRow("构建", "\(DS.probeVersion)（\(DS.probeBranch) 探针构建投影）", mono: true),
        ], spacing: 0)
        // 操作系统行（桌面差异注入点 · 实机=真实宿主）
        let osRow = MenuRowButton(symbol: "gearshape", title: "操作系统",
                                  subtitle: "macOS · CoreBluetooth · 点按查看", actionId: "dtk-ossheet") { [weak self] in
            self?.openOsSheet()
        }
        infoCard.setViews([
            kvRow("当前环境", "Desktop · \(osVersionText)"),
            kvRow("设备型号", Host.current().localizedName ?? "Mac"),
            osRow,
            kvRow("构建", "\(DS.probeVersion)（\(DS.probeBranch) 探针构建投影）", mono: true),
            hstack(features.map { chip($0, tone: "primary") }, spacing: 6),
        ], spacing: 8)
        views.append(infoCard)

        // 平台状态（五词表）
        let statusCard = Card()
        statusCard.setViews(platformStatus.map { p in
            let capChip = statusWord(p.cap)
            let relChip = p.cap == p.rel ? nil : statusWord(p.rel)
            return hstack([makeLabel(p.name, size: 13)] + (relChip.map { [capChip, $0] } ?? [capChip]) + [NSView()], spacing: 8)
        }, spacing: 9)
        views.append(statusCard)

        // 生态能力矩阵卡（11_ecosystem · 随真实宿主 macOS）
        let mxCard = Card()
        var mxViews: [NSView] = [makeLabel("生态能力矩阵（11_ecosystem · macOS）", size: 13, weight: .bold)]
        for (k, v, note) in matrixRows {
            let tone = v.hasPrefix("✅") ? DS.successDeep : v.hasPrefix("⚠") ? DS.warningDeep : DS.danger
            var row = [makeLabel(k, size: 12, color: DS.sub), NSView(), makeLabel(v, size: 12, weight: .bold, color: tone)]
            mxViews.append(hstack(row, spacing: 8))
            if !note.isEmpty {
                mxViews.append(makeLabel(note, size: 10, color: DS.mut))
            }
        }
        mxViews.append(makeLabel("来源：Smart_BLE_平台功能差异矩阵 v1.0（11_ecosystem）· 桌面行 MAC；能力细节待 D2 spike 实测后回写。", size: 10, color: DS.mut))
        mxCard.setViews(mxViews, spacing: 5)
        views.append(mxCard)

        // 相关链接菜单
        let menuCard = Card(padding: 8)
        menuCard.setViews([
            MenuRowButton(symbol: "arrow.up.right.square", title: "官方网站", actionId: "p009-openweb") { [weak self] in
                self?.openExternal("smartble.example.com")
            },
            MenuRowButton(symbol: "paperplane", title: "问题反馈", actionId: "p009-feedback") { [weak self] in
                self?.openExternal("feedback.example.com/ble-toolkit")
            },
            MenuRowButton(symbol: "doc", title: "版本记录", actionId: "p009-versions") { [weak self] in
                self?.host?.router.go(.p010)
            },
            MenuRowButton(symbol: "square.and.arrow.up", title: "分享应用", actionId: "p009-shareapp") { [weak self] in
                self?.shareApp()
            },
        ], spacing: 0)
        views.append(menuCard)

        let foot = makeLabel("日志全局脱敏：敏感凭据显示为 token=***\nBLE Toolkit+ · Smart BLE 产品家族 · 桌面探针（\(DS.probeBranch)）", size: 11, color: DS.ph, align: .center)
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
            label.topAnchor.constraint(equalTo: box.topAnchor, constant: 1),
            label.bottomAnchor.constraint(equalTo: box.bottomAnchor, constant: -1),
            label.leadingAnchor.constraint(equalTo: box.leadingAnchor, constant: 7),
            label.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: -7),
        ])
        return box
    }

    // MARK: - 推广详情 sheet（F028 非微信渠道承接 · 落地页真实打开）

    private func openPromo(name: String, land: String) {
        guard let host else { return }
        var body: [NSView] = []
        body.append(noteBanner("info", "非微信渠道承接（用户指示 2026-09-03）：Desktop 无法直跳微信小程序 → 浏览器打开落地页 + 出示小程序码（微信扫码可达 · 可下载）。"))
        let qrHost = NSView()
        qrHost.wantsLayer = true
        qrHost.layer?.backgroundColor = NSColor.white.cgColor
        qrHost.layer?.cornerRadius = DS.rMd
        qrHost.addSubview(PseudoQRView(seed: name))
        body.append(qrHost)
        body.append(makeLabel("小程序码（示意图形 · 实机为静态预生成资源，零后端）· 落地页 \(land)", size: 11, color: DS.mut, align: .center))
        let open = DSButton("打开落地页", tone: .primary, symbol: "arrow.up.right.square", actionId: "dtk-promoland") { [weak self] in
            self?.host?.closeLayer()
            if let url = URL(string: "https://\(land)") {
                NSWorkspace.shared.open(url)
            }
            self?.host?.toast("已在系统浏览器打开落地页 · \(land)", ok: true)
        }
        let download = DSButton("下载小程序码", tone: .soft, symbol: "arrow.down.circle", actionId: "dtk-promoqr") { [weak self] in
            self?.host?.toast("候选能力：文件导出未决策，暂不提供（10_platform §2.4）")
        }
        body.append(hstack([open, download], spacing: 9))
        host.showSheet(title: "\(name) · 推广详情", body: vstack(body, spacing: 12))
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
