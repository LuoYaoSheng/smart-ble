//
// P003HidDetailPage.swift — PAGE003 Smart HID 设备详情（会话级内存快照 · 三出口）
// 探针口径：配网成功（需 SHID 夹具）前不可达快照态 → 记录不存在空态（正典态之一）。
//

import AppKit

@MainActor
final class P003HidDetailPage: NSViewController, PageProtocol {
    weak var host: PageHost?
    private var scroll: PageScroll!
    private var missingModalShown = false

    enum PreviewState: Equatable {
        case normal
        case missingFields
        case empty
    }

    func applyPreviewState(_ state: PreviewState) {
        guard let host else { return }
        missingModalShown = false
        switch state {
        case .normal:
            host.shared.provSnapshot = ProvisionSnapshot(
                deviceId: "HID-9F3E2A1C",
                name: "SHID-9F3E2A1C",
                proto: "V1",
                firmware: "1.1.1",
                lastWifi: "Home-5G",
                lastHub: "192.168.1.8:17892"
            )
        case .missingFields:
            host.shared.provSnapshot = ProvisionSnapshot(
                deviceId: "HID-9F3E2A1C",
                name: "SHID-9F3E2A1C",
                proto: nil,
                firmware: nil,
                lastWifi: "",
                lastHub: ""
            )
        case .empty:
            host.shared.provSnapshot = nil
        }
        rebuild()
    }

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
        _ = view
        guard let host else { return }
        var views: [NSView] = []
        views.append(subnav(title: "Smart HID 设备详情", onBack: { [weak self] in
            self?.host?.router.back()
        }))

        guard let device = host.shared.provSnapshot else {
            views.append(emptyState(symbol: "shippingbox", title: "设备记录不存在",
                                    desc: "该设备快照已随会话结束释放，请重新配网后查看。"))
            scroll.setViews(views)
            if !missingModalShown {
                missingModalShown = true
                DispatchQueue.main.async { [weak self] in
                    self?.host?.showModal(
                        title: "提示",
                        content: "该历史设备记录已不存在",
                        confirmText: "知道了",
                        cancelText: nil,
                        hideCancel: true,
                        onConfirm: { [weak self] in self?.host?.router.back() },
                        onCancel: nil
                    )
                }
            }
            return
        }

        // 设备身份卡
        let iconBox = NSView()
        iconBox.wantsLayer = true
        iconBox.layer?.backgroundColor = DS.successWeak.cgColor
        iconBox.layer?.cornerRadius = 14
        iconBox.translatesAutoresizingMaskIntoConstraints = false
        let keyboard = makeIcon("keyboard", color: DS.successDeep, size: 24)
        iconBox.addSubview(keyboard)
        NSLayoutConstraint.activate([
            iconBox.widthAnchor.constraint(equalToConstant: 52),
            iconBox.heightAnchor.constraint(equalToConstant: 52),
            keyboard.centerXAnchor.constraint(equalTo: iconBox.centerXAnchor),
            keyboard.centerYAnchor.constraint(equalTo: iconBox.centerYAnchor),
        ])
        let heroText = NSMutableAttributedString(
            string: device.name.isEmpty ? "Smart HID 设备" : device.name,
            attributes: [.font: DS.font(17, .heavy), .foregroundColor: DS.text]
        )
        heroText.append(NSAttributedString(
            string: "\n配置成功 · READY",
            attributes: [.font: DS.font(11, .bold), .foregroundColor: DS.successDeep]
        ))
        let heroLabel = NSTextField(labelWithAttributedString: heroText)
        heroLabel.maximumNumberOfLines = 2
        heroLabel.translatesAutoresizingMaskIntoConstraints = false
        let heroContent = NSView()
        heroContent.translatesAutoresizingMaskIntoConstraints = false
        heroContent.addSubview(iconBox)
        heroContent.addSubview(heroLabel)
        NSLayoutConstraint.activate([
            heroContent.heightAnchor.constraint(equalToConstant: 52),
            iconBox.leadingAnchor.constraint(equalTo: heroContent.leadingAnchor),
            iconBox.centerYAnchor.constraint(equalTo: heroContent.centerYAnchor),
            heroLabel.leadingAnchor.constraint(equalTo: iconBox.trailingAnchor, constant: 13),
            heroLabel.centerYAnchor.constraint(equalTo: heroContent.centerYAnchor),
            heroLabel.trailingAnchor.constraint(lessThanOrEqualTo: heroContent.trailingAnchor),
        ])
        let identityHead = Card()
        identityHead.setViews([heroContent], spacing: 0)
        views.append(identityHead)

        let protoText = device.proto.map { "Smart HID \($0)" }
        var identityRows: [NSView] = [
            sectionTitle("cpu", "设备身份"),
            kvRow("Device ID", device.deviceId, mono: true),
            kvRow("协议版本", protoText),
            kvRow("固件版本", device.firmware, mono: true),
        ]
        if device.proto == nil {
            identityRows.append(hstack([chip("协议未记录"), NSView()], spacing: 0))
        }
        let identityCard = Card()
        identityCard.setViews(identityRows, spacing: 2)
        views.append(identityCard)

        let lastCard = Card()
        lastCard.setViews([
            sectionTitle("wifi", "最近配置"),
            kvRow("Wi-Fi", device.lastWifi),
            kvRow("ControlHub", device.lastHub, mono: true),
        ], spacing: 2)
        views.append(lastCard)

        views.append(noteBanner("info", "本页为本次配网会话的内存快照，退出应用后不再可见（零本地持久化）。重新配置前需让设备进入配网模式。"))

        let reconfig = DSButton("重新配置", tone: .primary, symbol: "arrow.clockwise", actionId: "p003-reconfig") { [weak self] in
            guard let self, let host = self.host, let current = host.shared.currentDevice else {
                self?.host?.toast("缺少配网设备上下文（需重新从扫描页进入）")
                return
            }
            host.router.go(.p002)
            if let p002Page = host.page(.p002) as? P002ProvisionPage {
                p002Page.begin(device: current)
            }
        }
        let diag = DSButton("运行诊断", tone: .soft, symbol: "waveform.path.ecg", actionId: "p003-diag") { [weak self] in
            self?.host?.router.go(.p005)
        }
        let gatt = DSButton("高级 BLE 调试", tone: .soft, symbol: "slider.horizontal.3", actionId: "p003-gatt") { [weak self] in
            self?.host?.router.go(.p006)
        }
        let secondaryActions = hstack([diag, gatt], spacing: 9)
        secondaryActions.distribution = .fillEqually
        let actionStack = vstack([reconfig, secondaryActions], spacing: 9)
        reconfig.widthAnchor.constraint(equalTo: actionStack.widthAnchor).isActive = true
        secondaryActions.widthAnchor.constraint(equalTo: actionStack.widthAnchor).isActive = true
        views.append(actionStack)

        scroll.setViews(views)
    }
}
