//
// Pages/Common.swift — 页面公共件：自绘导航栏（navbar）/ 二级页导航（subnav）/ 文字链 /
// 头像块 / 共享会话状态（AppShared · 对齐原型 S.shared）
//

import AppKit

// MARK: - 共享状态（原型 S.shared：currentDevice / 配网快照 / 诊断上下文）

@MainActor
final class AppShared {
    var currentDevice: BLEDevice?
    var provSnapshot: ProvisionSnapshot?
}

struct ProvisionSnapshot {
    let deviceId: String
    let name: String
    let proto: String?
    let firmware: String?
    let lastWifi: String
    let lastHub: String
}

// MARK: - 文字链（components.css .txtlink）

@MainActor
final class TextLinkButton: NSButton {
    private var handler: (() -> Void)?
    var actionId = ""

    init(_ title: String, actionId: String = "", handler: @escaping () -> Void) {
        self.handler = handler
        self.actionId = actionId
        super.init(frame: .zero)
        isBordered = false
        translatesAutoresizingMaskIntoConstraints = false
        focusRingType = .none
        target = self
        action = #selector(tapped)
        setLinkTitle(title)
        toolTip = actionId
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func setLinkTitle(_ title: String) {
        attributedTitle = NSAttributedString(string: title, attributes: [
            .font: DS.font(12, .semibold),
            .foregroundColor: DS.primary,
        ])
    }

    @objc private func tapped() { handler?() }
}

// MARK: - 自绘导航栏（Tab 页：kicker + 标题 + 右侧状态 chip）

@MainActor
func navbar(kicker: String, title: String, trailing: [NSView] = []) -> NSView {
    let kickerLabel = makeLabel(kicker, size: 10, weight: .heavy, color: DS.primary)
    let titleLabel = makeLabel(title, size: 20, weight: .heavy)
    var trailingViews = trailing
    let row = hstack([titleLabel, NSView()] + trailingViews, spacing: 8)
    row.distribution = .gravityAreas
    row.translatesAutoresizingMaskIntoConstraints = false
    let column = vstack([kickerLabel, row], spacing: 2)
    let box = NSView()
    box.translatesAutoresizingMaskIntoConstraints = false
    box.wantsLayer = true
    box.layer?.backgroundColor = NSColor.white.cgColor
    box.addSubview(column)
    let bottomLine = NSView()
    bottomLine.wantsLayer = true
    bottomLine.layer?.backgroundColor = DS.lineSoft.cgColor
    bottomLine.translatesAutoresizingMaskIntoConstraints = false
    bottomLine.heightAnchor.constraint(equalToConstant: 1).isActive = true
    box.addSubview(bottomLine)
    NSLayoutConstraint.activate([
        column.topAnchor.constraint(equalTo: box.topAnchor, constant: 8),
        column.bottomAnchor.constraint(lessThanOrEqualTo: box.bottomAnchor, constant: -12),
        column.leadingAnchor.constraint(equalTo: box.leadingAnchor, constant: 18),
        column.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: -18),
        bottomLine.leadingAnchor.constraint(equalTo: box.leadingAnchor),
        bottomLine.trailingAnchor.constraint(equalTo: box.trailingAnchor),
        bottomLine.bottomAnchor.constraint(equalTo: box.bottomAnchor),
    ])
    return box
}

// MARK: - 二级页导航（返回钮 + 标题）

