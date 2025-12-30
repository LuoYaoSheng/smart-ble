//
// SmartBLE - Scan View
//

import SwiftUI

struct ScanView: View {
    @EnvironmentObject var bleManager: BLEManager
    @State private var selectedDevice: ScanResult?
    @State private var showingDeviceDetails = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header

            // Device List
            if bleManager.scanResults.isEmpty {
                emptyState
            } else {
                deviceList
            }
        }
        .navigationTitle("蓝牙设备")
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(bleManager.bluetoothState.rawValue)
                    .font(.caption)
                    .foregroundColor(.secondary)

                if !bleManager.scanResults.isEmpty {
                    Text("发现 \(bleManager.scanResults.count) 台设备")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
            }

            Spacer()

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
                ForEach(bleManager.scanResults) { device in
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
                Text(device.name)
                    .font(.headline)

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
}

// MARK: - Device Detail Sheet
struct DeviceDetailSheet: View {
    @EnvironmentObject var bleManager: BLEManager
    @Environment(\.dismiss) var dismiss
    let device: ScanResult

    var body: some View {
        NavigationView {
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
            .navigationTitle(device.name)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("关闭") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .primaryAction) {
                    Button(bleManager.connectionState == .connected ? "已连接" : "连接") {
                        if bleManager.connectionState == .connected {
                            bleManager.disconnect()
                        } else {
                            bleManager.connect(to: device)
                        }
                    }
                    .disabled(bleManager.connectionState == .connecting || bleManager.connectionState == .disconnecting)
                }
            }
        }
    }

    private var deviceInfoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("设备信息")
                .font(.headline)

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
            Text("广播数据")
                .font(.headline)

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
