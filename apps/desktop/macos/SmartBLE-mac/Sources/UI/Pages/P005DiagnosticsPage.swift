//
// P005DiagnosticsPage.swift — PAGE005 Smart HID 诊断（F024 五项链路 + 栈感知导航）
// 探针口径：五项 = BLE 链路（真实 CoreBluetooth）；其余四项需 SHID 协议（BLOCKED_FIXTURE，
// 未连接/无夹具 → offline / error 态，不伪造检测结果）。
//

import AppKit

@MainActor
final class P005DiagnosticsPage: NSViewController, PageProtocol {
    weak var host: PageHost?
    private var scroll: PageScroll!

    enum DiagState { case idle, connected, checking, live, offline, error }
    private var state: DiagState = .idle
    private var error: (code: String, message: String)?
    private var showErr = false
    private var rowStates: [String] = ["pending", "pending", "pending", "pending", "pending"]
    private var rowDetails: [Int: String] = [:]

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

    private static let rowDefs: [(String, String)] = [
        ("ble", "BLE 链路"), ("wifi", "Wi-Fi 连接"), ("hub", "ControlHub"),
        ("conn", "控制连接"), ("usb", "设备 Ready 状态"),
    ]

    func rebuild() {
        guard let host else { return }
        var views: [NSView] = []
        views.append(subnav(title: "SHID 诊断", onBack: { [weak self] in
            self?.host?.router.back()
        }))

        let deviceId = host.shared.currentDevice?.id ?? host.shared.provSnapshot?.deviceId ?? "SHID-—"
        let (word, tone): (String, String)
        switch state {
        case .idle: (word, tone) = ("尚未检测", "dim")
        case .connected: (word, tone) = ("设备已连接可开始检测", "dim")
        case .checking: (word, tone) = ("正在读取实时状态…", "warn")
        case .live: (word, tone) = ("实时检测完成", "on")
        case .offline: (word, tone) = ("设备未连接", "err")
        case .error: (word, tone) = ("检测失败", "err")
        }
        let statusCard = Card()
        statusCard.setViews([hstack([badge(word, tone: tone),
                                     makeLabel(deviceId, size: 11, color: DS.mut, mono: true)], spacing: 10)], spacing: 0)
        views.append(statusCard)

        // 五项诊断行（五态：待检测/检测中/正常/异常/失败）
        let rows = Self.rowDefs.enumerated().map { i, def in
            let st = rowStates[i]
            let mark = st == "ok" ? "✓" : st == "warn" ? "!" : st == "fail" ? "✕" : st == "active" ? "•" : "·"
            let color: NSColor = st == "ok" ? DS.successDeep : st == "warn" ? DS.warningDeep : st == "fail" ? DS.danger : st == "active" ? DS.primary : DS.mut
            let wordLabel = ["pending": "待检测", "active": "检测中", "ok": "正常", "warn": "异常", "fail": "失败"][st] ?? ""
            var mid = hstack([makeLabel(def.1, size: 13), makeLabel(wordLabel, size: 12, color: color)], spacing: 8)
            let detail = rowDetails[i].map { makeLabel($0, size: 11, color: DS.mut) }
            let row = hstack([makeLabel(mark, size: 13, weight: .bold, color: color),
                              vstack(detail == nil ? [mid] : [mid, detail!], spacing: 2)], spacing: 10)
            row.translatesAutoresizingMaskIntoConstraints = false
            return row
        }
        let rowsCard = Card()
        rowsCard.setViews(rows, spacing: 9)
        views.append(rowsCard)

        if let error {
            views.append(opState(state == .error ? "err" : "warn", title: "错误详情", desc: error.message))
            let toggle = DSButton(showErr ? "隐藏错误码" : "显示错误码（详细信息）", tone: .ghost, small: true,
                                  actionId: "p005-toggleerr") { [weak self] in
                self?.showErr.toggle()
                self?.rebuild()
            }
            views.append(toggle)
            if showErr {
                views.append(inkBlock([("code", "", error.code)]))
            }
        }

        let run = DSButton(state == .checking ? "检测中…" : "重新检测", tone: .primary,
                           symbol: "arrow.clockwise", actionId: "p005-run") { [weak self] in
            self?.run()
        }
        run.isEnabled = state != .checking
        let backDetail = DSButton("返回设备详情", tone: .soft, symbol: "chevron.right", actionId: "p005-godetail") { [weak self] in
            guard let self else { return }
            // 栈感知：栈中有 P003 → back，否则 go
            if self.host?.router.stack.contains(.p003) == true {
                self.host?.router.back()
            } else {
                self.host?.router.go(.p003)
            }
        }
        let reprov = DSButton("重新配网", tone: .softDanger, symbol: "arrow.clockwise", actionId: "p005-reprov") { [weak self] in
            guard let self, let host = self.host else { return }
            host.showModal(title: "重新配网",
                           content: "READY 设备已关闭蓝牙广播。\n请先让设备进入配网/恢复模式（长按配对键 5s），确认后继续。",
                           confirmText: "已进入配网模式", cancelText: "取消", hideCancel: false,
                           onConfirm: { [weak self] in
                               guard let self, let host = self.host else { return }
                               if host.router.stack.contains(.p002) {
                                   host.router.smartGo(.p002)
                               } else {
                                   host.router.go(.p002)
                               }
                           }, onCancel: { [weak self] in
                               self?.host?.toast("已取消")
                           })
        }
        views.append(vstack([run, hstack([backDetail, reprov], spacing: 9)], spacing: 9))

        scroll.setViews(views)
    }

