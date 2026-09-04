//
// P006GattPage.swift — PAGE006 GATT 调试工作台（F006-F012 + F025 OTA 受限）
// 桌面差异（SOP §12 布局调整）：两栏重排 —— 左主区（设备/服务/操作）、右日志常驻（.dcol1/.dcol2）。
// 流程与数据模型同基准：连接→服务树→读/写/监听→日志六色。
//

import AppKit

@MainActor
final class P006GattPage: NSViewController, PageProtocol {
    weak var host: PageHost?
    private var scroll: PageScroll!
    private var expanded: [String: Bool] = [:]
    private var writeTarget: BLECharacteristic?
    private var logPanel: LogPanelView?

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

    private var device: BLEDevice? {
        host?.ble.connectedDevice ?? host?.shared.currentDevice
    }

    private var hasOtaService: Bool {
        host?.ble.services.contains { $0.uuid.uppercased().hasPrefix("4FAFC201") } ?? false
    }

    func rebuild() {
        guard let host else { return }
        let ble = host.ble
        var views: [NSView] = []

        // 二级页导航 + 固件更新（检测到 OTA 服务才显示 · F025）
        var subTrailing: [NSView] = []
        if hasOtaService {
            subTrailing.append(DSButton("固件更新", tone: .ghostDanger, small: true, symbol: "arrow.down.circle",
                                        actionId: "p006-ota") { [weak self] in
                self?.openOtaDialog()
            })
        }
        views.append(subnav(title: "GATT 调试", onBack: { [weak self] in
            self?.host?.router.back()
        }, trailing: subTrailing))

        // ---- 左栏（.dcol1）----
        var left: [NSView] = []

        // 设备面板（devhead）
        let d = device
        let stCls = ble.connectionState == .connected ? "on"
            : (ble.connectionState == .connecting || ble.connectionState == .reconnecting) ? "mid" : ""
        let stWord = ble.connectionState == .connected ? "已连接"
            : ble.connectionState == .connecting ? "连接中"
            : ble.connectionState == .reconnecting ? "重连中" : "未连接"
        let dot = NSView()
        dot.wantsLayer = true
        dot.layer?.backgroundColor = (stCls == "on" ? DS.success : stCls == "mid" ? DS.warning : DS.ph).cgColor
        dot.layer?.cornerRadius = 5
        dot.translatesAutoresizingMaskIntoConstraints = false
        dot.widthAnchor.constraint(equalToConstant: 10).isActive = true
        dot.heightAnchor.constraint(equalToConstant: 10).isActive = true

        let name = d?.name ?? "未命名设备"
        let idText = d.map { "\($0.id) · \(stWord)" } ?? "— · \(stWord)"
        let connBtn: DSButton
        switch ble.connectionState {
        case .connecting:
            connBtn = DSButton("连接中…", tone: .primary, actionId: "p006-connecting")
            connBtn.isEnabled = false
        case .reconnecting:
            let n = d.flatMap { ble.reconnectInfo(deviceId: $0.id) } ?? 0
            connBtn = DSButton("重连中…（\(n)/3）", tone: .primary, actionId: "p006-reconnecting")
            connBtn.isEnabled = false
        case .connected:
            connBtn = DSButton("断开连接", tone: .danger, symbol: "xmark", actionId: "p006-disconnect") { [weak self] in
                self?.host?.ble.disconnect()
            }
        default:
            connBtn = DSButton("连接设备", tone: .primary, symbol: "link", actionId: "p006-connect") { [weak self] in
                guard let self, let d = self.device else { return }
                self.host?.ble.connect(device: d)
            }
            connBtn.isEnabled = d != nil
        }
        let devhead = Card()
        devhead.setViews([
            hstack([dot, vstack([
                makeLabel(name, size: 17, weight: .bold),
                makeLabel(idText, size: 10, color: DS.mut, mono: true),
            ], spacing: 2)], spacing: 11),
            connBtn,
        ], spacing: DS.sp3)
        left.append(devhead)

        if ble.connectionState == .connected {
            left.append(noteBanner("warn", "OTA 端到端链路 BLOCKED（固件侧暂未开放，P-03）：「固件更新」为真实调用链（选包校验→start→分块→commit→版本回读），无固件配合时将停在等待/失败态，不伪造成功。"))
        }

        // 服务面板（五态 idle/connecting/ready/empty/error）
        let panel: NSView
        switch ble.connectionState {
        case .connecting:
            panel = opState("loading", title: "连接中…", desc: "正在连接 \(name)（10s 超时 · 失败自动重试 3 次）")
        case .reconnecting:
            let n = d.flatMap { ble.reconnectInfo(deviceId: $0.id) } ?? 0
            panel = opState("loading", title: "重连中…（\(n)/3）",
                            desc: "被动断线后自动重连 · \(name)（1s/3s/5s 退避）")
        case .connected:
            if ble.services.isEmpty {
                panel = opState("loading", title: "服务发现中…", desc: "正在枚举 GATT 服务与特征")
            } else if ble.services.allSatisfy({ $0.characteristics.isEmpty }) {
                panel = opState("warn", title: "服务发现完成 · 列表为空", desc: "该设备未暴露任何 GATT 服务（或权限受限）。")
            } else {
                panel = serviceTree()
            }
        default:
            panel = opState("loading", title: "未初始化", desc: "点击「连接设备」建立 GATT 会话。")
        }
        left.append(panel)

        // ---- 右栏（.dcol2）----
        var right: [NSView] = []
        let dnote = makeLabel("桌面布局（SOP §12 圈内调整）：右栏日志常驻 · 左区设备/服务/操作，流程与数据模型同基准。", size: 11, color: DS.mut)
        dnote.lineBreakMode = .byWordWrapping
        dnote.maximumNumberOfLines = 0
        right.append(dnote)
        let logPanel = LogPanelView(variant: "dock", emptyText: "暂无日志",
                                    onClear: { [weak self] in
                                        self?.host?.ble.logs.removeAll()
                                        self?.rebuild()
                                    },
                                    onExport: { [weak self] in
                                        self?.exportLogs()
                                    })
        logPanel.update(ble.logs)
        right.append(logPanel)
        self.logPanel = logPanel

        // 两栏容器（dcol1 + dcol2）
        let leftCol = vstack(left, spacing: DS.sp3)
        leftCol.translatesAutoresizingMaskIntoConstraints = false
        let rightCol = vstack(right, spacing: DS.sp2)
        rightCol.translatesAutoresizingMaskIntoConstraints = false
        let columns = NSView()
        columns.translatesAutoresizingMaskIntoConstraints = false
        columns.addSubview(leftCol)
        columns.addSubview(rightCol)
        NSLayoutConstraint.activate([
            columns.heightAnchor.constraint(greaterThanOrEqualToConstant: 300),
            leftCol.leadingAnchor.constraint(equalTo: columns.leadingAnchor),
            leftCol.topAnchor.constraint(equalTo: columns.topAnchor),
            leftCol.bottomAnchor.constraint(lessThanOrEqualTo: columns.bottomAnchor),
            rightCol.leadingAnchor.constraint(equalTo: leftCol.trailingAnchor, constant: DS.sp3),
            rightCol.trailingAnchor.constraint(equalTo: columns.trailingAnchor),
            rightCol.topAnchor.constraint(equalTo: columns.topAnchor),
            rightCol.bottomAnchor.constraint(lessThanOrEqualTo: columns.bottomAnchor),
            rightCol.widthAnchor.constraint(equalToConstant: 300),
            leftCol.widthAnchor.constraint(greaterThanOrEqualToConstant: 300),
        ])
        views.append(columns)

        scroll.setViews(views)
        columns.widthAnchor.constraint(equalTo: scroll.column.widthAnchor, constant: -32).isActive = true
    }

