//
// SmartBLE Desktop for macOS - Service Panel Component
//

import Cocoa

protocol ServicePanelDelegate: AnyObject {
    func servicePanel(_ panel: ServicePanel, didRequestRead characteristic: BLECharacteristic, in service: BLEService)
    func servicePanel(_ panel: ServicePanel, didRequestWrite characteristic: BLECharacteristic, in service: BLEService)
    func servicePanel(_ panel: ServicePanel, didToggleNotify characteristic: BLECharacteristic, in service: BLEService, enabled: Bool)
}

class ServicePanel: NSView, NSOutlineViewDelegate, NSOutlineViewDataSource {
    weak var delegate: ServicePanelDelegate?
    
    private var scrollView: NSScrollView!
    private var outlineView: NSOutlineView!
    
    private var services: [BLEService] = []
    
    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        // Create scroll view
        scrollView = NSScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.borderType = .noBorder
        self.addSubview(scrollView)

        // Create outline view
        outlineView = NSOutlineView()
        outlineView.delegate = self
        outlineView.dataSource = self
        outlineView.headerView = nil
        outlineView.indentationPerLevel = 16
        outlineView.rowHeight = 40
        outlineView.selectionHighlightStyle = .none
        
        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("main"))
        column.title = ""
        column.width = 300
        outlineView.addTableColumn(column)
        
        scrollView.documentView = outlineView

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: self.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: self.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: self.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: self.bottomAnchor)
        ])
    }
    
    func configure(with services: [BLEService]) {
        self.services = services
        self.outlineView.reloadData()
        if !services.isEmpty {
            self.outlineView.expandItem(nil, expandChildren: true)
        }
    }
    
    // MARK: - NSOutlineViewDataSource
    func outlineView(_ outlineView: NSOutlineView, numberOfChildrenOfItem item: Any?) -> Int {
        if let service = item as? BLEService {
            return service.characteristics.count
        }
        return services.count
    }

    func outlineView(_ outlineView: NSOutlineView, child index: Int, ofItem item: Any?) -> Any {
        if let service = item as? BLEService {
            return service.characteristics[index]
        }
        return services[index]
    }

    func outlineView(_ outlineView: NSOutlineView, isItemExpandable item: Any) -> Bool {
        return item is BLEService
    }

    // MARK: - NSOutlineViewDelegate
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

        cellView.subviews.forEach { $0.removeFromSuperview() }

        let nameField = NSTextField(labelWithString: service.name)
        nameField.font = .systemFont(ofSize: 13, weight: .semibold)
        nameField.translatesAutoresizingMaskIntoConstraints = false
        nameField.isEditable = false
        nameField.isBordered = false
        nameField.backgroundColor = .clear
        cellView.addSubview(nameField)

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

        cellView.subviews.forEach { $0.removeFromSuperview() }

        let container = NSView()
        container.translatesAutoresizingMaskIntoConstraints = false
        cellView.addSubview(container)

        let nameField = NSTextField(labelWithString: characteristic.name)
        nameField.font = .systemFont(ofSize: 12, weight: .medium)
        nameField.translatesAutoresizingMaskIntoConstraints = false
        nameField.isEditable = false
        nameField.isBordered = false
        nameField.backgroundColor = .clear
        container.addSubview(nameField)

        let uuidField = NSTextField(labelWithString: characteristic.uuid)
        uuidField.font = .monospacedSystemFont(ofSize: 9, weight: .regular)
        uuidField.textColor = .secondaryLabelColor
        uuidField.translatesAutoresizingMaskIntoConstraints = false
        uuidField.isEditable = false
        uuidField.isBordered = false
        uuidField.backgroundColor = .clear
        container.addSubview(uuidField)

        let badgesStack = createPropertiesBadges(for: characteristic.properties)
        badgesStack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(badgesStack)

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

        stack.identifier = NSUserInterfaceItemIdentifier(characteristic.id)

        return stack
    }

    @objc private func readClicked(_ sender: NSButton) {
        guard let characteristic = findCharacteristic(for: sender) else { return }
        guard let service = findService(for: characteristic) else { return }
        delegate?.servicePanel(self, didRequestRead: characteristic, in: service)
    }

    @objc private func writeClicked(_ sender: NSButton) {
        guard let characteristic = findCharacteristic(for: sender) else { return }
        guard let service = findService(for: characteristic) else { return }
        delegate?.servicePanel(self, didRequestWrite: characteristic, in: service)
    }

    @objc private func notifyClicked(_ sender: NSButton) {
        guard let characteristic = findCharacteristic(for: sender) else { return }
        guard let service = findService(for: characteristic) else { return }
        let enabled = sender.state == .on
        delegate?.servicePanel(self, didToggleNotify: characteristic, in: service, enabled: enabled)
    }

    private func findCharacteristic(for sender: NSButton) -> BLECharacteristic? {
        guard let stackView = sender.superview as? NSStackView,
              let charId = stackView.identifier?.rawValue else { return nil }
        return services.flatMap({ $0.characteristics }).first { $0.id == charId }
    }

    private func findService(for characteristic: BLECharacteristic) -> BLEService? {
        return services.first { service in
            service.characteristics.contains { $0.id == characteristic.id }
        }
    }
}
