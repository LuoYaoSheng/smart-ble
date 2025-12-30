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

            DeviceDetailView()
                .tabItem {
                    Label("设备", systemImage: "cpu")
                }
                .tag(1)

            BroadcastView()
                .tabItem {
                    Label("广播", systemImage: "dot.radiowaves.up.forward")
                }
                .tag(2)

            LogView()
                .tabItem {
                    Label("日志", systemImage: "doc.text")
                }
                .tag(3)
        }
        .tint(.blue)
    }
}
