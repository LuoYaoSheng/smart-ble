//
// SmartBLE - Device Detail View
//

import SwiftUI
import AppKit

struct DeviceDetailView: View {
    @EnvironmentObject var bleManager: BLEManager

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header

            // Content
            if bleManager.connectedDevice != nil {
                servicesContent
            } else {
                noDeviceContent
            }
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                if let device = bleManager.connectedDevice {
                    Text(device.name)
                        .font(.headline)

                    Text(connectionText)
                        .font(.caption)
                        .foregroundColor(connectionColor)
                } else {
                    Text("未连接设备")
                        .font(.headline)
                }
            }

            Spacer()

            if bleManager.connectedDevice != nil {
                Button(action: {
                    bleManager.disconnect()
                }) {
                    Text("断开")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.red)
                        .cornerRadius(16)
                }
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
    }

    private var connectionText: String {
        switch bleManager.connectionState {
        case .connected:
            return "已连接"
        case .connecting:
            return "连接中..."
        case .disconnecting:
            return "断开中..."
        case .disconnected:
            return "未连接"
        }
    }

    private var connectionColor: Color {
        switch bleManager.connectionState {
        case .connected:
            return .green
        case .connecting:
            return .orange
        case .disconnecting:
            return .orange
        case .disconnected:
            return .gray
        }
    }

    private var noDeviceContent: some View {
        VStack(spacing: 16) {
            Image(systemName: "antenna.radiowaves.left.and.right.slash")
                .font(.system(size: 50))
                .foregroundColor(.gray.opacity(0.5))

            Text("请先连接设备")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("在扫描页面点击设备进行连接")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var servicesContent: some View {
        Group {
            if bleManager.services.isEmpty {
                VStack(spacing: 16) {
                    ProgressView()
                    Text(bleManager.connectionState == .connected ? "正在发现服务..." : "请先连接设备")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                // Services are auto-discovered on connection
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(bleManager.services) { service in
                            ServiceCard(serviceId: service.id)
                                .environmentObject(bleManager)
                        }
                    }
                    .padding()
                }
            }
        }
    }
}

// MARK: - Service Card
struct ServiceCard: View {
    @EnvironmentObject var bleManager: BLEManager
    let serviceId: String  // Use ID to look up latest data
    @State private var isExpanded = false
    @State private var hasDiscoveredCharacteristics = false

    // Computed property to get latest service data
    private var service: BLEService? {
        bleManager.services.first { $0.id == serviceId }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Service Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(service?.name ?? "Unknown Service")
                        .font(.headline)
                        .foregroundColor(.primary)

                    Text(service?.uuid ?? "")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .foregroundColor(.secondary)
            }

