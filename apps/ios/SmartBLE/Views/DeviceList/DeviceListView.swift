//
//  DeviceListView.swift
//  SmartBLE
//
//  设备列表视图
//

import SwiftUI

struct DeviceListView: View {
    @StateObject private var viewModel = DeviceListViewModel()
    @State private var selectedDevice: BleDevice?

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // 状态消息
                if let message = viewModel.stateMessage {
                    stateView(message: message)
                        .transition(.opacity)
                } else {
                    // 扫描控制
                    scanControlsView

                    if viewModel.devices.isEmpty {
                        emptyStateView
                    } else {
                        deviceListView
                    }
                }
            }
            .navigationTitle("Smart BLE")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    bluetoothStateIndicator
                }
            }
            .alert(item: $viewModel.errorMessage) { message in
                Alert(
                    title: Text("提示"),
                    message: Text(message),
                    dismissButton: .default(Text("确定"))
                )
            }
            .sheet(item: $selectedDevice) { device in
                DeviceDetailView(
                    bleManager: viewModel.getBleManager(),
                    deviceId: device.id,
                    deviceName: device.displayName
                )
            }
        }
    }

    // MARK: - State View

    @ViewBuilder
    private func stateView(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "bluetooth.slash")
                .font(.system(size: 64))
                .foregroundColor(.gray)

            Text("蓝牙未就绪")
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            if viewModel.bluetoothState == .off {
                Button("打开设置") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Bluetooth State Indicator

    private var bluetoothStateIndicator: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(stateColor)
                .frame(width: 8, height: 8)

            Text(stateText)
                .font(.caption)
        }
    }

    private var stateColor: Color {
        switch viewModel.bluetoothState {
        case .on:
            return .green
        case .off:
            return .gray
        case .unavailable, .unauthorized:
            return .red
        default:
            return .gray
        }
    }

    private var stateText: String {
        switch viewModel.bluetoothState {
        case .on:
            return "蓝牙已开启"
        case .off:
            return "蓝牙已关闭"
        case .unavailable:
            return "蓝牙不可用"
        case .unauthorized:
            return "未授权"
        case .resetting:
            return "重置中"
        case .unknown:
            return "状态未知"
        }
    }

    // MARK: - Scan Controls

    private var scanControlsView: some View {
        HStack(spacing: 12) {
            Button(action: {
                viewModel.toggleScan()
            }) {
                HStack {
                    Image(systemName: viewModel.isScanning ? "stop.fill" : "magnifyingglass")
                    Text(viewModel.isScanning ? "停止扫描" : "开始扫描")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(viewModel.isScanning ? Color.red : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
            }

            deviceCountBadge
        }
        .padding()
    }

    private var deviceCountBadge: some View {
        VStack(spacing: 4) {
            Text("\(viewModel.devices.count)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.blue)

            Text("台设备")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(width: 60)
        .padding(.vertical, 8)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(10)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: 64))
                .foregroundColor(.gray.opacity(0.5))

            Text("暂无设备")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("点击上方按钮开始扫描")
                .font(.subheadline)
                .foregroundColor(.secondary.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Device List

    private var deviceListView: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(viewModel.devices) { device in
                    DeviceCard(device: device) {
                        selectedDevice = device
                    }
                }
            }
            .padding()
        }
    }
}

// MARK: - Device Card

struct DeviceCard: View {
    let device: BleDevice
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 16) {
                // 设备图标
                ZStack {
                    LinearGradient(
                        gradient: Gradient(colors: [Color.blue.opacity(0.8), Color.blue]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .frame(width: 56, height: 56)
                    .cornerRadius(12)

                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .font(.system(size: 24))
                        .foregroundColor(.white)
                }

                // 设备信息
                VStack(alignment: .leading, spacing: 4) {
                    Text(device.displayName)
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text(device.id)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // RSSI 指示器
                VStack(alignment: .trailing, spacing: 4) {
                    Image(systemName: rssiIconName)
                        .foregroundColor(rssiColor)

                    Text("\(device.rssi) dBm")
                        .font(.caption2)
                        .foregroundColor(rssiColor)
                        .fontWeight(.medium)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private var rssiIconName: String {
        switch device.rssiLevel {
        case .excellent:
            return "wifi.excellent"
        case .good:
            return "wifi.high"
        case .fair:
            return "wifi.medium"
        case .weak:
            return "wifi.low"
        }
    }

    private var rssiColor: Color {
        switch device.rssiLevel {
        case .excellent:
            return .green
        case .good:
            return .green
        case .fair:
            return .orange
        case .weak:
            return .red
        }
    }
}

// MARK: - Preview

struct DeviceListView_Previews: PreviewProvider {
    static var previews: some View {
        DeviceListView()
    }
}
