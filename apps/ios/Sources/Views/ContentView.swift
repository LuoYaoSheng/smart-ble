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

            AboutView()
                .tabItem {
                    Label("关于", systemImage: "info.circle")
                }
                .tag(3)
        }
        .tint(.blue)
        .onChange(of: bleManager.connectionStates) { _ in
            let hasConnected = !bleManager.connectedDeviceIds.isEmpty
            if hasConnected && selectedTab != 1 {
                selectedTab = 1
            }
        }
    }
}
