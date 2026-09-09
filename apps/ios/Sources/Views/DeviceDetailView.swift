import SwiftUI

struct DeviceDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var bleManager: BLEManager
    @ObservedObject var logger = Logger.shared
    @State private var showingOtaDialog = false

    let deviceId: String

    var body: some View {
        VStack(spacing: 0) {
            subnavigation

            ScrollView(showsIndicators: false) {
                VStack(spacing: 12) {
                    deviceHeader

                    if isConnected, hasOtaService {
                        htmlNote
                    }

                    if isConnected {
                        NativeSectionHeading(icon: "doc.text", title: "服务与特征") {
                            Text(serviceSummary)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(NativeDS.sub)
                                .padding(.horizontal, 9).padding(.vertical, 3)
                                .background(NativeDS.fill).clipShape(Capsule())
                        }
                        ServicePanel(deviceId: deviceId)
                    } else {
                        NativeEmptyState(
                            illustration: "box",
                            title: device == nil ? "路由参数无效" : "未初始化",
                            description: device == nil ? "缺少有效的设备标识，请从扫描页或已连接页进入。" : "点击「连接设备」建立 GATT 会话。"
                        )
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 12)
            }
            .background(NativeDS.page)

            LogPanel(
                deviceId: deviceId,
                logs: logger.logsByDevice[deviceId] ?? [],
                onClear: { logger.clearForDevice(deviceId) }
            )
        }
        .nativeNavigationBarHidden()
        .sheet(isPresented: $showingOtaDialog) {
            OtaUpgradeDialog(
                otaManager: OtaManager(deviceId: deviceId, bleManager: bleManager),
                isPresented: $showingOtaDialog
            )
        }
    }

    private var subnavigation: some View {
        HStack(spacing: 10) {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .frame(width: 30, height: 30)
                    .background(NativeDS.fill)
                    .clipShape(RoundedRectangle(cornerRadius: 9))
            }
            .buttonStyle(.plain)

            Text("GATT 调试")
                .font(.system(size: 17, weight: .bold))
            Spacer()

            if isConnected, hasOtaService {
                Button(action: { showingOtaDialog = true }) {
                    Label("固件更新", systemImage: "arrow.down.circle")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(NativeDS.danger)
                        .padding(.horizontal, 10)
                        .frame(height: 32)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(NativeDS.danger))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .background(Color.white)
        .overlay(alignment: .bottom) { Rectangle().fill(NativeDS.lineSoft).frame(height: 1) }
    }

    private var deviceHeader: some View {
        VStack(spacing: 12) {
            HStack(spacing: 11) {
                Circle()
                    .fill(connectionColor)
                    .frame(width: 10, height: 10)
                VStack(alignment: .leading, spacing: 2) {
                    Text(device?.name ?? "未命名设备")
                        .font(.system(size: 17, weight: .bold))
                    Text("\(deviceId) · \(connectionText)")
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(NativeDS.muted)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
                Spacer()
            }

            Button(action: toggleConnection) {
                Label(isConnected ? "断开连接" : connectionState == .connecting ? "连接中…" : "连接设备",
                      systemImage: isConnected ? "xmark" : "link")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 40)
                    .background(isConnected ? NativeDS.danger : NativeDS.primary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
            .disabled(connectionState == .connecting || connectionState == .disconnecting)
        }
        .nativeCard()
    }

    private var htmlNote: some View {
        HStack(alignment: .top, spacing: 9) {
            Image(systemName: "exclamationmark.triangle")
            Text("OTA 端到端链路 BLOCKED（固件侧暂未开放）：正式使用前需固件配合。")
                .font(.system(size: 12))
        }
        .foregroundColor(Color(red: 138 / 255, green: 84 / 255, blue: 16 / 255))
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(NativeDS.warningWeak)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var device: ScanResult? {
        bleManager.connectedDevices[deviceId] ?? bleManager.scanResults.first(where: { $0.id == deviceId })
    }

    private var connectionState: ConnectionState {
        bleManager.connectionStates[deviceId] ?? .disconnected
    }

    private var isConnected: Bool { connectionState == .connected }

    private var hasOtaService: Bool {
        bleManager.servicesByDevice[deviceId]?.contains { $0.uuid.uppercased().hasPrefix("4FAFC201") } == true
    }

    private var serviceSummary: String {
        let services = bleManager.servicesByDevice[deviceId] ?? []
        return "\(services.count) 服务 / \(services.reduce(0) { $0 + $1.characteristics.count }) 特征"
    }

    private var connectionText: String {
        switch connectionState {
        case .connected: return "已连接"
        case .connecting: return "连接中"
        case .disconnecting: return "断开中"
        case .disconnected: return "未连接"
        }
    }

    private var connectionColor: Color {
        switch connectionState {
        case .connected: return NativeDS.success
        case .connecting, .disconnecting: return NativeDS.warning
        case .disconnected: return NativeDS.placeholder
        }
    }

    private func toggleConnection() {
        if isConnected {
            bleManager.disconnect(deviceId: deviceId)
        } else if let device {
            bleManager.connect(to: device)
        }
    }
}
