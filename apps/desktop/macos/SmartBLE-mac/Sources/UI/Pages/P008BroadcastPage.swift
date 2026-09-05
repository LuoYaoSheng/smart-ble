//
// P008BroadcastPage.swift — PAGE008 BLE 广播（F014/F015 平台分支 + F016 31B 预算）
// 桌面差异：平台徽标 = Desktop · macOS；页首原生层提示（CoreBluetooth · D2 待验证不预判）；
// 检查支持/启停 = 真实 CBPeripheralManager；字节预算实时核算、超限拦截不静默截断。
//

import AppKit

@MainActor
final class P008BroadcastPage: NSViewController, PageProtocol {
    weak var host: PageHost?
    private var scroll: PageScroll!

    // 表单（默认值对齐 advDefaults：name SmartBLE / FFE0 / 0001 / BLE）
    private var advName = "SmartBLE"
    private var advUUID = "FFE0"
    private var mfgId = "0001"
    private var mfgData = "BLE"
    private var uuidErr = false
    private var checked = false
    private var supported = false
    private var failed = false

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

    // MARK: - 字节预算（F016：AD 结构逐项；超限显示但不静默截断）

    struct Budget {
        let name: Int, uuid: Int, mfg: Int
        var total: Int { name + uuid + mfg }
        var over: Bool { total > 31 }
    }

    func computeBudget() -> Budget {
        let nameB = advName.isEmpty ? 0 : 2 + advName.utf8.count
        let uuidChars = advUUID.count
        let uuidB = advUUID.isEmpty ? 0 : 2 + uuidChars / 2
        let mfgB = (mfgId.isEmpty && mfgData.isEmpty) ? 0 : 4 + mfgData.utf8.count
        return Budget(name: nameB, uuid: uuidB, mfg: mfgB)
    }

    static func isValidUUID(_ v: String) -> Bool {
        v.isEmpty || v.count == 4 || v.count == 8 || v.count == 36
    }

