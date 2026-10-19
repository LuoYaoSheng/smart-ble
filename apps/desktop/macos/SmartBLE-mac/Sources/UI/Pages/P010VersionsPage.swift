//
// P010VersionsPage.swift — PAGE010 版本记录（F027 · Desktop HTML 对齐）
// 卡片顺序、尺寸与状态词遵循 prototype/platform/desktop/high-fi/pages/p010-versions.js。
//

import AppKit

@MainActor
final class P010VersionsPage: NSViewController, PageProtocol {
    weak var host: PageHost?
    private var scroll: PageScroll!

    private let limitations = [
        "OTA 端到端链路 BLOCKED：固件侧暂未开放升级通道",
        "iOS 广播依赖原生能力与签名真机验证",
        "H5 平台不支持 BLE 外围模式",
    ]

    private let previews: [(version: String, date: String, note: String, sha: String)] = [
        ("v1.0.5-preview", "2026-09-09", "Apple 原生 Smart HID 与 HTML 对齐进行中", "local"),
        ("v1.0.4-preview", "2026-08-21", "Profile 注册表与诊断五项链路", "a91e3d7"),
    ]

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

    func rebuild() {
        guard host != nil else { return }
        var views: [NSView] = []
        views.append(subnav(title: "版本记录", onBack: { [weak self] in
            self?.host?.router.back()
        }))

        views.append(currentVersionCard())
        views.append(limitationsCard())
        views.append(releaseHistoryCard())
        views.append(previewHistoryCard())

        let foot = makeLabel("本页数据来自 Release Metadata 投影，不是手写版本事实源。", size: 10, color: DS.ph, align: .center)
        views.append(foot)
        scroll.setViews(views)
    }

    private func currentVersionCard() -> NSView {
        let version = makeLabel(DS.probeVersion, size: 24, weight: .heavy, color: DS.primary)
        version.setContentCompressionResistancePriority(.required, for: .horizontal)

        let card = Card(padding: 14)
        let platformRow1 = hstack([
            statusWord("App · Android NOT_RELEASED", tone: "danger"),
            statusWord("App · iOS NOT_RELEASED", tone: "danger"),
            NSView(),
        ], spacing: 6)
        let platformRow2 = hstack([
            statusWord("H5 / Web NOT_RELEASED", tone: "danger"),
            statusWord("桌面端 NOT_RELEASED", tone: "danger"),
            NSView(),
        ], spacing: 6)
        card.setViews([
            sectionTitle("doc", "当前版本"),
            hstack([version, statusWord(DS.probeChannel, tone: "primary"), NSView()], spacing: 10),
            kvRow("构建", "v+local", mono: true),
            kvRow("Release tag", "已登记（preview）"),
            platformRow1,
            platformRow2,
            DSButton("复制版本信息", tone: .soft, small: true, symbol: "doc.on.doc", actionId: "p010-copy") { [weak self] in
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString("\(DS.probeVersion) · \(DS.probeChannel) · \(DS.probeBranch)", forType: .string)
                self?.host?.toast("版本已复制", ok: true)
            },
        ], spacing: 8)
        return card
    }

    private func limitationsCard() -> NSView {
        let rows = limitations.map { text -> NSView in
            let label = makeLabel(text, size: 13, color: DS.sub)
            label.maximumNumberOfLines = 0
            label.lineBreakMode = .byWordWrapping
            return hstack([
                makeIcon("exclamationmark.triangle.fill", color: DS.warningDeep, size: 12),
                label,
            ], spacing: 8, alignment: .top)
        }
        let card = Card(padding: 14)
        card.setViews(
            [sectionTitle("exclamationmark.triangle", "当前限制")]
                + rows
                + [noteBanner("info", "当前无 Artifact，不提供下载入口。")],
            spacing: 8
        )
        return card
    }

    private func releaseHistoryCard() -> NSView {
        let card = Card(padding: 14)
        card.setViews([
            sectionTitle("checkmark.circle", "正式发布历史"),
            emptyState(
                symbol: "doc",
                title: "暂无正式发布版本",
                desc: "产品当前处于 PREVIEW 阶段，首个正式版发布后将在此列出。"
            ),
        ], spacing: 8)
        return card
    }

    private func previewHistoryCard() -> NSView {
        let rows = previews.map { item -> NSView in
            let top = hstack([
                makeLabel(item.version, size: 13, weight: .semibold),
                NSView(),
                makeLabel(item.sha, size: 12, color: DS.mut, mono: true),
            ], spacing: 8)
            let detail = makeLabel("\(item.date) · \(item.note)", size: 11, color: DS.mut)
            detail.maximumNumberOfLines = 0
            return vstack([top, detail], spacing: 3)
        }
        let card = Card(padding: 14)
        card.setViews([sectionTitle("arrow.down.circle", "预览记录")] + rows, spacing: 9)
        return card
    }

    private func statusWord(_ text: String, tone: String) -> NSView {
        let foreground: NSColor
        let background: NSColor
        switch tone {
        case "primary":
            foreground = DS.primary
            background = DS.primaryWeak
        case "success":
            foreground = DS.successDeep
            background = DS.successWeak
        case "warning":
            foreground = DS.warningDeep
            background = DS.warningWeak
        default:
            foreground = DS.danger
            background = DS.dangerWeak
        }

        let label = makeLabel(text, size: 10, weight: .bold, color: foreground, mono: true)
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        let box = NSView()
        box.wantsLayer = true
        box.layer?.backgroundColor = background.cgColor
        box.layer?.cornerRadius = 5
        box.translatesAutoresizingMaskIntoConstraints = false
        box.addSubview(label)
        NSLayoutConstraint.activate([
            box.widthAnchor.constraint(equalToConstant: max(24, label.intrinsicContentSize.width + 14)),
            box.heightAnchor.constraint(equalToConstant: 22),
            label.topAnchor.constraint(equalTo: box.topAnchor, constant: 2),
            label.bottomAnchor.constraint(equalTo: box.bottomAnchor, constant: -2),
            label.leadingAnchor.constraint(equalTo: box.leadingAnchor, constant: 7),
            label.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: -7),
        ])
        return box
    }
}
