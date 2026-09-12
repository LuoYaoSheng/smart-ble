//
// SmartBLE - Scan View
//

import SwiftUI
#if os(macOS)
import AppKit
#elseif os(iOS)
import UIKit
#endif

private struct ScanDeviceIdRoute: Identifiable {
    let id: String
}

enum ScanPreviewScenario: Equatable {
    case filterExpanded
    case filterEmpty
    case scanFailed
    case bluetoothOff
    case unsupported
}

private struct ScanFailure: Equatable {
    let code: String
    let message: String
}

private struct ScanSystemNotice: Identifiable, Equatable {
    let id: String
    let title: String
    let message: String
    let actionTitle: String
}

struct ScanView: View {
    @EnvironmentObject var bleManager: BLEManager
    @State private var selectedDevice: ScanResult?
    @State private var showFilterPanel: Bool
    @State private var hasScanned: Bool
    @State private var scanFailure: ScanFailure?
    @State private var systemNotice: ScanSystemNotice?
    @State private var provisioningDevice: ScanResult?
    @State private var hidDetailRoute: ScanDeviceIdRoute?
    @State private var hidDiagnosticsRoute: ScanDeviceIdRoute?

    init(previewScenario: ScanPreviewScenario? = nil) {
        _showFilterPanel = State(initialValue: previewScenario == .filterExpanded)
        _hasScanned = State(initialValue: previewScenario == .filterExpanded || previewScenario == .filterEmpty)
        _scanFailure = State(initialValue: previewScenario == .scanFailed
            ? ScanFailure(
                code: "scan_failed",
                message: "扫描启动失败：蓝牙适配器初始化超时。请在系统设置确认蓝牙已开启后重试。"
            )
            : nil)
        _systemNotice = State(initialValue: previewScenario == .bluetoothOff
            ? ScanSystemNotice(
                id: "bluetooth_off",
                title: "提示",
                message: "请先打开系统蓝牙",
                actionTitle: "去开启"
            )
            : nil)
    }

