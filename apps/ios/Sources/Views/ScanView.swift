//
// SmartBLE - Scan View
//

import SwiftUI
import AppKit

struct ScanView: View {
    @EnvironmentObject var bleManager: BLEManager
    @State private var selectedDevice: ScanResult?
    @State private var showingDeviceDetails = false
    @State private var showFilterPanel = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header

            // Filter Panel (collapsible)
            if showFilterPanel {
                filterPanel
            }

            // Device List
            if bleManager.filteredScanResults.isEmpty {
                emptyState
            } else {
                deviceList
            }
        }
        .navigationTitle("蓝牙设备")
        .sheet(isPresented: $showingDeviceDetails) {
            if let device = selectedDevice {
                DeviceDetailSheet(device: device)
                    .environmentObject(bleManager)
            }
        }
        .onChange(of: bleManager.filterRSSI) { _ in bleManager.applyFilters() }
        .onChange(of: bleManager.filterNamePrefix) { _ in bleManager.applyFilters() }
        .onChange(of: bleManager.hideNoNameDevices) { _ in bleManager.applyFilters() }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(bleManager.bluetoothState.rawValue)
                    .font(.caption)
                    .foregroundColor(.secondary)

                if !bleManager.filteredScanResults.isEmpty {
                    Text("发现 \(bleManager.filteredScanResults.count) 台设备")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }

            Spacer()

            // Filter toggle button
            Button(action: {
                withAnimation(.easeInOut(duration: 0.2)) {
                    showFilterPanel.toggle()
                }
            }) {
                Image(systemName: showFilterPanel ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                    .font(.title3)
                    .foregroundColor(showFilterPanel ? .blue : .secondary)
            }
            .buttonStyle(.plain)
            .help("过滤设置")

            Button(action: {
                if bleManager.isScanning {
                    bleManager.stopScan()
                } else {
                    bleManager.startScan()
                }
            }) {
                HStack(spacing: 6) {
                    Image(systemName: bleManager.isScanning ? "stop.circle.fill" : "play.circle.fill")
                        .font(.title3)
                    Text(bleManager.isScanning ? "停止" : "扫描")
                        .fontWeight(.medium)
                }
                .foregroundColor(.white)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                .background(bleManager.isScanning ? Color.orange : Color.blue)
                .cornerRadius(20)
            }
            .disabled(bleManager.bluetoothState != .poweredOn)
        }
        .padding()
        .background(Color.gray.opacity(0.1))
    }

    private var filterPanel: some View {
        VStack(spacing: 12) {
            // Filter header with reset button
            HStack {
                Text("过滤条件")
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Spacer()

                Button(action: resetFilters) {
                    Text("重置")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(6)
                }
                .buttonStyle(.plain)
            }

            // RSSI Filter - aligned with UniApp (-100 to -30)
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("信号强度: \(bleManager.filterRSSI) dBm")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }

                HStack {
                    Text("-100")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Slider(value: Binding(
                        get: { Double(bleManager.filterRSSI) },
                        set: { bleManager.filterRSSI = Int($0) }
                    ), in: -100 ... -30, step: 5)
                    Text("-30")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                // Preset buttons - aligned with UniApp
                HStack(spacing: 8) {
                    ForEach([-100, -90, -70, -50], id: \.self) { value in
                        Button(action: { bleManager.filterRSSI = value }) {
                            Text(value == -100 ? "全部" : "\(value)")
                                .font(.caption2)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(bleManager.filterRSSI == value ? Color.blue : Color.gray.opacity(0.2))
                                .foregroundColor(bleManager.filterRSSI == value ? .white : .primary)
                                .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            // Name prefix filter
            HStack(spacing: 12) {
                Text("名称前缀:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                TextField("输入前缀", text: $bleManager.filterNamePrefix)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 120)
                    .font(.caption)

                Spacer()

                // Hide no name toggle
                HStack(spacing: 8) {
                    Text("隐藏无名设备")
                        .font(.caption)
                    Toggle("", isOn: $bleManager.hideNoNameDevices)
                        .toggleStyle(.switch)
                }
            }
        }
        .padding()
        .background(Color.blue.opacity(0.08))
        .transition(.opacity.combined(with: .move(edge: .top)))
    }

    private func resetFilters() {
        bleManager.filterRSSI = -100
        bleManager.filterNamePrefix = ""
        bleManager.hideNoNameDevices = false
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: 60))
                .foregroundColor(.blue.opacity(0.5))

            Text("暂无设备")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("点击上方按钮开始扫描")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var deviceList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(bleManager.filteredScanResults) { device in
                    DeviceCard(device: device)
                        .environmentObject(bleManager)
                        .onTapGesture {
                            selectedDevice = device
                            showingDeviceDetails = true
                        }
                }
            }
            .padding()
        }
    }
}

// MARK: - Device Card
struct DeviceCard: View {
    @EnvironmentObject var bleManager: BLEManager
    let device: ScanResult

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: 50, height: 50)

                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.title3)
                    .foregroundColor(.blue)
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(device.name)
                        .font(.headline)

                    // Device type label
                    deviceTypeLabel
                }

                Text(device.id.prefix(8) + "...")
                    .font(.caption)
                    .foregroundColor(.secondary)

                if !device.serviceUUIDs.isEmpty {
                    Text(device.serviceUUIDs.prefix(3).joined(separator: ", "))
                        .font(.caption2)
                        .foregroundColor(.blue)
                }
            }

            Spacer()

            // RSSI
            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: 2) {
                    ForEach(0..<4) { i in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(i < bleManager.getSignalBars(rssi: device.rssi) ? Color.green : Color.gray.opacity(0.3))
                            .frame(width: 4, height: CGFloat(4 + i * 3))
                    }
                }

                Text("\(device.rssi) dBm")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
    }

    private var deviceTypeLabel: some View {
        Group {
            if device.name.lowercased().contains("ble") {
                Text("BLE")
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.8))
                    .foregroundColor(.white)
                    .cornerRadius(4)
            } else if device.name.lowercased().contains("bluetooth") {
                Text("BT")
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.8))
                    .foregroundColor(.white)
                    .cornerRadius(4)
            }
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
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(string, forType: .string)
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
