//
// SmartBLE Desktop for macOS - Main Window Controller
//

import Cocoa
import Combine

class MainWindowController: NSWindowController, NSWindowDelegate {
    // MARK: - Properties
    var bleManager: BLEManager?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - UI Components
    private var splitViewController: NSSplitViewController!
    private var scanViewController: ScanViewController!
    private var detailViewController: DeviceDetailViewController!
    private var logViewController: LogViewController!
    private var rightSplitController: NSSplitViewController!
    private var logSplitItem: NSSplitViewItem!

    // MARK: - Initialization
    override init(window: NSWindow?) {
        super.init(window: window)
        setupWindow()
        setupContent()
        setupBLE()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupWindow()
        setupContent()
        setupBLE()
    }

    // MARK: - Setup
    private func setupWindow() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 900, height: 600),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "BLE Toolkit+"
        window.center()
        window.minSize = NSSize(width: 700, height: 500)
        window.delegate = self

        // Set toolbar
        let toolbar = NSToolbar(identifier: "com.smartble.toolbar")
        toolbar.delegate = self
        toolbar.displayMode = .iconOnly
        window.toolbar = toolbar

        self.window = window
    }

    private func setupContent() {
        // Create split view
        splitViewController = NSSplitViewController()

        // Create scan view (left/top)
        scanViewController = ScanViewController()
        scanViewController.delegate = self
        let scanItem = NSSplitViewItem(viewController: scanViewController)
        scanItem.minimumThickness = 300

        // Create detail view (right/bottom)
        // Create log view
        logViewController = LogViewController()

        // Create right split view (vertical stack)
        rightSplitController = NSSplitViewController()
        rightSplitController.splitView.isVertical = false // Stack vertically

        // Create detail view (right/bottom)
        detailViewController = DeviceDetailViewController()
        let detailItem = NSSplitViewItem(viewController: detailViewController)
        
        logSplitItem = NSSplitViewItem(viewController: logViewController)
        logSplitItem.canCollapse = true
        logSplitItem.isCollapsed = false // Open by default or false? Let's leave it open by default to match other platforms!
        
        rightSplitController.addSplitViewItem(detailItem)
        rightSplitController.addSplitViewItem(logSplitItem)

        // Add items to main split
        let rightItem = NSSplitViewItem(viewController: rightSplitController)
        splitViewController.addSplitViewItem(scanItem)
        splitViewController.addSplitViewItem(rightItem)

        // Set as content
        window?.contentViewController = splitViewController
    }

    private func setupBLE() {
        let manager = BLEManager()
        self.bleManager = manager

        // Publish to detail view
        detailViewController.bleManager = manager
        logViewController.bleManager = manager

        // Observe connection changes
        manager.$connectionState
            .sink { [weak self] state in
                self?.updateConnectionState(state)
            }
            .store(in: &cancellables)
    }

    // MARK: - Connection State
    private func updateConnectionState(_ state: ConnectionState) {
        switch state {
        case .connected:
            detailViewController.showDevice(bleManager?.connectedDevice)
        case .disconnected:
            detailViewController.showNoDevice()
        default:
            break
        }
    }

    // MARK: - NSWindowDelegate
    func windowWillClose(_ notification: Notification) {
        bleManager?.disconnect()
        bleManager?.stopScan()
    }

    func windowDidResize(_ notification: Notification) {
        // Handle resize
    }

    // Show/Toggle log panel inline
    func showLogPanel() {
        if let logItem = logSplitItem {
            NSAnimationContext.runAnimationGroup({ context in
                context.duration = 0.25
                context.allowsImplicitAnimation = true
                logItem.isCollapsed.toggle()
            }, completionHandler: nil)
        }
    }
}

// MARK: - Scan View Delegate
extension MainWindowController: ScanViewDelegate {
    func scanViewController(_ controller: ScanViewController, didSelectDevice device: BLEDevice) {
        bleManager?.connect(device: device)
    }
}

// MARK: - Toolbar Delegate
extension MainWindowController: NSToolbarDelegate {
    func toolbar(_ toolbar: NSToolbar, itemForItemIdentifier itemIdentifier: NSToolbarItem.Identifier,
                willBeInsertedIntoToolbar flag: Bool) -> NSToolbarItem? {
        switch itemIdentifier {
        case .scanToggle:
            let item = NSToolbarItem(itemIdentifier: .scanToggle)
            item.label = "Scan"
            item.paletteLabel = "Toggle Scan"
            item.image = NSImage(systemSymbolName: "antenna.radiowaves.left.and.right", accessibilityDescription: nil)
            item.action = #selector(toggleScan)
            item.target = self
            return item

        case .disconnect:
            let item = NSToolbarItem(itemIdentifier: .disconnect)
            item.label = "Disconnect"
            item.paletteLabel = "Disconnect"
            item.image = NSImage(systemSymbolName: "xmark.circle", accessibilityDescription: nil)
            item.action = #selector(disconnectDevice)
            item.target = self
            return item

        case .logs:
            let item = NSToolbarItem(itemIdentifier: .logs)
            item.label = "Logs"
            item.paletteLabel = "Show Logs"
            item.image = NSImage(systemSymbolName: "doc.text", accessibilityDescription: nil)
            item.action = #selector(showLogs)
            item.target = self
            return item

        default:
            return nil
        }
    }

    func toolbarAllowedItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        return [.scanToggle, .disconnect, .logs, .flexibleSpace]
    }

    func toolbarDefaultItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        return [.scanToggle, .flexibleSpace, .disconnect, .logs]
    }

    @objc private func toggleScan() {
        if bleManager?.isScanning == true {
            bleManager?.stopScan()
        } else {
            bleManager?.startScan()
        }
        scanViewController.updateScanButton()
    }

    @objc private func disconnectDevice() {
        bleManager?.disconnect()
    }

    @objc private func showLogs() {
        showLogPanel()
    }
}

// MARK: - Toolbar Item Identifiers
extension NSToolbarItem.Identifier {
    static let scanToggle = NSToolbarItem.Identifier("scanToggle")
    static let disconnect = NSToolbarItem.Identifier("disconnect")
    static let logs = NSToolbarItem.Identifier("logs")
}

// MARK: - Scan View Delegate Protocol
protocol ScanViewDelegate: AnyObject {
    func scanViewController(_ controller: ScanViewController, didSelectDevice device: BLEDevice)
}