    private func run() {
        guard let host else { return }
        let ble = host.ble
        guard let d = host.shared.currentDevice else {
            state = .offline
            rebuild()
            return
        }
        if ble.sessionState(d.id) != .connected {
            state = .offline
            host.showModal(title: "BLE 未连接", content: "设备当前未连接，是否连接并检测？",
                           confirmText: "连接并检测", cancelText: "取消", hideCancel: false,
                           onConfirm: { [weak self] in
                               guard let self, let host = self.host, let d = host.shared.currentDevice else { return }
                               host.ble.connect(device: d)
                               self.state = .idle
                               self.rebuild()
                               host.toast("已发起连接，连接成功后请重新检测")
                           }, onCancel: { [weak self] in
                               self?.host?.toast("已取消")
                           })
            rebuild()
            return
        }
        // 检测中：BLE 链路项真实实证；协议四项经 STATUS 特征映射（协议层 r6-M5 接线）
        state = .checking
        rowStates = ["active", "pending", "pending", "pending", "pending"]
        rowDetails = [:]
        rebuild()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            guard let self else { return }
            self.rowStates[0] = "ok"
            self.rowDetails[0] = "GATT 连接保持（CoreBluetooth 实证）"
            self.rebuild()
        }

        let services = ble.sessionServices(d.id)
        let statusChar = services.flatMap(\.characteristics).first {
            $0.uuid.uppercased() == HidProtocol.statusCharUuid
        }
        if statusChar != nil, let session = ble.sessions[d.id] {
            // 真实诊断路径：读 + 订阅 STATUS → state/step/error 映射四行（DEVICE_PROFILE_SPEC §3.4）
            ble.hid.onStatusRaw = { [weak self] _, status in
                guard let self, let status else { return }
                self.applyStatus(status)
            }
            if statusChar?.properties.contains(.notify) == true {
                ble.setNotification(characteristicUUID: HidProtocol.statusCharUuid, enabled: true, on: session)
            }
            ble.readCharacteristic(deviceId: d.id, characteristicUUID: HidProtocol.statusCharUuid)
            // 3.5s 无回值 → 诚实超时（BLOCKED_FIXTURE：无真实 SHID 设备应答）
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.5) { [weak self] in
                guard let self, self.state == .checking else { return }
                self.state = .error
                self.error = (code: "diagnostic_no_response",
                              message: "STATUS 特征 3.5s 无回值（需真实 SHID 设备应答 · BLOCKED_FIXTURE）。BLE 链路项已实证。")
                self.rebuild()
            }
        } else {
            // 无配网服务/状态特征（普通设备）→ 诚实 BLOCKED_FIXTURE
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
                guard let self else { return }
                self.state = .error
                self.error = (code: "smart_hid_service_missing",
                              message: "未在设备上发现 smart-hid 配网服务/状态特征（需真实 SHID 设备 · BLOCKED_FIXTURE）。BLE 链路项已实证。")
                self.rebuild()
            }
        }
    }

    /// Provision Status → 五项诊断行映射（F024：错误串定位异常行）
    private func applyStatus(_ status: HidProtocol.ProvisionStatus) {
        state = .live
        error = nil
        let rows = HidProtocol.mapRows(state: status.state, step: status.step, error: status.error)
        let detail = "state=\(status.state.isEmpty ? "—" : status.state) · step=\(status.step.isEmpty ? "—" : status.step)"
        // 行 1-4 = wifi/hub/conn/usb（行 0 BLE 已实证）
        for (i, key) in ["wifi", "hub", "conn", "usb"].enumerated() {
            let v = rows[key] ?? "pending"
            switch v {
            case "done": rowStates[i + 1] = "ok"
            case "fail": rowStates[i + 1] = "fail"
            case "active": rowStates[i + 1] = "active"
            default: rowStates[i + 1] = status.state.isEmpty ? "pending" : "warn"
            }
            rowDetails[i + 1] = detail
        }
        if let err = status.error {
            state = .error
            error = (code: err, message: HidProtocol.errorHints[err] ?? "设备侧错误：\(err)")
        }
        rebuild()
    }
}
