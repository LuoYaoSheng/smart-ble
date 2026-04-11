import SwiftUI

struct DeviceCard: View {
    @EnvironmentObject var bleManager: BLEManager
    let device: ScanResult
    var isConnectionTab: Bool = false
    var onAction: (() -> Void)? = nil

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            ZStack {
                Circle()
                    .fill(isDeviceConnected ? Color.green.opacity(0.1) : Color.blue.opacity(0.1))
                    .frame(width: 50, height: 50)

                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.title3)
                    .foregroundColor(isDeviceConnected ? .green : .blue)
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(device.name)
                        .font(.headline)

                    // Device type label
                    deviceTypeLabel
                }

                Text(device.id.prefix(8) + "...")
                    .font(.caption)
                    .foregroundColor(.secondary)

                if !device.serviceUUIDs.isEmpty {
                    Text(device.serviceUUIDs.prefix(3).joined(separator: ", "))
                        .font(.caption2)
                        .foregroundColor(.blue)
                }
            }

            Spacer()

            // RSSI or Action Button
            if isConnectionTab {
                Button(action: {
                    if let action = onAction {
                        action()
                    } else if isDeviceConnected {
                        bleManager.disconnect(deviceId: device.id)
                    } else {
                        bleManager.connect(to: device)
                    }
                }) {
                    Text(isDeviceConnected ? "断开" : "连接")
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(isDeviceConnected ? Color.red.opacity(0.1) : Color.blue.opacity(0.1))
                        .foregroundColor(isDeviceConnected ? .red : .blue)
                        .cornerRadius(12)
                }
                .buttonStyle(.plain)
            } else {
                VStack(alignment: .trailing, spacing: 4) {
                    HStack(spacing: 2) {
                        ForEach(0..<4) { i in
                            RoundedRectangle(cornerRadius: 2)
                                .fill(i < bleManager.getSignalBars(rssi: device.rssi) ? Color.green : Color.gray.opacity(0.3))
                                .frame(width: 4, height: CGFloat(4 + i * 3))
                        }
                    }

                    Text("\(device.rssi) dBm")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
    }

    private var isDeviceConnected: Bool {
        bleManager.isDeviceConnected(device.id)
    }

    private var deviceTypeLabel: some View {
        Group {
            if device.name.lowercased().contains("ble") {
                Text("BLE")
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.8))
                    .foregroundColor(.white)
                    .cornerRadius(4)
            } else if device.name.lowercased().contains("bluetooth") {
                Text("BT")
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.8))
                    .foregroundColor(.white)
                    .cornerRadius(4)
            }
        }
    }
}
