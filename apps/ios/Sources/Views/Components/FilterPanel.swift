import SwiftUI

struct FilterPanel: View {
    @EnvironmentObject var bleManager: BLEManager

    var body: some View {
        VStack(spacing: 12) {
            // Filter header with reset button
            HStack {
                Text("过滤条件")
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Spacer()

                Button(action: resetFilters) {
                    Text("重置")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(6)
                }
                .buttonStyle(.plain)
            }

            // RSSI Filter - aligned with UniApp (-100 to -30)
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("信号强度: \(bleManager.filterRSSI) dBm")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }

                HStack {
                    Text("-100")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Slider(value: Binding(
                        get: { Double(bleManager.filterRSSI) },
                        set: { bleManager.filterRSSI = Int($0) }
                    ), in: -100 ... -30, step: 5)
                    Text("-30")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                // Preset buttons - aligned with UniApp
                HStack(spacing: 8) {
                    ForEach([-100, -90, -70, -50], id: \.self) { value in
                        Button(action: { bleManager.filterRSSI = value }) {
                            Text(value == -100 ? "全部" : "\(value)")
                                .font(.caption2)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(bleManager.filterRSSI == value ? Color.blue : Color.gray.opacity(0.2))
                                .foregroundColor(bleManager.filterRSSI == value ? .white : .primary)
                                .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            // Name prefix filter
            HStack(spacing: 12) {
                Text("名称前缀:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                TextField("输入前缀", text: $bleManager.filterNamePrefix)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 120)
                    .font(.caption)

                Spacer()

                // Hide no name toggle
                HStack(spacing: 8) {
                    Text("隐藏无名设备")
                        .font(.caption)
                    Toggle("", isOn: $bleManager.hideNoNameDevices)
                        .toggleStyle(.switch)
                }
            }
        }
        .padding()
        .background(Color.blue.opacity(0.08))
        .transition(.opacity.combined(with: .move(edge: .top)))
    }

    private func resetFilters() {
        bleManager.filterRSSI = -100
        bleManager.filterNamePrefix = ""
        bleManager.hideNoNameDevices = false
    }
}
