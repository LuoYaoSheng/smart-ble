//
// P002ProvisionPage.swift — PAGE002 Smart HID 配网向导（F018-F022）
// 三阶段（连接→填写→状态）+ 桌面差异：配对码 = 扫码为主（摄像头未实现 → NOT_RUN，走桌面兜底）
// + 粘贴/手输配对码（shid://pair 正则解析，纯前端，10_platform §2.4）。
// 诚实口径：无真实 SHID 夹具时下发流程停在错误态（BLOCKED_FIXTURE），不伪造成功。
//

import AppKit

@MainActor
final class P002ProvisionPage: NSViewController, PageProtocol {
    weak var host: PageHost?

    enum Phase { case connect, configure, status }
    var phase: Phase = .connect
    private var connecting = false
    private var connError: String?
    private var lost = false

    var ssid = "" { didSet { dirty = true } }
    var pwd = "" { didSet { dirty = true } }
    var hub = "" { didSet { dirty = true } }
    var token: String?
    var showPwd = false

    var isProvisioning = false
    var done = false
    struct ProvisionError { let code: String; let msg: String; let row: String; let recovery: String }
    var err: ProvisionError?
    var progress: [String: String] = ["wifi": "pending", "hub": "pending", "conn": "pending", "usb": "pending"]
    private var dirty = false
    private var configuredOnce = false

    /// 携带设备进入（P001 配置入口 / P003 重新配置）
    func begin(device: BLEDevice) {
        host?.shared.currentDevice = device
        reset()
        phase = .connect
        connecting = true
        connError = nil
        rebuild()
        host?.ble.connect(device: device)
    }

    private func reset() {
        ssid = ""; pwd = ""; hub = ""; token = nil
        isProvisioning = false; done = false; err = nil; dirty = false
        progress = ["wifi": "pending", "hub": "pending", "conn": "pending", "usb": "pending"]
        lost = false; configuredOnce = false
    }

