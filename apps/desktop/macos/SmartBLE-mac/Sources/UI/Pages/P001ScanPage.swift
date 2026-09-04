//
// P001ScanPage.swift — PAGE001 扫描首页（F001 扫描 / F003 筛选 / F004 广播数据弹窗 / F005 名称 fallback）
// 结构对齐 v1-new/pages/p001-scan.js：自绘导航栏（蓝牙状态）→ 扫描工具条 → 附近设备面板（筛选+列表）→ 广播数据弹窗。
//

import AppKit

@MainActor
final class P001ScanPage: NSViewController, PageProtocol {
    weak var host: PageHost?
    private var scroll: PageScroll!
    private var scanError: (code: String, message: String)?
    private var filterOpen = false

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
        guard let host, let ble = host.ble as BLEManager? else { return }
        var views: [NSView] = []

        // ① 自绘导航栏（蓝牙状态三态）
        let dot = NSView()
        dot.wantsLayer = true
        dot.layer?.backgroundColor = (ble.btState == .on ? DS.success : ble.btState == .off ? DS.danger : DS.ph).cgColor
        dot.layer?.cornerRadius = 4
        dot.translatesAutoresizingMaskIntoConstraints = false
        dot.widthAnchor.constraint(equalToConstant: 8).isActive = true
        dot.heightAnchor.constraint(equalToConstant: 8).isActive = true
        let btWord = makeLabel(ble.btState.word, size: 11, weight: .semibold, color: DS.mut)
        let btChip = hstack([dot, btWord], spacing: 6)
        views.append(navbar(kicker: "BLE TOOLKIT+", title: "扫描", trailing: [btChip]))

        // ② 扫描工具条
        let scanLb: String
        if ble.isScanning {
            scanLb = "扫描中 · 5s 会话"
        } else {
            scanLb = ble.lastScanSummary
        }
        let scanBtn: DSButton
        if ble.isScanning {
            scanBtn = DSButton("停止扫描", tone: .danger, symbol: "stop.fill", actionId: "p001-stop") { [weak self] in
                self?.host?.ble.stopScan(userInitiated: true)
            }
        } else {
            scanBtn = DSButton("开始扫描", tone: .primary, symbol: "magnifyingglass", actionId: "p001-scan") { [weak self] in
                self?.startScan()
            }
        }
        let tool = hstack([makeLabel(scanLb, size: 12, color: DS.mut), NSView(), scanBtn], spacing: 10)
        tool.translatesAutoresizingMaskIntoConstraints = false
        views.append(tool)

        // 错误横幅（扫描失败 → 重试）
        if let err = scanError {
            let retry = DSButton("重试", tone: .ghostDanger, small: true, symbol: "arrow.clockwise", actionId: "p001-retry") { [weak self] in
                self?.scanError = nil
                self?.startScan()
            }
            views.append(errorBanner(code: err.code, message: err.message, retry: retry))
        }

        // ③ 附近设备面板（筛选 + 列表）
        let shown = ble.filteredScanResults
        let countChip = shown.isEmpty ? nil : chip("\(shown.count)")
        let filterToggle = TextLinkButton(filterOpen ? "收起筛选" : "筛选", actionId: "p001-filter") { [weak self] in
            self?.filterOpen.toggle()
            self?.rebuild()
        }
        views.append(sectionTitle("cpu", "附近设备", trailing: hstack([countChip, filterToggle].compactMap { $0 }, spacing: 8)))

        if filterOpen {
            views.append(filterPanel())
        }

        if shown.isEmpty {
            if ble.filteredToEmpty {
                views.append(emptyState(symbol: "link.badge.plus", title: "当前没有匹配设备", desc: "调整筛选条件试试"))
            } else {
                let act = DSButton("开始扫描", tone: .soft, symbol: "magnifyingglass", actionId: "p001-scan-empty") { [weak self] in
                    self?.startScan()
                }
                views.append(emptyState(symbol: "dot.radiowaves.left.and.right", title: "还没有扫描结果",
                                        desc: "点上方按钮开始扫描附近 BLE 设备", action: act))
            }
        } else {
            for device in shown {
                views.append(deviceCard(device))
            }
        }

