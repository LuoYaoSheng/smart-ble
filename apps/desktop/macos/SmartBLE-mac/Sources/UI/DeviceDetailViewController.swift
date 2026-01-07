//
// SmartBLE Desktop for macOS - Device Detail View Controller
//

import Cocoa
import Combine

class DeviceDetailViewController: NSViewController {
    // MARK: - Properties
    var bleManager: BLEManager?
    private var cancellables = Set<AnyCancellable>()
    private var currentService: BLEService?

    // MARK: - UI Components
    private var scrollView: NSScrollView!
    private var outlineView: NSOutlineView!
    private var placeholderView: NSView!

    // MARK: - Lifecycle
    override func loadView() {
        view = NSView()
        setupUI()
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        showNoDevice()
    }

    // MARK: - Setup UI
    private func setupUI() {
        // Create scroll view
        scrollView = NSScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.borderType = .noBorder
        view.addSubview(scrollView)

        // Create outline view
        outlineView = NSOutlineView()
        outlineView.delegate = self
        outlineView.dataSource = self
        outlineView.headerView = nil
        outlineView.indentationPerLevel = 16
        outlineView.rowHeight = 40
        outlineView.selectionHighlightStyle = .none
        scrollView.documentView = outlineView

        // Create columns
        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("main"))
        column.title = ""
        column.width = 250
        outlineView.addTableColumn(column)

        // Create placeholder
        placeholderView = createPlaceholderView()
        placeholderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(placeholderView)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            placeholderView.topAnchor.constraint(equalTo: view.topAnchor),
            placeholderView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            placeholderView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            placeholderView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func createPlaceholderView() -> NSView {
        let view = NSView()
        view.wantsLayer = true

        let imageView = NSImageView()
        imageView.image = NSImage(systemSymbolName: "antenna.radiowaves.left.and.right.slash", accessibilityDescription: nil)
        imageView.contentTintColor = .separatorColor
        imageView.symbolConfiguration = NSImage.SymbolConfiguration(pointSize: 48, weight: .regular)
        imageView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(imageView)

        let label = NSTextField(labelWithString: "No Device Connected")
        label.font = .systemFont(ofSize: 14, weight: .medium)
        label.textColor = .secondaryLabelColor
        label.alignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        label.isEditable = false
        label.isBordered = false
        label.backgroundColor = .clear
        view.addSubview(label)

        let hint = NSTextField(labelWithString: "Select a device from the scan list")
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

    // MARK: - Public Methods
    func showDevice(_ device: BLEDevice?) {
        placeholderView.isHidden = true
        outlineView.reloadData()
    }

    func showNoDevice() {
        placeholderView.isHidden = false
    }

    func setBLEManager(_ manager: BLEManager) {
        self.bleManager = manager

        manager.$services
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.outlineView.reloadData()
            }
            .store(in: &cancellables)
    }
}

// MARK: - NSOutlineViewDataSource
extension DeviceDetailViewController: NSOutlineViewDataSource {
    func outlineView(_ outlineView: NSOutlineView, numberOfChildrenOfItem item: Any?) -> Int {
        if let service = item as? BLEService {
            return service.characteristics.count
        }

        guard let manager = bleManager else { return 0 }
        return manager.services.count
    }

    func outlineView(_ outlineView: NSOutlineView, child index: Int, ofItem item: Any?) -> Any {
        if let service = item as? BLEService {
            return service.characteristics[index]
        }

        guard let manager = bleManager else { return "" }
        return manager.services[index]
    }

    func outlineView(_ outlineView: NSOutlineView, isItemExpandable item: Any) -> Bool {
        return item is BLEService
    }
}

// MARK: - NSOutlineViewDelegate
extension DeviceDetailViewController: NSOutlineViewDelegate {
    func outlineView(_ outlineView: NSOutlineView, viewFor tableColumn: NSTableColumn?, item: Any) -> NSView? {
        if let service = item as? BLEService {
            return createServiceCell(for: service)
        } else if let characteristic = item as? BLECharacteristic {
            return createCharacteristicCell(for: characteristic)
        }
        return nil
    }

