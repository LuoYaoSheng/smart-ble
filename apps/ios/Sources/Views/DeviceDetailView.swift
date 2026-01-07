//
// SmartBLE - Device Detail View
//

import SwiftUI

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
    @State private var showWriteSheet = false

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
                                showWriteSheet = true
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
        .sheet(isPresented: $showWriteSheet) {
            if let characteristic = characteristic {
                WriteCharacteristicSheet(
                    characteristic: characteristic,
                    serviceId: serviceId,
                    isPresented: $showWriteSheet
                )
                .environmentObject(bleManager)
            }
        }
    }

    private var isNotifying: Bool {
        guard let characteristic = characteristic else { return false }
        return bleManager.isNotifying(serviceUUID: serviceId, characteristicUUID: characteristic.uuid)
    }
}

// MARK: - Write Characteristic Sheet
struct WriteCharacteristicSheet: View {
    @EnvironmentObject var bleManager: BLEManager
    let characteristic: BLECharacteristic
    let serviceId: String
    @Binding var isPresented: Bool

    @State private var inputText = ""
    @State private var selectedFormat: WriteFormat = .hex
    @FocusState private var isInputFocused: Bool

    enum WriteFormat: String, CaseIterable {
        case hex = "HEX"
        case utf8 = "UTF-8"
    }

    var body: some View {
        #if os(iOS)
        NavigationView {
            contentView
                .navigationTitle("写入特征值")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("取消") { isPresented = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("写入") { performWrite() }
                            .disabled(inputText.isEmpty)
                    }
                }
        }
        #else
        VStack(spacing: 0) {
            // Title bar (macOS style)
            HStack {
                Text("写入特征值")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
                Button(action: { isPresented = false }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding()
            .background(Color.gray.opacity(0.1))

            Divider()

            // Content
            ScrollView {
                contentView
            }
        }
        .frame(width: 400, height: 300)
        .onAppear {
            isInputFocused = true
        }
        #endif
    }

    private var contentView: some View {
        Form {
            Section(header: Text("特征值信息")) {
                HStack {
                    Text("UUID")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(characteristic.uuid)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundColor(.primary)
                }
            }

            Section(header: Text("数据")) {
                Picker("格式", selection: $selectedFormat) {
                    ForEach(WriteFormat.allCases, id: \.self) { format in
                        Text(format.rawValue).tag(format)
                    }
                }
                .pickerStyle(.segmented)

                VStack(alignment: .leading, spacing: 4) {
                    Text("输入数据")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    TextField(selectedFormat.placeholder, text: $inputText)
                        .textFieldStyle(.roundedBorder)
                        #if os(iOS)
                        .autocapitalization(.allCharacters)
                        .keyboardType(selectedFormat == .hex ? .asciiCapable : .default)
                        #endif
                        .focused($isInputFocused)
                }
            }

            if selectedFormat == .hex {
                Section(header: Text("提示")) {
                    Text("HEX 格式: 输入十六进制字节，例如 48 65 6C 6C 6F")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .onSubmit {
            performWrite()
        }
    }

    private func performWrite() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        let data: Data
        switch selectedFormat {
        case .hex:
            let cleanHex = text.replacingOccurrences(of: " ", with: "")
            guard cleanHex.count % 2 == 0, cleanHex.allSatisfy({ $0.isHexDigit }) else {
                bleManager.log("Invalid hex input", type: .error)
                return
            }
            data = Data(hex: cleanHex)
        case .utf8:
            data = text.data(using: .utf8) ?? Data()
        }

        bleManager.writeCharacteristic(
            serviceUUID: serviceId,
            characteristicUUID: characteristic.uuid,
            data: data
        )
        isPresented = false
    }
}

extension WriteCharacteristicSheet.WriteFormat {
    var placeholder: String {
        switch self {
        case .hex: return "48 65 6C 6C 6F"
        case .utf8: return "Hello"
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