    init(host: PageHost) {
        self.host = host
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private var scroll: PageScroll!

    override func loadView() {
        scroll = PageScroll()
        view = scroll
        view.wantsLayer = true
        view.layer?.backgroundColor = DS.bg.cgColor
    }

    // MARK: - 配对码解析（desktop.js dtk-parse 同口径：t= 必需，hub= 可选回填）

    /// 返回 (hub, token)；无 t= 令牌 → nil（toast「未识别配对码（需包含 t=… 令牌）」）
    static func parsePairCode(_ raw: String) -> (hub: String?, token: String)? {
        guard let m = try? NSRegularExpression(pattern: "t=([A-Za-z0-9\\-]{4,})") else { return nil }
        let range = NSRange(raw.startIndex..., in: raw)
        guard let tm = m.firstMatch(in: raw, range: range),
              let tr = Range(tm.range(at: 1), in: raw) else { return nil }
        let token = String(raw[tr])
        var hub: String?
        if let hm = try? NSRegularExpression(pattern: "hub=([^&\\s]+)"),
           let match = hm.firstMatch(in: raw, range: range),
           let hr = Range(match.range(at: 1), in: raw) {
            hub = String(raw[hr])
        }
        return (hub, token)
    }

    // MARK: - rebuild（含 BLE 状态→阶段联动）

    func rebuild() {
        guard let host else { return }
        let ble = host.ble
        var views: [NSView] = []

        views.append(subnav(title: "配置 Smart HID", onBack: { [weak self] in self?.leave() }))

        guard let device = host.shared.currentDevice else {
            // 缺少设备上下文（guard 态）
            let go = DSButton("去扫描", tone: .soft, symbol: "magnifyingglass", actionId: "p002-gohome") { [weak self] in
                self?.host?.router.switchTab(.p001)
            }
            views.append(emptyState(symbol: "exclamationmark.triangle", title: "缺少设备上下文",
                                    desc: "请从扫描页的 Smart HID 设备卡进入配网流程。", action: go))
            scroll.setViews(views)
            return
        }

        // BLE 联动（r6-M1：按设备会话查询，不再依赖活动会话镜像）：连接成功 → configure；configure 断线 → lost（表单保留）
        let st = ble.sessionState(device.id)
        if phase == .connect {
            if st == .connected {
                phase = .configure
                connecting = false
            } else if st == nil, !connecting {
                if configuredOnce || connError != nil {
                    // 已尝试过：保持错误显示
                } else {
                    connecting = true
                }
            }
            if connecting && st == .connecting {
                connError = nil
            }
        }
        if phase == .configure {
            lost = st != .connected
            if !lost { configuredOnce = true }
        }

        let stepIdx = phase == .connect ? 0 : phase == .configure ? 1 : 2
        views.append(stepper(["连接设备", "填写配置", "下发状态"], stepIdx))

        // 设备摘要卡
        let ava = avatarView(String(device.name.prefix(1)), shid: true)
        let summary = hstack([ava, vstack([
            makeLabel(device.name, size: 15, weight: .bold),
            makeLabel("\(device.id) · Device Info 已验证", size: 10, color: DS.mut, mono: true),
        ], spacing: 2)], spacing: 11, alignment: .centerY)
        let summaryCard = Card(padding: 12)
        summaryCard.setViews([summary], spacing: 0)
        views.append(summaryCard)

        switch phase {
        case .connect:
            views.append(contentsOf: connectBody(device))
        case .configure:
            views.append(contentsOf: configureBody(device))
        case .status:
            views.append(contentsOf: statusBody())
        }

        scroll.setViews(views)
    }

    // MARK: - 阶段一：连接

    private func connectBody(_ device: BLEDevice) -> [NSView] {
        guard let host else { return [] }
        let st = host.ble.sessionState(device.id)
        if st == .connecting || connecting {
            return [opState("loading", title: "连接并确认设备中…", desc: "正在建立 GATT 连接 · \(device.name)")]
        }
        if st == nil || st == .disconnected {
            let retry = DSButton("重试", tone: .ghostDanger, small: true, symbol: "arrow.clockwise", actionId: "p002-reconnect") { [weak self] in
                self?.begin(device: device)
            }
            let banner = errorBanner(code: "identity_failed",
                                     message: "设备连接失败（10s 超时 · 已自动重试 3 次）。请让设备保持配网模式后重试。",
                                     retry: retry)
            let again = DSButton("重新连接", tone: .primary, symbol: "arrow.clockwise", actionId: "p002-reconnect") { [weak self] in
                self?.begin(device: device)
            }
            let home = DSButton("返回设备列表", tone: .soft, actionId: "p002-gohome") { [weak self] in
                self?.host?.router.switchTab(.p001)
            }
            return [banner, hstack([again, home], spacing: 9)]
        }
        return []
    }

    // MARK: - 阶段二：填写配置

    private func configureBody(_ device: BLEDevice) -> [NSView] {
        guard let host else { return [] }
        var views: [NSView] = []

        if lost {
            let rejoin = DSButton("重试", tone: .ghostDanger, small: true, symbol: "arrow.clockwise", actionId: "p002-rejoin") { [weak self] in
                self?.host?.ble.connect(device: device)
            }
            views.append(errorBanner(code: "connection_lost",
                                     message: "设备连接已断开。已填写的配网信息不会丢失，重新连接后可继续。",
                                     retry: rejoin))
        }

        views.append(hstack([badge(lost ? "已断开" : "已连接", tone: lost ? "err" : "on"),
                             makeLabel(device.id, size: 11, color: DS.mut, mono: true)], spacing: 8))

        let ssidInput = FieldInput(placeholder: "家庭 / 办公 2.4G Wi-Fi") { [weak self] v in
            self?.ssid = String(v.prefix(32))
        }
        ssidInput.textField.stringValue = ssid
        let pwdInput = FieldInput(placeholder: "无密码可留空", secure: true) { [weak self] v in
            self?.pwd = String(v.prefix(64))
        }
        pwdInput.textField.stringValue = pwd
        let hubInput = FieldInput(placeholder: "192.168.1.8:17892", mono: true) { [weak self] v in
            self?.hub = v
        }
        hubInput.textField.stringValue = hub

        let formCard = Card()
        formCard.setViews([
            vstack([fieldLabel("Wi-Fi 名称", required: true), ssidInput], spacing: 6),
            vstack([fieldLabel("Wi-Fi 密码"), pwdInput], spacing: 6),
            vstack([fieldLabel("ControlHub 地址", required: true), hubInput], spacing: 6),
        ], spacing: DS.sp3)
        views.append(formCard)

        // 大动作卡：扫描配对码（桌面：粘贴/手输兜底为主路径之一）
        let qrIcon = makeIcon("qrcode", color: token != nil ? DS.successDeep : DS.primary, size: 26)
        let bigTitle = makeLabel(token != nil ? "重新扫描配对码" : "扫描 ControlHub 配对码",
                                 size: 15, weight: .bold, color: token != nil ? DS.successDeep : DS.primary)
        let bigDesc = makeLabel(token != nil
                                ? "token 已获取（内存会话，不落盘）"
                                : "扫码解析 shid://pair 自动回填地址与令牌", size: 11, color: DS.mut)
        var descRow: [NSView] = [bigDesc]
        if token != nil {
            descRow.append(chip("已获取", tone: "success"))
        } else {
            descRow.append(chip("必需", tone: "warning"))
        }
        let bigact = hstack([qrIcon, vstack([bigTitle, hstack(descRow, spacing: 6)], spacing: 2)], spacing: 12)
        bigact.translatesAutoresizingMaskIntoConstraints = false
        let bigactBox = NSView()
        bigactBox.wantsLayer = true
        bigactBox.layer?.cornerRadius = DS.rLg
        bigactBox.layer?.backgroundColor = (token != nil ? DS.successWeak : DS.primaryWeak).cgColor
        bigactBox.layer?.borderColor = (token != nil ? DS.success : DS.primary).cgColor
        bigactBox.layer?.borderWidth = 1.5
        bigactBox.translatesAutoresizingMaskIntoConstraints = false
        bigactBox.addSubview(bigact)
        let tap = NSClickGestureRecognizer(target: self, action: #selector(openQrSheet))
        bigactBox.addGestureRecognizer(tap)
        bigactBox.toolTip = "p002-qr"
        NSLayoutConstraint.activate([
            bigact.topAnchor.constraint(equalTo: bigactBox.topAnchor, constant: 14),
            bigact.bottomAnchor.constraint(lessThanOrEqualTo: bigactBox.bottomAnchor, constant: -14),
            bigact.leadingAnchor.constraint(equalTo: bigactBox.leadingAnchor, constant: 14),
            bigact.trailingAnchor.constraint(lessThanOrEqualTo: bigactBox.trailingAnchor, constant: -14),
        ])
        views.append(bigactBox)

        views.append(noteBanner("info", "Wi-Fi 密码和配对凭据只用于本次下发，不写入日志或本地存储。"))

        let canSubmit = !ssid.trimmingCharacters(in: .whitespaces).isEmpty
            && !hub.trimmingCharacters(in: .whitespaces).isEmpty
            && token != nil && !isProvisioning
        let submit = DSButton("下发配置", tone: .primary, symbol: "paperplane", actionId: "p002-submit") { [weak self] in
            self?.submit()
        }
        submit.isEnabled = canSubmit
        views.append(submit)
        return views
    }

    // MARK: - 配对码：扫码 sheet（桌面差异）+ 粘贴兜底 sheet

    @objc private func openQrSheet() {
        guard let host else { return }
        var body: [NSView] = []
        body.append(noteBanner("info", "配对码通过扫描二维码获取（产品统一口径 · F020）：摄像头读取 ControlHub 屏显 shid://pair 二维码，识别后自动回填地址与令牌。"))
        // 取景器（.dtk-vf）：摄像头扫码未在本探针实现 → 显式 NOT_RUN，兜底为可用主路径
        body.append(inkBlock([
            ("取景器 · 摄像头扫码", "NOT_RUN", "本探针未实现摄像头二维码识别（探针范围外）。\n请使用下方「粘贴 / 手输配对码」兜底路径（10_platform §2.4）。"),
        ]))
        let pasteBtn = DSButton("无法扫码？粘贴 / 手输配对码 →", tone: .primary, symbol: "qrcode", actionId: "dtk-paste") { [weak self] in
            self?.openPasteSheet()
        }
        let cancelBtn = DSButton("取消", tone: .soft, small: true, actionId: "p002-qr-cancel") { [weak self] in
            self?.host?.closeLayer()
            self?.host?.toast("已取消扫码（不算错误）")
        }
        body.append(hstack([pasteBtn, cancelBtn], spacing: 9))
        host.showSheet(title: "扫描 ControlHub 配对码", body: vstack(body, spacing: 10))
    }

    private func openPasteSheet() {
        guard let host else { return }
        var body: [NSView] = []
        body.append(noteBanner("info", "兜底路径：无摄像头或无法扫码时，粘贴 shid://pair 内容直接解析（纯前端可解，10_platform §2.4）。"))
        let input = FieldInput(placeholder: "shid://pair?hub=…&t=…", mono: true)
        body.append(vstack([fieldLabel("配对码内容"), input], spacing: 6))

        let parseBtn = DSButton("解析并回填", tone: .primary, symbol: "qrcode", actionId: "dtk-parse") { [weak self, weak input] in
            guard let self else { return }
            let raw = input?.textField.stringValue ?? ""
            if let parsed = Self.parsePairCode(raw) {
                self.token = parsed.token
                if self.hub.isEmpty, let hub = parsed.hub {
                    self.hub = hub
                }
                self.host?.closeLayer()
                self.host?.toast("配对码已解析 · 地址与令牌已回填", ok: true)
                self.rebuild()
            } else {
                self.host?.toast("未识别配对码（需包含 t=… 令牌）")
            }
        }
        let sampleBtn = DSButton("填入示例", tone: .soft, actionId: "dtk-sample") { [weak input] in
            input?.textField.stringValue = "shid://pair?hub=192.168.1.8:17892&t=tok-3f9a7c1e"
        }
        body.append(hstack([parseBtn, sampleBtn], spacing: 9))
        host.showSheet(title: "粘贴 / 手输配对码（兜底）", body: vstack(body, spacing: 10))
    }

    // MARK: - 阶段三：下发状态（四行进度；无 SHID 夹具 → 诚实错误态）

    private func submit() {
        guard let host else { return }
        phase = .status
        isProvisioning = true
        done = false
        err = nil
        progress = ["wifi": "active", "hub": "pending", "conn": "pending", "usb": "pending"]
        rebuild()

        let rows: [(String, Double)] = [("wifi", 0.5), ("hub", 1.3), ("conn", 2.1), ("usb", 2.9)]
        for (row, delay) in rows {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                guard let self, self.isProvisioning else { return }
                if self.err == nil {
                    self.progress[row] = "active"
                    self.rebuild()
                }
            }
        }
        // 真实判定：smart-hid 配网服务是否在已连接设备上（探针无 SHID 夹具 → 停在错误态）
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            guard let self, self.isProvisioning else { return }
            let shidService = host.ble.services.first {
                $0.uuid.uppercased().hasPrefix("9F1D1001") || $0.uuid.uppercased().hasPrefix("4FAFC201")
            }
            if shidService == nil {
                self.progress["wifi"] = "fail"
                self.isProvisioning = false
                self.err = ProvisionError(
                    code: "smart_hid_service_missing",
                    msg: "未在设备上发现 smart-hid 配网服务（需真实 SHID 设备 · BLOCKED_FIXTURE）。表单内容已保留，可返回修改或运行诊断。",
                    row: "wifi", recovery: "form")
                self.rebuild()
            }
        }
    }

