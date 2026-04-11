//
// SmartBLE Desktop for macOS - Log Panel Component
//

import Cocoa

class LogPanel: NSView {
    private var scrollView: NSScrollView!
    private var textView: NSTextView!
    
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
        self.layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor
        self.layer?.cornerRadius = 6
        self.layer?.borderWidth = 1
        self.layer?.borderColor = NSColor.separatorColor.cgColor
        
        scrollView = NSScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.hasVerticalScroller = true
        scrollView.borderType = .noBorder
        
        textView = NSTextView()
        textView.isEditable = false
        textView.isSelectable = true
        textView.backgroundColor = .clear
        textView.textContainerInset = NSSize(width: 8, height: 8)
        textView.font = .monospacedSystemFont(ofSize: 11, weight: .regular)
        
        scrollView.documentView = textView
        self.addSubview(scrollView)
        
        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: self.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: self.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: self.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: self.bottomAnchor)
        ])
    }
    
    func appendLog(_ message: String, color: NSColor = .labelColor) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let attributes: [NSAttributedString.Key: Any] = [
                .foregroundColor: color,
                .font: NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)
            ]
            let attributedString = NSAttributedString(string: message + "\n", attributes: attributes)
            self.textView.textStorage?.append(attributedString)
            self.textView.scrollToEndOfDocument(nil)
        }
    }
    
    func clearLogs() {
        DispatchQueue.main.async { [weak self] in
            self?.textView.string = ""
        }
    }
}
