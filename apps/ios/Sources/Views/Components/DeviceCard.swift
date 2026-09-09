import SmartHidCore
import SwiftUI

struct DeviceCard: View {
    @EnvironmentObject var bleManager: BLEManager
    let device: ScanResult
    var isConnectionTab = false
    var onAction: (() -> Void)?
    var onGattAction: (() -> Void)?
    var onSmartHidAction: (() -> Void)?

    var body: some View {
        VStack(spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                avatar

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(displayName)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(NativeDS.ink)
                            .lineLimit(1)
                        if let smartHidMatch {
                            Text(smartHidMatch == .strong ? "Smart HID · 强匹配" : "Smart HID · 弱匹配")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundColor(NativeDS.success)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 2)
                                .background(NativeDS.successWeak)
                                .clipShape(Capsule())
                        }
                    }

                    Text(device.id)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(NativeDS.muted)
                        .lineLimit(1)
                        .truncationMode(.middle)

                    HStack(spacing: 8) {
                        signalBars
                        Text("\(device.rssi) dBm")
                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                            .foregroundColor(NativeDS.muted)
                        if isConnectionTab {
                            Text("已连接")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(NativeDS.success)
                        }
                    }
                    .padding(.top, 2)
                }

                Spacer(minLength: 0)
            }

            if isConnectionTab {
                Button(action: onAction ?? { bleManager.disconnect(deviceId: device.id) }) {
                    Text("断开")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(NativeDS.danger)
                        .frame(maxWidth: .infinity)
                        .frame(height: 34)
                        .background(NativeDS.dangerWeak)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            } else if onGattAction != nil || onSmartHidAction != nil {
                HStack(spacing: 8) {
                    if smartHidMatch != nil, let onSmartHidAction {
                        actionButton(
                            title: "配置 Smart HID",
                            icon: "keyboard",
                            primary: true,
                            action: onSmartHidAction
                        )
                    }
                    if let onGattAction {
                        actionButton(
                            title: "连接",
                            icon: "link",
                            primary: smartHidMatch == nil,
                            action: onGattAction
                        )
                    }
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(NativeDS.line))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: Color(red: 16 / 255, green: 32 / 255, blue: 64 / 255).opacity(0.06), radius: 8, y: 4)
    }

    private var avatar: some View {
        ZStack {
            LinearGradient(
                colors: smartHidMatch == nil
                    ? [NativeDS.primaryWeak, Color(red: 220 / 255, green: 233 / 255, blue: 1)]
                    : [Color(red: 217 / 255, green: 246 / 255, blue: 240 / 255), NativeDS.successWeak],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Text(String(displayName.prefix(1)).uppercased())
                .font(.system(size: 17, weight: .heavy))
                .foregroundColor(smartHidMatch == nil ? NativeDS.primary : NativeDS.success)
        }
        .frame(width: 44, height: 44)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var signalBars: some View {
        HStack(alignment: .bottom, spacing: 2) {
            ForEach(0..<4) { index in
                RoundedRectangle(cornerRadius: 1)
                    .fill(index < signalLevel ? signalColor : NativeDS.line)
                    .frame(width: 3, height: CGFloat(4 + index * 3))
            }
        }
        .frame(height: 12)
    }

    private func actionButton(
        title: String,
        icon: String,
        primary: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(primary ? .white : NativeDS.ink)
                .frame(maxWidth: .infinity)
                .frame(height: 34)
                .background(primary ? NativeDS.primary : NativeDS.fill)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(primary ? Color.clear : NativeDS.line))
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }

    private var displayName: String {
        let trimmed = device.name.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty || trimmed == "Unknown Device" {
            return "未命名 BLE · \(device.id.suffix(4).uppercased())"
        }
        return trimmed
    }

    private var smartHidMatch: SmartHidProfile.MatchLevel? {
        SmartHidProfile.match(name: device.name, serviceUUIDs: device.serviceUUIDs)
    }

    private var signalLevel: Int {
        bleManager.getSignalBars(rssi: device.rssi)
    }

    private var signalColor: Color {
        switch signalLevel {
        case 4, 3: return NativeDS.success
        case 2: return NativeDS.warning
        default: return NativeDS.danger
        }
    }
}