    var body: some View {
        VStack(spacing: 0) {
            navbar
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    if let scanFailure {
                        scanErrorBanner(scanFailure)
                            .padding(.top, 12)
                    }
                    scanToolbar
                    sectionHeader
                    if showFilterPanel {
                        FilterPanel()
                            .padding(.bottom, 12)
                    }
                    if scanFailure == nil, bleManager.filteredScanResults.isEmpty {
                        emptyState
                    } else if scanFailure == nil {
                        deviceList
                    }
                }
                .padding(.horizontal, 16)
            }
        }
        .background(NativeDS.page)
        // item 单一事实来源：isPresented + 外部 selectedDevice 双状态在启动窗口
        // 存在内容闭包捕获过期状态的竞争（偶发空呈现/丢呈现）
        .sheet(item: $selectedDevice) { device in
            DeviceDetailSheet(device: device)
                .environmentObject(bleManager)
        }
        .nativePageCover(item: $provisioningDevice) { device in
            ProvisioningView(
                manager: bleManager.hidProvisionManager,
                device: device,
                onViewDevice: { deviceId in
                    provisioningDevice = nil
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        hidDetailRoute = ScanDeviceIdRoute(id: deviceId)
                    }
                },
                onOpenDiagnostics: { deviceId in
                    provisioningDevice = nil
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        hidDiagnosticsRoute = ScanDeviceIdRoute(id: deviceId)
                    }
                }
            )
        }
        .nativePageCover(item: $hidDetailRoute) { route in
            HidDeviceDetailView(deviceId: route.id)
                .environmentObject(bleManager)
        }
        .nativePageCover(item: $hidDiagnosticsRoute) { route in
            HidDiagnosticsView(manager: bleManager.hidProvisionManager, deviceId: route.id)
                .environmentObject(bleManager)
        }
        .onChange(of: bleManager.filterRSSI) { _ in bleManager.applyFilters() }
        .onChange(of: bleManager.filterNamePrefix) { _ in bleManager.applyFilters() }
        .onChange(of: bleManager.hideNoNameDevices) { _ in bleManager.applyFilters() }
        .onChange(of: bleManager.bluetoothState) { state in
            if state == .poweredOff || state == .unauthorized {
                presentBluetoothOffNotice()
            }
        }
        .alert(item: $systemNotice) { notice in
            Alert(
                title: Text(notice.title),
                message: Text(notice.message),
                dismissButton: .default(Text(notice.actionTitle), action: openBluetoothSettings)
            )
        }
    }

    private var navbar: some View {
        NativeNavbar(kicker: "BLE TOOLKIT+", title: "扫描") {
            HStack(spacing: 6) {
                Circle()
                    .fill(bluetoothStatusColor)
                    .frame(width: 8, height: 8)
                Text(bluetoothStatusText)
                    .scaledFont(11, .semibold)
                    .foregroundColor(NativeDS.muted)
            }
        }
    }

    private var scanToolbar: some View {
        HStack(spacing: 10) {
            HStack(spacing: 6) {
                if bleManager.isScanning {
                    Circle().fill(NativeDS.primary).frame(width: 6, height: 6)
                }
                Text(scanStatusText)
                    .scaledFont(12)
                    .foregroundColor(NativeDS.muted)
            }
            Spacer()
            Button(action: toggleScan) {
                Label(bleManager.isScanning ? "停止扫描" : "开始扫描", systemImage: bleManager.isScanning ? "stop.fill" : "plus.circle")
                    .scaledFont(15, .semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 18)
                    .frame(height: 40)
                    .background(
                        LinearGradient(
                            colors: bleManager.isScanning ? [NativeDS.danger, NativeDS.danger] : [NativeDS.primary, NativeDS.primaryDeep],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(color: (bleManager.isScanning ? NativeDS.danger : NativeDS.primary).opacity(0.25), radius: 8, y: 4)
            }
            .buttonStyle(.plain)
            .disabled(bleManager.bluetoothState != .poweredOn)
            .opacity(bleManager.bluetoothState == .poweredOn ? 1 : 0.45)
        }
        .padding(.top, 14)
        .padding(.bottom, 10)
    }

    private func scanErrorBanner(_ failure: ScanFailure) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 7) {
                Image(systemName: "exclamationmark.triangle")
                    .scaledFont(15, .bold)
                Text("扫描失败")
                    .scaledFont(15, .bold)
                NativeStatusChip(text: failure.code, tone: NativeDS.danger)
            }
            .foregroundColor(NativeDS.danger)
            Text(failure.message)
                .scaledFont(13)
                .foregroundColor(NativeDS.sub)
                .fixedSize(horizontal: false, vertical: true)
                .lineSpacing(3)
            Button(action: retryScan) {
                Label("重试", systemImage: "arrow.clockwise")
                    .scaledFont(13, .semibold)
                    .foregroundColor(NativeDS.danger)
                    .padding(.horizontal, 13)
                    .frame(height: 34)
                    .background(NativeDS.dangerWeak)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(NativeDS.danger.opacity(0.45)))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
            .accessibilityHint("重新尝试启动蓝牙扫描")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(NativeDS.dangerWeak)
        .overlay(alignment: .leading) {
            Rectangle().fill(NativeDS.danger).frame(width: 3)
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(NativeDS.danger.opacity(0.18)))
        .accessibilityElement(children: .contain)
    }

    private var sectionHeader: some View {
        NativeSectionHeading(icon: "cpu", title: "附近设备") {
            HStack(spacing: 10) {
                if !bleManager.filteredScanResults.isEmpty {
                    Text("\(bleManager.filteredScanResults.count) 台")
                        .scaledFont(11, .semibold)
                        .foregroundColor(NativeDS.sub)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 3)
                        .background(NativeDS.fill)
                        .clipShape(Capsule())
                }
                Button(showFilterPanel ? "收起筛选" : "筛选") {
                    withAnimation(.easeInOut(duration: 0.2)) { showFilterPanel.toggle() }
                }
                .buttonStyle(.plain)
                .scaledFont(12, .semibold)
                .foregroundColor(NativeDS.primary)
                .nativeHitTarget()
            }
        }
        .padding(.bottom, 4)
    }

    private var emptyState: some View {
        NativeEmptyState(
            illustration: hasScanned ? "link" : "radar",
            title: hasScanned ? "当前没有匹配设备" : "还没有扫描结果",
            description: hasScanned ? "调整筛选条件试试" : "点上方按钮开始扫描附近 BLE 设备",
            actionTitle: hasScanned ? nil : "开始扫描",
            actionIcon: hasScanned ? nil : "plus.circle",
            action: hasScanned ? nil : toggleScan
        )
        .padding(.top, 26)
    }

    private var deviceList: some View {
        LazyVStack(spacing: 12) {
            ForEach(bleManager.filteredScanResults) { device in
                DeviceCard(
                    device: device,
                    onGattAction: {
                        selectedDevice = device
                    },
                    onSmartHidAction: {
                        provisioningDevice = device
                    }
                )
                .environmentObject(bleManager)
            }
        }
        .padding(.top, 8)
        .padding(.bottom, 20)
    }

    private var bluetoothStatusText: String {
        switch bleManager.bluetoothState {
        case .poweredOn: return "蓝牙就绪"
        case .poweredOff, .unauthorized: return "蓝牙未开启"
        // .unknown=CBCentralManager 首回调前的瞬态，对齐桌面壳显示「初始化中…」而非「平台不支持」
        case .unknown: return "初始化中…"
        default: return "平台不支持"
        }
    }

    private var bluetoothStatusColor: Color {
        switch bleManager.bluetoothState {
        case .poweredOn: return NativeDS.success
        case .poweredOff, .unauthorized: return NativeDS.danger
        default: return NativeDS.placeholder
        }
    }

    private var scanStatusText: String {
        if bleManager.isScanning { return "扫描中…" }
        if hasScanned { return "扫描完成 · \(bleManager.filteredScanResults.count) 台设备" }
        return "待开始扫描"
    }

    private func toggleScan() {
        if bleManager.isScanning {
            bleManager.stopScan()
        } else {
            hasScanned = true
            scanFailure = nil
            if bleManager.bluetoothState == .poweredOff || bleManager.bluetoothState == .unauthorized {
                presentBluetoothOffNotice()
                return
            }
            if !bleManager.startScan() {
                scanFailure = ScanFailure(
                    code: "scan_failed",
                    message: "扫描启动失败：蓝牙当前不可用。请在系统设置确认蓝牙已开启后重试。"
                )
            }
        }
    }

    private func retryScan() {
        scanFailure = nil
        toggleScan()
    }

    private func openBluetoothSettings() {
        #if os(iOS)
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
        #endif
    }

    private func presentBluetoothOffNotice() {
        systemNotice = ScanSystemNotice(
            id: "bluetooth_off",
            title: "提示",
            message: "请先打开系统蓝牙",
            actionTitle: "去开启"
        )
    }
}



