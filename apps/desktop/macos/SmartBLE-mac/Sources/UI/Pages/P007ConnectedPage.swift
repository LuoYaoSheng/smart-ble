//
// P007ConnectedPage.swift — PAGE007 已连接设备（F013 多设备会话管理 · 双空态）
// 探针限制（诚实口径）：BLEManager 为单连接 —— 列表最多呈现 1 台通用会话；
// 多设备并行会话属共享层能力（Windows 主线），见 verification r3 限制清单。
//

import AppKit

@MainActor
final class P007ConnectedPage: NSViewController, PageProtocol {
    weak var host: PageHost?
    private var scroll: PageScroll!

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
        guard let host else { return }
        var views: [NSView] = []
        let provOnline = (host.page(.p002) as? P002ProvisionPage)?.isProvisioning ?? false
        views.append(navbar(kicker: "SESSIONS", title: "已连接",
                            trailing: [chip(provOnline ? "配网会话在线" : "通用调试会话",
                                            tone: provOnline ? "warning" : "neutral")]))

        let session = host.ble.connectedDevice

        if let d = session, host.ble.connectionState == .connected {
            // 汇总卡（探针 = 单会话；文案对齐正典「N 台在线 · 全部为内存会话」）
            let sumCard = Card(padding: 12)
            sumCard.setViews([hstack([
                vstack([makeLabel("1", size: 22, weight: .heavy),
                        makeLabel("台在线 · 内存会话（探针单连接，多设备属共享层能力）", size: 11, color: DS.mut)], spacing: 2),
                NSView(),
            ], spacing: 10)], spacing: 0)
            views.append(sumCard)
            views.append(connCard(d))
        } else {
            views.append(emptyState(
                symbol: "link",
                title: "还没有连接中的设备",
                desc: provOnline
                    ? "Smart HID 配网连接进行中，这里列出通用调试连接"
                    : "先在「扫描」页找到设备并连接，会话将保存在这里",
                action: DSButton("去扫描", tone: .soft, symbol: "magnifyingglass", actionId: "p007-gohome") { [weak self] in
                    self?.host?.router.switchTab(.p001)
                }))
        }

        scroll.setViews(views)
    }

    private func connCard(_ d: BLEDevice) -> NSView {
        guard let host else { return NSView() }
        let avatar = avatarView(String(d.name.prefix(1)), shid: d.profileMatch != nil, connected: true)
        let mid = vstack([
            hstack([makeLabel(d.name.isEmpty ? "未命名设备" : d.name, size: 15, weight: .bold)], spacing: 6),
            makeLabel(d.id, size: 11, color: DS.mut, mono: true),
            makeLabel("已连接 · 可进行 GATT 调试", size: 11, color: DS.mut),
        ], spacing: 3)
        let disconnect = DSButton("断开", tone: .softDanger, small: true, actionId: "p007-disconnect") { [weak self] in
            self?.host?.ble.disconnect()
            self?.host?.toast("已断开")
        }
        let row = hstack([avatar, mid, NSView(), disconnect], spacing: 12)
        row.translatesAutoresizingMaskIntoConstraints = false
        let card = Card()
        card.setViews([row], spacing: 0)
        let click = NSClickGestureRecognizer(target: self, action: #selector(open(_:)))
        card.addGestureRecognizer(click)
        return card
    }

    @objc private func open(_ g: NSClickGestureRecognizer) {
        // 按 profileId 分流（正典）：无 Profile → P006
        host?.router.go(.p006)
    }
}