    private func createServiceCell(for service: BLEService) -> NSTableCellView {
        let cellId = NSUserInterfaceItemIdentifier("ServiceCell")
        let cellView = outlineView.makeView(withIdentifier: cellId, owner: self) as? NSTableCellView ?? NSTableCellView()

        // Clear previous content
        cellView.subviews.forEach { $0.removeFromSuperview() }

        // Name
        let nameField = NSTextField(labelWithString: service.name)
        nameField.font = .systemFont(ofSize: 13, weight: .semibold)
        nameField.translatesAutoresizingMaskIntoConstraints = false
        nameField.isEditable = false
        nameField.isBordered = false
        nameField.backgroundColor = .clear
        cellView.addSubview(nameField)

        // UUID
        let uuidField = NSTextField(labelWithString: service.uuid)
        uuidField.font = .monospacedSystemFont(ofSize: 10, weight: .regular)
        uuidField.textColor = .secondaryLabelColor
        uuidField.translatesAutoresizingMaskIntoConstraints = false
        uuidField.isEditable = false
        uuidField.isBordered = false
        uuidField.backgroundColor = .clear
        cellView.addSubview(uuidField)

        NSLayoutConstraint.activate([
            nameField.leadingAnchor.constraint(equalTo: cellView.leadingAnchor, constant: 4),
            nameField.topAnchor.constraint(equalTo: cellView.topAnchor, constant: 8),

            uuidField.leadingAnchor.constraint(equalTo: cellView.leadingAnchor, constant: 4),
            uuidField.topAnchor.constraint(equalTo: nameField.bottomAnchor, constant: 2)
        ])

        cellView.textField = nameField
        return cellView
    }

    private func createCharacteristicCell(for characteristic: BLECharacteristic) -> NSTableCellView {
        let cellId = NSUserInterfaceItemIdentifier("CharacteristicCell")
        let cellView = outlineView.makeView(withIdentifier: cellId, owner: self) as? NSTableCellView ?? NSTableCellView()

        // Clear previous content
        cellView.subviews.forEach { $0.removeFromSuperview() }

        let container = NSView()
        container.translatesAutoresizingMaskIntoConstraints = false
        cellView.addSubview(container)

        // Name
        let nameField = NSTextField(labelWithString: characteristic.name)
        nameField.font = .systemFont(ofSize: 12, weight: .medium)
        nameField.translatesAutoresizingMaskIntoConstraints = false
        nameField.isEditable = false
        nameField.isBordered = false
        nameField.backgroundColor = .clear
        container.addSubview(nameField)

        // UUID
        let uuidField = NSTextField(labelWithString: characteristic.uuid)
        uuidField.font = .monospacedSystemFont(ofSize: 9, weight: .regular)
        uuidField.textColor = .secondaryLabelColor
        uuidField.translatesAutoresizingMaskIntoConstraints = false
        uuidField.isEditable = false
        uuidField.isBordered = false
        uuidField.backgroundColor = .clear
        container.addSubview(uuidField)

        // Properties badges
        let badgesStack = createPropertiesBadges(for: characteristic.properties)
        badgesStack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(badgesStack)

        // Value
        let valueField = NSTextField(labelWithString: characteristic.value ?? "--")
        valueField.font = .monospacedSystemFont(ofSize: 10, weight: .regular)
        valueField.textColor = .secondaryLabelColor
        valueField.translatesAutoresizingMaskIntoConstraints = false
        valueField.isEditable = false
        valueField.isBordered = false
        valueField.backgroundColor = .controlBackgroundColor
        valueField.wantsLayer = true
        valueField.layer?.cornerRadius = 4
        container.addSubview(valueField)

        // Action buttons
        let buttonsStack = createActionButtons(for: characteristic)
        buttonsStack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(buttonsStack)

        NSLayoutConstraint.activate([
            container.leadingAnchor.constraint(equalTo: cellView.leadingAnchor, constant: 4),
            container.trailingAnchor.constraint(equalTo: cellView.trailingAnchor, constant: -4),
            container.topAnchor.constraint(equalTo: cellView.topAnchor, constant: 4),
            container.bottomAnchor.constraint(equalTo: cellView.bottomAnchor, constant: -4),

            nameField.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            nameField.topAnchor.constraint(equalTo: container.topAnchor),

            uuidField.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            uuidField.topAnchor.constraint(equalTo: nameField.bottomAnchor, constant: 2),

            badgesStack.leadingAnchor.constraint(equalTo: nameField.trailingAnchor, constant: 8),
            badgesStack.centerYAnchor.constraint(equalTo: nameField.centerYAnchor),

            valueField.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            valueField.topAnchor.constraint(equalTo: uuidField.bottomAnchor, constant: 4),
            valueField.trailingAnchor.constraint(equalTo: container.trailingAnchor),

            buttonsStack.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            buttonsStack.topAnchor.constraint(equalTo: valueField.bottomAnchor, constant: 6)
        ])

        cellView.textField = nameField
        return cellView
    }

