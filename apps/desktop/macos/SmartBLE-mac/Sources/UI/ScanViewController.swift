//
// SmartBLE Desktop for macOS - Scan View Controller
//

import Cocoa
import Combine

class ScanViewController: NSViewController {
    // MARK: - Properties
    weak var delegate: ScanViewDelegate?
    var bleManager: BLEManager?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - UI Components
    private var scrollView: NSScrollView!
    private var tableView: NSTableView!
    private var scanButton: NSButton!
    private var statusLabel: NSTextField!
    private var deviceCountLabel: NSTextField!
    private var filterButton: NSButton!

    private var filterPanel: FilterPanel!
    private var devices: [BLEDevice] = []

    // MARK: - Lifecycle
    override func loadView() {
        view = NSView()
        view.translatesAutoresizingMaskIntoConstraints = false

        setupUI()
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupBindings()
    }

    // MARK: - Setup UI
    private func setupUI() {
        // Create controls container
        let controlsView = NSView()
        controlsView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(controlsView)

        // Scan button
        scanButton = NSButton(title: "Start Scan", target: self, action: #selector(scanButtonClicked))
        scanButton.bezelStyle = .rounded
        scanButton.translatesAutoresizingMaskIntoConstraints = false
        controlsView.addSubview(scanButton)

        // Filter toggle button
        filterButton = NSButton(title: "", image: NSImage(systemSymbolName: "line.3.horizontal.decrease.circle", accessibilityDescription: nil), target: self, action: #selector(toggleFilterPanel))
        filterButton.bezelStyle = .regularSquare
        filterButton.isBordered = false
        filterButton.translatesAutoresizingMaskIntoConstraints = false
        controlsView.addSubview(filterButton)

        // Status label
        statusLabel = NSTextField(labelWithString: "Ready")
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.font = .systemFont(ofSize: 11)
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        controlsView.addSubview(statusLabel)

        // Device count label
        deviceCountLabel = NSTextField(labelWithString: "0 devices")
        deviceCountLabel.textColor = .secondaryLabelColor
        deviceCountLabel.font = .systemFont(ofSize: 11)
        deviceCountLabel.translatesAutoresizingMaskIntoConstraints = false
        controlsView.addSubview(deviceCountLabel)

        // Filter panel (initially hidden)
        filterPanel = FilterPanel()
        filterPanel.delegate = self
        filterPanel.translatesAutoresizingMaskIntoConstraints = false
        filterPanel.isHidden = true
        view.addSubview(filterPanel)

        // Create scroll view and table view
        scrollView = NSScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.borderType = .noBorder
        view.addSubview(scrollView)

        // Create table view
        tableView = NSTableView()
        tableView.delegate = self
        tableView.dataSource = self
        tableView.headerView = nil
        tableView.style = .plain
        tableView.rowHeight = 60
        tableView.selectionHighlightStyle = .regular
        tableView.backgroundColor = .clear
        scrollView.documentView = tableView

        // Table column (single column for DeviceCard)
        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("DeviceCard"))
        column.title = "Devices"
        column.width = 400
        tableView.addTableColumn(column)
        
        // Remove headers
        tableView.headerView = nil

        // Set background color for empty state
        tableView.backgroundColor = .controlBackgroundColor

        // Layout constraints
        NSLayoutConstraint.activate([
            // Controls
            controlsView.topAnchor.constraint(equalTo: view.topAnchor, constant: 12),
            controlsView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            controlsView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            controlsView.heightAnchor.constraint(equalToConstant: 32),

            scanButton.leadingAnchor.constraint(equalTo: controlsView.leadingAnchor),
            scanButton.centerYAnchor.constraint(equalTo: controlsView.centerYAnchor),
            scanButton.widthAnchor.constraint(equalToConstant: 100),

            filterButton.leadingAnchor.constraint(equalTo: scanButton.trailingAnchor, constant: 8),
            filterButton.centerYAnchor.constraint(equalTo: controlsView.centerYAnchor),
            filterButton.widthAnchor.constraint(equalToConstant: 24),
            filterButton.heightAnchor.constraint(equalToConstant: 24),

            statusLabel.leadingAnchor.constraint(equalTo: filterButton.trailingAnchor, constant: 12),
            statusLabel.centerYAnchor.constraint(equalTo: controlsView.centerYAnchor),

            deviceCountLabel.trailingAnchor.constraint(equalTo: controlsView.trailingAnchor),
            deviceCountLabel.centerYAnchor.constraint(equalTo: controlsView.centerYAnchor),

            // Filter panel
            filterPanel.topAnchor.constraint(equalTo: controlsView.bottomAnchor, constant: 8),
            filterPanel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            filterPanel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),

            // Table view
            scrollView.topAnchor.constraint(equalTo: filterPanel.bottomAnchor, constant: 12),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    // Removed monolithic createFilterPanel(), replaced by FilterPanel component

    // MARK: - Actions
    @objc private func toggleFilterPanel() {
        filterPanel.isHidden.toggle()
        filterButton.contentTintColor = filterPanel.isHidden ? .secondaryLabelColor : .controlAccentColor
    }

    // Filter panel actions are now handled by FilterPanelDelegate

    private func createEmptyState() -> NSView {
        let view = NSView()
        view.wantsLayer = true

        let imageView = NSImageView()
        imageView.image = NSImage(systemSymbolName: "antenna.radiowaves.left.and.right.slash", accessibilityDescription: nil)
        imageView.contentTintColor = .separatorColor
        imageView.symbolConfiguration = NSImage.SymbolConfiguration(pointSize: 48, weight: .regular)
        imageView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(imageView)

        let label = NSTextField(labelWithString: "No Devices Found")
        label.font = .systemFont(ofSize: 14, weight: .medium)
        label.textColor = .secondaryLabelColor
        label.alignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        label.isEditable = false
        label.isBordered = false
        label.backgroundColor = .clear
        view.addSubview(label)

        let hint = NSTextField(labelWithString: "Click Start Scan to begin")
        hint.font = .systemFont(ofSize: 11)
        hint.textColor = .tertiaryLabelColor
        hint.alignment = .center
        hint.translatesAutoresizingMaskIntoConstraints = false
        hint.isEditable = false
        hint.isBordered = false
        hint.backgroundColor = .clear
        view.addSubview(hint)

        NSLayoutConstraint.activate([
            imageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            imageView.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -20),

            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.topAnchor.constraint(equalTo: imageView.bottomAnchor, constant: 12),

            hint.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            hint.topAnchor.constraint(equalTo: label.bottomAnchor, constant: 4)
        ])

        return view
    }

    private func setupBindings() {
        // Bind to BLE manager when available
        // This will be set from MainWindowController
    }

    func setBLEManager(_ manager: BLEManager) {
        self.bleManager = manager

        // Listen to filter changes
        manager.$filterRSSI
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.updateDeviceList() }
            .store(in: &cancellables)

        manager.$filterNamePrefix
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.updateDeviceList() }
            .store(in: &cancellables)

        manager.$hideNoNameDevices
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.updateDeviceList() }
            .store(in: &cancellables)

