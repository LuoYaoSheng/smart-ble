import SmartHidCore
import SwiftUI

struct ProvisioningPreviewSeed {
    var ssid = ""
    var password = ""
    var hubHost = ""
    var hubPort: Int? = HidProtocol.defaultPairingPort
    var token = ""
    var submitted = false
}

struct ProvisioningView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var bleManager: BLEManager
    @ObservedObject var manager: HidProvisionManager
    let device: ScanResult
    var onViewDevice: (String) -> Void = { _ in }
    var onOpenDiagnostics: (String) -> Void = { _ in }

    @State private var ssid = ""
    @State private var password = ""
    @State private var hubHost = ""
    @State private var hubPort: Int? = HidProtocol.defaultPairingPort
    @State private var token = ""
    @State private var showPassword = false
    @State private var showQrScanner = false
    @State private var showLeaveAlert = false
    @State private var submitted = false

    init(
        manager: HidProvisionManager,
        device: ScanResult,
        previewSeed: ProvisioningPreviewSeed? = nil,
        onViewDevice: @escaping (String) -> Void = { _ in },
        onOpenDiagnostics: @escaping (String) -> Void = { _ in }
    ) {
        self.manager = manager
        self.device = device
        self.onViewDevice = onViewDevice
        self.onOpenDiagnostics = onOpenDiagnostics
        _ssid = State(initialValue: previewSeed?.ssid ?? "")
        _password = State(initialValue: previewSeed?.password ?? "")
        _hubHost = State(initialValue: previewSeed?.hubHost ?? "")
        _hubPort = State(initialValue: previewSeed?.hubPort ?? HidProtocol.defaultPairingPort)
        _token = State(initialValue: previewSeed?.token ?? "")
        _submitted = State(initialValue: previewSeed?.submitted ?? false)
    }

    var body: some View {
        VStack(spacing: 0) {
            subnavigation
            ScrollView {
                VStack(spacing: 14) {
                    stepper
                    deviceSummary
                    content
                }
                .padding(16)
            }
            .background(NativeDS.page)
        }
        .sheet(isPresented: $showQrScanner) {
            SmartHidQrScanner(onCode: applyPairingCode)
        }
        .alert("离开配网？", isPresented: $showLeaveAlert) {
            Button("继续填写", role: .cancel) {}
            Button("离开", role: .destructive) { leave(preserveConnection: false) }
        } message: {
            Text("当前填写内容和配对凭据只保存在内存中，离开后会清除。")
        }
        .onAppear {
            if manager.stage == .idle {
                manager.begin(deviceId: device.id)
            }
        }
        .onDisappear {
            if manager.stage != .idle {
                manager.abandon(preserveConnection: manager.stage == .done)
            }
        }
    }

    private var subnavigation: some View {
        NativeSubnavBar(title: "配置 Smart HID", onBack: requestLeave)
    }

    private var stepper: some View {
        HStack(spacing: 4) {
            step(number: 1, label: "连接设备", index: 0)
            stepLine(after: 0)
            step(number: 2, label: "填写配置", index: 1)
            stepLine(after: 1)
            step(number: 3, label: "下发状态", index: 2)
        }
        .padding(.horizontal, 4)
    }

    private func step(number: Int, label: String, index: Int) -> some View {
        let current = phaseIndex
        return VStack(spacing: 5) {
            ZStack {
                Circle()
                    .fill(index < current ? NativeDS.successWeak : index == current ? NativeDS.primary : Color.white)
                    .overlay(Circle().stroke(index < current ? NativeDS.success : index == current ? NativeDS.primary : NativeDS.line, lineWidth: 1))
                    .frame(width: 28, height: 28)
                Text(index < current ? "✓" : "\(number)")
                    .font(.caption.weight(.bold))
                    .foregroundColor(index < current ? NativeDS.success : index == current ? .white : NativeDS.muted)
            }
            Text(label)
                .font(.caption2.weight(index == current ? .bold : .medium))
                .foregroundColor(index < current ? NativeDS.success : index == current ? NativeDS.primary : NativeDS.muted)
        }
        .frame(width: 78)
    }

    private func stepLine(after index: Int) -> some View {
        Rectangle()
            .fill(phaseIndex > index ? NativeDS.success : NativeDS.line)
            .frame(height: 2)
            .offset(y: -10)
    }

    private var deviceSummary: some View {
        HStack(spacing: 11) {
            ZStack {
                RoundedRectangle(cornerRadius: 10).fill(NativeDS.successWeak)
                Text(String(device.name.prefix(1)).uppercased())
                    .font(.headline.weight(.heavy))
                    .foregroundColor(NativeDS.success)
            }
            .frame(width: 40, height: 40)

            VStack(alignment: .leading, spacing: 2) {
                Text(device.name.isEmpty ? "Smart HID 设备" : device.name)
                    .font(.headline)
                Text(summaryLine)
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(NativeDS.muted)
            }
            Spacer()
        }
        .nativeCard(padding: 12)
    }

    @ViewBuilder
    private var content: some View {
        switch manager.stage {
        case .idle, .connecting, .verifying:
            connectionContent
        case .verified:
            configurationContent
        case .sending, .waiting, .done:
            statusContent
        case .failed where manager.deviceInfo == nil && !submitted:
            connectionContent
        case .failed where !submitted:
            configurationContent
        case .failed:
            statusContent
        }
    }

    private var connectionContent: some View {
        VStack(spacing: 14) {
            if case .failed(let code, let message, _) = manager.stage {
                errorBanner(code: code, message: message)
                HStack {
                    primaryButton("重新连接", icon: "arrow.clockwise") {
                        manager.begin(deviceId: device.id)
                    }
                    softButton("返回设备列表") { leave(preserveConnection: false) }
                }
            } else {
                VStack(spacing: 12) {
                    ProgressView()
                    Text("连接并确认设备中…").font(.headline)
                    Text("正在建立 GATT 连接并验证 Device Info · \(device.name)")
                        .font(.footnote)
                        .foregroundColor(NativeDS.muted)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .nativeCard()
            }
        }
    }

    private var configurationContent: some View {
        VStack(spacing: 12) {
            if case .failed(let code, let message, _) = manager.stage {
                errorBanner(code: code, message: message)
            }

            HStack(spacing: 8) {
                Text(manager.stage == .verified ? "已连接" : "已断开")
                    .font(.caption.weight(.bold))
                    .foregroundColor(manager.stage == .verified ? NativeDS.success : NativeDS.danger)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 4)
                    .background((manager.stage == .verified ? NativeDS.successWeak : NativeDS.dangerWeak).clipShape(Capsule()))
                Text(device.id)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(NativeDS.muted)
                Spacer()
            }

            VStack(spacing: 14) {
                field("Wi-Fi 名称", required: true) {
                    TextField("家庭 / 办公 2.4G Wi-Fi", text: $ssid)
                        .textFieldStyle(.roundedBorder)
                        .onChange(of: ssid) { value in ssid = String(value.prefix(32)) }
                }
                field("Wi-Fi 密码", required: false) {
                    HStack {
                        Group {
                            if showPassword {
                                TextField("无密码可留空", text: $password)
                            } else {
                                SecureField("无密码可留空", text: $password)
                            }
                        }
                        .textFieldStyle(.roundedBorder)
                        Button(action: { showPassword.toggle() }) {
                            Image(systemName: showPassword ? "eye.slash" : "eye")
                        }
                        .buttonStyle(.plain)
                    }
                    .onChange(of: password) { value in password = String(value.prefix(64)) }
                }
                field("ControlHub 地址", required: true) {
                    TextField("192.168.1.8:17892", text: $hubHost)
                        .textFieldStyle(.roundedBorder)
                }
            }
            .nativeCard()

            Button(action: { showQrScanner = true }) {
                HStack(spacing: 12) {
                    Image(systemName: "qrcode.viewfinder").font(.title2)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(token.isEmpty ? "扫描 ControlHub 配对码" : "重新扫描配对码")
                            .font(.headline)
                        Text(token.isEmpty ? "扫码解析 shid://pair 自动回填地址与令牌" : "token 已获取（内存会话，不落盘）")
                            .font(.caption)
                    }
                    Spacer()
                    Text(token.isEmpty ? "必需" : "已获取")
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background((token.isEmpty ? NativeDS.warning.opacity(0.15) : NativeDS.successWeak).clipShape(Capsule()))
                }
                .foregroundColor(token.isEmpty ? NativeDS.primary : NativeDS.success)
                .padding(14)
                .background(token.isEmpty ? NativeDS.primaryWeak : NativeDS.successWeak)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(token.isEmpty ? NativeDS.primary : NativeDS.success, lineWidth: 1.5))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)

            Text("Wi-Fi 密码和配对凭据只用于本次下发，不写入日志或本地存储。")
                .font(.footnote)
                .foregroundColor(NativeDS.sub)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(NativeDS.primaryWeak)
                .clipShape(RoundedRectangle(cornerRadius: 10))

            primaryButton("下发配置", icon: "paperplane.fill", fullWidth: true, action: submit)
                .disabled(!canSubmit)
                .opacity(canSubmit ? 1 : 0.45)
        }
    }

    private var statusContent: some View {
        VStack(spacing: 14) {
            if manager.stage == .done {
                VStack(spacing: 12) {
                    ZStack {
                        Circle().fill(NativeDS.successWeak).frame(width: 58, height: 58)
                        Image(systemName: "checkmark").font(.title.bold()).foregroundColor(NativeDS.success)
                    }
                    Text("配置成功 · 设备 READY").font(.title3.bold())
                    Text("HID 控制请通过 ControlHub 下发").foregroundColor(NativeDS.muted)
                    primaryButton("查看设备", icon: "chevron.right") {
                        bleManager.saveHidSessionSnapshot(HidSessionSnapshot(
                            deviceId: device.id,
                            name: device.name,
                            protocolVersion: manager.deviceInfo?.protocolVersion,
                            firmware: manager.deviceInfo?.firmware,
                            lastWifi: ssid,
                            lastHub: hubPort.map { "\(hubHost):\($0)" } ?? hubHost
                        ))
                        onViewDevice(device.id)
                        leave(preserveConnection: true)
                    }
                }
                .frame(maxWidth: .infinity)
                .nativeCard()
            } else {
                if case .failed(let code, let message, _) = manager.stage {
                    errorBanner(code: code, message: message)
                }
                VStack(spacing: 0) {
                    progressRow(key: "wifi", title: "Wi-Fi 连接")
                    Divider()
                    progressRow(key: "hub", title: "ControlHub 配对")
                    Divider()
                    progressRow(key: "conn", title: "MQTT 控制链路")
                    Divider()
                    progressRow(key: "usb", title: "USB HID Ready")
                }
                .nativeCard(padding: 0)

                if case .failed(_, _, let recovery) = manager.stage {
                    primaryButton(recoveryTitle(recovery), icon: recoveryIcon(recovery)) {
                        performRecovery(recovery)
                    }
                } else {
                    softButton("取消等待") {
                        manager.cancelWait()
                        submitted = false
                    }
                }
            }
        }
    }

    private func field<Content: View>(_ title: String, required: Bool, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 3) {
                Text(title).font(.subheadline.weight(.semibold))
                if required { Text("*").foregroundColor(NativeDS.danger) }
            }
            content()
        }
    }

    private func progressRow(key: String, title: String) -> some View {
        let state = manager.rows[key] ?? "pending"
        let color = state == "done" ? NativeDS.success : state == "fail" ? NativeDS.danger : state == "active" ? NativeDS.primary : NativeDS.muted
        return HStack(spacing: 10) {
            Text(state == "done" ? "✓" : state == "fail" ? "✕" : "·")
                .font(.headline.bold())
                .foregroundColor(color)
            Text(title)
            Spacer()
            Text(state == "active" ? "进行中" : state == "done" ? "完成" : state == "fail" ? "失败" : "待处理")
                .font(.caption)
                .foregroundColor(color)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
    }

    private func errorBanner(code: String, message: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                Text("操作失败").font(.headline)
                Text(code).font(.system(size: 10, design: .monospaced))
                    .padding(.horizontal, 7).padding(.vertical, 2).background(Color.white).clipShape(RoundedRectangle(cornerRadius: 6))
            }
            .foregroundColor(NativeDS.danger)
            Text(message).font(.footnote).foregroundColor(NativeDS.sub)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(NativeDS.dangerWeak)
        .overlay(alignment: .leading) { Rectangle().fill(NativeDS.danger).frame(width: 3) }
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func primaryButton(_ title: String, icon: String, fullWidth: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.bold))
                .frame(maxWidth: fullWidth ? .infinity : nil)
                .padding(.horizontal, 16)
                .padding(.vertical, 11)
        }
        .buttonStyle(.plain)
        .foregroundColor(.white)
        .background(NativeDS.primary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func softButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .buttonStyle(.plain)
            .font(.subheadline.weight(.semibold))
            .foregroundColor(NativeDS.sub)
            .padding(.horizontal, 16)
            .padding(.vertical, 11)
            .background(NativeDS.fill)
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var phaseIndex: Int {
        switch manager.stage {
        case .idle, .connecting, .verifying: return 0
        case .failed where manager.deviceInfo == nil && !submitted: return 0
        case .verified: return 1
        case .failed where !submitted && manager.deviceInfo != nil: return 1
        default: return 2
        }
    }

    private var summaryLine: String {
        if let info = manager.deviceInfo {
            let firmware = info.firmware.isEmpty ? "固件未知" : "固件 \(info.firmware)"
            return "\(device.id) · \(info.protocolVersion) · \(firmware)"
        }
        return "\(device.id) · Device Info \(manager.stage == .verifying ? "验证中…" : "待验证")"
    }

    private var canSubmit: Bool {
        manager.stage == .verified
            && !ssid.trimmingCharacters(in: .whitespaces).isEmpty
            && !hubHost.trimmingCharacters(in: .whitespaces).isEmpty
            && !token.isEmpty
    }

    private func applyPairingCode(_ raw: String) -> Bool {
        guard let parsed = manager.acceptPairingQr(raw) else { return false }
        token = parsed.token
        hubHost = parsed.host
        hubPort = parsed.port
        return true
    }

    private func submit() {
        submitted = true
        manager.submit(
            ssid: ssid,
            password: password,
            hubHost: hubHost,
            hubPort: hubPort,
            token: token
        )
    }

    private func recoveryTitle(_ recovery: String) -> String {
        ["form": "返回表单修改", "pairing": "重新扫描配对码", "diagnostics": "运行诊断", "retry": "重新下发"][recovery]
            ?? "返回表单修改"
    }

    private func recoveryIcon(_ recovery: String) -> String {
        ["form": "slider.horizontal.3", "pairing": "qrcode", "diagnostics": "waveform.path.ecg", "retry": "paperplane.fill"][recovery]
            ?? "slider.horizontal.3"
    }

    private func performRecovery(_ recovery: String) {
        switch recovery {
        case "diagnostics":
            onOpenDiagnostics(device.id)
        case "pairing":
            manager.resumeConfiguration()
            submitted = false
            token = ""
            showQrScanner = true
        case "retry":
            manager.resumeConfiguration()
            submitted = false
            submit()
        default:
            manager.resumeConfiguration()
            submitted = false
        }
    }

    private func requestLeave() {
        if !ssid.isEmpty || !password.isEmpty || !hubHost.isEmpty || !token.isEmpty || submitted {
            showLeaveAlert = true
        } else {
            leave(preserveConnection: false)
        }
    }

    private func leave(preserveConnection: Bool) {
        manager.abandon(preserveConnection: preserveConnection)
        dismiss()
    }
}
