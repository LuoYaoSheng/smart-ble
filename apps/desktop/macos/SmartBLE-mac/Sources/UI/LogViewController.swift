//
// SmartBLE Desktop for macOS - Log View Controller
//

import Cocoa
import Combine

class LogViewController: NSViewController {
    // MARK: - Properties
    var bleManager: BLEManager?
    private var cancellables = Set<AnyCancellable>()

    // MARK: - UI Components
    private var logPanel: LogPanel!
    private var clearButton: NSButton!
    private var countLabel: NSTextField!

    // MARK: - Lifecycle
    override func loadView() {
        view = NSView()
        setupUI()
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupBindings()
    }

    // MARK: - Setup UI
    private func setupUI() {
        // Toolbar
        let toolbar = NSView()
        toolbar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(toolbar)

        // Clear button
        clearButton = NSButton(title: "Clear", target: self, action: #selector(clearLogs))
        clearButton.bezelStyle = .rounded
        clearButton.font = .systemFont(ofSize: 10)
        clearButton.translatesAutoresizingMaskIntoConstraints = false
        toolbar.addSubview(clearButton)

        // Count label
        countLabel = NSTextField(labelWithString: "0 entries")
        countLabel.font = .systemFont(ofSize: 10)
        countLabel.textColor = .secondaryLabelColor
        countLabel.translatesAutoresizingMaskIntoConstraints = false
        countLabel.isEditable = false
        countLabel.isBordered = false
        countLabel.backgroundColor = .clear
        toolbar.addSubview(countLabel)

        // Log panel
        logPanel = LogPanel()
        logPanel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(logPanel)

        NSLayoutConstraint.activate([
            // Toolbar
            toolbar.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            toolbar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            toolbar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -12),
            toolbar.heightAnchor.constraint(equalToConstant: 24),

            clearButton.leadingAnchor.constraint(equalTo: toolbar.leadingAnchor),
            clearButton.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor),

            countLabel.trailingAnchor.constraint(equalTo: toolbar.trailingAnchor),
            countLabel.centerYAnchor.constraint(equalTo: toolbar.centerYAnchor),

            // Log panel
            logPanel.topAnchor.constraint(equalTo: toolbar.bottomAnchor, constant: 8),
            logPanel.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            logPanel.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            logPanel.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func setupBindings() {
        // Bindings will be set when BLE manager is assigned
    }

    func setBLEManager(_ manager: BLEManager) {
        self.bleManager = manager

        manager.$logs
            .receive(on: DispatchQueue.main)
            .sink { [weak self] logs in
                self?.updateLogs(logs)
            }
            .store(in: &cancellables)
    }

    private func updateLogs(_ logs: [BLEManager.LogEntry]) {
        // Clear panel first using its method (or manually clear string)
        logPanel.clearLogs()

        for log in logs { // Use ascending if LogPanel appends, or reversed depending on desired visual
            let timestamp = DateFormatter.localizedString(from: log.timestamp, dateStyle: .none, timeStyle: .medium)
            let prefix = "[\(timestamp)] "

            let color: NSColor
            switch log.type {
            case .info: color = .labelColor
            case .success: color = .systemGreen
            case .error: color = .systemRed
            case .warning: color = .systemOrange
            }

            logPanel.appendLog("\(prefix)\(log.message)", color: color)
        }

        // Update count
        countLabel.stringValue = "\(logs.count) entries"
    }

    @objc private func clearLogs() {
        bleManager?.logs.removeAll()
        updateLogs([])
    }
}
