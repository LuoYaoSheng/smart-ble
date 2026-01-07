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
    private var scrollView: NSScrollView!
    private var textView: NSTextView!
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

        // Scroll view
        scrollView = NSScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.borderType = .noBorder
        view.addSubview(scrollView)

        // Text view
        textView = NSTextView()
        textView.isEditable = false
        textView.isSelectable = true
        textView.font = .monospacedSystemFont(ofSize: 10, weight: .regular)
        textView.textColor = .labelColor
        textView.backgroundColor = .textBackgroundColor
        textView.textContainer?.containerSize = NSSize(width: scrollView.contentSize.width, height: CGFloat.greatestFiniteMagnitude)
        textView.textContainer?.widthTracksTextView = true
        textView.textContainer?.heightTracksTextView = false
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false
        scrollView.documentView = textView

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

            // Scroll view
            scrollView.topAnchor.constraint(equalTo: toolbar.bottomAnchor, constant: 8),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
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
        guard let textView = textView else { return }

        let attributedString = NSMutableAttributedString()

        for log in logs.reversed() {
            let timestamp = DateFormatter.localizedString(from: log.timestamp, dateStyle: .none, timeStyle: .medium)
            let prefix = "[\(timestamp)] "

            let color: NSColor
            switch log.type {
            case .info: color = .labelColor
            case .success: color = .systemGreen
            case .error: color = .systemRed
            case .warning: color = .systemOrange
            }

            let entry = NSAttributedString(
                string: "\(prefix)\(log.message)\n",
                attributes: [.foregroundColor: color]
            )
            attributedString.append(entry)
        }

        textView.textStorage?.setAttributedString(attributedString)

        // Update count
        countLabel.stringValue = "\(logs.count) entries"

        // Scroll to top
        let clipView = scrollView.contentView
        textView.scroll(NSPoint(x: 0, y: clipView.bounds.height))
    }

    @objc private func clearLogs() {
        bleManager?.logs.removeAll()
        updateLogs([])
    }
}
