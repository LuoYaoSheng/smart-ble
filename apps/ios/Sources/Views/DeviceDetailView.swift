//
// SmartBLE - Device Detail View
//

import SwiftUI

struct DeviceDetailView: View {
    @EnvironmentObject var bleManager: BLEManager
    @ObservedObject var logger = Logger.shared
    @State private var showingOtaDialog = false
    
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
                logs: logger.logsByDevice[deviceId] ?? []
            ) {
                logger.clearForDevice(deviceId)
            }
        }
        .sheet(isPresented: $showingOtaDialog) {
            OtaUpgradeDialog(
                otaManager: OtaManager(deviceId: deviceId, bleManager: bleManager),
                isPresented: $showingOtaDialog
            )
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

            if let device = bleManager.connectedDevices[deviceId] {
                // OTA Button
                if hasOtaService {
                    Button(action: {
                        showingOtaDialog = true
                    }) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.title2)
                            .foregroundColor(.blue)
                    }
                    .padding(.trailing, 8)
                }
                
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
    
    private var hasOtaService: Bool {
        guard let device = bleManager.connectedDevices[deviceId] else { return false }
        // check if any service matches OTA uuid
        let otaUuid = "4FAFC201-1FB5-459E-8FCC-C5C9C331914D"
        return device.services.contains(where: { $0.uuid.uppercased() == otaUuid.uppercased() })
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