    // MARK: - 服务树（服务折叠 + 特征行 + 读/写/监听）

    private func serviceTree() -> NSView {
        guard let ble = host?.ble else { return NSView() }
        let charCount = ble.services.reduce(0) { $0 + $1.characteristics.count }
        let expand = TextLinkButton("全部展开", actionId: "p006-expand") { [weak self] in
            guard let self else { return }
            for s in self.host?.ble.services ?? [] { self.expanded[s.uuid] = true }
            self.rebuild()
        }
        let collapse = TextLinkButton("全部收起", actionId: "p006-collapse") { [weak self] in
            self?.expanded.removeAll()
            self?.rebuild()
        }
        var tree: [NSView] = [sectionTitle("doc.text", "服务与特征", trailing: hstack([expand, collapse], spacing: 4))]

        for (i, service) in ble.services.enumerated() {
            let isOpen = expanded[service.uuid] ?? (expanded.isEmpty && i == 0)
            let chevron = makeIcon(isOpen ? "chevron.down" : "chevron.right", color: DS.mut, size: 10)
            let headerBtn = NSButton()
            headerBtn.isBordered = false
            headerBtn.focusRingType = .none
            headerBtn.attributedTitle = NSAttributedString(string: "  \(service.name)", attributes: [
                .font: DS.font(13, .bold), .foregroundColor: DS.text,
            ])
            headerBtn.target = self
            headerBtn.action = #selector(toggleService(_:))
            headerBtn.toolTip = "p006-fold:\(service.uuid)"
            headerBtn.translatesAutoresizingMaskIntoConstraints = false
            let uuidShort = String(service.uuid.replacingOccurrences(of: "-", with: "").prefix(8)) + "…"
            let header = hstack([headerBtn, chip(uuidShort, mono: true), NSView(), chevron], spacing: 8)
            header.translatesAutoresizingMaskIntoConstraints = false

            var body: [NSView] = [header]
            if isOpen {
                for ch in service.characteristics {
                    body.append(charRow(ch))
                }
                if service.characteristics.isEmpty {
                    body.append(makeLabel("特征发现中…", size: 11, color: DS.mut))
                }
            }
            let card = Card(padding: DS.sp3)
            card.setViews(body, spacing: 8)
            tree.append(card)
        }
        _ = charCount
        return vstack(tree, spacing: DS.sp2)
    }

