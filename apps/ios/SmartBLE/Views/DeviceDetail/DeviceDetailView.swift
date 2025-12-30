//
//  DeviceDetailView.swift
//  SmartBLE
//
//  设备详情视图
//

import SwiftUI

struct DeviceDetailView: View {
    @ObservedObject var bleManager: BleManager
    let deviceId: String
    let deviceName: String

    @StateObject private var viewModel: DeviceDetailViewModel
    @Environment(\.dismiss) private var dismiss

    init(bleManager: BleManager, deviceId: String, deviceName: String) {
        self.bleManager = bleManager
        self.deviceId = deviceId
        self.deviceName = deviceName
        _viewModel = StateObject(wrappedValue: DeviceDetailViewModel(
            bleManager: bleManager,
            deviceId: deviceId,
            deviceName: deviceName
        ))
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                if viewModel.isLoading {
                    loadingView
                } else if viewModel.services.isEmpty {
                    emptyServicesView
                } else {
                    servicesListView
                }

                // 日志面板
                if !viewModel.logs.isEmpty {
                    logPanel
                }
            }
            .navigationTitle(deviceName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("返回") {
                        viewModel.disconnect()
                        dismiss()
                    }
                    .disabled(viewModel.connectionState == .connecting)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    connectionStatusBadge
                }
            }
            .alert(item: $viewModel.errorMessage) { message in
                Alert(
                    title: Text("提示"),
                    message: Text(message),
                    dismissButton: .default(Text("确定"))
                )
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)

            Text("正在发现服务...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty Services View

    private var emptyServicesView: some View {
        VStack(spacing: 16) {
            Image(systemName: "gearshape.2")
                .font(.system(size: 48))
                .foregroundColor(.gray)

            Text("未发现服务")
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Connection Status Badge

    private var connectionStatusBadge: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            Text(statusText)
                .font(.caption)
                .foregroundColor(statusColor)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(statusColor.opacity(0.1))
        .cornerRadius(20)
    }

    private var statusColor: Color {
        switch viewModel.connectionState {
        case .connected:
            return .green
        case .connecting:
            return .orange
        case .disconnected:
            return .red
        case .disconnecting:
            return .orange
        }
    }

    private var statusText: String {
        switch viewModel.connectionState {
        case .connected:
            return "已连接"
        case .connecting:
            return "连接中"
        case .disconnected:
            return "未连接"
        case .disconnecting:
            return "断开中"
        }
    }

    // MARK: - Services List

    private var servicesListView: some View {
        ScrollView {
            LazyVStack(spacing: 12, pinnedViews: [.sectionHeaders]) {
                // 操作按钮
                if viewModel.isConnected {
                    actionButtons
                        .padding()
                }

                // 服务列表
                ForEach(viewModel.services) { service in
                    ServiceCard(
                        service: service,
                        onRead: { char in
                            viewModel.readCharacteristic(
                                serviceUuid: service.uuid,
                                characteristicUuid: char.uuid
                            )
                        },
                        onWrite: { char in
                            // TODO: Show write dialog
                        },
                        onToggleNotify: { char in
                            viewModel.toggleNotification(
                                serviceUuid: service.uuid,
                                characteristicUuid: char.uuid
                            )
                        }
                    )
                }
            }
            .padding()
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 12) {
            Button(action: {
                viewModel.clearLogs()
            }) {
                HStack {
                    Image(systemName: "trash")
                    Text("清空日志")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.gray.opacity(0.2))
                .foregroundColor(.primary)
                .cornerRadius(10)
            }

            Button(action: {
                viewModel.disconnect()
                dismiss()
            }) {
                HStack {
                    Image(systemName: "bluetooth.slash")
                    Text("断开连接")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.red)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
        }
    }

    // MARK: - Log Panel

    private var logPanel: some View {
        VStack(spacing: 0) {
            // 日志标题栏
            HStack {
                Image(systemName: "doc.text")
                    .foregroundColor(.secondary)

                Text("操作日志")
                    .font(.headline)

                Spacer()

                Text("\(viewModel.logs.count) 条")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemGroupedBackground))

            Divider()

            // 日志列表
            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(viewModel.logs.reversed()) { log in
                        LogItemView(log: log)
                    }
                }
                .padding()
            }
            .frame(height: 150)
        }
        .background(Color(.systemBackground))
        .overlay(
            Rectangle()
                .fill(Color.gray.opacity(0.3))
                .frame(height: 1),
            alignment: .top
        )
    }
}

// MARK: - Service Card