            // Characteristics
            if isExpanded {
                VStack(spacing: 8) {
                    if let service = service, service.characteristics.isEmpty {
                        Text("正在发现特征值...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding()
                    } else if let service = service {
                        ForEach(service.characteristics) { characteristic in
                            CharacteristicRow(
                                serviceId: serviceId,
                                characteristicId: characteristic.id
                            )
                            .environmentObject(bleManager)
                        }
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding()
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
        .contentShape(Rectangle())  // Make entire area clickable
        .onTapGesture {
            withAnimation(.spring(response: 0.3)) {
                isExpanded.toggle()
            }
        }
        .onChange(of: isExpanded) { newValue in
            // Discover characteristics when expanded
            if newValue && !hasDiscoveredCharacteristics {
                if let service = service, let peripheralService = service.peripheralService {
                    bleManager.discoverCharacteristics(for: peripheralService)
                    hasDiscoveredCharacteristics = true
                }
            }
        }
        .onAppear {
            // Also discover on appear in case service is already expanded
            if isExpanded && !hasDiscoveredCharacteristics {
                if let service = service, let peripheralService = service.peripheralService {
                    bleManager.discoverCharacteristics(for: peripheralService)
                    hasDiscoveredCharacteristics = true
                }
            }
        }
    }
}

// MARK: - Characteristic Row
struct CharacteristicRow: View {
    @EnvironmentObject var bleManager: BLEManager
    let serviceId: String
    let characteristicId: String
    @State private var isExpanded = false

    // Computed property to get latest characteristic data
    private var characteristic: BLECharacteristic? {
        guard let service = bleManager.services.first(where: { $0.id == serviceId }) else {
            return nil
        }
        return service.characteristics.first { $0.id == characteristicId }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Characteristic Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(characteristic?.name ?? "Unknown Characteristic")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)

                    Text(characteristic?.uuid ?? "")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Properties badges
                if let characteristic = characteristic {
                    HStack(spacing: 4) {
                        ForEach(Array(characteristic.properties.description), id: \.self) { prop in
                            Text(prop)
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(4)
                        }
                    }
                }

                Image(systemName: isExpanded ? "chevron.up" : "chevron.down.circle.fill")
                    .foregroundColor(.blue)
            }

            // Value and Actions
            if isExpanded {
                VStack(spacing: 8) {
                    // Value display
                    if let value = characteristic?.value {
                        HStack {
                            Text("值:")
                                .font(.caption)
                                .foregroundColor(.secondary)

                            Text(value)
                                .font(.system(.caption, design: .monospaced))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.gray.opacity(0.15))
                                .cornerRadius(6)
                        }
                    }

                    // Action buttons
                    HStack(spacing: 8) {
                        // Read
                        if let characteristic = characteristic, characteristic.properties.contains(.read) {
                            Button("读取") {
                                bleManager.readCharacteristic(
                                    serviceUUID: serviceId,
                                    characteristicUUID: characteristic.uuid
                                )
                            }
                            .buttonStyle(.bordered)
                        }

                        // Write
                        if let characteristic = characteristic,
                           characteristic.properties.contains(.write) || characteristic.properties.contains(.writeWithoutResponse) {
                            Button("写入") {
                                showWriteDialog(characteristic: characteristic)
                            }
                            .buttonStyle(.bordered)
                        }

                        Spacer()

                        // Notify
                        if let characteristic = characteristic,
                           characteristic.properties.contains(.notify) || characteristic.properties.contains(.indicate) {
                            Button(isNotifying ? "停止通知" : "通知") {
                                bleManager.setNotification(
                                    serviceUUID: serviceId,
                                    characteristicUUID: characteristic.uuid,
                                    enabled: !isNotifying
                                )
                            }
                            .buttonStyle(.bordered)
                            .foregroundColor(isNotifying ? .red : .blue)
                        }
                    }
                }
                .padding(.top, 4)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color.gray.opacity(0.15))
        .cornerRadius(10)
        .contentShape(Rectangle())  // Make entire area clickable
        .onTapGesture {
            withAnimation(.spring(response: 0.3)) {
                isExpanded.toggle()
            }
        }
    }

    // MARK: - Write Dialog
    private func showWriteDialog(characteristic: BLECharacteristic) {
        // Use NSAlert with accessoryView - the most reliable approach
        let alert = NSAlert()
        alert.messageText = "写入特征值"
        alert.informativeText = "特征值: \(characteristic.uuid)\n\n请选择格式并输入数据"
        alert.alertStyle = .informational

        // Create the input field
        let inputField = NSTextField(frame: NSRect(x: 0, y: 0, width: 300, height: 24))
        inputField.placeholderString = "请输入数据 (HEX或文本)"
        inputField.isEditable = true
        inputField.isSelectable = true
        inputField.isBordered = true
        inputField.bezelStyle = .roundedBezel

        // Create format popup
        let formatPopup = NSPopUpButton(frame: NSRect(x: 0, y: 30, width: 120, height: 26))
        formatPopup.addItems(withTitles: ["HEX", "UTF-8"])
        formatPopup.selectItem(at: 0)

        // Container view
        let containerView = NSView(frame: NSRect(x: 0, y: 0, width: 300, height: 60))
        containerView.addSubview(formatPopup)
        containerView.addSubview(inputField)

        alert.accessoryView = containerView

        // Add buttons (Enter key activates second button)
        alert.addButton(withTitle: "取消")
        alert.addButton(withTitle: "写入")

        // Show alert as a modal sheet
        let response = alert.runModal()

        if response == .alertSecondButtonReturn {
            let text = inputField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { return }

            let data: Data
            if formatPopup.indexOfSelectedItem == 0 {
                // HEX
                let cleanHex = text.replacingOccurrences(of: " ", with: "")
                guard cleanHex.count % 2 == 0 else {
                    bleManager.log("Invalid hex input: length must be even", type: .error)
                    return
                }
                data = Data(hex: cleanHex)
            } else {
                // UTF-8
                data = text.data(using: .utf8) ?? Data()
            }

            bleManager.writeCharacteristic(
                serviceUUID: serviceId,
                characteristicUUID: characteristic.uuid,
                data: data
            )
        }
    }

    private var isNotifying: Bool {
        guard let characteristic = characteristic else { return false }
        return bleManager.isNotifying(serviceUUID: serviceId, characteristicUUID: characteristic.uuid)
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
