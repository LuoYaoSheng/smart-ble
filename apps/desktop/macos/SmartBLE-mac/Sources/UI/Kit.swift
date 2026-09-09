//
// Kit.swift — 组件库（对齐 COMPONENT.md / components.css：B1 按钮 / B2 chip / B3 badge /
// B4 kv / B5 表单 / B6 empty / B7 op-state / B8 error-banner / B9 note / C5 log-panel / C6 stepper）
// 全部代码装配（无 XIB）；冒烟测试通过标题/辅助标识遍历定位控件。
//

import AppKit

// MARK: - 布局助手

@MainActor
func hstack(_ views: [NSView], spacing: CGFloat = DS.sp2, alignment: NSLayoutConstraint.Attribute = .centerY) -> NSStackView {
    let stack = NSStackView(views: views)
    stack.orientation = .horizontal
    stack.spacing = spacing
    stack.alignment = alignment
    views.forEach { $0.translatesAutoresizingMaskIntoConstraints = false }
    return stack
}

@MainActor
func vstack(_ views: [NSView], spacing: CGFloat = DS.sp3, alignment: NSLayoutConstraint.Attribute = .centerX) -> NSStackView {
    let stack = NSStackView(views: views)
    stack.orientation = .vertical
    stack.spacing = spacing
    stack.alignment = .leading
    stack.translatesAutoresizingMaskIntoConstraints = false
    return stack
}

@MainActor
func makeLabel(_ text: String, size: CGFloat, weight: NSFont.Weight = .regular,
               color: NSColor = DS.text, mono: Bool = false, align: NSTextAlignment = .left) -> NSTextField {
    let label = NSTextField(labelWithAttributedString: NSAttributedString(string: text, attributes: [
        .font: mono ? DS.mono(size) : DS.font(size, weight),
        .foregroundColor: color,
        .paragraphStyle: {
            let p = NSMutableParagraphStyle(); p.alignment = align; p.lineBreakMode = .byWordWrapping
            return p
        }()
    ]))
    label.translatesAutoresizingMaskIntoConstraints = false
    return label
}

/// flipped 文档容器（滚动内容自上而下）
@MainActor
final class FlipView: NSView {
    override var isFlipped: Bool { true }
}

/// 页面滚动容器：flipped 文档视图 + 纵向内容列；左右 16pt 边距（pages.css .page padding）
/// 宽度 = 视口（autoresizing），高度 = max(视口, 内容 fitting)。
@MainActor
final class PageScroll: NSScrollView {
    let column: NSStackView
    private let doc = FlipView()

    init() {
        column = NSStackView()
        column.orientation = .vertical
        column.alignment = .leading
        column.spacing = DS.sp3
        column.translatesAutoresizingMaskIntoConstraints = false
        // 页面内容边距：0 16 24（pages.css .page）
        column.edgeInsets = NSEdgeInsets(top: 0, left: 16, bottom: 24, right: 16)

        super.init(frame: .zero)
        doc.autoresizingMask = [.width]
        documentView = doc
        doc.addSubview(column)
        NSLayoutConstraint.activate([
            column.leadingAnchor.constraint(equalTo: doc.leadingAnchor),
            column.trailingAnchor.constraint(equalTo: doc.trailingAnchor),
            column.topAnchor.constraint(equalTo: doc.topAnchor),
        ])
        hasVerticalScroller = true
        hasHorizontalScroller = false
        autohidesScrollers = true
        drawsBackground = false
        translatesAutoresizingMaskIntoConstraints = false
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func setViews(_ views: [NSView]) {
        column.arrangedSubviews.forEach { column.removeArrangedSubview($0); $0.removeFromSuperview() }
        for v in views {
            column.addArrangedSubview(v)
            // 内容行统一钉列宽（-左右边距）：长文本截断/换行，不撑开列
            v.widthAnchor.constraint(equalTo: column.widthAnchor, constant: -32).isActive = true
        }
        relayoutDocument()
    }

    /// 文档尺寸对齐：宽度 = 视口；高度 = max(视口, 内容 fitting)
    private func relayoutDocument() {
        let clip = contentView
        let width = clip.bounds.width
        guard width > 0 else { return }
        column.layoutSubtreeIfNeeded()
        let needed = column.fittingSize.height + column.edgeInsets.top + column.edgeInsets.bottom
        let height = max(clip.bounds.height, needed)
        if abs(doc.bounds.width - width) > 0.5 || abs(doc.bounds.height - height) > 0.5 {
            doc.setFrameSize(NSSize(width: width, height: height))
        }
    }

    override func layout() {
        super.layout()
        relayoutDocument()
    }
}

// MARK: - B1 按钮（primary / danger / soft / soft·danger-t / ghost / ghost·danger-t）

@MainActor
final class DSButton: NSButton {
    enum Tone { case primary, danger, soft, softDanger, ghost, ghostDanger }