struct ServiceCard: View {
    let service: BleService
    let onRead: (BleCharacteristic) -> Void
    let onWrite: (BleCharacteristic) -> Void
    let onToggleNotify: (BleCharacteristic) -> Void

    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 0) {
            // 服务头部
            Button(action: {
                withAnimation(.spring()) {
                    isExpanded.toggle()
                }
            }) {
                HStack(spacing: 16) {
                    // 服务图标
                    ZStack {
                        Color.blue.opacity(0.1)
                            .frame(width: 44, height: 44)
                            .cornerRadius(10)

                        Image(systemName: "antenna.radiowaves.left.and.right")
                            .foregroundColor(.blue)
                    }

                    // 服务信息
                    VStack(alignment: .leading, spacing: 4) {
                        Text(service.displayName)
                            .font(.headline)
                            .foregroundColor(.primary)

                        Text(service.shortUuid)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .font(.system(.monospaced, design: .rounded))
                    }

                    Spacer()

                    // 特征值数量徽章
                Text("\(service.characteristics.count) 特征值")
                    .font(.caption)
                    .foregroundColor(.blue)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)

                    // 展开指示器
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(.secondary)
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                }
                .padding()
                .background(Color(.systemBackground))
            }
            .buttonStyle(PlainButtonStyle())

            // 特征值列表
            if isExpanded {
                Divider()
                    .padding(.leading, 76)

                if service.characteristics.isEmpty {
                    Text("无特征值")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(service.characteristics.enumerated()), id: \.element.id) { index, characteristic in
                            CharacteristicRow(
                                characteristic: characteristic,
                                onRead: { onRead(characteristic) },
                                onWrite: { onWrite(characteristic) },
                                onToggleNotify: { onToggleNotify(characteristic) }
                            )

                            if index < service.characteristics.count - 1 {
                                Divider()
                                    .padding(.leading, 76)
                            }
                        }
                    }
                }
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

// MARK: - Characteristic Row

struct CharacteristicRow: View {
    let characteristic: BleCharacteristic
    let onRead: () -> Void
    let onWrite: () -> Void
    let onToggleNotify: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            // 特征值图标
            ZStack {
                (characteristic.isNotifying ? Color.green.opacity(0.1) : Color.gray.opacity(0.1))
                    .frame(width: 36, height: 36)
                    .cornerRadius(8)

                Image(systemName: iconName)
                    .foregroundColor(iconColor)
                    .font(.system(size: 14))
            }

            // 特征值信息
            VStack(alignment: .leading, spacing: 4) {
                Text(characteristic.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(characteristic.shortUuid)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .font(.system(.monospaced, design: .rounded))

                // 属性标签
                propertyChips
            }

            Spacer()

            // 操作按钮
            HStack(spacing: 8) {
                if characteristic.canRead {
                    actionButton(icon: "arrow.down.doc", color: .blue, action: onRead)
                }

                if characteristic.canWrite {
                    actionButton(icon: "arrow.up.doc", color: .orange, action: onWrite)
                }

                if characteristic.canNotify {
                    actionButton(
                        icon: characteristic.isNotifying ? "bell.fill" : "bell",
                        color: characteristic.isNotifying ? .green : .gray,
                        action: onToggleNotify
                    )
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
        .background(Color(.systemGroupedBackground))
    }

    private var iconName: String {
        if characteristic.isNotifying { return "bell.fill" }
        if characteristic.canNotify { return "bell" }
        if characteristic.canRead { return "doc.text" }
        if characteristic.canWrite { return "pencil" }
        return "gear"
    }

    private var iconColor: Color {
        if characteristic.isNotifying { return .green }
        if characteristic.canNotify { return .blue }
        if characteristic.canRead { return .blue }
        if characteristic.canWrite { return .orange }
        return .gray
    }

    @ViewBuilder
    private var propertyChips: some View {
        HStack(spacing: 4) {
            if characteristic.canRead {
                PropertyChip(label: "Read", color: .blue)
            }
            if characteristic.canWrite {
                PropertyChip(label: "Write", color: .orange)
            }
            if characteristic.canNotify {
                PropertyChip(
                    label: characteristic.isNotifying ? "Notifying" : "Notify",
                    color: characteristic.isNotifying ? .green : .gray
                )
            }
        }
    }

    private func actionButton(icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(color)
                .frame(width: 32, height: 32)
                .background(color.opacity(0.1))
                .cornerRadius(8)
        }
    }
}

// MARK: - Property Chip

struct PropertyChip: View {
    let label: String
    let color: Color

    var body: some View {
        Text(label)
            .font(.caption2)
            .foregroundColor(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.15))
            .cornerRadius(4)
    }
}

// MARK: - Log Item View

struct LogItemView: View {
    let log: LogEntry

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: iconName)
                .font(.system(size: 12))
                .foregroundColor(iconColor)
                .frame(width: 16)

            VStack(alignment: .leading, spacing: 2) {
                Text(log.message)
                    .font(.caption)
                    .foregroundColor(iconColor)

                Text(log.timestamp)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var iconColor: Color {
        switch log.type {
        case .info:
            return .blue
        case .success:
            return .green
        case .error:
            return .red
        case .receive:
            return .purple
        }
    }

    private var iconName: String {
        switch log.type {
        case .info:
            return "info.circle"
        case .success:
            return "checkmark.circle"
        case .error:
            return "xmark.circle"
        case .receive:
            return "arrow.down.circle"
        }
    }
}

// MARK: - Preview

struct DeviceDetailView_Previews: PreviewProvider {
    static var previews: some View {
        DeviceDetailView(
            bleManager: BleManager(),
            deviceId: "123",
            deviceName: "Test Device"
        )
    }
}
