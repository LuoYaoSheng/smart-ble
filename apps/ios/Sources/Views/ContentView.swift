//
// SmartBLE - Main Content View
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var bleManager: BLEManager
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            ScanView()
                .tabItem {
                    Label("扫描", systemImage: "antenna.radiowaves.left.and.right")
                }
                .tag(0)

            ConnectedDevicesView()
                .tabItem {
                    Label("已连接", systemImage: "link")
                }
                .tag(1)

            BroadcastView()
                .tabItem {
                    Label("广播", systemImage: "dot.radiowaves.up.forward")
                }
                .tag(2)

            // T05: 日志已移至 DeviceDetailView 内联，此处去掉独立日志 Tab
            AboutView()
                .tabItem {
                    Label("关于", systemImage: "info.circle")
                }
                .tag(3)
        }
        .tint(.blue)
        .onChange(of: bleManager.connectionStates) { _ in
            // Auto-switch to connected devices tab when at least one device is connected
            let hasConnected = !bleManager.connectedDeviceIds.isEmpty
            if hasConnected && selectedTab != 1 {
                selectedTab = 1
            }
        }
    }
}

// MARK: - About View
struct AboutView: View {
    var body: some View {
        VStack(spacing: 20) {
            Text("BLE Toolkit+")
                .font(.largeTitle)
                .fontWeight(.bold)

            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.system(size: 60))
                .foregroundColor(.blue)

            VStack(spacing: 8) {
                Text("原生 macOS/iOS BLE 调试工具")
                    .font(.headline)

                Text("版本 1.0.0")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                VStack(spacing: 4) {
                    Text("Framework: SwiftUI")
                    Text("Language: Swift")
                }
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.blue)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
                .padding(.top, 4)
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("功能特性:")
                    .font(.headline)

                FeatureRow(icon: "magnifyingglass", text: "BLE 设备扫描与过滤")
                FeatureRow(icon: "link", text: "设备连接与断开")
                FeatureRow(icon: "list.bullet", text: "服务和特征值查看")
                FeatureRow(icon: "arrow.up.arrow.down", text: "数据读写操作")
                FeatureRow(icon: "bell", text: "特征值通知监听")
                FeatureRow(icon: "dot.radiowaves.up.forward", text: "BLE 外设广播模式")
                FeatureRow(icon: "doc.text", text: "操作日志记录")
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(12)

            Spacer()

            Text("© 2025 BLE Toolkit+")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct FeatureRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 20)

            Text(text)
                .font(.subheadline)

            Spacer()
        }
    }
}
