//
// SmartBLE Desktop for macOS - Main Entry Point
//

import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    var mainWindowController: MainWindowController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Create main window
        mainWindowController = MainWindowController()
        mainWindowController?.showWindow(nil)

        // Make app active
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        // Clean up BLE
        mainWindowController?.bleManager?.disconnect()
        mainWindowController?.bleManager?.stopScan()
        return .terminateNow
    }
}

