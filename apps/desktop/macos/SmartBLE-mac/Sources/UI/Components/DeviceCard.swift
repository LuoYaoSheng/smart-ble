//
// SmartBLE Desktop for macOS - Device Card Component
//

import Cocoa

protocol DeviceCardDelegate: AnyObject {
    func deviceCardDidClickConnect(_ card: DeviceCard, device: BLEDevice)
}

class DeviceCard: NSTableCellView {
    weak var delegate: DeviceCardDelegate?
    
    private var device: BLEDevice?
    
    // UI Elements
    private var backgroundBox: NSBox!
    private var nameLabel: NSTextField!
    private var idLabel: NSTextField!
    private var rssiLabel: NSTextField!
    private var connectButton: NSButton!
    private var typeTagLabel: NSTextField!
    
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
        
        // Background card
        backgroundBox = NSBox()
        backgroundBox.boxType = .custom
        backgroundBox.borderType = .noBorder
        backgroundBox.cornerRadius = 8
        backgroundBox.fillColor = NSColor.controlBackgroundColor
        backgroundBox.translatesAutoresizingMaskIntoConstraints = false
        self.addSubview(backgroundBox)
        
        // Name Label
        nameLabel = NSTextField(labelWithString: "Unknown Device")
        nameLabel.font = .systemFont(ofSize: 13, weight: .medium)
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        backgroundBox.addSubview(nameLabel)
        
        // ID Label
        idLabel = NSTextField(labelWithString: "00:00:00:00:00:00")
        idLabel.font = .monospacedSystemFont(ofSize: 10, weight: .regular)
        idLabel.textColor = .secondaryLabelColor
        idLabel.translatesAutoresizingMaskIntoConstraints = false
        backgroundBox.addSubview(idLabel)
        
        // Type Tag
        typeTagLabel = NSTextField(labelWithString: "BLE")
        typeTagLabel.font = .systemFont(ofSize: 9, weight: .bold)
        typeTagLabel.textColor = .white
        typeTagLabel.backgroundColor = NSColor.systemBlue
        typeTagLabel.isBordered = false
        typeTagLabel.isEditable = false
        typeTagLabel.alignment = .center
        typeTagLabel.wantsLayer = true
        typeTagLabel.layer?.cornerRadius = 4
        typeTagLabel.translatesAutoresizingMaskIntoConstraints = false
        backgroundBox.addSubview(typeTagLabel)
        
        // RSSI Label
        rssiLabel = NSTextField(labelWithString: "-100 dBm")
        rssiLabel.font = .systemFont(ofSize: 11)
        rssiLabel.textColor = .secondaryLabelColor
        rssiLabel.translatesAutoresizingMaskIntoConstraints = false
        backgroundBox.addSubview(rssiLabel)
        
        // Connect Button
        connectButton = NSButton(title: "Connect", target: self, action: #selector(connectClicked))
        connectButton.bezelStyle = .rounded
        connectButton.translatesAutoresizingMaskIntoConstraints = false
        backgroundBox.addSubview(connectButton)
        
        NSLayoutConstraint.activate([
            backgroundBox.topAnchor.constraint(equalTo: self.topAnchor, constant: 4),
            backgroundBox.leadingAnchor.constraint(equalTo: self.leadingAnchor, constant: 8),
            backgroundBox.trailingAnchor.constraint(equalTo: self.trailingAnchor, constant: -8),
            backgroundBox.bottomAnchor.constraint(equalTo: self.bottomAnchor, constant: -4),
            
            nameLabel.leadingAnchor.constraint(equalTo: backgroundBox.leadingAnchor, constant: 12),
            nameLabel.topAnchor.constraint(equalTo: backgroundBox.topAnchor, constant: 10),
            
            typeTagLabel.leadingAnchor.constraint(equalTo: nameLabel.trailingAnchor, constant: 8),
            typeTagLabel.centerYAnchor.constraint(equalTo: nameLabel.centerYAnchor),
            typeTagLabel.widthAnchor.constraint(equalToConstant: 30),
            
            idLabel.leadingAnchor.constraint(equalTo: backgroundBox.leadingAnchor, constant: 12),
            idLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 4),
            
            rssiLabel.trailingAnchor.constraint(equalTo: connectButton.leadingAnchor, constant: -16),
            rssiLabel.centerYAnchor.constraint(equalTo: backgroundBox.centerYAnchor),
            
            connectButton.trailingAnchor.constraint(equalTo: backgroundBox.trailingAnchor, constant: -12),
            connectButton.centerYAnchor.constraint(equalTo: backgroundBox.centerYAnchor),
            connectButton.widthAnchor.constraint(equalToConstant: 80)
        ])
    }
    
    func configure(with device: BLEDevice, connectionState: ConnectionState? = nil) {
        self.device = device
        nameLabel.stringValue = device.name.isEmpty ? "Unknown Device" : device.name
        idLabel.stringValue = String(device.id.prefix(12)) // Show reasonable ID portion
        rssiLabel.stringValue = "\(device.rssi) dBm"
        
        if let state = connectionState {
            switch state {
            case .connecting:
                connectButton.title = "Connecting..."
                connectButton.isEnabled = false
            case .connected:
                connectButton.title = "Connected"
                connectButton.isEnabled = false
            case .disconnecting:
                connectButton.title = "Disconnecting..."
                connectButton.isEnabled = false
            case .disconnected:
                connectButton.title = "Connect"
                connectButton.isEnabled = true
            }
        } else {
            connectButton.title = "Connect"
            connectButton.isEnabled = true
        }
    }
    
    @objc private func connectClicked() {
        guard let device = device else { return }
        delegate?.deviceCardDidClickConnect(self, device: device)
    }
}