    private func createPropertiesBadges(for properties: CharacteristicProperties) -> NSStackView {
        let stack = NSStackView()
        stack.orientation = .horizontal
        stack.spacing = 4

        if properties.contains(.read) { addBadge(to: stack, title: "R") }
        if properties.contains(.write) { addBadge(to: stack, title: "W") }
        if properties.contains(.writeWithoutResponse) { addBadge(to: stack, title: "WNR") }
        if properties.contains(.notify) { addBadge(to: stack, title: "N") }
        if properties.contains(.indicate) { addBadge(to: stack, title: "I") }

        return stack
    }

    private func addBadge(to stack: NSStackView, title: String) {
        let badge = NSTextField(labelWithString: title)
        badge.font = .systemFont(ofSize: 8, weight: .medium)
        badge.textColor = .white
        badge.alignment = .center
        badge.wantsLayer = true
        badge.layer?.backgroundColor = NSColor.controlAccentColor.cgColor
        badge.layer?.cornerRadius = 3
        badge.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            badge.widthAnchor.constraint(equalToConstant: 28),
            badge.heightAnchor.constraint(equalToConstant: 16)
        ])
        stack.addArrangedSubview(badge)
    }

    private func createActionButtons(for characteristic: BLECharacteristic) -> NSStackView {
        let stack = NSStackView()
        stack.orientation = .horizontal
        stack.spacing = 6

        if characteristic.properties.contains(.read) {
            let btn = NSButton(title: "Read", target: self, action: #selector(readClicked(_:)))
            btn.bezelStyle = .rounded
            btn.font = .systemFont(ofSize: 10)
            stack.addArrangedSubview(btn)
        }

        if characteristic.properties.contains(.write) || characteristic.properties.contains(.writeWithoutResponse) {
            let btn = NSButton(title: "Write", target: self, action: #selector(writeClicked(_:)))
            btn.bezelStyle = .rounded
            btn.font = .systemFont(ofSize: 10)
            stack.addArrangedSubview(btn)
        }

        if characteristic.properties.contains(.notify) || characteristic.properties.contains(.indicate) {
            let btn = NSButton(title: "Notify", target: self, action: #selector(notifyClicked(_:)))
            btn.bezelStyle = .rounded
            btn.font = .systemFont(ofSize: 10)
            btn.setButtonType(.pushOnPushOff)
            stack.addArrangedSubview(btn)
        }

        // Store characteristic reference
        stack.identifier = NSUserInterfaceItemIdentifier(characteristic.id)

        return stack
    }

    @objc private func readClicked(_ sender: NSButton) {
        guard let characteristic = findCharacteristic(for: sender) else { return }
        guard let service = findService(for: characteristic) else { return }

        bleManager?.readCharacteristic(serviceUUID: service.uuid, characteristicUUID: characteristic.uuid)
    }

    @objc private func writeClicked(_ sender: NSButton) {
        guard let characteristic = findCharacteristic(for: sender) else { return }
        guard let service = findService(for: characteristic) else { return }

        showWriteDialog(characteristic: characteristic, service: service)
    }

    @objc private func notifyClicked(_ sender: NSButton) {
        guard let characteristic = findCharacteristic(for: sender) else { return }
        guard let service = findService(for: characteristic) else { return }

        let enabled = sender.state == .on
        bleManager?.setNotification(serviceUUID: service.uuid, characteristicUUID: characteristic.uuid, enabled: enabled)
    }

    private func findCharacteristic(for sender: NSButton) -> BLECharacteristic? {
        guard let stackView = sender.superview as? NSStackView,
              let charId = stackView.identifier?.rawValue else { return nil }

        return bleManager?.services.flatMap({ $0.characteristics }).first { $0.id == charId }
    }

    private func findService(for characteristic: BLECharacteristic) -> BLEService? {
        return bleManager?.services.first { service in
            service.characteristics.contains { $0.id == characteristic.id }
        }
    }

    private func showWriteDialog(characteristic: BLECharacteristic, service: BLEService) {
        let alert = NSAlert()
        alert.messageText = "Write Characteristic"
        alert.informativeText = "Characteristic: \(characteristic.uuid)"
        alert.alertStyle = .informational

        // Create input
        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 300, height: 24))
        input.placeholderString = "48 65 6C 6C 6F"
        input.isEditable = true
        input.isSelectable = true
        input.isBordered = true
        input.bezelStyle = .roundedBezel

        // Format segment
        let formatLabel = NSTextField(labelWithString: "Format:")
        formatLabel.font = .systemFont(ofSize: 11)
        formatLabel.isEditable = false
        formatLabel.isBordered = false
        formatLabel.backgroundColor = .clear

        let formatSeg = NSSegmentedControl(labels: ["HEX", "UTF-8"], trackingMode: .selectOne, target: nil, action: nil)
        formatSeg.selectedSegment = 0
        formatSeg.segmentStyle = .rounded

        let container = NSView(frame: NSRect(x: 0, y: 0, width: 300, height: 60))
        input.translatesAutoresizingMaskIntoConstraints = false
        formatLabel.translatesAutoresizingMaskIntoConstraints = false
        formatSeg.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(formatLabel)
        container.addSubview(formatSeg)
        container.addSubview(input)

        NSLayoutConstraint.activate([
            formatLabel.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            formatLabel.topAnchor.constraint(equalTo: container.topAnchor),

            formatSeg.leadingAnchor.constraint(equalTo: formatLabel.trailingAnchor, constant: 8),
            formatSeg.centerYAnchor.constraint(equalTo: formatLabel.centerYAnchor),

            input.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            input.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            input.topAnchor.constraint(equalTo: formatLabel.bottomAnchor, constant: 12),
            input.heightAnchor.constraint(equalToConstant: 24)
        ])

        alert.accessoryView = container
        alert.addButton(withTitle: "Cancel")
        alert.addButton(withTitle: "Write")

        let response = alert.runModal()
        if response == .alertSecondButtonReturn {
            let text = input.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { return }

            let data: Data
            if formatSeg.selectedSegment == 0 {
                // HEX
                let clean = text.replacingOccurrences(of: " ", with: "")
                guard clean.count % 2 == 0 else { return }
                data = Data(hex: clean)
            } else {
                // UTF-8
                data = text.data(using: .utf8) ?? Data()
            }

            bleManager?.writeCharacteristic(serviceUUID: service.uuid, characteristicUUID: characteristic.uuid, data: data)
        }
    }
}

// MARK: - Data Extension for hex
extension Data {
    init(hex: String) {
        let cleanHex = hex
        self.init()

        var index = cleanHex.startIndex
        while index < cleanHex.endIndex {
            let nextIndex = cleanHex.index(index, offsetBy: 2)
            if let byte = UInt8(cleanHex[index..<nextIndex], radix: 16) {
                append(byte)
            }
            index = nextIndex
        }
    }
}