    private func statusBody() -> [NSView] {
        guard let host else { return [] }
        if done {
            let card = Card()
            card.setViews([
                makeLabel("配置成功 · 设备 READY", size: 17, weight: .heavy, align: .center),
                makeLabel("HID 控制请通过 ControlHub 下发", size: 13, color: DS.mut, align: .center),
                DSButton("查看设备", tone: .primary, symbol: "chevron.right", actionId: "p002-view") { [weak self] in
                    guard let self, let d = self.host?.shared.currentDevice else { return }
                    self.host?.shared.provSnapshot = ProvisionSnapshot(
                        deviceId: d.id, name: d.name, proto: "V1", firmware: nil,
                        lastWifi: self.ssid, lastHub: self.hub)
                    self.host?.router.redirect(.p003)
                },
            ], spacing: 8)
            return [card]
        }

        let rowDefs: [(String, String)] = [("wifi", "Wi-Fi 连接"), ("hub", "ControlHub 配对"), ("conn", "MQTT 控制链路"), ("usb", "USB HID Ready")]
        let rows = rowDefs.map { key, label in
            let st = progress[key] ?? "pending"
            let mark = st == "done" ? "✓" : st == "fail" ? "✕" : st == "active" ? "•" : "·"
            let color: NSColor = st == "done" ? DS.successDeep : st == "fail" ? DS.danger : st == "active" ? DS.primary : DS.mut
            var views = [makeLabel(mark, size: 13, weight: .bold, color: color), makeLabel(label, size: 13)]
            if err?.row == key {
                views.append(makeLabel(err!.code, size: 11, color: DS.danger, mono: true))
            }
            return hstack(views, spacing: 10)
        }
        let progressCard = Card()
        progressCard.setViews(rows, spacing: 9)

        if let err {
            let banner = errorBanner(code: err.code, message: err.msg, retry: nil)
            let rec: (String, String, String)
            switch err.recovery {
            case "pairing": rec = ("重新扫描配对码", "qrcode", "pairing")
            case "diagnostics": rec = ("运行诊断", "waveform.path.ecg", "diagnostics")
            case "retry": rec = ("重新下发", "paperplane", "retry")
            default: rec = ("返回表单修改", "slider.horizontal.3", "form")
            }
            let recBtn = DSButton(rec.0, tone: .primary, symbol: rec.1, actionId: "p002-recovery-\(rec.2)") { [weak self] in
                guard let self else { return }
                switch rec.2 {
                case "pairing":
                    self.token = nil
                    self.phase = .configure
                    self.err = nil
                    self.progress = ["wifi": "pending", "hub": "pending", "conn": "pending", "usb": "pending"]
                case "diagnostics":
                    self.host?.router.go(.p005)
                    return
                default:
                    self.phase = .configure
                    self.err = nil
                    self.progress = ["wifi": "pending", "hub": "pending", "conn": "pending", "usb": "pending"]
                }
                self.rebuild()
            }
            return [banner, progressCard, recBtn]
        }

        let cancel = DSButton("取消等待", tone: .soft, actionId: "p002-cancelwait") { [weak self] in
            guard let self else { return }
            self.isProvisioning = false
            self.err = ProvisionError(code: "timeout", msg: "等待设备确认超时（60s），可重试下发。", row: "conn", recovery: "retry")
            self.rebuild()
        }
        return [progressCard, cancel]
    }

    // MARK: - 离开确认（U-01：配网中 / 脏表单）

    private func leave() {
        guard let host else { return }
        if isProvisioning {
            host.showModal(title: "离开确认", content: "离开将取消本次配置等待，确定离开吗？",
                           confirmText: "离开", cancelText: "继续配置", hideCancel: false,
                           onConfirm: { [weak self] in self?.cleanupAndBack() }, onCancel: nil)
            return
        }
        if phase == .configure && (dirty || token != nil) {
            host.showModal(title: "离开确认",
                           content: "已填写的配网信息与配对令牌将全部清空（隐私约定：不写入本地）。确定离开吗？",
                           confirmText: "离开并清空", cancelText: "继续填写", hideCancel: false,
                           onConfirm: { [weak self] in self?.cleanupAndBack() }, onCancel: nil)
            return
        }
        cleanupAndBack()
    }

    private func cleanupAndBack() {
        pwd = ""
        token = nil
        host?.router.back()
    }
}
