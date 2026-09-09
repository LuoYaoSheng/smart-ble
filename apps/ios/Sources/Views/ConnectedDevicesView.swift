import SmartHidCore
import SwiftUI

private struct ConnectedDeviceRoute: Identifiable {
    let id: String
}

struct ConnectedDevicesView: View {
    @EnvironmentObject var bleManager: BLEManager
    var onGoScan: () -> Void = {}

    @State private var route: ConnectedDeviceRoute?

    var body: some View {
        VStack(spacing: 0) {
            NativeNavbar(kicker: "SESSIONS", title: "已连接") {
                Text("通用调试会话")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(NativeDS.sub)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 3)
                    .background(NativeDS.fill)
                    .clipShape(Capsule())
            }

            ScrollView(showsIndicators: false) {
                if devices.isEmpty {
                    NativeEmptyState(
                        illustration: "link",
                        title: "还没有连接中的设备",
                        description: "先在「扫描」页找到设备并连接，会话将保存在这里",
                        actionTitle: "去扫描",
                        action: onGoScan
                    )
                    .padding(.top, 56)
                } else {
                    VStack(spacing: 12) {
                        if devices.count > 1 {
                            summaryCard
                        }
                        ForEach(devices) { device in
                            DeviceCard(
                                device: device,
                                isConnectionTab: true,
                                onAction: { bleManager.disconnect(deviceId: device.id) }
                            )
                            .environmentObject(bleManager)
                            .contentShape(Rectangle())
                            .onTapGesture { route = ConnectedDeviceRoute(id: device.id) }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
            }
            .background(NativeDS.page)
        }
        .nativePageCover(item: $route) { selected in
            destination(deviceId: selected.id)
                .environmentObject(bleManager)
        }
    }

    private var summaryCard: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(devices.count)")
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundColor(NativeDS.primary)
                Text("台在线 · 全部为内存会话")
                    .font(.system(size: 11))
                    .foregroundColor(NativeDS.muted)
            }
            Spacer()
            Button(action: bleManager.disconnectAll) {
                Label("全部断开", systemImage: "xmark")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 13)
                    .frame(height: 32)
                    .background(NativeDS.danger)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
        }
        .nativeCard()
    }

    private var devices: [ScanResult] {
        bleManager.connectedDevices.values.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    @ViewBuilder
    private func destination(deviceId: String) -> some View {
        if let device = bleManager.connectedDevices[deviceId],
           SmartHidProfile.match(name: device.name, serviceUUIDs: device.serviceUUIDs) != nil {
            HidDeviceDetailView(deviceId: deviceId)
        } else {
            DeviceDetailView(deviceId: deviceId)
        }
    }
}