    func rebuild() {
        guard let host else { return }
        let ble = host.ble
        var views: [NSView] = []

        // 运行徽章（六值口径：广播中/失败/已停止/已就绪/未就绪/不支持）
        let badgeText: String
        let badgeTone: String
        if ble.isAdvertising {
            badgeText = "广播中"; badgeTone = "on"
        } else if failed {
            badgeText = "失败"; badgeTone = "err"
        } else if checked && supported {
            badgeText = ble.lastAdvStopped ? "已停止" : "已就绪"
            badgeTone = ble.lastAdvStopped ? "dim" : "warn"
        } else {
            badgeText = "未就绪"; badgeTone = "dim"
        }

        views.append(navbar(kicker: "PERIPHERAL", title: "广播",
                            trailing: [chip("平台：Desktop · macOS"), badge(badgeText, tone: badgeTone)]))

        // 桌面原生层提示（P008 页首注入 · desktop.js 同口径）
        views.append(noteBanner("info", "桌面原生层 CoreBluetooth（macOS）：扫描 / GATT / 广播外围 △～✅（10_platform §2.4），技术选型待 D2 spike，不预判。"))

        let budget = computeBudget()
        let dis = ble.isAdvertising

        // 设置卡
        let nameInput = FieldInput(placeholder: "SmartBLE") { [weak self] v in
            self?.advName = String(v.prefix(20))
        }
        nameInput.textField.stringValue = advName
        if dis { nameInput.isEnabled = false }
        let uuidInput = FieldInput(placeholder: "4 / 8 / 36 位 HEX", mono: true) { [weak self] v in
            let t = v.trimmingCharacters(in: .whitespaces)
            self?.advUUID = t
            self?.uuidErr = !Self.isValidUUID(t)
        }
        uuidInput.textField.stringValue = advUUID
        if dis { uuidInput.isEnabled = false }
        let mfgIdInput = FieldInput(placeholder: "0001", mono: true) { [weak self] v in
            self?.mfgId = String(v.prefix(4))
        }
        mfgIdInput.textField.stringValue = mfgId
        if dis { mfgIdInput.isEnabled = false }
        let mfgDataInput = FieldInput(placeholder: "BLE") { [weak self] v in
            self?.mfgData = String(v.prefix(26))
        }
        mfgDataInput.textField.stringValue = mfgData
        if dis { mfgDataInput.isEnabled = false }

        var fields: [NSView] = [
            vstack([fieldLabel("设备名称\(dis ? " · 广播中禁用" : "")"), nameInput], spacing: 6),
            vstack([fieldLabel("服务 UUID"), uuidInput], spacing: 6),
        ]
        if uuidErr {
            fields.append(noteBanner("warn", "UUID 需为 4 / 8 / 36 位十六进制"))
        }
        fields.append(contentsOf: [
            vstack([fieldLabel("厂商 ID（HEX）"), mfgIdInput], spacing: 6),
            vstack([fieldLabel("厂商数据（ASCII）"), mfgDataInput], spacing: 6),
        ])

        // 字节预算条（深色）+ 分项
        let byteNum = makeLabel("\(budget.total)", size: 15, weight: .bold, color: budget.over ? #colorLiteral(red: 1, green: 0.545, blue: 0.576, alpha: 1) : .white, mono: true)
        let byteBar = hstack([
            makeLabel("ADV 负载预算", size: 10, color: DS.inkMut),
            NSView(), byteNum, makeLabel("/ 31 字节", size: 11, color: DS.inkMut),
        ], spacing: 8)
        byteBar.translatesAutoresizingMaskIntoConstraints = false
        let byteBox = NSView()
        byteBox.wantsLayer = true
        byteBox.layer?.backgroundColor = DS.ink.cgColor
        byteBox.layer?.cornerRadius = DS.rMd
        byteBox.translatesAutoresizingMaskIntoConstraints = false
        byteBox.addSubview(byteBar)
        NSLayoutConstraint.activate([
            byteBar.topAnchor.constraint(equalTo: byteBox.topAnchor, constant: 9),
            byteBar.bottomAnchor.constraint(lessThanOrEqualTo: byteBox.bottomAnchor, constant: -9),
            byteBar.leadingAnchor.constraint(equalTo: byteBox.leadingAnchor, constant: 13),
            byteBar.trailingAnchor.constraint(equalTo: byteBox.trailingAnchor, constant: -13),
        ])
        fields.append(byteBox)

        let budgetCard = Card()
        budgetCard.setViews([
            budgetRow("完整名称 (0x09)", "\(budget.name) B", budget.name > 31),
            budgetRow("服务 UUID (0x03/0x07)", "\(budget.uuid) B", false),
            budgetRow("厂商块 (0xFF = 2+2+\(mfgData.utf8.count))", "\(budget.mfg) B", false),
            budgetRow("合计\(budget.over ? " · 超限，启动将被拦截（不静默截断）" : "")", "\(budget.total) / 31 B", budget.over),
        ], spacing: 5)
        fields.append(budgetCard)

        let settings = Card()
        settings.setViews(fields, spacing: DS.sp3)
        views.append(settings)

        // 操作区：开始/停止（真实）+ 检查支持（真实）
        let main: DSButton
        if ble.isAdvertising {
            main = DSButton("停止广播", tone: .danger, symbol: "stop.fill", actionId: "p008-stop") { [weak self] in
                guard let self, let host = self.host else { return }
                host.ble.stopAdvertising()
                host.ble.lastAdvStopped = true
                self.rebuild()
            }
        } else {
            main = DSButton("开始广播", tone: .primary, symbol: "antenna.radiowaves.left.and.right", actionId: "p008-start") { [weak self] in
                self?.start()
            }
            main.isEnabled = !budget.over && !uuidErr
        }
        let check = DSButton("检查支持", tone: .soft, symbol: "arrow.clockwise", actionId: "p008-check") { [weak self] in
            self?.check()
        }
        check.isEnabled = !dis
        views.append(hstack([main, check], spacing: 9))

        // 操作日志（card 变体）
        let logPanel = LogPanelView(variant: "cardv", emptyText: "暂无日志 · 开始广播或检查支持后，操作记录会显示在这里",
                                    onClear: { [weak self] in
                                        self?.host?.ble.logs.removeAll()
                                        self?.rebuild()
                                    },
                                    onExport: { [weak self] in
                                        guard let self, let host = self.host else { return }
                                        if host.ble.logs.isEmpty {
                                            host.toast("暂无日志")
                                            return
                                        }
                                        host.showModal(title: "导出日志（桌面）",
                                                       content: "复制到剪贴板，或保存为日志文件。\n（文件流导出为候选增强，未决策——10_platform §2.4）",
                                                       confirmText: "复制到剪贴板", cancelText: "保存为文件（候选）", hideCancel: false,
                                                       onConfirm: { [weak host] in
                                                           let text = host?.ble.logs.map { "\($0.timeText) [\($0.kind.label)] \($0.message)" }.joined(separator: "\n") ?? ""
                                                           NSPasteboard.general.clearContents()
                                                           NSPasteboard.general.setString(text, forType: .string)
                                                           host?.toast("日志已复制", ok: true)
                                                       },
                                                       onCancel: { [weak host] in
                                                           host?.toast("候选能力：文件流导出未决策，暂不提供")
                                                       })
                    })
        logPanel.update(ble.logs)
        views.append(logPanel)

        scroll.setViews(views)
    }

    /// 冒烟入口：注入厂商数据并重建（验证预算实时核算与超限拦截）
    func setMfgDataForSmoke(_ value: String) {
        mfgData = value
        rebuild()
    }

    private func budgetRow(_ k: String, _ v: String, _ over: Bool) -> NSView {
        hstack([makeLabel(k, size: 11, color: over ? DS.danger : DS.sub, mono: true),
                NSView(),
                makeLabel(v, size: 11, weight: over ? .bold : .regular, color: over ? DS.danger : DS.sub, mono: true)], spacing: 8)
    }

    // MARK: - 检查支持（真实 CoreBluetooth 判定）

    func check() {
        guard let host else { return }
        checked = true
        supported = host.ble.checkPeripheralSupport()
        rebuild()
    }

    // MARK: - 启停（真实 CBPeripheralManager）

    func start() {
        guard let host else { return }
        let budget = computeBudget()
        if budget.over {
            host.toast("广播负载超限（\(budget.total)/31B），启动被拦截")
            return
        }
        if uuidErr {
            host.toast("UUID 非法，请修正后重试")
            return
        }
        host.ble.startAdvertising(name: advName, serviceUUID: advUUID)
        host.ble.lastAdvStopped = false
        failed = false
        rebuild()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            guard let self, let host = self.host else { return }
            if !host.ble.isAdvertising {
                self.failed = true
                self.rebuild()
            }
        }
    }
}
