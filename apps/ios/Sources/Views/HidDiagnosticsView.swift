import SmartHidCore
import SwiftUI

struct HidDiagnosticAssessment {
    enum State: String, Equatable {
        case pending
        case active
        case ok
        case warn
        case fail
    }

    struct Row: Identifiable, Equatable {
        let id: String
        let label: String
        let state: State
        let detail: String?
    }

    static func rows(
        connected: Bool,
        info: HidProtocol.DeviceInfo?,
        status: HidProtocol.ProvisionStatus?
    ) -> [Row] {
        let progress = status.map {
            HidProtocol.mapRows(state: $0.state, step: $0.step, error: $0.error)
        } ?? ["wifi": "pending", "hub": "pending", "conn": "pending", "usb": "pending"]

        return [
            Row(
                id: "ble",
                label: "BLE 链路",
                state: connected ? .ok : .fail,
                detail: connected
                    ? info.map { "CoreBluetooth 已连接 · \($0.deviceId) · Smart HID \($0.protocolVersion)" } ?? "CoreBluetooth 会话已连接"
                    : "设备未连接"
            ),
            Row(id: "wifi", label: "Wi-Fi 连接", state: rowState(progress["wifi"]), detail: status?.step),
            Row(id: "hub", label: "ControlHub", state: rowState(progress["hub"]), detail: status?.state),
            Row(id: "conn", label: "控制连接", state: rowState(progress["conn"]), detail: status?.state),
            Row(id: "usb", label: "设备 Ready 状态", state: rowState(progress["usb"]), detail: status?.error),
        ]
    }

    private static func rowState(_ value: String?) -> State {
        switch value {
        case "done": return .ok
        case "active": return .active
        case "fail": return .fail
        case "warn": return .warn
        default: return .pending
        }
    }
}

struct HidDiagnosticsView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var bleManager: BLEManager
    @ObservedObject var manager: HidProvisionManager
    let deviceId: String
    var onReconfigure: (String) -> Void = { _ in }
    var autoRun = true

    @State private var showErrorCode = false

    var body: some View {
        VStack(spacing: 0) {
            subnavigation
            ScrollView {
                VStack(spacing: 14) {
                    statusCard
                    diagnosticRows
                    if case .failed(let code, let message, _) = manager.stage {
                        errorDetails(code: code, message: message)
                    }
                    actions
                }
                .padding(16)
            }
            .background(NativeDS.page)
        }
        .onAppear {
            if autoRun { manager.beginDiagnostics(deviceId: deviceId) }
        }
        .onDisappear {
            if manager.stage != .idle { manager.abandon(preserveConnection: true) }
        }
    }

    private var subnavigation: some View {
        NativeSubnavBar(title: "SHID 诊断", onBack: { dismiss() })
    }

    private var statusCard: some View {
        HStack(spacing: 10) {
            Text(statusWord)
                .font(.caption.weight(.bold))
                .foregroundColor(statusColor)
                .padding(.horizontal, 9)
                .padding(.vertical, 4)
                .background(statusColor.opacity(0.12).clipShape(Capsule()))
            Text(deviceId)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(NativeDS.muted)
            Spacer()
        }
        .nativeCard(padding: 12)
    }

    private var diagnosticRows: some View {
        VStack(spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: icon(for: row.state))
                        .foregroundColor(color(for: row.state))
                        .frame(width: 20)
                    VStack(alignment: .leading, spacing: 3) {
                        HStack {
                            Text(row.label).font(.subheadline.weight(.semibold))
                            Text(word(for: row.state)).font(.caption).foregroundColor(color(for: row.state))
                        }
                        if let detail = row.detail, !detail.isEmpty {
                            Text(detail).font(.caption2).foregroundColor(NativeDS.muted)
                        }
                    }
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 13)
                if index < rows.count - 1 { Divider() }
            }
        }
        .nativeCard(padding: 0)
    }

    @ViewBuilder
    private func errorDetails(code: String, message: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            NativeSectionHeading(icon: "exclamationmark.octagon", title: "错误详情", tone: NativeDS.danger)
            Text(message).font(.footnote).foregroundColor(NativeDS.sub)
            Button(showErrorCode ? "隐藏错误码" : "显示错误码（详细信息）") {
                showErrorCode.toggle()
            }
            .buttonStyle(.borderless)
            if showErrorCode {
                Text(code)
                    .font(.system(.footnote, design: .monospaced))
                    .foregroundColor(Color(red: 1, green: 139 / 255, blue: 148 / 255))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(NativeDS.ink)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .nativeCard()
    }

    private var actions: some View {
        VStack(spacing: 9) {
            Button(action: { manager.refreshDiagnostics() }) {
                Label("重新检测", systemImage: "arrow.clockwise")
                    .font(.subheadline.bold())
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
            }
            .buttonStyle(.plain)
            .foregroundColor(.white)
            .background(NativeDS.primary)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            HStack(spacing: 9) {
                Button(action: { dismiss() }) {
                    Label("返回设备详情", systemImage: "chevron.left").frame(maxWidth: .infinity)
                }
                Button(action: { onReconfigure(deviceId) }) {
                    Label("重新配网", systemImage: "arrow.clockwise").frame(maxWidth: .infinity)
                }
                .foregroundColor(NativeDS.danger)
            }
            .buttonStyle(.plain)
            .font(.caption.weight(.semibold))
            .padding(.vertical, 11)
            .background(NativeDS.fill)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private var rows: [HidDiagnosticAssessment.Row] {
        if !bleManager.isDeviceConnected(deviceId), manager.latestStatus == nil {
            return [
                .init(id: "ble", label: "BLE 链路", state: .pending, detail: nil),
                .init(id: "wifi", label: "Wi-Fi 连接", state: .pending, detail: nil),
                .init(id: "hub", label: "ControlHub", state: .pending, detail: nil),
                .init(id: "conn", label: "控制连接", state: .pending, detail: nil),
                .init(id: "usb", label: "设备 Ready 状态", state: .pending, detail: nil),
            ]
        }
        return HidDiagnosticAssessment.rows(
            connected: bleManager.isDeviceConnected(deviceId),
            info: manager.deviceInfo,
            status: manager.latestStatus
        )
    }

    private var statusWord: String {
        if case .failed = manager.stage { return "检测失败" }
        if !bleManager.isDeviceConnected(deviceId) { return "设备未连接" }
        if manager.latestStatus != nil { return "实时检测完成" }
        return "正在读取实时状态…"
    }

    private var statusColor: Color {
        if case .failed = manager.stage { return NativeDS.danger }
        return manager.latestStatus == nil ? NativeDS.muted : NativeDS.success
    }

    private func icon(for state: HidDiagnosticAssessment.State) -> String {
        switch state {
        case .ok: return "checkmark.circle.fill"
        case .warn: return "exclamationmark.triangle.fill"
        case .fail: return "xmark.circle.fill"
        case .active: return "ellipsis.circle"
        case .pending: return "circle"
        }
    }

    private func color(for state: HidDiagnosticAssessment.State) -> Color {
        switch state {
        case .ok: return NativeDS.success
        case .warn: return NativeDS.warning
        case .fail: return NativeDS.danger
        case .active: return NativeDS.primary
        case .pending: return NativeDS.muted
        }
    }

    private func word(for state: HidDiagnosticAssessment.State) -> String {
        switch state {
        case .ok: return "正常"
        case .warn: return "异常"
        case .fail: return "失败"
        case .active: return "检测中"
        case .pending: return "待检测"
        }
    }
}
