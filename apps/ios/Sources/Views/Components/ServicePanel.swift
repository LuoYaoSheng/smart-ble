import SwiftUI

struct ServicePanel: View {
    @EnvironmentObject var bleManager: BLEManager
    let deviceId: String

    var body: some View {
        Group {
            let services = bleManager.servicesByDevice[deviceId] ?? []
            if services.isEmpty {
                VStack(spacing: 16) {
                    ProgressView()
                    Text(bleManager.connectionStates[deviceId] == .connected ? "正在发现服务..." : "请先连接设备")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(services) { service in
                            ServiceCard(deviceId: deviceId, serviceId: service.id)
                        }
                    }
                    .padding()
                }
            }
        }
    }
}

struct ServiceCard: View {
    @EnvironmentObject var bleManager: BLEManager
    let deviceId: String
    let serviceId: String
    @State private var isExpanded = false
    @State private var hasDiscoveredCharacteristics = false

    private var service: BLEService? {
        bleManager.servicesByDevice[deviceId]?.first { $0.id == serviceId }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
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
                                deviceId: deviceId,
                                serviceId: serviceId,
                                characteristicId: characteristic.id
                            )
                        }
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding()
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation(.spring(response: 0.3)) {
                isExpanded.toggle()
            }
        }
        .onChange(of: isExpanded) { newValue in
            if newValue && !hasDiscoveredCharacteristics {
                if let service = service, let peripheralService = service.peripheralService {
                    bleManager.discoverCharacteristics(for: peripheralService)
                    hasDiscoveredCharacteristics = true
                }
            }
        }
        .onAppear {
            if isExpanded && !hasDiscoveredCharacteristics {
                if let service = service, let peripheralService = service.peripheralService {
                    bleManager.discoverCharacteristics(for: peripheralService)
                    hasDiscoveredCharacteristics = true
                }
            }
        }
    }
}

struct CharacteristicRow: View {
    @EnvironmentObject var bleManager: BLEManager
    let deviceId: String
    let serviceId: String
    let characteristicId: String
    @State private var isExpanded = false
    @State private var showWriteSheet = false

    private var characteristic: BLECharacteristic? {
        guard let service = bleManager.servicesByDevice[deviceId]?.first(where: { $0.id == serviceId }) else {
            return nil
        }
        return service.characteristics.first { $0.id == characteristicId }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
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

            if isExpanded {
                VStack(spacing: 8) {
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

                    HStack(spacing: 8) {
                        if let characteristic = characteristic, characteristic.properties.contains(.read) {
                            Button("读取") {
                                bleManager.readCharacteristic(
                                    deviceId: deviceId,
                                    serviceUUID: serviceId,
                                    characteristicUUID: characteristic.uuid
                                )
                            }
                            .buttonStyle(.bordered)
                        }

                        if let characteristic = characteristic,
                           characteristic.properties.contains(.write) || characteristic.properties.contains(.writeWithoutResponse) {
                            Button("写入") {
                                showWriteSheet = true
                            }
                            .buttonStyle(.bordered)
                        }

                        Spacer()

                        if let characteristic = characteristic,
                           characteristic.properties.contains(.notify) || characteristic.properties.contains(.indicate) {
                            Button(isNotifying ? "停止通知" : "通知") {
                                bleManager.setNotification(
                                    deviceId: deviceId,
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
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation(.spring(response: 0.3)) {
                isExpanded.toggle()
            }
        }
        .sheet(isPresented: $showWriteSheet) {
            if let characteristic = characteristic {
                WriteDialog(
                    characteristic: characteristic,
                    deviceId: deviceId,
                    serviceId: serviceId,
                    isPresented: $showWriteSheet
                )
            }
        }
    }

    private var isNotifying: Bool {
        guard let characteristic = characteristic else { return false }
        return bleManager.isNotifying(deviceId: deviceId, serviceUUID: serviceId, characteristicUUID: characteristic.uuid)
    }
}
