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
            if let device = bleManager.connectedDevice {
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
                    Text("正在发现服务...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .onAppear {
                    bleManager.discoverServices()
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(bleManager.services) { service in
                            ServiceCard(service: service)
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
    let service: BLEService
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Service Header
            Button(action: {
                withAnimation(.spring(response: 0.3)) {
                    isExpanded.toggle()
                }
            }) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(service.name)
                            .font(.headline)
                            .foregroundColor(.primary)

                        Text(service.uuid)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(PlainButtonStyle())

            // Characteristics
            if isExpanded {
                VStack(spacing: 8) {
                    if service.characteristics.isEmpty {
                        Text("无特征值")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding()
                    } else {
                        ForEach(service.characteristics) { characteristic in
                            CharacteristicRow(
                                serviceUUID: service.uuid,
                                characteristic: characteristic
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
    }
}

// MARK: - Characteristic Row
struct CharacteristicRow: View {
    @EnvironmentObject var bleManager: BLEManager
    let serviceUUID: String
    let characteristic: BLECharacteristic
    @State private var isExpanded = false
    @State private var showingWriteDialog = false
    @State private var writeInput = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Characteristic Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(characteristic.name)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    Text(characteristic.uuid)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Properties badges
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

            // Value and Actions
            if isExpanded {
                VStack(spacing: 8) {
                    // Value display
                    if let value = characteristic.value {
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
                        if characteristic.properties.contains(.read) {
                            Button("读取") {
                                bleManager.readCharacteristic(
                                    serviceUUID: serviceUUID,
                                    characteristicUUID: characteristic.uuid
                                )
                            }
                            .buttonStyle(.bordered)
                        }

                        // Write
                        if characteristic.properties.contains(.write) || characteristic.properties.contains(.writeWithoutResponse) {
                            Button("写入") {
                                showingWriteDialog = true
                            }
                            .buttonStyle(.bordered)
                        }

                        Spacer()

                        // Notify
                        if characteristic.properties.contains(.notify) || characteristic.properties.contains(.indicate) {
                            Button(isNotifying ? "停止通知" : "通知") {
                                bleManager.setNotification(
                                    serviceUUID: serviceUUID,
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

            // Expand button
            Button(action: {
                withAnimation(.spring(response: 0.3)) {
                    isExpanded.toggle()
                }
            }) {
                HStack {
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down.circle.fill")
                        .foregroundColor(.blue)
                }
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color.gray.opacity(0.15))
        .cornerRadius(10)
        .sheet(isPresented: $showingWriteDialog) {
            writeDialog
        }
    }

    private var isNotifying: Bool {
        // This would be tracked in the manager
        return false
    }

    private var writeDialog: some View {
        NavigationView {
            Form {
                Section(header: Text("数据格式")) {
                    Picker("格式", selection: $format) {
                        Text("HEX").tag("hex")
                        Text("UTF-8").tag("utf8")
                    }
                    .pickerStyle(.segmented)
                }

                Section(header: Text("输入数据")) {
                    TextEditor(text: $writeInput)
                        .font(.body)
                        .frame(minHeight: 100)
                }

                Section {
                    Button("写入") {
                        performWrite()
                    }
                    .disabled(writeInput.isEmpty)
                }
            }
            .navigationTitle("写入特征值")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        showingWriteDialog = false
                    }
                }
            }
        }
    }

    @State private var format = "hex"

    private func performWrite() {
        let data: Data
        if format == "hex" {
            let cleanHex = writeInput.replacingOccurrences(of: " ", with: "")
            guard cleanHex.count % 2 == 0 else {
                return
            }
            data = Data(hex: cleanHex)
        } else {
            data = writeInput.data(using: .utf8) ?? Data()
        }

        bleManager.writeCharacteristic(
            serviceUUID: serviceUUID,
            characteristicUUID: characteristic.uuid,
            data: data
        )

        showingWriteDialog = false
        writeInput = ""
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
