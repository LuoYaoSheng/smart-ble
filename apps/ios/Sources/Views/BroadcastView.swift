//
// SmartBLE - Broadcast View (Peripheral Mode)
//

import SwiftUI

struct BroadcastView: View {
    @EnvironmentObject var bleManager: BLEManager
    @State private var advertiseName = "SmartBLE"
    @State private var serviceUUID = "FFF0"
    @State private var isAdvertising = false

    var body: some View {
        VStack(spacing: 20) {
            Text("创建 BLE 广播")
                .font(.title2)
                .fontWeight(.bold)
                .padding(.top)

            Text("让其他设备能够发现并连接到此设备")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Spacer()

            VStack(spacing: 16) {
                // Name Input
                VStack(alignment: .leading, spacing: 8) {
                    Text("广播名称")
                        .font(.headline)

                    TextField("设备名称", text: $advertiseName)
                        .textFieldStyle(.roundedBorder)
                        .disabled(isAdvertising)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)

                // Service UUID Input
                VStack(alignment: .leading, spacing: 8) {
                    Text("服务 UUID")
                        .font(.headline)

                    TextField("FFF0", text: $serviceUUID)
                        .textFieldStyle(.roundedBorder)
                        .autocapitalization(.allCharacters)
                        .disabled(isAdvertising)

                    Text("16位或128位UUID")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)

                // Status
                HStack {
                    Circle()
                        .fill(isAdvertising ? Color.green : Color.gray)
                        .frame(width: 12, height: 12)

                    Text(isAdvertising ? "正在广播" : "未广播")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    Spacer()
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)

                // Start/Stop Button
                Button(action: {
                    if isAdvertising {
                        bleManager.stopAdvertising()
                        isAdvertising = false
                    } else {
                        // Validate UUID
                        if serviceUUID.isEmpty || serviceUUID.count < 4 {
                            return
                        }
                        bleManager.startAdvertising(name: advertiseName, serviceUUIDs: [serviceUUID])
                        isAdvertising = true
                    }
                }) {
                    HStack {
                        Image(systemName: isAdvertising ? "stop.circle.fill" : "play.circle.fill")
                            .font(.title3)

                        Text(isAdvertising ? "停止广播" : "开始广播")
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(isAdvertising ? Color.red : Color.blue)
                    .cornerRadius(12)
                }
                .disabled(serviceUUID.isEmpty)

                // Info
                VStack(alignment: .leading, spacing: 8) {
                    InfoRow(icon: "info.circle", title: "广播说明", text: "设备将以设置的名称和UUID进行广播")

                    InfoRow(icon: "antenna.radiowaves.left.and.right", title: "设备发现", text: "其他设备可以通过扫描发现此广播")

                    InfoRow(icon: "checkmark.circle", title: "连接支持", text: "支持其他设备的连接和数据传输")
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
            }
            .padding()

            Spacer()
        }
        .padding()
    }
}

struct InfoRow: View {
    let icon: String
    let title: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(text)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}
