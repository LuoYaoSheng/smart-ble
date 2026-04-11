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
    private var servicePanel: ServicePanel!
    private var placeholderView: NSView!
    private var writeDialog: WriteDialog!

    // MARK: - Lifecycle
    override func loadView() {
        view = NSView()
        setupUI()
        writeDialog = WriteDialog()
        writeDialog.delegate = self
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        showNoDevice()
    }

    // MARK: - Setup UI
    private func setupUI() {
        servicePanel = ServicePanel()
        servicePanel.delegate = self
        servicePanel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(servicePanel)

        // Create placeholder
        placeholderView = createPlaceholderView()
        placeholderView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(placeholderView)

        NSLayoutConstraint.activate([
            servicePanel.topAnchor.constraint(equalTo: view.topAnchor),
            servicePanel.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            servicePanel.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            servicePanel.bottomAnchor.constraint(equalTo: view.bottomAnchor),

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
        servicePanel.configure(with: bleManager?.services ?? [])
    }

    func showNoDevice() {
        placeholderView.isHidden = false
    }

    func setBLEManager(_ manager: BLEManager) {
        self.bleManager = manager

        manager.$services
            .receive(on: DispatchQueue.main)
            .sink { [weak self] services in
                self?.servicePanel.configure(with: services)
            }
            .store(in: &cancellables)
    }
}

// MARK: - ServicePanelDelegate
extension DeviceDetailViewController: ServicePanelDelegate {
    func servicePanel(_ panel: ServicePanel, didRequestRead characteristic: BLECharacteristic, in service: BLEService) {
        bleManager?.readCharacteristic(serviceUUID: service.uuid, characteristicUUID: characteristic.uuid)
    }

    func servicePanel(_ panel: ServicePanel, didRequestWrite characteristic: BLECharacteristic, in service: BLEService) {
        writeDialog.show(for: characteristic, in: service)
    }

    func servicePanel(_ panel: ServicePanel, didToggleNotify characteristic: BLECharacteristic, in service: BLEService, enabled: Bool) {
        bleManager?.setNotification(serviceUUID: service.uuid, characteristicUUID: characteristic.uuid, enabled: enabled)
    }
}

// MARK: - WriteDialogDelegate
extension DeviceDetailViewController: WriteDialogDelegate {
    func writeDialog(_ dialog: WriteDialog, didSubmitData data: Data, for characteristic: BLECharacteristic, in service: BLEService) {
        bleManager?.writeCharacteristic(serviceUUID: service.uuid, characteristicUUID: characteristic.uuid, data: data)
    }
}