    let tone: Tone
    let small: Bool
    private var handler: (() -> Void)?
    /// 冒烟/测试辅助标识（同 data-act）
    var actionId: String = ""

    init(_ title: String, tone: Tone = .primary, small: Bool = false, symbol: String? = nil,
         actionId: String = "", handler: (() -> Void)? = nil) {
        self.tone = tone
        self.small = small
        self.handler = handler
        self.actionId = actionId
        super.init(frame: .zero)
        self.actionId = actionId
        isBordered = false
        wantsLayer = true
        focusRingType = .none
        translatesAutoresizingMaskIntoConstraints = false
        if let symbol {
            image = NSImage(systemSymbolName: symbol, accessibilityDescription: nil)
            imageScaling = .scaleProportionallyDown
            imagePosition = .imageLeft
        }
        target = self
        action = #selector(tapped)
        heightAnchor.constraint(equalToConstant: small ? 32 : 40).isActive = true
        if !small {
            contentTintColor = .white
        }
        updateAppearance(with: title)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    @objc private func tapped() { handler?() }

    func setHandler(_ h: @escaping () -> Void) { handler = h }

    func setTitle(_ title: String) { updateAppearance(with: title) }

    private func updateAppearance(with title: String) {
        guard let layer = layer else { return }
        layer.cornerRadius = small ? DS.rSm : DS.rMd
        let h: CGFloat = small ? 32 : 40
        let font = DS.font(small ? 13 : 15, .semibold)
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center

        let bg: NSColor
        let fg: NSColor
        switch tone {
        case .primary:
            bg = DS.primary; fg = .white
        case .danger:
            bg = DS.danger; fg = .white
        case .soft:
            bg = DS.fill; fg = DS.text
        case .softDanger:
            bg = DS.dangerWeak; fg = DS.danger
        case .ghost:
            bg = .clear; fg = DS.primary
        case .ghostDanger:
            bg = .clear; fg = DS.danger
        }
        layer.backgroundColor = bg.cgColor
        if tone == .ghost || tone == .ghostDanger {
            layer.borderWidth = 1.5
            layer.borderColor = fg.cgColor
        } else {
            layer.borderWidth = 0
        }
        let color: NSColor = isEnabled ? fg : DS.ph
        attributedTitle = NSAttributedString(string: title, attributes: [
            .font: font, .foregroundColor: color, .paragraphStyle: paragraph
        ])
        if !isEnabled && (tone == .ghost || tone == .ghostDanger) {
            layer.borderColor = DS.ph.cgColor
        }
        if tone == .soft && !isEnabled {
            layer.backgroundColor = DS.fill.cgColor
        }
        _ = h
        contentTintColor = color
        toolTip = actionId
    }

    override var isEnabled: Bool {
        didSet { refresh() }
    }

    func refresh() {
        let t = attributedTitle.string
        updateAppearance(with: t)
        needsDisplay = true
        alphaValue = isEnabled ? 1.0 : 0.75
    }
}

// MARK: - B2 chip / B3 badge

@MainActor
func chip(_ text: String, tone: String = "neutral", mono: Bool = false) -> NSView {
    let (bg, fg): (NSColor, NSColor)
    switch tone {
    case "primary": (bg, fg) = (DS.primaryWeak, DS.primary)
    case "success": (bg, fg) = (DS.successWeak, DS.successDeep)
    case "danger": (bg, fg) = (DS.dangerWeak, DS.danger)
    case "warning": (bg, fg) = (DS.warningWeak, DS.warningDeep)
    default: (bg, fg) = (DS.fill, DS.sub)
    }
    let label = makeLabel(text, size: mono ? 10 : 11, weight: .semibold, color: fg, mono: mono)
    let box = NSView()
    box.wantsLayer = true
    box.layer?.backgroundColor = bg.cgColor
    box.layer?.cornerRadius = 999
    box.translatesAutoresizingMaskIntoConstraints = false
    box.addSubview(label)
    NSLayoutConstraint.activate([
        box.widthAnchor.constraint(equalToConstant: max(24, label.intrinsicContentSize.width + 18)),
        box.heightAnchor.constraint(equalToConstant: mono ? 22 : 23),
        label.topAnchor.constraint(equalTo: box.topAnchor, constant: 2),
        label.bottomAnchor.constraint(equalTo: box.bottomAnchor, constant: -2),
        label.leadingAnchor.constraint(equalTo: box.leadingAnchor, constant: 9),
        label.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: -9),
    ])
    return box
}

@MainActor
func badge(_ text: String, tone: String = "dim") -> NSView {
    let (bg, fg, dot): (NSColor, NSColor, NSColor?)
    switch tone {
    case "on": (bg, fg, dot) = (DS.successWeak, DS.successDeep, DS.success)
    case "err": (bg, fg, dot) = (DS.dangerWeak, DS.danger, DS.danger)
    case "warn": (bg, fg, dot) = (DS.warningWeak, DS.warningDeep, DS.warning)
    default: (bg, fg, dot) = (DS.fill, DS.mut, DS.ph)
    }
    let label = makeLabel(text, size: 11, weight: .bold, color: fg)
    var views: [NSView] = []
    if let dotColor = dot {
        let dotView = NSView()
        dotView.wantsLayer = true
        dotView.layer?.backgroundColor = dotColor.cgColor
        dotView.layer?.cornerRadius = 3.5
        dotView.translatesAutoresizingMaskIntoConstraints = false
        dotView.widthAnchor.constraint(equalToConstant: 7).isActive = true
        dotView.heightAnchor.constraint(equalToConstant: 7).isActive = true
        views.append(dotView)
    }
    views.append(label)
    let row = hstack(views, spacing: 5)
    let box = NSView()
    box.wantsLayer = true
    box.layer?.backgroundColor = bg.cgColor
    box.layer?.cornerRadius = 999
    box.translatesAutoresizingMaskIntoConstraints = false
    box.addSubview(row)
    NSLayoutConstraint.activate([
        row.topAnchor.constraint(equalTo: box.topAnchor, constant: 3),
        row.bottomAnchor.constraint(equalTo: box.bottomAnchor, constant: -3),
        row.leadingAnchor.constraint(equalTo: box.leadingAnchor, constant: 10),
        row.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: -10),
    ])
    return box
}

