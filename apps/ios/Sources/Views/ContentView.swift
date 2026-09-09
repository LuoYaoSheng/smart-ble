//
// SmartBLE - Main Content View
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var bleManager: BLEManager
    @State private var selectedTab: NativeTab
    private let scanPreviewScenario: ScanPreviewScenario?
    private let connectedCountOverride: Int?

    init(
        initialTab: NativeTab = .scan,
        scanPreviewScenario: ScanPreviewScenario? = nil,
        connectedCountOverride: Int? = nil
    ) {
        _selectedTab = State(initialValue: initialTab)
        self.scanPreviewScenario = scanPreviewScenario
        self.connectedCountOverride = connectedCountOverride
    }

    var body: some View {
        VStack(spacing: 0) {
            Group {
                switch selectedTab {
                case .scan:
                    ScanView(previewScenario: scanPreviewScenario)
                case .connected:
                    ConnectedDevicesView(onGoScan: { selectedTab = .scan })
                case .broadcast:
                    BroadcastView()
                case .about:
                    AboutView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            NativeTabBar(
                selection: $selectedTab,
                connectedCount: connectedCountOverride
                    ?? (scanPreviewScenario == nil ? bleManager.connectedDeviceIds.count : 3)
            )
        }
        .background(NativeDS.page.ignoresSafeArea())
    }
}