    @objc private func toggleService(_ sender: NSButton) {
        guard let uuid = sender.toolTip?.replacingOccurrences(of: "p006-fold:", with: "") else { return }
        expanded[uuid] = !(expanded[uuid] ?? false)
        rebuild()
    }

    private func charRow(_ ch: BLECharacteristic) -> NSView {
        guard let host else { return NSView() }
        var chips: [NSView] = []
        if ch.properties.contains(.read) { chips.append(chip("read", tone: "primary")) }
        if ch.properties.contains(.write) || ch.properties.contains(.writeWithoutResponse) { chips.append(chip("write", tone: "success")) }
        if ch.properties.contains(.notify) || ch.properties.contains(.indicate) { chips.append(chip("notify", tone: "warning")) }

        var buttons: [NSView] = []
        if ch.properties.contains(.read) {
            buttons.append(DSButton("读取", tone: .soft, small: true, actionId: "p006-read") { [weak self] in
                self?.host?.ble.readCharacteristic(characteristicUUID: ch.uuid)
            })
        }
        if ch.properties.contains(.write) || ch.properties.contains(.writeWithoutResponse) {
            buttons.append(DSButton("写入", tone: .soft, small: true, actionId: "p006-write") { [weak self] in
                self?.writeTarget = ch
                self?.openWriteDialog()
            })
        }
        if ch.properties.contains(.notify) || ch.properties.contains(.indicate) {
            let notifying = host.ble.isNotifying(characteristicUUID: ch.uuid)
            buttons.append(DSButton(notifying ? "停止监听" : "开始监听", tone: .ghost, small: true, actionId: "p006-notify") { [weak self] in
                self?.host?.ble.setNotification(characteristicUUID: ch.uuid, enabled: !notifying)
            })
        }
        let valueLine = ch.value.map { makeLabel("HEX: \($0)", size: 11, color: DS.sub, mono: true) }
        let row = vstack([
            hstack([makeLabel(ch.name, size: 13, weight: .semibold)] + chips, spacing: 8),
            hstack(buttons, spacing: 8),
        ] + (valueLine.map { [$0] } ?? []), spacing: 6)
        row.translatesAutoresizingMaskIntoConstraints = false
        return row
    }

