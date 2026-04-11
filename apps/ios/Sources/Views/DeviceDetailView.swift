//
// SmartBLE - Device Detail View
//

import SwiftUI

struct DeviceDetailView: View {
    @EnvironmentObject var bleManager: BLEManager
    let deviceId: String

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header

            // Content
            if bleManager.connectedDevices[deviceId] != nil {
                servicesContent
            } else {
                noDeviceContent
            }

            // T05: 统一的日志面板（对齐全平台组件）
            LogPanel(
                deviceId: deviceId,
                logs: bleManager.logsByDevice[deviceId] ?? []
            ) {
                bleManager.clearDeviceLogs(deviceId)
            }
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                if let device = bleManager.connectedDevices[deviceId] {
                    Text(device.name)
                        .font(.headline)

                    Text(connectionText)
                        .font(.caption)
                        .foregroundColor(connectionColor)
                } else {
                    Text("未连接设备")
                        .font(.headline)
                }
            }

            Spacer()

            if bleManager.connectedDevices[deviceId] != nil {
                Button(action: {
                    bleManager.disconnect(deviceId: deviceId)
                }) {
                    Text("断开")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.red)
                        .cornerRadius(16)
                }
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
    }

    private var connectionText: String {
        switch bleManager.connectionStates[deviceId] ?? .disconnected {
        case .connected:
            return "已连接"
        case .connecting:
            return "连接中..."
        case .disconnecting:
            return "断开中..."
        case .disconnected:
            return "未连接"
        }
    }

    private var connectionColor: Color {
        switch bleManager.connectionStates[deviceId] ?? .disconnected {
        case .connected:
            return .green
        case .connecting:
            return .orange
        case .disconnecting:
            return .orange
        case .disconnected:
            return .gray
        }
    }

    private var noDeviceContent: some View {
        VStack(spacing: 16) {
            Image(systemName: "antenna.radiowaves.left.and.right.slash")
                .font(.system(size: 50))
                .foregroundColor(.gray.opacity(0.5))

            Text("此设备已断开连接")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("请返回扫描页面重新连接")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var servicesContent: some View {
        ServicePanel(deviceId: deviceId)
    }
}

}

