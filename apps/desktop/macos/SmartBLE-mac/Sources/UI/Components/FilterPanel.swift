//
// SmartBLE Desktop for macOS - Filter Panel Component
//

import Cocoa

protocol FilterPanelDelegate: AnyObject {
    func filterPanel(_ panel: FilterPanel, didChangeRSSI value: Int)
    func filterPanel(_ panel: FilterPanel, didChangeNamePrefix prefix: String)
    func filterPanel(_ panel: FilterPanel, didToggleHideUnnamed isHidden: Bool)
    func filterPanelDidReset(_ panel: FilterPanel)
}

class FilterPanel: NSView, NSTextFieldDelegate {
    weak var delegate: FilterPanelDelegate?
    
    private var rssiSlider: NSSlider!
    private var rssiValueLabel: NSTextField!
    private var namePrefixField: NSTextField!
    private var hideUnnamedCheckbox: NSButton!
    private var resetFiltersButton: NSButton!
    
    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        self.wantsLayer = true
        self.layer?.backgroundColor = NSColor.controlBackgroundColor.withAlphaComponent(0.5).cgColor
        self.layer?.cornerRadius = 8

        // RSSI Filter
        let rssiLabel = NSTextField(labelWithString: "Signal Strength: -100 dBm")
        rssiLabel.font = .systemFont(ofSize: 11)
        rssiLabel.translatesAutoresizingMaskIntoConstraints = false
        self.addSubview(rssiLabel)

        rssiSlider = NSSlider(value: -100, minValue: -100, maxValue: -30, target: self, action: #selector(rssiSliderChanged))
        rssiSlider.translatesAutoresizingMaskIntoConstraints = false
        self.addSubview(rssiSlider)

        rssiValueLabel = NSTextField(labelWithString: "-100")
        rssiValueLabel.font = .systemFont(ofSize: 11, weight: .medium)
        rssiValueLabel.translatesAutoresizingMaskIntoConstraints = false
        rssiValueLabel.isEditable = false
        rssiValueLabel.isBordered = false
        rssiValueLabel.backgroundColor = .clear
        self.addSubview(rssiValueLabel)

        // Preset buttons
        let presetStack = NSStackView()
        presetStack.orientation = .horizontal
        presetStack.spacing = 4
        presetStack.translatesAutoresizingMaskIntoConstraints = false
        self.addSubview(presetStack)

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
        self.addSubview(nameLabel)

        namePrefixField = NSTextField()
        namePrefixField.placeholderString = "Filter by name prefix..."
        namePrefixField.font = .systemFont(ofSize: 11)
        namePrefixField.delegate = self
        namePrefixField.translatesAutoresizingMaskIntoConstraints = false
        self.addSubview(namePrefixField)

        // Hide unnamed checkbox
        hideUnnamedCheckbox = NSButton(checkboxWithTitle: "Hide devices without name", target: self, action: #selector(hideUnnamedToggled))
        hideUnnamedCheckbox.state = .off
        hideUnnamedCheckbox.font = .systemFont(ofSize: 11)
        hideUnnamedCheckbox.translatesAutoresizingMaskIntoConstraints = false
        self.addSubview(hideUnnamedCheckbox)

        // Reset button
        resetFiltersButton = NSButton(title: "Reset", target: self, action: #selector(resetFiltersClicked))
        resetFiltersButton.bezelStyle = .rounded
        resetFiltersButton.font = .systemFont(ofSize: 10)
        resetFiltersButton.translatesAutoresizingMaskIntoConstraints = false
        self.addSubview(resetFiltersButton)

        NSLayoutConstraint.activate([
            // RSSI label
            rssiLabel.topAnchor.constraint(equalTo: self.topAnchor, constant: 12),
            rssiLabel.leadingAnchor.constraint(equalTo: self.leadingAnchor, constant: 12),

            // RSSI value and reset button on right
            resetFiltersButton.topAnchor.constraint(equalTo: self.topAnchor, constant: 8),
            resetFiltersButton.trailingAnchor.constraint(equalTo: self.trailingAnchor, constant: -12),
            resetFiltersButton.widthAnchor.constraint(equalToConstant: 50),

            rssiValueLabel.centerYAnchor.constraint(equalTo: rssiLabel.centerYAnchor),
            rssiValueLabel.trailingAnchor.constraint(equalTo: resetFiltersButton.leadingAnchor, constant: -12),

            // RSSI slider
            rssiSlider.topAnchor.constraint(equalTo: rssiLabel.bottomAnchor, constant: 4),
            rssiSlider.leadingAnchor.constraint(equalTo: self.leadingAnchor, constant: 12),
            rssiSlider.trailingAnchor.constraint(equalTo: rssiValueLabel.leadingAnchor, constant: -8),

            // Preset buttons
            presetStack.topAnchor.constraint(equalTo: rssiSlider.bottomAnchor, constant: 4),
            presetStack.leadingAnchor.constraint(equalTo: self.leadingAnchor, constant: 12),

            // Name filter row
            nameLabel.topAnchor.constraint(equalTo: presetStack.bottomAnchor, constant: 12),
            nameLabel.leadingAnchor.constraint(equalTo: self.leadingAnchor, constant: 12),
            nameLabel.widthAnchor.constraint(equalToConstant: 80),

            namePrefixField.centerYAnchor.constraint(equalTo: nameLabel.centerYAnchor),
            namePrefixField.leadingAnchor.constraint(equalTo: nameLabel.trailingAnchor, constant: 8),
            namePrefixField.trailingAnchor.constraint(equalTo: self.trailingAnchor, constant: -12),
            namePrefixField.heightAnchor.constraint(equalToConstant: 24),

            // Hide unnamed checkbox
            hideUnnamedCheckbox.topAnchor.constraint(equalTo: namePrefixField.bottomAnchor, constant: 8),
            hideUnnamedCheckbox.leadingAnchor.constraint(equalTo: self.leadingAnchor, constant: 12),

            // Panel bottom
            self.bottomAnchor.constraint(equalTo: hideUnnamedCheckbox.bottomAnchor, constant: 12),
            self.heightAnchor.constraint(greaterThanOrEqualToConstant: 100)
        ])
    }

    @objc private func rssiSliderChanged() {
        let value = Int(rssiSlider.intValue)
        rssiValueLabel.stringValue = "\(value)"
        delegate?.filterPanel(self, didChangeRSSI: value)
    }

    @objc private func rssiPresetClicked(_ sender: NSButton) {
        let value = sender.tag
        rssiSlider.integerValue = value
        rssiValueLabel.stringValue = "\(value)"
        delegate?.filterPanel(self, didChangeRSSI: value)
    }

    @objc private func hideUnnamedToggled() {
        let enabled = hideUnnamedCheckbox.state == .on
        delegate?.filterPanel(self, didToggleHideUnnamed: enabled)
    }

    @objc private func resetFiltersClicked() {
        rssiSlider.integerValue = -100
        rssiValueLabel.stringValue = "-100"
        namePrefixField.stringValue = ""
        hideUnnamedCheckbox.state = .off
        delegate?.filterPanelDidReset(self)
    }

    func controlTextDidChange(_ obj: Notification) {
        guard let textField = obj.object as? NSTextField,
              textField == namePrefixField else { return }
        delegate?.filterPanel(self, didChangeNamePrefix: textField.stringValue)
    }
}