    // MARK: - 写入弹窗（TEXT/HEX + 校验）

    private func openWriteDialog() {
        guard let host, let ch = writeTarget else { return }
        let segmented = NSSegmentedControl(labels: ["TEXT", "HEX"], trackingMode: .selectOne, target: nil, action: nil)
        segmented.selectedSegment = 0
        segmented.translatesAutoresizingMaskIntoConstraints = false
        let input = FieldInput(placeholder: "Hello BLE", mono: true)

        let confirm = DSButton("确认写入", tone: .primary, symbol: "paperplane", actionId: "p006-wd-confirm") { [weak self, weak input, weak segmented] in
            guard let self else { return }
            let v = (input?.textField.stringValue ?? "").trimmingCharacters(in: .whitespaces)
            guard !v.isEmpty else {
                self.host?.toast("请输入数据")
                return
            }
            let isHex = segmented?.selectedSegment == 1
            if isHex {
                let ok = v.split(whereSeparator: { $0 == " " }).allSatisfy { UInt8($0, radix: 16) != nil && $0.count == 2 }
                if !ok || v.isEmpty {
                    self.host?.toast("HEX 格式非法：应为「01 A2 FF」形式")
                    return
                }
            }
            self.host?.closeLayer()
            self.host?.ble.writeCharacteristic(characteristicUUID: ch.uuid, text: v, isHex: isHex)
        }
        let cancel = DSButton("取消", tone: .soft, actionId: "p006-wd-cancel") { [weak self] in
            self?.host?.closeLayer()
        }
        let column = vstack([
            makeLabel(ch.uuid, size: 10, color: DS.mut, mono: true),
            segmented,
            input,
            hstack([cancel, confirm], spacing: 9),
        ], spacing: 12)
        column.alignment = .centerX
        host.showSheet(title: "写入 · \(ch.name)", body: column)
    }

    // MARK: - OTA（F025 · 真实调用链；端到端 P-03 BLOCKED 预警）

