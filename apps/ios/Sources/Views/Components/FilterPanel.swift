import SwiftUI

struct FilterPanel: View {
    @EnvironmentObject var bleManager: BLEManager

    private let presets: [(value: Int, title: String, detail: String)] = [
        (-40, "强", "[-40]"),
        (-60, "较好", "[-60]"),
        (-70, "一般", "[-70]"),
        (-85, "弱", "[-85]"),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                fieldLabel("最弱信号")
                HStack(spacing: 6) {
                    ForEach(presets, id: \.value) { preset in
                        presetButton(preset)
                    }
                }
            }

            HStack(spacing: 10) {
                fieldLabel("阈值 \(bleManager.filterRSSI)\ndBm")
                Slider(value: Binding(
                    get: { Double(bleManager.filterRSSI) },
                    set: { bleManager.filterRSSI = Int($0) }
                ), in: -100 ... -40, step: 1)
                .tint(NativeDS.primary)
                .accessibilityLabel("最弱信号阈值")
                .accessibilityValue("\(bleManager.filterRSSI) dBm")
            }

            HStack(spacing: 10) {
                fieldLabel("名称前缀")
                TextField("如 SHID / LightBLE", text: $bleManager.filterNamePrefix)
                    .scaledFont(13)
                    .padding(.horizontal, 12)
                    .frame(height: 38)
                    .background(NativeDS.fill)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .accessibilityHint("只显示名称以前缀开头的设备")
            }

            HStack(spacing: 10) {
                fieldLabel("隐藏无名")
                Toggle("", isOn: $bleManager.hideNoNameDevices)
                    .labelsHidden()
                    .toggleStyle(.switch)
                    .tint(NativeDS.primary)
                    .accessibilityLabel("隐藏无名设备")
                Spacer()
                Button("重置过滤", action: resetFilters)
                    .buttonStyle(.plain)
                    .scaledFont(13, .semibold)
                    .foregroundColor(NativeDS.ink)
                    .padding(.horizontal, 13)
                    .frame(height: 34)
                    .background(NativeDS.fill)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(NativeDS.line))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .nativeHitTarget()
            }
        }
        .padding(14)
        .background(Color.white)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(NativeDS.line))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .transition(.opacity.combined(with: .move(edge: .top)))
    }

    private func fieldLabel(_ text: String) -> some View {
        Text(text)
            .scaledFont(12, .semibold)
            .foregroundColor(NativeDS.sub)
            .frame(width: 66, alignment: .leading)
    }

    private func presetButton(_ preset: (value: Int, title: String, detail: String)) -> some View {
        let selected = bleManager.filterRSSI == preset.value
        return Button(action: { bleManager.filterRSSI = preset.value }) {
            VStack(spacing: 1) {
                Text(preset.title)
                    .scaledFont(11, .semibold)
                Text(preset.detail)
                    .scaledFont(10, .semibold, design: .monospaced)
            }
            .foregroundColor(selected ? .white : NativeDS.sub)
            .frame(maxWidth: .infinity)
            .frame(height: 38)
            .background(selected ? NativeDS.primary : NativeDS.fill)
            .clipShape(RoundedRectangle(cornerRadius: 9))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("最弱信号 \(preset.title) \(preset.value) dBm")
        .nativeHitTarget(minHeight: 44)
    }

    private func resetFilters() {
        bleManager.filterRSSI = -100
        bleManager.filterNamePrefix = ""
        bleManager.hideNoNameDevices = false
    }
}
