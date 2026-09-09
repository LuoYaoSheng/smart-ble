//
// SmartBLE - Main App Entry Point
//

import SwiftUI

@main
struct SmartBLEApp: App {
    @StateObject private var bleManager = BLEManager()

    var body: some Scene {
        WindowGroup {
            rootView
                .environmentObject(bleManager)
                .onAppear {
                    bleManager.log("Smart BLE Started", type: .info)
                }
        }
    }

    @ViewBuilder
    private var rootView: some View {
        #if DEBUG
        if let scenario = NativePreviewScenario.fromArguments() {
            NativePreviewRoot(scenario: scenario)
        } else {
            ContentView()
        }
        #else
        ContentView()
        #endif
    }
}
