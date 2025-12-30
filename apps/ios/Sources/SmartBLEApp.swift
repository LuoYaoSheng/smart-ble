//
// SmartBLE - Main App Entry Point
//

import SwiftUI

@main
struct SmartBLEApp: App {
    @StateObject private var bleManager = BLEManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(bleManager)
                .onAppear {
                    bleManager.log("SmartBLE Started", type: .info)
                }
        }
    }
}
