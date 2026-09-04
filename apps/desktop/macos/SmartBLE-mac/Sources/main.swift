//
// SmartBLE Desktop for macOS - Main Entry Point
//

import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    var mainWindowController: MainWindowController?
    private static var retainedDelegate: AppDelegate?

    static func main() {
        // Unbuffered stdout so BLE logs reach piped verification harnesses immediately
        setbuf(stdout, nil)
        print("[APP] static main entered")
        let app = NSApplication.shared
        let delegate = AppDelegate()
        AppDelegate.retainedDelegate = delegate
        app.delegate = delegate
        // SPM executables launch with a prohibited/accessory policy; promote to a
        // regular app so the window shows and TCC can attribute Bluetooth prompts
        app.setActivationPolicy(.regular)
        app.run()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        print("[APP] applicationDidFinishLaunching")

        // Create main window
        mainWindowController = MainWindowController()
        mainWindowController?.showWindow(nil)

        // Make app active
        NSApp.activate(ignoringOtherApps: true)

        // 页面级自动化冒烟（仅 --smoke-pages 启动时生效）
        PageSmoke.runIfRequested()

        // 扫描压力稳定性（仅 --soak-scans=N 启动时生效）
        SoakRunner.runIfRequested()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        // Clean up BLE
        mainWindowController?.ble.disconnect()
        mainWindowController?.ble.stopScan()
        return .terminateNow
    }
}

