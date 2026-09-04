//
// P007ConnectedPage.swift — PAGE007 已连接设备（F013 多设备会话管理 · 双空态）
// r6（M1）：多设备并行会话落地 —— 汇总卡（>1 台）+ 设备卡列表 + 全部断开（allSettled：
// 全部成功 toast；部分失败 modal 列失败设备名清单，PAGE007 按钮表）。
// 点卡按 profileId 分流（正典）：smart-hid → PAGE003，否则 → PAGE006（切换活动会话）。
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
        let provOnline = host.ble.provisioningSessionOnline
        views.append(navbar(kicker: "SESSIONS", title: "已连接",
                            trailing: [chip(provOnline ? "配网会话在线" : "通用调试会话",
                                            tone: provOnline ? "warning" : "neutral")]))

        let list = host.ble.connectedDevices

        if list.isEmpty {
            views.append(emptyState(
                symbol: "link",
                title: "还没有连接中的设备",
                desc: provOnline
                    ? "Smart HID 配网连接进行中，这里列出通用调试连接"
                    : "先在「扫描」页找到设备并连接，会话将保存在这里",
                action: DSButton("去扫描", tone: .soft, symbol: "magnifyingglass", actionId: "p007-gohome") { [weak self] in
                    self?.host?.router.switchTab(.p001)
                }))
        } else {
            if list.count > 1 {
                // 汇总卡（仅 >1 台 · 正典文案「N 台在线 · 全部为内存会话」）
                let allBtn = DSButton("全部断开", tone: .danger, small: true, symbol: "x", actionId: "p007-disconnectall") { [weak self] in
                    self?.disconnectAll()
                }
                let sumCard = Card(padding: 12)
                sumCard.setViews([hstack([
                    vstack([makeLabel("\(list.count)", size: 22, weight: .heavy),
                            makeLabel("台在线 · 全部为内存会话", size: 11, color: DS.mut)], spacing: 2),
                    NSView(),
                    allBtn,
                ], spacing: 10)], spacing: 0)
                views.append(sumCard)
            }
            for d in list {
                views.append(connCard(d))
            }
        }

        scroll.setViews(views)
    }

    // MARK: - 全部断开（allSettled：3s 结算，部分失败 modal 清单）

    private func disconnectAll() {
        guard let host else { return }
        host.ble.onDisconnectAllSettled = { [weak self] report in
            guard let self, let host = self.host else { return }
            if report.failed.isEmpty {
                host.toast("已全部断开", ok: true)
            } else {
                host.showModal(title: "部分设备断开失败",
                               content: "以下设备未确认断开（3s 超时）：\n" + report.failed.joined(separator: "\n"),
                               confirmText: "知道了", cancelText: nil, hideCancel: true,
                               onConfirm: nil, onCancel: nil)
            }
        }
        host.ble.disconnectAll()
        host.toast("正在断开 \(host.ble.connectedDevices.count) 台设备…")
    }

    // MARK: - 连接态设备卡（ON 头标 + 断开 + 点卡分流）

    private func connCard(_ d: BLEDevice) -> NSView {
        guard let host else { return NSView() }
        let avatar = avatarView(String(d.name.prefix(1)), shid: d.profileMatch != nil, connected: true)
        let mid = vstack([
            hstack([makeLabel(d.name.isEmpty ? "未命名设备" : d.name, size: 15, weight: .bold)] +
                   (d.profileMatch != nil ? [chip("Smart HID")] : []), spacing: 6),
            makeLabel(d.id, size: 11, color: DS.mut, mono: true),
            makeLabel("已连接 · 可进行 GATT 调试", size: 11, color: DS.mut),
        ], spacing: 3)
        let disconnect = DSButton("断开", tone: .softDanger, small: true, actionId: "p007-disconnect") { [weak self] in
            guard let self, let host = self.host else { return }
            host.ble.disconnect(deviceId: d.id)
            host.toast("已断开")
        }
        let row = hstack([avatar, mid, NSView(), disconnect], spacing: 12)
        row.translatesAutoresizingMaskIntoConstraints = false
        let card = Card()
        card.setViews([row], spacing: 0)
        let click = NSClickGestureRecognizer(target: self, action: #selector(open(_:)))
        card.addGestureRecognizer(click)
        card.toolTip = "p007-open:\(d.id)"
        return card
    }

    @objc private func open(_ g: NSClickGestureRecognizer) {
        guard let host,
              let id = g.view?.toolTip?.replacingOccurrences(of: "p007-open:", with: ""),
              let d = host.ble.connectedDevices.first(where: { $0.id == id }) else { return }
        // 按 profileId 分流（正典）：smart-hid → P003；否则切换活动会话 → P006
        if d.profileMatch != nil {
            host.router.go(.p003)
        } else {
            host.ble.setActive(deviceId: id)
            host.router.go(.p006)
        }
    }
}
