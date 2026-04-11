//
// SmartBLE - Connected Devices View
//

import SwiftUI

struct ConnectedDevicesView: View {
    @EnvironmentObject var bleManager: BLEManager

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                if bleManager.connectedDevices.isEmpty {
                    noDeviceContent
                } else {
                    deviceList
                }
            }
            .navigationTitle("已连接设备")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if !bleManager.connectedDevices.isEmpty {
                        Button("全部断开") {
                            bleManager.disconnectAll()
                        }
                        .foregroundColor(.red)
                    }
                }
            }
        }
    }

    private var noDeviceContent: some View {
        VStack(spacing: 16) {
            Image(systemName: "link.badge.plus")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text("暂无连接设备")
                .font(.headline)
                .foregroundColor(.secondary)
            
            Text("请到扫描页面连接您的蓝牙设备")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(NSColor.windowBackgroundColor))
    }

    private var deviceList: some View {
        List {
            ForEach(Array(bleManager.connectedDevices.values), id: \.id) { device in
                NavigationLink(destination: DeviceDetailView(deviceId: device.id)) {
                    DeviceCard(
                        device: device,
                        isConnectionTab: true,
                        onAction: {
                            bleManager.disconnect(deviceId: device.id)
                        }
                    )
                }
            }
        }
        .listStyle(PlainListStyle())
    }
}