        scroll.setViews(views)
    }

    private func startScan() {
        guard let host else { return }
        let ble = host.ble
        if ble.btState == .off {
            host.showModal(title: "提示", content: "请先打开系统蓝牙", confirmText: "去开启",
                           cancelText: nil, hideCancel: true, onConfirm: {
                    NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.Bluetooth-settings")!)
                }, onCancel: nil)
            return
        }
        if ble.btState == .unsupported {
            host.toast("当前平台不支持 BLE")
            return
        }
        scanError = nil
        ble.lastScanSummary = "待开始扫描"
        ble.startScan()
    }

    // MARK: - 筛选面板（RSSI 预设×4 / 滑杆 / 名称前缀 / 隐藏无名 / 重置）

    private func filterPanel() -> NSView {
        guard let ble = host?.ble else { return NSView() }
        var rows: [NSView] = []

        let presets: [(Int, String)] = [(-40, "强 [-40]"), (-60, "较好 [-60]"), (-70, "一般 [-70]"), (-85, "弱 [-85]")]
        let presetButtons = presets.map { v, label in
            let on = ble.filterRSSI == v
            let b = DSButton(label, tone: on ? .primary : .soft, small: true, actionId: "p001-preset-\(v)") { [weak self] in
                self?.host?.ble.filterRSSI = v
                self?.rebuild()
            }
            b.alphaValue = on ? 1 : 0.85
            return b
        }
        rows.append(hstack([makeLabel("最弱信号", size: 12, color: DS.sub)] + presetButtons, spacing: 8))

        let threshold = makeLabel("阈值 \(ble.filterRSSI) dBm", size: 12, color: DS.sub, mono: true)
        let slider = NSSlider(value: Double(ble.filterRSSI), minValue: -100, maxValue: -40, target: nil, action: nil)
        slider.target = self
        slider.action = #selector(sliderChanged(_:))
        slider.translatesAutoresizingMaskIntoConstraints = false
        rows.append(hstack([threshold, slider], spacing: 10))

        let prefixInput = FieldInput(placeholder: "如 SHID / LightBLE", mono: false) { [weak self] text in
            self?.host?.ble.filterNamePrefix = text
        }
        prefixInput.textField.stringValue = ble.filterNamePrefix
        rows.append(hstack([makeLabel("名称前缀", size: 12, color: DS.sub), prefixInput], spacing: 10))

        let hideSwitch = NSSwitch()
        hideSwitch.state = ble.hideNoNameDevices ? .on : .off
        hideSwitch.target = self
        hideSwitch.action = #selector(hideNoNameToggled(_:))
        let resetBtn = DSButton("重置过滤", tone: .soft, small: true, actionId: "p001-reset") { [weak self] in
            self?.host?.ble.resetFilters()
            self?.rebuild()
        }
        rows.append(hstack([makeLabel("隐藏无名", size: 12, color: DS.sub), hideSwitch, NSView(), resetBtn], spacing: 10))

        let card = Card()
        card.setViews(rows, spacing: 10)
        return card
    }

    @objc private func sliderChanged(_ sender: NSSlider) {
        host?.ble.filterRSSI = Int(sender.intValue)
        rebuild()
    }

    @objc private func hideNoNameToggled(_ sender: NSSwitch) {
        host?.ble.hideNoNameDevices = sender.state == .on
        rebuild()
    }

    // MARK: - 设备卡（scan 变体 · C1：普通/SHID 双入口/已连接）

    private func deviceCard(_ d: BLEDevice) -> NSView {
        guard let host else { return NSView() }
        let isShid = d.profileMatch != nil
        let connected = host.ble.isDeviceConnected(d.id)

        let avatar = avatarView(String(d.name.prefix(1)), shid: isShid, connected: connected)
        var nameViews: [NSView] = [makeLabel(d.name, size: 15, weight: .bold)]
        if let match = d.profileMatch {
            nameViews.append(chip(match.level == "STRONG" ? "Smart HID · 强匹配" : "疑似 Smart HID · 弱匹配",
                                  tone: match.level == "STRONG" ? "primary" : "warning"))
        }
        let idText = d.rawName.isEmpty ? "\(d.id)（未命名）" : d.id
        let meta = hstack([SignalBars(quality: d.signalQuality),
                           makeLabel("\(d.rssi) dBm", size: 11, color: DS.mut, mono: true)], spacing: 6)
        let mid = vstack([hstack(nameViews, spacing: 6), makeLabel(idText, size: 11, color: DS.mut, mono: true), meta], spacing: 3)

        var acts: [NSView] = []
        if isShid {
            acts.append(DSButton("配置 Smart HID", tone: .primary, small: true, symbol: "keyboard",
                                 actionId: "p001-config") { [weak self] in
                self?.openProvision(d)
            })
        }
        let connectBtn: DSButton
        if connected {
            connectBtn = DSButton("已连接", tone: .soft, small: true, actionId: "p001-connected")
            connectBtn.isEnabled = false
        } else {
            connectBtn = DSButton("连接", tone: isShid ? .soft : .primary, small: true, symbol: "link",
                                  actionId: "p001-connect") { [weak self] in
                guard let self, let host = self.host else { return }
                if host.ble.isScanning {
                    host.ble.stopScan(userInitiated: false)
                }
                host.ble.connect(device: d)
                host.router.go(.p006)
            }
        }
        acts.append(connectBtn)
        let top = hstack([avatar, mid], spacing: 12, alignment: .top)
        let actsRow = hstack(acts, spacing: 9)
        actsRow.translatesAutoresizingMaskIntoConstraints = false

        let card = Card()
        card.setViews([top, actsRow], spacing: 10)
        // 点卡片本体 → 广播数据弹窗（F004）
        let click = NSClickGestureRecognizer(target: self, action: #selector(cardTapped(_:)))
        card.addGestureRecognizer(click)
        card.toolTip = "p001-advdlg:\(d.id)"
        return card
    }

    @objc private func cardTapped(_ g: NSClickGestureRecognizer) {
        guard let id = g.view?.toolTip?.replacingOccurrences(of: "p001-advdlg:", with: ""),
              let d = host?.ble.discoveredDevices.first(where: { $0.id == id }) else { return }
        showAdvDialog(d)
    }

    private func openProvision(_ d: BLEDevice) {
        guard let host else { return }
        if host.ble.isScanning {
            host.ble.stopScan(userInitiated: false)
        }
        host.shared.currentDevice = d
        // 进入向导即自动连接+验证（DEVICE_PROFILE_SPEC §3.2：等扫描收尾→setCurrentDevice→P002）
        (host.page(.p002) as? P002ProvisionPage)?.begin(device: d)
        host.router.go(.p002)
    }

    // MARK: - 广播数据弹窗（F004 · R04：缺失字段标注口径）

    /// 冒烟入口：等价于设备卡点击（showAdvDialog 的公开包装）
    func openAdvDialogForSmoke(_ d: BLEDevice) {
        showAdvDialog(d)
    }

    private func showAdvDialog(_ d: BLEDevice) {
        guard let host else { return }
        let adv = d.adv
        let miss = "本轮平台 API 未提供此字段"

        var body: [NSView] = [
            kvRow("设备 ID", d.id, mono: true),
            kvRow("名称", d.rawName.isEmpty ? "（未命名）" : d.name),
            kvRow("RSSI", "\(d.rssi) dBm", mono: true),
            kvRow("profileMatch", d.profileMatch.map { "\($0.level) · \($0.profileId)" }, mono: true),
        ]

        if let uuids = adv?.serviceUUIDs, !uuids.isEmpty {
            body.append(inkBlock([("Service UUIDs · \(uuids.count) 项", "", uuids.joined(separator: "\n"))]))
        } else {
            body.append(inkBlock([("Service UUIDs", "—", miss)]))
        }

        if let adv, !adv.segments.isEmpty {
            var segs: [(String, String, String)] = adv.segments.map { ("AD \($0.type) · \($0.name)", "\($0.len) B", $0.hex) }
            segs.append(("整包 hex", "\(adv.byteLength) B", adv.rawHex))
            body.append(inkBlock(segs))
        } else {
            body.append(inkBlock([("AD 结构 · 逐段", "—", miss)]))
        }

        if let mfgId = adv?.manufacturerIdHex {
            body.append(kvRow("厂商 ID（Manufacturer Data）", "0x\(mfgId)", mono: true))
        } else {
            body.append(inkBlock([("Manufacturer Data", "—", miss)]))
        }
        if let sd = adv?.serviceDataHex, !sd.isEmpty {
            body.append(inkBlock([("Service Data", "", sd)]))
        } else {
            body.append(inkBlock([("Service Data", "—", miss)]))
        }
        if let adv, adv.byteLength == 0 {
            body.append(noteBanner("warn", "字段存在但长度为 0"))
        }

        let copyBtn = DSButton("复制数据", tone: .primary, small: true, symbol: "doc.on.doc", actionId: "p001-advcopy") { [weak self] in
            let report = """
            广播数据 · \(d.name)
            设备 ID: \(d.id)
            RSSI: \(d.rssi) dBm
            AD hex: \(adv?.rawHex ?? miss)
            """
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(report, forType: .string)
            self?.host?.toast("已复制", ok: true)
            self?.host?.closeLayer()
        }
        let closeBtn = DSButton("关闭", tone: .soft, small: true, actionId: "sheet-close") { [weak self] in
            self?.host?.closeLayer()
        }
        body.append(hstack([copyBtn, closeBtn], spacing: 9))

        let column = vstack(body, spacing: 8)
        column.translatesAutoresizingMaskIntoConstraints = false
        host.showSheet(title: "广播数据 · \(d.rawName.isEmpty ? String(d.id.suffix(6)) : d.name)", body: column)
    }
}