// MARK: - 卡片 / B4 kv / 分节标题 / 菜单行

@MainActor
final class Card: NSView {
    init(padding: CGFloat = DS.sp4) {
        super.init(frame: .zero)
        wantsLayer = true
        layer?.backgroundColor = DS.card.cgColor
        layer?.cornerRadius = DS.rLg
        layer?.borderColor = DS.line.cgColor
        layer?.borderWidth = 1
        translatesAutoresizingMaskIntoConstraints = false
        self.padding = padding
    }
    var padding: CGFloat = DS.sp4 {
        didSet { rebuild() }
    }
    private(set) var body: NSStackView?
    private var views: [NSView] = []
    private var spacing: CGFloat = DS.sp1

    func setViews(_ views: [NSView], spacing: CGFloat = DS.sp1) {
        self.views = views
        self.spacing = spacing
        rebuild()
    }

    private func rebuild() {
        if let body {
            body.removeFromSuperview()
        }
        let stack = NSStackView(views: views)
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = spacing
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: topAnchor, constant: padding),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: bottomAnchor, constant: -padding),
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: padding),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -padding),
        ])
        for view in views {
            view.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        }
        body = stack
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}

@MainActor
func kvRow(_ key: String, _ value: String?, mono: Bool = false) -> NSView {
    let k = makeLabel(key, size: 12, weight: .semibold, color: DS.mut)
    k.widthAnchor.constraint(equalToConstant: 96).isActive = true
    let v = makeLabel(value?.isEmpty == false ? value! : "—", size: 13,
                      color: (value?.isEmpty == false) ? DS.text : DS.ph, mono: mono)
    let box = NSView()
    box.translatesAutoresizingMaskIntoConstraints = false
    [k, v].forEach { box.addSubview($0) }
    let line = NSView()
    line.wantsLayer = true
    line.layer?.backgroundColor = DS.lineSoft.cgColor
    line.translatesAutoresizingMaskIntoConstraints = false
    line.heightAnchor.constraint(equalToConstant: 1).isActive = true
    box.addSubview(line)
    NSLayoutConstraint.activate([
        box.heightAnchor.constraint(equalToConstant: 38),
        k.leadingAnchor.constraint(equalTo: box.leadingAnchor),
        k.topAnchor.constraint(equalTo: box.topAnchor, constant: 9),
        v.leadingAnchor.constraint(equalTo: k.trailingAnchor),
        v.trailingAnchor.constraint(equalTo: box.trailingAnchor),
        v.topAnchor.constraint(equalTo: box.topAnchor, constant: 9),
        v.bottomAnchor.constraint(equalTo: box.bottomAnchor, constant: -8),
        k.centerYAnchor.constraint(equalTo: v.centerYAnchor),
        line.leadingAnchor.constraint(equalTo: box.leadingAnchor),
        line.trailingAnchor.constraint(equalTo: box.trailingAnchor),
        line.bottomAnchor.constraint(equalTo: box.bottomAnchor),
    ])
    return box
}

