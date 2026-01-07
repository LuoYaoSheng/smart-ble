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

    // Filter panel
    private var filterPanel: NSView!
    private var rssiSlider: NSSlider!
    private var rssiValueLabel: NSTextField!
    private var namePrefixField: NSTextField!
    private var hideUnnamedCheckbox: NSButton!
    private var resetFiltersButton: NSButton!

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
        filterPanel = createFilterPanel()
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

        // Table columns
        let nameColumn = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("name"))
        nameColumn.title = "Device"
        nameColumn.width = 200
        tableView.addTableColumn(nameColumn)

        let infoColumn = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("info"))
        infoColumn.title = "Info"
        infoColumn.width = 150
        tableView.addTableColumn(infoColumn)

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

    private func createFilterPanel() -> NSView {
        let panel = NSView()
        panel.wantsLayer = true
        panel.layer?.backgroundColor = NSColor.controlBackgroundColor.withAlphaComponent(0.5).cgColor
        panel.layer?.cornerRadius = 8

        // RSSI Filter
        let rssiLabel = NSTextField(labelWithString: "Signal Strength: -100 dBm")
        rssiLabel.font = .systemFont(ofSize: 11)
        rssiLabel.translatesAutoresizingMaskIntoConstraints = false
        panel.addSubview(rssiLabel)

        rssiSlider = NSSlider(value: -100, minValue: -100, maxValue: -30, target: self, action: #selector(rssiSliderChanged))
        rssiSlider.translatesAutoresizingMaskIntoConstraints = false
        panel.addSubview(rssiSlider)

        rssiValueLabel = NSTextField(labelWithString: "-100")
        rssiValueLabel.font = .systemFont(ofSize: 11, weight: .medium)
        rssiValueLabel.translatesAutoresizingMaskIntoConstraints = false
        rssiValueLabel.isEditable = false
        rssiValueLabel.isBordered = false
        rssiValueLabel.backgroundColor = .clear
        panel.addSubview(rssiValueLabel)

        // Preset buttons
        let presetStack = NSStackView()
        presetStack.orientation = .horizontal
        presetStack.spacing = 4
        presetStack.translatesAutoresizingMaskIntoConstraints = false
        panel.addSubview(presetStack)

        let presets = [-100, -90, -70, -50]
        let presetLabels = ["All", "-90", "-70", "-50"]
        for (value, label) in zip(presets, presetLabels) {
            let btn = NSButton(title: label, target: self, action: #selector(rssiPresetClicked(_:)))
            btn.tag = value
            btn.bezelStyle = .rounded
            btn.font = .systemFont(ofSize: 10)
            btn.translatesAutoresizingMaskIntoConstraints = false
            presetStack.addArrangedSubview(btn)
        }

        // Name prefix filter
        let nameLabel = NSTextField(labelWithString: "Name Prefix:")
        nameLabel.font = .systemFont(ofSize: 11)
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        panel.addSubview(nameLabel)

        namePrefixField = NSTextField()
        namePrefixField.placeholderString = "Filter by name prefix..."
        namePrefixField.font = .systemFont(ofSize: 11)
        namePrefixField.delegate = self
        namePrefixField.translatesAutoresizingMaskIntoConstraints = false
        panel.addSubview(namePrefixField)

        // Hide unnamed checkbox
        hideUnnamedCheckbox = NSButton(checkboxWithTitle: "Hide devices without name", target: self, action: #selector(hideUnnamedToggled))
        hideUnnamedCheckbox.state = .off
        hideUnnamedCheckbox.font = .systemFont(ofSize: 11)
        hideUnnamedCheckbox.translatesAutoresizingMaskIntoConstraints = false
        panel.addSubview(hideUnnamedCheckbox)

        // Reset button
        resetFiltersButton = NSButton(title: "Reset", target: self, action: #selector(resetFiltersClicked))
        resetFiltersButton.bezelStyle = .rounded
        resetFiltersButton.font = .systemFont(ofSize: 10)
        resetFiltersButton.translatesAutoresizingMaskIntoConstraints = false
        panel.addSubview(resetFiltersButton)

        NSLayoutConstraint.activate([
            // RSSI label
            rssiLabel.topAnchor.constraint(equalTo: panel.topAnchor, constant: 12),
            rssiLabel.leadingAnchor.constraint(equalTo: panel.leadingAnchor, constant: 12),

            // RSSI value and reset button on right
            resetFiltersButton.topAnchor.constraint(equalTo: panel.topAnchor, constant: 8),
            resetFiltersButton.trailingAnchor.constraint(equalTo: panel.trailingAnchor, constant: -12),
            resetFiltersButton.widthAnchor.constraint(equalToConstant: 50),

            rssiValueLabel.centerYAnchor.constraint(equalTo: rssiLabel.centerYAnchor),
            rssiValueLabel.trailingAnchor.constraint(equalTo: resetFiltersButton.leadingAnchor, constant: -12),

            // RSSI slider
            rssiSlider.topAnchor.constraint(equalTo: rssiLabel.bottomAnchor, constant: 4),
            rssiSlider.leadingAnchor.constraint(equalTo: panel.leadingAnchor, constant: 12),
            rssiSlider.trailingAnchor.constraint(equalTo: rssiValueLabel.leadingAnchor, constant: -8),

            // Preset buttons
            presetStack.topAnchor.constraint(equalTo: rssiSlider.bottomAnchor, constant: 4),
            presetStack.leadingAnchor.constraint(equalTo: panel.leadingAnchor, constant: 12),

            // Name filter row
            nameLabel.topAnchor.constraint(equalTo: presetStack.bottomAnchor, constant: 12),
            nameLabel.leadingAnchor.constraint(equalTo: panel.leadingAnchor, constant: 12),
            nameLabel.widthAnchor.constraint(equalToConstant: 80),

            namePrefixField.centerYAnchor.constraint(equalTo: nameLabel.centerYAnchor),
            namePrefixField.leadingAnchor.constraint(equalTo: nameLabel.trailingAnchor, constant: 8),
            namePrefixField.trailingAnchor.constraint(equalTo: panel.trailingAnchor, constant: -12),
            namePrefixField.heightAnchor.constraint(equalToConstant: 24),

            // Hide unnamed checkbox
            hideUnnamedCheckbox.topAnchor.constraint(equalTo: namePrefixField.bottomAnchor, constant: 8),
            hideUnnamedCheckbox.leadingAnchor.constraint(equalTo: panel.leadingAnchor, constant: 12),

            // Panel bottom
            panel.bottomAnchor.constraint(equalTo: hideUnnamedCheckbox.bottomAnchor, constant: 12),
            panel.heightAnchor.constraint(greaterThanOrEqualToConstant: 100)
        ])

        return panel
    }

    // MARK: - Actions
    @objc private func toggleFilterPanel() {
        filterPanel.isHidden.toggle()
        filterButton.contentTintColor = filterPanel.isHidden ? .secondaryLabelColor : .controlAccentColor
    }

    @objc private func rssiSliderChanged() {
        let value = Int(rssiSlider.intValue)
        rssiValueLabel.stringValue = "\(value)"
        bleManager?.filterRSSI = value
        updateDeviceList()
    }

    @objc private func rssiPresetClicked(_ sender: NSButton) {
        let value = sender.tag
        rssiSlider.integerValue = value
        rssiValueLabel.stringValue = "\(value)"
        bleManager?.filterRSSI = value
        updateDeviceList()
    }

    @objc private func hideUnnamedToggled() {
        let enabled = hideUnnamedCheckbox.state == .on
        bleManager?.hideNoNameDevices = enabled
        updateDeviceList()
    }

    @objc private func resetFiltersClicked() {
        rssiSlider.integerValue = -100
        rssiValueLabel.stringValue = "-100"
        namePrefixField.stringValue = ""
        hideUnnamedCheckbox.state = .off

        bleManager?.resetFilters()
        updateDeviceList()
    }

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

// MARK: - NSTextFieldDelegate
extension ScanViewController: NSTextFieldDelegate {
    func controlTextDidChange(_ obj: Notification) {
        guard let textField = obj.object as? NSTextField,
              textField == namePrefixField else { return }

        bleManager?.filterNamePrefix = textField.stringValue
        updateDeviceList()
    }
}

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

        if tableColumn?.identifier.rawValue == "name" {
            let cellView = tableView.makeView(withIdentifier: NSUserInterfaceItemIdentifier("DeviceCell"), owner: self) as? NSTableCellView ?? NSTableCellView()

            // Create name field
            let nameField = NSTextField(labelWithString: device.name)
            nameField.font = .systemFont(ofSize: 13, weight: .medium)
            nameField.translatesAutoresizingMaskIntoConstraints = false
            nameField.isEditable = false
            nameField.isBordered = false
            nameField.backgroundColor = .clear

            // Create ID field
            let idField = NSTextField(labelWithString: String(device.id.prefix(8)))
            idField.font = .monospacedSystemFont(ofSize: 10, weight: .regular)
            idField.textColor = .secondaryLabelColor
            idField.translatesAutoresizingMaskIntoConstraints = false
            idField.isEditable = false
            idField.isBordered = false
            idField.backgroundColor = .clear

            cellView.addSubview(nameField)
            cellView.addSubview(idField)
            cellView.textField = nameField

            NSLayoutConstraint.activate([
                nameField.leadingAnchor.constraint(equalTo: cellView.leadingAnchor, constant: 4),
                nameField.topAnchor.constraint(equalTo: cellView.topAnchor, constant: 8),

                idField.leadingAnchor.constraint(equalTo: cellView.leadingAnchor, constant: 4),
                idField.topAnchor.constraint(equalTo: nameField.bottomAnchor, constant: 2)
            ])

            return cellView

        } else {
            let cellView = tableView.makeView(withIdentifier: NSUserInterfaceItemIdentifier("InfoCell"), owner: self) as? NSTableCellView ?? NSTableCellView()

            let rssiField = NSTextField(labelWithString: "\(device.rssi) dBm")
            rssiField.font = .systemFont(ofSize: 11)
            rssiField.textColor = .secondaryLabelColor
            rssiField.translatesAutoresizingMaskIntoConstraints = false
            rssiField.isEditable = false
            rssiField.isBordered = false
            rssiField.backgroundColor = .clear

            cellView.addSubview(rssiField)
            cellView.textField = rssiField

            NSLayoutConstraint.activate([
                rssiField.leadingAnchor.constraint(equalTo: cellView.leadingAnchor, constant: 4),
                rssiField.centerYAnchor.constraint(equalTo: cellView.centerYAnchor)
            ])

            return cellView
        }
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        let selectedRow = tableView.selectedRow
        guard selectedRow >= 0, selectedRow < devices.count else { return }

        let device = devices[selectedRow]
        delegate?.scanViewController(self, didSelectDevice: device)
    }
}
