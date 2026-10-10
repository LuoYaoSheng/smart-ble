import SwiftUI

struct ServicePanel: View {
    @EnvironmentObject var bleManager: BLEManager
    let deviceId: String

    var body: some View {
        let services = bleManager.servicesByDevice[deviceId] ?? []
        if services.isEmpty {
            HStack(alignment: .top, spacing: 12) {
                ProgressView().tint(NativeDS.primary)
                VStack(alignment: .leading, spacing: 3) {
                    Text(bleManager.connectionStates[deviceId] == .connected ? "正在发现服务…" : "未初始化")
                        .scaledFont(15, .bold)
                    Text(bleManager.connectionStates[deviceId] == .connected ? "等待 CoreBluetooth 返回服务与特征值" : "点击「连接设备」建立 GATT 会话。")
                        .scaledFont(13)
                        .foregroundColor(NativeDS.sub)
                }
                Spacer()
            }
            .nativeCard()
        } else {
            LazyVStack(spacing: 10) {
                ForEach(services) { service in
                    ServiceCard(deviceId: deviceId, serviceId: service.id)
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

    private var service: BLEService? {
        bleManager.servicesByDevice[deviceId]?.first { $0.id == serviceId }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button(action: { withAnimation(.easeInOut(duration: 0.18)) { isExpanded.toggle() } }) {
                HStack(spacing: 8) {
                    Image(systemName: isOta ? "arrow.down.circle" : "cpu")
                        .foregroundColor(isOta ? NativeDS.danger : NativeDS.primary)
                    Text(service?.name ?? "未知服务")
                        .scaledFont(15, .bold)
                        .foregroundColor(NativeDS.ink)
                    Text(shortUuid)
                        .scaledFont(10, design: .monospaced)
                        .foregroundColor(NativeDS.sub)
                        .padding(.horizontal, 7).padding(.vertical, 2)
                        .background(NativeDS.fill).clipShape(Capsule())
                    Spacer()
                    Image(systemName: "chevron.right")
                        .scaledFont(11, .semibold)
                        .foregroundColor(NativeDS.placeholder)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
            }
            .buttonStyle(.plain)

            if isExpanded {
                if let service, service.characteristics.isEmpty {
                    Text("正在发现特征值…")
                        .scaledFont(11)
                        .foregroundColor(NativeDS.muted)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                } else if let service {
                    VStack(spacing: 8) {
                        ForEach(service.characteristics) { characteristic in
                            CharacteristicRow(
                                deviceId: deviceId,
                                serviceId: serviceId,
                                characteristicId: characteristic.id
                            )
                        }
                    }
                }
            }
        }
        .nativeCard()
        .onChange(of: isExpanded) { expanded in
            if expanded, let service, let peripheralService = service.peripheralService {
                bleManager.discoverCharacteristics(for: peripheralService)
            }
        }
    }

    private var shortUuid: String {
        guard let uuid = service?.uuid else { return "" }
        return uuid.count > 8 ? "\(uuid.prefix(8))…" : uuid
    }

    private var isOta: Bool {
        service?.uuid.uppercased().hasPrefix("4FAFC201") == true
    }
}

struct CharacteristicRow: View {
    @EnvironmentObject var bleManager: BLEManager
    let deviceId: String
    let serviceId: String
    let characteristicId: String
    @State private var showWriteSheet = false

    private var characteristic: BLECharacteristic? {
        bleManager.servicesByDevice[deviceId]?
            .first(where: { $0.id == serviceId })?
            .characteristics
            .first(where: { $0.id == characteristicId })
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Text(characteristic?.name ?? "未知特征值")
                    .scaledFont(13, .semibold)
                if let characteristic {
                    ForEach(characteristic.properties.description, id: \.self) { property in
                        Text(property.lowercased())
                            .scaledFont(9, .semibold)
                            .foregroundColor(property.lowercased().contains("write") ? NativeDS.success : property.lowercased().contains("notify") ? NativeDS.warning : NativeDS.primary)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(NativeDS.primaryWeak.opacity(0.7))
                            .clipShape(RoundedRectangle(cornerRadius: 5))
                    }
                }
                Spacer()
            }

            Text(characteristic?.uuid ?? "")
                .scaledFont(10, design: .monospaced)
                .foregroundColor(NativeDS.muted)

            if let value = characteristic?.value {
                Text(value)
                    .scaledFont(10, design: .monospaced)
                    .foregroundColor(NativeDS.sub)
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            }

            HStack(spacing: 8) {
                if characteristic?.properties.contains(.read) == true {
                    smallButton("读取") {
                        guard let characteristic else { return }
                        bleManager.readCharacteristic(deviceId: deviceId, serviceUUID: serviceId, characteristicUUID: characteristic.uuid)
                    }
                }
                if characteristic?.properties.contains(.write) == true
                    || characteristic?.properties.contains(.writeWithoutResponse) == true {
                    smallButton("写入") { showWriteSheet = true }
                }
                if characteristic?.properties.contains(.notify) == true
                    || characteristic?.properties.contains(.indicate) == true {
                    smallButton(isNotifying ? "停止监听" : "开始监听", outlined: true) {
                        guard let characteristic else { return }
                        bleManager.setNotification(
                            deviceId: deviceId,
                            serviceUUID: serviceId,
                            characteristicUUID: characteristic.uuid,
                            enabled: !isNotifying
                        )
                    }
                }
                Spacer()
            }
        }
        .padding(12)
        .background(NativeDS.fill)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .sheet(isPresented: $showWriteSheet) {
            if let characteristic {
                WriteDialog(
                    characteristic: characteristic,
                    deviceId: deviceId,
                    serviceId: serviceId,
                    isPresented: $showWriteSheet
                )
            }
        }
    }

    private func smallButton(_ title: String, outlined: Bool = false, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .buttonStyle(.plain)
            .scaledFont(12, .semibold)
            .foregroundColor(outlined ? NativeDS.primary : NativeDS.ink)
            .padding(.horizontal, 12)
            .frame(height: 32)
            .background(outlined ? Color.clear : Color.white)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(outlined ? NativeDS.primary : NativeDS.line))
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var isNotifying: Bool {
        guard let characteristic else { return false }
        return bleManager.isNotifying(deviceId: deviceId, serviceUUID: serviceId, characteristicUUID: characteristic.uuid)
    }
}