@MainActor
func sectionTitle(_ symbol: String, _ text: String, trailing: NSView? = nil) -> NSView {
    let icon = makeIcon(symbol, color: DS.primary, size: 15)
    let label = makeLabel(text, size: 15, weight: .bold)
    var views: [NSView] = [icon, label]
    if let trailing {
        views.append(trailing)
    }
    let row = hstack(views, spacing: 6)
    row.translatesAutoresizingMaskIntoConstraints = false
    row.heightAnchor.constraint(equalToConstant: 24).isActive = true
    return row
}

@MainActor
func makeIcon(_ symbol: String, color: NSColor, size: CGFloat) -> NSImageView {
    let config = NSImage.SymbolConfiguration(pointSize: size, weight: .medium)
    let image = NSImage(systemSymbolName: symbol, accessibilityDescription: nil)?
        .withSymbolConfiguration(config)
    let view = NSImageView()
    view.image = image
    view.contentTintColor = color
    view.translatesAutoresizingMaskIntoConstraints = false
    view.symbolConfiguration = config
    return view
}

/// 菜单行（P009：icon + 标题 + 副标题 + ›）。NSButton 便于冒烟按标题定位。
@MainActor
final class MenuRowButton: NSButton {
    private var handler: (() -> Void)?
    var actionId: String = ""

    init(symbol: String, title: String, subtitle: String? = nil,
         actionId: String = "", handler: (() -> Void)? = nil) {
        super.init(frame: .zero)
        self.actionId = actionId
        self.handler = handler
        isBordered = false
        self.title = ""
        translatesAutoresizingMaskIntoConstraints = false
        focusRingType = .none
        target = self
        action = #selector(tapped)
        heightAnchor.constraint(equalToConstant: 46).isActive = true

        let icon = makeIcon(symbol, color: DS.mut, size: 14)
        let label = makeLabel(title, size: 13, weight: .semibold)
        var views: [NSView] = [icon, label]
        if let subtitle {
            views.append(makeLabel(subtitle, size: 11, color: DS.mut))
        }
        views.append(makeIcon("chevron.right", color: DS.ph, size: 10))
        let row = hstack(views, spacing: 10)
        addSubview(row)
        NSLayoutConstraint.activate([
            row.topAnchor.constraint(equalTo: topAnchor, constant: 12),
            row.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -12),
            row.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 2),
            row.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -2),
        ])
        toolTip = actionId
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    @objc private func tapped() { handler?() }
}

// MARK: - B6 empty / B7 op-state / B8 error-banner / B9 note