        manager.$discoveredDevices
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in self?.updateDeviceList() }
            .store(in: &cancellables)

        manager.$isScanning
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isScanning in
                self?.updateScanButton()
            }
            .store(in: &cancellables)

        manager.$connectionState
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.updateConnectionState(state)
            }
            .store(in: &cancellables)
    }

    private func updateDeviceList() {
        guard let manager = bleManager else { return }
        devices = manager.filteredScanResults
        tableView.reloadData()
        deviceCountLabel.stringValue = "\(devices.count) device\(devices.count == 1 ? "" : "s")"
    }

    // MARK: - Actions
    @objc private func scanButtonClicked() {
        guard let manager = bleManager else { return }

        if manager.isScanning {
            manager.stopScan()
        } else {
            manager.startScan()
        }
    }

    func updateScanButton() {
        guard let manager = bleManager else { return }

        if manager.isScanning {
            scanButton.title = "Stop Scan"
            scanButton.bezelStyle = .rounded
            statusLabel.stringValue = "Scanning..."
        } else {
            scanButton.title = "Start Scan"
            scanButton.bezelStyle = .rounded
            statusLabel.stringValue = "Ready"
        }
    }

    private func updateConnectionState(_ state: ConnectionState) {
        switch state {
        case .connecting:
            statusLabel.stringValue = "Connecting..."
        case .connected:
            statusLabel.stringValue = "Connected"
        case .disconnecting:
            statusLabel.stringValue = "Disconnecting..."
        case .disconnected:
            updateScanButton()
        }
    }
}

// Filter Panel actions are deleted here

// MARK: - NSTableViewDataSource
extension ScanViewController: NSTableViewDataSource {
    func numberOfRows(in tableView: NSTableView) -> Int {
        return devices.count
    }
}

// MARK: - NSTableViewDelegate
extension ScanViewController: NSTableViewDelegate {
    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        guard row < devices.count else { return nil }
        let device = devices[row]

        let identifier = NSUserInterfaceItemIdentifier("DeviceCard")
        var view = tableView.makeView(withIdentifier: identifier, owner: self) as? DeviceCard
        
        if view == nil {
            view = DeviceCard(frame: NSRect(x: 0, y: 0, width: tableView.frame.width, height: 60))
            view?.identifier = identifier
        }
        
        let state = bleManager?.connectionState ?? .disconnected
        // Ensure connection state logic highlights the correct connected device, but we just pass standard state for now
        // A real app would check if device.id == bleManager.connectedDeviceId
        
        view?.configure(with: device, connectionState: .disconnected)
        view?.delegate = self
        
        return view
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        let selectedRow = tableView.selectedRow
        guard selectedRow >= 0, selectedRow < devices.count else { return }

        let device = devices[selectedRow]
        delegate?.scanViewController(self, didSelectDevice: device)
    }
}

// MARK: - DeviceCardDelegate
extension ScanViewController: DeviceCardDelegate {
    func deviceCardDidClickConnect(_ card: DeviceCard, device: BLEDevice) {
        // Find existing MainWindowController logic or implement a connect flow here
        delegate?.scanViewController(self, didSelectDevice: device)
        bleManager?.connect(to: device)
    }
}

// MARK: - FilterPanelDelegate
extension ScanViewController: FilterPanelDelegate {
    func filterPanel(_ panel: FilterPanel, didChangeRSSI value: Int) {
        bleManager?.filterRSSI = value
        updateDeviceList()
    }
    
    func filterPanel(_ panel: FilterPanel, didChangeNamePrefix prefix: String) {
        bleManager?.filterNamePrefix = prefix
        updateDeviceList()
    }
    
    func filterPanel(_ panel: FilterPanel, didToggleHideUnnamed isHidden: Bool) {
        bleManager?.hideNoNameDevices = isHidden
        updateDeviceList()
    }
    
    func filterPanelDidReset(_ panel: FilterPanel) {
        bleManager?.resetFilters()
        updateDeviceList()
    }
}
