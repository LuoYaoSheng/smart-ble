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

struct ScanView: View {
    @EnvironmentObject var bleManager: BLEManager
    @State private var selectedDevice: ScanResult?
    @State private var showingDeviceDetails = false
    @State private var showFilterPanel = false
    @State private var hasScanned = false
    @State private var provisioningDevice: ScanResult?
    @State private var hidDetailRoute: ScanDeviceIdRoute?
    @State private var hidDiagnosticsRoute: ScanDeviceIdRoute?

    var body: some View {
        VStack(spacing: 0) {
            navbar
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    scanToolbar
                    sectionHeader
                    if showFilterPanel {
                        FilterPanel()
                            .padding(.bottom, 12)
                    }
                    if bleManager.filteredScanResults.isEmpty {
                        emptyState
                    } else {
                        deviceList
                    }
                }
                .padding(.horizontal, 16)
            }
        }
        .background(NativeDS.page)
        .sheet(isPresented: $showingDeviceDetails) {
            if let device = selectedDevice {
                DeviceDetailSheet(device: device)
                    .environmentObject(bleManager)
            }
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
    }

    private var navbar: some View {
        NativeNavbar(kicker: "BLE TOOLKIT+", title: "扫描") {
            HStack(spacing: 6) {
                Circle()
                    .fill(bluetoothStatusColor)
                    .frame(width: 8, height: 8)
                Text(bluetoothStatusText)
                    .font(.system(size: 11, weight: .semibold))
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
                    .font(.system(size: 12))
                    .foregroundColor(NativeDS.muted)
            }
            Spacer()
            Button(action: toggleScan) {
                Label(bleManager.isScanning ? "停止扫描" : "开始扫描", systemImage: bleManager.isScanning ? "stop.fill" : "magnifyingglass")
                    .font(.system(size: 15, weight: .semibold))
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

    private var sectionHeader: some View {
        NativeSectionHeading(icon: "cpu", title: "附近设备") {
            HStack(spacing: 10) {
                if !bleManager.filteredScanResults.isEmpty {
                    Text("\(bleManager.filteredScanResults.count) 台")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(NativeDS.sub)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 3)
                        .background(NativeDS.fill)
                        .clipShape(Capsule())
                }
                Button(showFilterPanel ? "收起" : "筛选") {
                    withAnimation(.easeInOut(duration: 0.2)) { showFilterPanel.toggle() }
                }
                .buttonStyle(.plain)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(NativeDS.primary)
            }
        }
        .padding(.bottom, 4)
    }

    private var emptyState: some View {
        NativeEmptyState(
            illustration: "radar",
            title: hasScanned ? "没有匹配的设备" : "还没有扫描结果",
            description: hasScanned ? "调整筛选条件，或重新扫描附近 BLE 设备" : "点上方按钮开始扫描附近 BLE 设备",
            actionTitle: hasScanned ? nil : "开始扫描",
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
                        showingDeviceDetails = true
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
            bleManager.startScan()
        }
    }
}



// MARK: - Device Detail Sheet
struct DeviceDetailSheet: View {
    @EnvironmentObject var bleManager: BLEManager
    @Environment(\.dismiss) var dismiss
    let device: ScanResult

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

                    Spacer()
                }
                .padding()
            }
        }
        .frame(minWidth: 450, minHeight: 350)
    }

    private var deviceInfoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("设备信息")
                    .font(.headline)

                Spacer()

                Button(action: copyDeviceInfo) {
                    Label("复制", systemImage: "doc.on.doc")
                        .font(.caption)
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
                        .font(.caption)
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
                            .font(.caption)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
            }

            if let manufacturerData = device.manufacturerData {
                VStack(alignment: .leading, spacing: 4) {
                    Text("厂商数据")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Text(manufacturerData.map { String(format: "%02x", $0) }.joined(separator: " ").uppercased())
                        .font(.system(.caption, design: .monospaced))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                }
            }
        }
        .padding()
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
    }

    private func copyDeviceInfo() {
        let info = """
        设备 ID: \(device.id)
        名称: \(device.name)
        信号强度: \(device.rssi) dBm
        可连接: \(device.connectable ? "是" : "否")
        """
        copyToClipboard(info)
    }

    private func copyAdvData() {
        var content = "设备 ID: \(device.id)\n"
        content += "名称: \(device.name)\n"
        content += "信号强度: \(device.rssi) dBm\n\n"
        content += "服务 UUIDs:\n"
        if device.serviceUUIDs.isEmpty {
            content += "  无\n"
        } else {
            for uuid in device.serviceUUIDs {
                content += "  \(uuid)\n"
            }
        }
        if let manufacturerData = device.manufacturerData {
            content += "\n厂商数据:\n  "
            content += manufacturerData.map { String(format: "%02x", $0) }.joined(separator: " ").uppercased()
        }
        copyToClipboard(content)
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