    private func openOtaDialog() {
        guard let host, let deviceId = device?.id else { return }
        let ota = host.ble.ota

        var body: [NSView] = []
        body.append(noteBanner("warn", "端到端升级链路当前 BLOCKED（固件侧暂未开放），流程可演示，正式使用前需固件配合。"))

        // 相位行（确认设备→校验→传输 N%→提交→回读→成功/失败，PATTERN 相位文案）
        let phaseLabel = makeLabel("相位：\(ota.phase.word)", size: 13, weight: .semibold)
        let fileLabel = makeLabel(ota.fileName.map { "固件包：\($0)（\(ota.fileSize) 字节）" } ?? "未选择固件包（.bin）",
                                  size: 11, color: DS.mut)
        let progress = NSProgressIndicator()
        progress.minValue = 0
        progress.maxValue = 100
        progress.doubleValue = 0
        progress.style = .bar
        progress.translatesAutoresizingMaskIntoConstraints = false
        progress.heightAnchor.constraint(equalToConstant: 8).isActive = true

        // 错误码行（失败态）
        let errLabel = makeLabel("", size: 11, color: DS.danger, mono: true)
        errLabel.isHidden = true

        let pickBtn = DSButton("选择固件（.bin）", tone: .soft, symbol: "folder", actionId: "p006-ota-pick") { [weak self] in
            guard let self, let host = self.host else { return }
            let panel = NSOpenPanel()
            panel.allowedContentTypes = [.data]
            panel.allowsOtherFileTypes = true
            panel.canChooseDirectories = false
            panel.message = "选择 OTA 固件包（.bin）"
            if panel.runModal() == .OK, let url = panel.url {
                host.ble.ota.selectFile(url: url)
            }
        }
        let startBtn = DSButton("开始升级", tone: .danger, symbol: "arrow.up.circle", actionId: "p006-ota-start") { [weak self] in
            self?.host?.ble.ota.start(deviceId: deviceId)
        }
        startBtn.isEnabled = (ota.phase == .ready)
        let cancelBtn = DSButton("取消", tone: .soft, actionId: "p006-ota-cancel") { [weak self] in
            self?.host?.ble.ota.cancel()
        }
        let closeBtn = DSButton("关闭", tone: .soft, small: true, actionId: "p006-ota-close") { [weak self] in
            self?.host?.ble.ota.cancel()   // 进行中关闭 = 取消（op=abort）
            self?.host?.closeLayer()
        }

        let btnRow = hstack([pickBtn, startBtn, cancelBtn, NSView(), closeBtn], spacing: 9)
        btnRow.translatesAutoresizingMaskIntoConstraints = false
        let column = vstack([phaseLabel, fileLabel, progress, errLabel, btnRow], spacing: 10)
        column.translatesAutoresizingMaskIntoConstraints = false
        host.showSheet(title: "固件更新", body: column)

        // 相位订阅：弹窗内定向更新（不走全页 rebuild）
        var c: Any?
        c = ota.objectWillChange.sink { [weak ota, weak phaseLabel, weak fileLabel, weak progress, weak errLabel, weak startBtn, weak cancelBtn] _ in
            Task { @MainActor in
                guard let ota else { return }
                phaseLabel?.stringValue = "相位：\(ota.phase.word)"
                fileLabel?.stringValue = ota.fileName.map { "固件包：\($0)（\(ota.fileSize) 字节）" } ?? "未选择固件包（.bin）"
                let pct: Double
                if case .transferring(let p) = ota.phase { pct = Double(p) }
                else if case .success = ota.phase { pct = 100 }
                else { pct = ota.fileSize > 0 ? Double(ota.sentBytes) / Double(ota.fileSize) * 100 : 0 }
                progress?.doubleValue = pct
                if case .failed(let code, let msg) = ota.phase {
                    errLabel?.isHidden = false
                    errLabel?.stringValue = "\(code)：\(msg)"
                } else {
                    errLabel?.isHidden = true
                }
                startBtn?.isEnabled = (ota.phase == .ready)
                cancelBtn?.isEnabled = !ota.phase.isTerminal && ota.phase != .idle && ota.phase != .ready
            }
        }
        otaDialogCancellable = c
        ota.onFinished = { [weak self] in
            self?.host?.closeLayer()
        }
    }

    private var otaDialogCancellable: Any?

    // MARK: - 日志导出（桌面覆写口径：复制为主 + 文件候选拦截）

    private func exportLogs() {
        guard let host else { return }
        let logs = host.ble.logs
        if logs.isEmpty {
            host.toast("暂无日志")
            return
        }
        host.showModal(title: "导出日志（桌面）",
                       content: "复制到剪贴板，或保存为日志文件。\n（文件流导出为候选增强，未决策——10_platform §2.4）",
                       confirmText: "复制到剪贴板", cancelText: "保存为文件（候选）", hideCancel: false,
                       onConfirm: { [weak host] in
                           let text = logs.map { "\($0.timeText) [\($0.kind.label)] \($0.message)" }.joined(separator: "\n")
                           NSPasteboard.general.clearContents()
                           NSPasteboard.general.setString(text, forType: .string)
                           host?.toast("日志已复制（格式化纯文本）", ok: true)
                       },
                       onCancel: { [weak host] in
                           host?.toast("候选能力：文件流导出未决策，暂不提供（10_platform §2.4）")
                       })
    }
}