@MainActor
func emptyState(symbol: String, title: String, desc: String, action: DSButton? = nil) -> NSView {
    var views: [NSView] = []
    if let illustration = canonicalIllustration(symbol: symbol) {
        views.append(illustration)
    } else {
        let icon = makeIcon(symbol, color: DS.ph, size: 34)
        icon.contentTintColor = DS.primary
        views.append(icon)
    }
    views.append(makeLabel(title, size: 17, weight: .bold, align: .center))
    views.append(makeLabel(desc, size: 13, color: DS.mut, align: .center))
    if let action {
        views.append(action)
    }
    let stack = vstack(views, spacing: 8)
    stack.alignment = .centerX
    let box = NSView()
    box.translatesAutoresizingMaskIntoConstraints = false
    box.addSubview(stack)
    NSLayoutConstraint.activate([
        stack.topAnchor.constraint(equalTo: box.topAnchor, constant: 38),
        stack.bottomAnchor.constraint(lessThanOrEqualTo: box.bottomAnchor, constant: -24),
        stack.centerXAnchor.constraint(equalTo: box.centerXAnchor),
    ])
    return box
}

@MainActor
private func canonicalIllustration(symbol: String) -> NSImageView? {
    let name: String
    switch symbol {
    case "dot.radiowaves.left.and.right": name = "radar"
    case "link.badge.plus", "link": name = "link"
    case "doc", "doc.text": name = "doc"
    case "shippingbox", "shippingbox.fill": name = "box"
    default: return nil
    }
    guard let url = Bundle.module.url(forResource: name, withExtension: "svg"),
          let image = NSImage(contentsOf: url) else {
        fputs("[UI] missing canonical illustration: \(name).svg\n", stderr)
        return nil
    }
    let view = NSImageView(image: image)
    view.imageScaling = .scaleProportionallyUpOrDown
    view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
        view.widthAnchor.constraint(equalToConstant: 118),
        view.heightAnchor.constraint(equalToConstant: 86),
    ])
    return view
}

@MainActor
func bundledSVG(_ name: String, width: CGFloat, height: CGFloat) -> NSImageView? {
    guard let url = Bundle.module.url(forResource: name, withExtension: "svg"),
          let image = NSImage(contentsOf: url) else {
        fputs("[UI] missing bundled SVG: \(name).svg\n", stderr)
        return nil
    }
    let view = NSImageView(image: image)
    view.imageScaling = .scaleProportionallyUpOrDown
    view.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
        view.widthAnchor.constraint(equalToConstant: width),
        view.heightAnchor.constraint(equalToConstant: height),
    ])
    return view
}

@MainActor
func opState(_ mode: String, title: String, desc: String = "") -> NSView {
    let symbolName = mode == "ok" ? "checkmark.circle.fill" : mode == "warn" ? "exclamationmark.triangle.fill" : mode == "err" ? "xmark.circle.fill" : ""
    let fg: NSColor = mode == "ok" ? DS.successDeep : mode == "warn" ? DS.warningDeep : mode == "err" ? DS.danger : DS.primary
    var views: [NSView] = []
    if mode == "loading" {
        let spinner = NSProgressIndicator()
        spinner.isIndeterminate = true
        spinner.controlSize = .small
        spinner.style = .spinning
        spinner.startAnimation(nil)
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.widthAnchor.constraint(equalToConstant: 20).isActive = true
        spinner.heightAnchor.constraint(equalToConstant: 20).isActive = true
        views.append(spinner)
    } else {
        views.append(makeIcon(symbolName, color: fg, size: 18))
    }
    var textViews = [makeLabel(title, size: 15, weight: .bold, color: fg)]
    if !desc.isEmpty {
        textViews.append(makeLabel(desc, size: 13, color: DS.sub))
    }
    views.append(vstack(textViews, spacing: 3))
    let inner = hstack(views, spacing: 12, alignment: .top)
    let card = Card()
    card.setViews([inner], spacing: 0)
    return card
}

