//
// SmartBLE Desktop for macOS - Write Dialog Component
//

import Cocoa

protocol WriteDialogDelegate: AnyObject {
    func writeDialog(_ dialog: WriteDialog, didSubmitData data: Data, for characteristic: BLECharacteristic, in service: BLEService)
}

class WriteDialog {
    weak var delegate: WriteDialogDelegate?
    
    func show(for characteristic: BLECharacteristic, in service: BLEService) {
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
                let cleanHex = text.replacingOccurrences(of: " ", with: "")
                guard cleanHex.count % 2 == 0 else { return }
                
                var bytes = [UInt8]()
                var index = cleanHex.startIndex
                while index < cleanHex.endIndex {
                    let nextIndex = cleanHex.index(index, offsetBy: 2)
                    if let byte = UInt8(cleanHex[index..<nextIndex], radix: 16) {
                        bytes.append(byte)
                    }
                    index = nextIndex
                }
                data = Data(bytes)
            } else {
                // UTF-8
                data = text.data(using: .utf8) ?? Data()
            }

            delegate?.writeDialog(self, didSubmitData: data, for: characteristic, in: service)
        }
    }
}