@MainActor
func subnav(title: String, onBack: @escaping () -> Void, trailing: [NSView] = []) -> NSView {
    let back = DSButton("‹", tone: .soft, small: true, actionId: "back") { onBack() }
    back.widthAnchor.constraint(equalToConstant: 34).isActive = true
    let titleLabel = makeLabel(title, size: 17, weight: .bold)
    var views: [NSView] = [back, titleLabel]
    views.append(contentsOf: trailing)
    views.append(NSView())
    let row = hstack(views, spacing: 10)
    row.translatesAutoresizingMaskIntoConstraints = false
    let box = NSView()
    box.translatesAutoresizingMaskIntoConstraints = false
    box.wantsLayer = true
    box.layer?.backgroundColor = NSColor.white.cgColor
    box.addSubview(row)
    let bottomLine = NSView()
    bottomLine.wantsLayer = true
    bottomLine.layer?.backgroundColor = DS.lineSoft.cgColor
    bottomLine.translatesAutoresizingMaskIntoConstraints = false
    bottomLine.heightAnchor.constraint(equalToConstant: 1).isActive = true
    box.addSubview(bottomLine)
    NSLayoutConstraint.activate([
        row.topAnchor.constraint(equalTo: box.topAnchor, constant: 8),
        row.bottomAnchor.constraint(lessThanOrEqualTo: box.bottomAnchor, constant: -10),
        row.leadingAnchor.constraint(equalTo: box.leadingAnchor, constant: 14),
        row.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: -16),
        bottomLine.leadingAnchor.constraint(equalTo: box.leadingAnchor),
        bottomLine.trailingAnchor.constraint(equalTo: box.trailingAnchor),
        bottomLine.bottomAnchor.constraint(equalTo: box.bottomAnchor),
    ])
    return box
}

// MARK: - 头像块（device-card .ava · SHID 渐变绿）

@MainActor
func avatarView(_ initial: String, shid: Bool, connected: Bool = false) -> NSView {
    let box = NSView()
    box.wantsLayer = true
    box.layer?.cornerRadius = DS.rMd
    box.translatesAutoresizingMaskIntoConstraints = false
    box.layer?.backgroundColor = shid
        ? DS.successWeak.cgColor
        : DS.primaryWeak.cgColor
    let label = makeLabel(initial.uppercased(), size: 17, weight: .heavy,
                          color: shid ? DS.successDeep : DS.primary, align: .center)
    box.addSubview(label)
    NSLayoutConstraint.activate([
        box.widthAnchor.constraint(equalToConstant: 44),
        box.heightAnchor.constraint(equalToConstant: 44),
        label.centerXAnchor.constraint(equalTo: box.centerXAnchor),
        label.centerYAnchor.constraint(equalTo: box.centerYAnchor),
    ])
    if connected {
        let dot = NSView()
        dot.wantsLayer = true
        dot.layer?.backgroundColor = DS.success.cgColor
        dot.layer?.borderColor = NSColor.white.cgColor
        dot.layer?.borderWidth = 2
        dot.layer?.cornerRadius = 8
        dot.translatesAutoresizingMaskIntoConstraints = false
        box.addSubview(dot)
        NSLayoutConstraint.activate([
            dot.widthAnchor.constraint(equalToConstant: 16),
            dot.heightAnchor.constraint(equalToConstant: 16),
            dot.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: 2),
            dot.bottomAnchor.constraint(equalTo: box.bottomAnchor, constant: 2),
        ])
    }
    return box
}

// MARK: - 深色信息段（ad-sec / 评审深色块口径）

@MainActor
func inkBlock(_ lines: [(String, String, String)]) -> NSView {
    // lines: (标题, 右注, hex 正文)
    var views: [NSView] = []
    for (t, r, body) in lines {
        let head = hstack([makeLabel(t, size: 10, color: DS.inkMut, mono: true),
                           NSView(),
                           makeLabel(r, size: 10, color: DS.inkMut, mono: true)])
        views.append(head)
        if !body.isEmpty {
            let hex = makeLabel(body, size: 11, color: DS.inkText, mono: true)
            hex.lineBreakMode = .byCharWrapping
            hex.maximumNumberOfLines = 0
            views.append(hex)
        }
    }
    let column = vstack(views, spacing: 5)
    let box = NSView()
    box.wantsLayer = true
    box.layer?.backgroundColor = DS.ink.cgColor
    box.layer?.cornerRadius = DS.rMd
    box.translatesAutoresizingMaskIntoConstraints = false
    box.addSubview(column)
    NSLayoutConstraint.activate([
        column.topAnchor.constraint(equalTo: box.topAnchor, constant: 10),
        column.bottomAnchor.constraint(lessThanOrEqualTo: box.bottomAnchor, constant: -10),
        column.leadingAnchor.constraint(equalTo: box.leadingAnchor, constant: 12),
        column.trailingAnchor.constraint(equalTo: box.trailingAnchor, constant: -12),
    ])
    return box
}