@MainActor
func errorBanner(code: String, message: String, retry: DSButton? = nil) -> NSView {
    let title = makeLabel("扫描失败 \(code)", size: 15, weight: .bold, color: DS.danger)
    let desc = makeLabel(message, size: 13, color: DS.sub)
    var views: [NSView] = [vstack([title, desc], spacing: 5)]
    if let retry {
        views.append(retry)
    }
    let inner = vstack(views, spacing: 10)
    let box = NSView()
    box.wantsLayer = true
    box.layer?.backgroundColor = DS.dangerWeak.cgColor
    box.layer?.cornerRadius = DS.rMd
    // 左侧 3pt 红色竖条（components.css .ebanner border-left）
    let bar = NSView()
    bar.wantsLayer = true
    bar.layer?.backgroundColor = DS.danger.cgColor
    bar.translatesAutoresizingMaskIntoConstraints = false
    bar.widthAnchor.constraint(equalToConstant: 3).isActive = true
    box.addSubview(bar)
    box.addSubview(inner)
    box.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
        bar.leadingAnchor.constraint(equalTo: box.leadingAnchor),
        bar.topAnchor.constraint(equalTo: box.topAnchor),
        bar.bottomAnchor.constraint(equalTo: box.bottomAnchor),
        inner.topAnchor.constraint(equalTo: box.topAnchor, constant: 12),
        inner.bottomAnchor.constraint(lessThanOrEqualTo: box.bottomAnchor, constant: -12),
        inner.leadingAnchor.constraint(equalTo: bar.trailingAnchor, constant: 14),
        inner.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: -14),
    ])
    return box
}

@MainActor
func noteBanner(_ kind: String, _ text: String) -> NSView {
    let fg: NSColor = kind == "warn" ? DS.warningDeep : NSColor(red: 0x2E/255, green: 0x52/255, blue: 0x90/255, alpha: 1)
    let bg: NSColor = kind == "warn" ? DS.warningWeak : DS.primaryWeak
    let icon = makeIcon(kind == "warn" ? "exclamationmark.triangle.fill" : "info.circle.fill", color: fg, size: 13)
    let label = makeLabel(text, size: 12, color: fg)
    let row = hstack([icon, label], spacing: 9, alignment: .top)
    let box = NSView()
    box.wantsLayer = true
    box.layer?.backgroundColor = bg.cgColor
    box.layer?.cornerRadius = DS.rMd
    box.translatesAutoresizingMaskIntoConstraints = false
    box.addSubview(row)
    NSLayoutConstraint.activate([
        row.topAnchor.constraint(equalTo: box.topAnchor, constant: 10),
        row.bottomAnchor.constraint(lessThanOrEqualTo: box.bottomAnchor, constant: -10),
        row.leadingAnchor.constraint(equalTo: box.leadingAnchor, constant: 12),
        row.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: -12),
    ])
    return box
}

// MARK: - C6 stepper（三步）

@MainActor
func stepper(_ steps: [String], _ curIdx: Int) -> NSView {
    var views: [NSView] = []
    for (i, s) in steps.enumerated() {
        if i > 0 {
            let ln = NSView()
            ln.wantsLayer = true
            ln.layer?.backgroundColor = (i <= curIdx ? DS.primary : DS.line).cgColor
            ln.translatesAutoresizingMaskIntoConstraints = false
            ln.widthAnchor.constraint(equalToConstant: 28).isActive = true
            ln.heightAnchor.constraint(equalToConstant: 2).isActive = true
            views.append(ln)
        }
        let n = i < curIdx ? "✓" : "\(i + 1)"
        let done = i < curIdx
        let current = i == curIdx
        let circle = makeLabel(n, size: 12, weight: .bold,
                               color: done || current ? .white : DS.mut, align: .center)
        let circleBox = NSView()
        circleBox.wantsLayer = true
        circleBox.layer?.backgroundColor = (done || current ? DS.primary : DS.fill).cgColor
        circleBox.layer?.cornerRadius = 11
        circleBox.translatesAutoresizingMaskIntoConstraints = false
        circleBox.addSubview(circle)
        NSLayoutConstraint.activate([
            circle.centerXAnchor.constraint(equalTo: circleBox.centerXAnchor),
            circle.centerYAnchor.constraint(equalTo: circleBox.centerYAnchor),
            circleBox.widthAnchor.constraint(equalToConstant: 22),
            circleBox.heightAnchor.constraint(equalToConstant: 22),
        ])
        let label = makeLabel(s, size: 12, weight: current ? .bold : .regular,
                              color: current ? DS.text : DS.mut)
        views.append(hstack([circleBox, label], spacing: 6))
    }
    return hstack(views, spacing: 8)
}