// MARK: - Device Detail Sheet
struct DeviceDetailSheet: View {
    @EnvironmentObject var bleManager: BLEManager
    @Environment(\.dismiss) var dismiss
    let device: ScanResult
    @State private var toast: String?
    #if DEBUG
    @State private var pasteEcho: String?
    #endif

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text(device.name)
                    .font(.headline)

                Spacer()

                Button("关闭") {
                    dismiss()
                }
                .buttonStyle(.borderless)

                let isConnected = bleManager.isDeviceConnected(device.id)
                let deviceConnectionState = bleManager.connectionStates[device.id] ?? .disconnected

                Button(isConnected ? "已连接" : "连接") {
                    if isConnected {
                        bleManager.disconnect(deviceId: device.id)
                    } else {
                        bleManager.connect(to: device)
                    }
                }
                .buttonStyle(.borderless)
                .disabled(deviceConnectionState == .connecting || deviceConnectionState == .disconnecting)
            }
            .padding()
            .background(Color.gray.opacity(0.1))

            // Content
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Device Info
                    deviceInfoSection

                    // Advertisement Data
                    advertisementSection

                    #if DEBUG
                    // UI 测试回显探针：--ui-test-echo-pasteboard 开启。
                    // App 读自己刚写入的剪贴板不触发系统粘贴板隐私授权（runner 进程直读会挂），
                    // 测试通过该按钮 + 标签验证复制内容真正落板。
                    if ProcessInfo.processInfo.arguments.contains("--ui-test-echo-pasteboard") {
                        VStack(alignment: .leading, spacing: 6) {
                            Button("回显剪贴板") {
                                pasteEcho = UIPasteboard.general.string
                            }
                            .buttonStyle(.borderless)

                            if let pasteEcho {
                                Text("PASTE-ECHO \(pasteEcho)")
                                    .font(.system(.caption2, design: .monospaced))
                                    .foregroundColor(.secondary)
                                    .lineLimit(4)
                                    .accessibilityIdentifier("paste-echo")
                            }
                        }
                    }
                    #endif

                    Spacer()
                }
                .padding()
            }
        }
        .frame(minWidth: 450, minHeight: 350)
        .overlay(alignment: .bottom) {
            if let toast {
                Text(toast)
                    .scaledFont(12, .semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.black.opacity(0.75))
                    .clipShape(Capsule())
                    .padding(.bottom, 18)
                    .transition(.opacity)
                    .accessibilityIdentifier("copy-toast")
            }
        }
    }

    /// R04：复制反馈 toast（与 macOS 端 2.2s 时长一致）
    private func showToast(_ text: String) {
        withAnimation(.easeInOut(duration: 0.15)) { toast = text }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
            withAnimation(.easeInOut(duration: 0.2)) {
                if toast == text { toast = nil }
            }
        }
    }

    private var deviceInfoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("设备信息")
                    .font(.headline)

                Spacer()

                Button(action: copyDeviceInfo) {
                    Label("复制", systemImage: "doc.on.doc")
                        .scaledFont(12)
                }
                .buttonStyle(.borderless)
            }

            InfoRow(label: "设备 ID", value: device.id)
            InfoRow(label: "信号强度", value: "\(device.rssi) dBm (\(bleManager.getRssiText(rssi: device.rssi)))")
            InfoRow(label: "可连接", value: device.connectable ? "是" : "否")
        }
        .padding()
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
    }

    private var advertisementSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("广播数据")
                    .font(.headline)

                Spacer()

                Button(action: copyAdvData) {
                    Label("复制", systemImage: "doc.on.doc")
                        .scaledFont(12)
                }
                .buttonStyle(.borderless)
            }

            if !device.serviceUUIDs.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("服务 UUIDs")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    ForEach(device.serviceUUIDs, id: \.self) { uuid in
                        Text(uuid)
                            .scaledFont(12)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
            } else {
                missingFieldRow("服务 UUIDs")
            }

            if !device.serviceData.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Service Data")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    ForEach(device.serviceData.keys.sorted(), id: \.self) { uuid in
                        Text("\(uuid): \(hexText(device.serviceData[uuid] ?? Data()))")
                            .scaledFont(12)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.purple.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
            } else {
                missingFieldRow("Service Data")
            }

            if let manufacturerData = device.manufacturerData {
                VStack(alignment: .leading, spacing: 4) {
                    Text("厂商数据")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text(hexText(manufacturerData))
                        .font(.system(.caption, design: .monospaced))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                }
            } else {
                missingFieldRow("厂商数据")
            }

            // CoreBluetooth 仅提供结构化字段，无整包 hex（R04 缺失字段标注口径）
            missingFieldRow("原始广播整包 hex")
        }
        .padding()
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
    }

    /// R04：平台本轮未提供的字段标注行
    private func missingFieldRow(_ field: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(field)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text("本轮平台 API 未提供此字段")
                .scaledFont(11)
                .foregroundColor(NativeDS.muted)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.gray.opacity(0.08))
        .cornerRadius(8)
    }

    private func hexText(_ data: Data) -> String {
        data.map { String(format: "%02x", $0) }.joined(separator: " ").uppercased()
    }

    private func copyDeviceInfo() {
        let info = """
        设备 ID: \(device.id)
        名称: \(device.name)
        信号强度: \(device.rssi) dBm
        可连接: \(device.connectable ? "是" : "否")
        """
        copyToClipboard(info)
        showToast("已复制")
    }

    private func copyAdvData() {
        let miss = "本轮平台 API 未提供此字段"
        var content = "设备 ID: \(device.id)\n"
        content += "名称: \(device.name)\n"
        content += "信号强度: \(device.rssi) dBm\n\n"
        content += "服务 UUIDs:\n"
        if device.serviceUUIDs.isEmpty {
            content += "  \(miss)\n"
        } else {
            for uuid in device.serviceUUIDs {
                content += "  \(uuid)\n"
            }
        }
        content += "\nService Data:\n"
        if device.serviceData.isEmpty {
            content += "  \(miss)\n"
        } else {
            for uuid in device.serviceData.keys.sorted() {
                content += "  \(uuid): \(hexText(device.serviceData[uuid] ?? Data()))\n"
            }
        }
        content += "\n厂商数据:\n  "
        if let manufacturerData = device.manufacturerData {
            content += hexText(manufacturerData)
        } else {
            content += miss
        }
        content += "\n\n原始广播整包 hex: \(miss)"
        copyToClipboard(content)
        showToast("已复制")
    }

    private func copyToClipboard(_ string: String) {
        #if os(macOS)
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(string, forType: .string)
        #else
        UIPasteboard.general.string = string
        #endif
    }
}

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
        .font(.subheadline)
    }
}