// MARK: - 信号四格（PAGE001 数据展示规则）

@MainActor
final class SignalBars: NSView {
    let quality: Int
    init(quality: Int) {
        self.quality = quality
        super.init(frame: NSRect(x: 0, y: 0, width: 22, height: 14))
        translatesAutoresizingMaskIntoConstraints = false
        widthAnchor.constraint(equalToConstant: 22).isActive = true
        heightAnchor.constraint(equalToConstant: 14).isActive = true
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    override func draw(_ dirtyRect: NSRect) {
        for i in 0..<4 {
            let h = CGFloat(5 + i * 3)
            let rect = NSRect(x: CGFloat(i * 6), y: bounds.height - h, width: 4, height: h)
            let on = i < quality
            (on ? DS.primary : DS.line).setFill()
            rect.fill(using: .sourceOver)
        }
    }
}

// MARK: - B5 表单输入

@MainActor
func fieldLabel(_ text: String, required: Bool = false) -> NSView {
    if required {
        return makeLabel("\(text) *", size: 12, weight: .semibold, color: DS.danger)
    }
    return makeLabel(text, size: 12, weight: .semibold, color: DS.sub)
}

@MainActor
final class FieldInput: NSView {
    let textField: NSTextField
    var onTextChange: ((String) -> Void)?

    var isEnabled: Bool = true {
        didSet { textField.isEnabled = isEnabled }
    }

    init(placeholder: String, mono: Bool = false, secure: Bool = false,
         onChange: ((String) -> Void)? = nil) {
        self.onTextChange = onChange
        let cell = secure ? NSTextFieldCell() : NSTextFieldCell()
        cell.isBordered = false
        cell.backgroundColor = .clear
        cell.placeholderString = placeholder
        cell.font = mono ? DS.mono(13) : DS.font(13, .regular)
        cell.usesSingleLineMode = true
        textField = NSTextField(frame: .zero)
        textField.cell = cell
        textField.translatesAutoresizingMaskIntoConstraints = false

        super.init(frame: .zero)
        wantsLayer = true
        layer?.backgroundColor = DS.fill.cgColor
        layer?.cornerRadius = DS.rSm
        translatesAutoresizingMaskIntoConstraints = false
        addSubview(textField)
        textField.delegate = self
        NSLayoutConstraint.activate([
            textField.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            textField.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -12),
            textField.centerYAnchor.constraint(equalTo: centerYAnchor),
            heightAnchor.constraint(equalToConstant: 42),
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}

extension FieldInput: NSTextFieldDelegate {
    func controlTextDidChange(_ obj: Notification) {
        onTextChange?(textField.stringValue)
    }
}

// MARK: - C5 log-panel（六色日志 · dock/card 两变体）

@MainActor
final class LogPanelView: NSView {
    private let bar = NSView()
    private let listWrap = NSScrollView()
    private let list = NSStackView()
    private let titleLabel = makeLabel("通信日志", size: 13, weight: .bold)
    private var clearHandler: (() -> Void)?
    private var exportHandler: (() -> Void)?
    private(set) var variant: String

    init(variant: String = "dock", emptyText: String = "暂无日志",
         onClear: @escaping () -> Void, onExport: @escaping () -> Void) {
        self.variant = variant
        self.clearHandler = onClear
        self.exportHandler = onExport
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false
        wantsLayer = true
        layer?.backgroundColor = DS.card.cgColor
        layer?.cornerRadius = DS.rLg
        layer?.borderColor = DS.line.cgColor
        layer?.borderWidth = 1

        let clearBtn = DSButton("清空", tone: .ghostDanger, small: true, actionId: "logclear") { [weak self] in
            self?.clearHandler?()
        }
        let exportBtn = DSButton("导出", tone: .ghost, small: true, symbol: "doc.on.doc", actionId: "logexport") { [weak self] in
            self?.exportHandler?()
        }
        let icon = makeIcon("doc.text", color: DS.mut, size: 12)
        let titleRow = hstack([icon, titleLabel] , spacing: 6)
        let barRow = hstack([titleRow, clearBtn, exportBtn], spacing: 8)
        barRow.distribution = .gravityAreas
        barRow.translatesAutoresizingMaskIntoConstraints = false
        addSubview(barRow)

        list.orientation = .vertical
        list.alignment = .leading
        list.spacing = 2
        list.translatesAutoresizingMaskIntoConstraints = false
        listWrap.documentView = list
        listWrap.hasVerticalScroller = true
        listWrap.autohidesScrollers = true
        listWrap.drawsBackground = false
        listWrap.borderType = .noBorder
        listWrap.translatesAutoresizingMaskIntoConstraints = false
        addSubview(listWrap)

        NSLayoutConstraint.activate([
            barRow.topAnchor.constraint(equalTo: topAnchor, constant: 10),
            barRow.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            barRow.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),
            listWrap.topAnchor.constraint(equalTo: barRow.bottomAnchor, constant: 8),
            listWrap.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            listWrap.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -14),
            listWrap.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -12),
            list.leadingAnchor.constraint(equalTo: listWrap.contentView.leadingAnchor),
            list.widthAnchor.constraint(equalTo: listWrap.contentView.widthAnchor),
        ])
        self.emptyText = emptyText
        update([])
    }

    private var emptyText: String = "暂无日志"
    private var logs: [BLEManager.LogEntry] = []

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func update(_ logs: [BLEManager.LogEntry]) {
        self.logs = logs
        list.arrangedSubviews.forEach { list.removeArrangedSubview($0); $0.removeFromSuperview() }
        if logs.isEmpty {
            let empty = makeLabel(emptyText, size: 12, color: DS.ph, align: .center)
            list.addArrangedSubview(empty)
            empty.widthAnchor.constraint(equalTo: list.widthAnchor).isActive = true
        } else {
            for entry in logs {
                let time = makeLabel(entry.timeText, size: 11, color: DS.mut, mono: true)
                time.widthAnchor.constraint(equalToConstant: 52).isActive = true
                let (fg, bg, label): (NSColor, NSColor, String)
                switch entry.kind {
                case .sys: (fg, bg, label) = (DS.logSys, DS.logSysBg, "系统")
                case .err: (fg, bg, label) = (DS.logErr, DS.logErrBg, "错误")
                case .read: (fg, bg, label) = (DS.logRead, DS.logReadBg, "读取")
                case .write: (fg, bg, label) = (DS.logWrite, DS.logWriteBg, "写入")
                case .recv: (fg, bg, label) = (DS.logRecv, DS.logRecvBg, "接收")
                case .ok: (fg, bg, label) = (DS.logOk, DS.logOkBg, "成功")
                }
                let chipLabel = makeLabel(label, size: 10, weight: .bold, color: fg)
                let chipBox = NSView()
                chipBox.wantsLayer = true
                chipBox.layer?.backgroundColor = bg.cgColor
                chipBox.layer?.cornerRadius = 5
                chipBox.translatesAutoresizingMaskIntoConstraints = false
                chipBox.addSubview(chipLabel)
                NSLayoutConstraint.activate([
                    chipLabel.topAnchor.constraint(equalTo: chipBox.topAnchor, constant: 1),
                    chipLabel.bottomAnchor.constraint(equalTo: chipBox.bottomAnchor, constant: -1),
                    chipLabel.leadingAnchor.constraint(equalTo: chipBox.leadingAnchor, constant: 7),
                    chipLabel.trailingAnchor.constraint(equalTo: chipBox.trailingAnchor, constant: -7),
                ])
                chipBox.widthAnchor.constraint(greaterThanOrEqualToConstant: 34).isActive = true
                let msg = makeLabel(entry.message, size: 12, color: DS.sub)
                msg.lineBreakMode = .byWordWrapping
                msg.maximumNumberOfLines = 0
                let row = NSStackView(views: [time, chipBox, msg])
                row.orientation = .horizontal
                row.spacing = 6
                row.alignment = .top
                row.translatesAutoresizingMaskIntoConstraints = false
                list.addArrangedSubview(row)
                row.widthAnchor.constraint(equalTo: list.widthAnchor).isActive = true
            }
        }
    }
}
