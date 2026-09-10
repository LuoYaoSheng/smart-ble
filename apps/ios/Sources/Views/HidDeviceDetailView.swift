import SmartHidCore
import SwiftUI

private struct DeviceIdRoute: Identifiable {
    let id: String
}

struct HidDeviceDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var bleManager: BLEManager
    let deviceId: String

    @State private var reconfigureDevice: ScanResult?
    @State private var diagnosticsRoute: DeviceIdRoute?
    @State private var gattRoute: DeviceIdRoute?
    @State private var showMissingRecordAlert = false

    var body: some View {
        VStack(spacing: 0) {
            subnavigation
            ScrollView {
                if let snapshot {
                    VStack(spacing: 14) {
                        hero(snapshot)
                        identityCard(snapshot)
                        lastConfigurationCard(snapshot)
                        note
                        actions
                    }
                    .padding(16)
                } else {
                    NativeEmptyState(
                        illustration: "box",
                        title: "设备记录不存在",
                        description: "该设备快照已随会话结束释放，请重新配网后查看。"
                    )
                    .padding(.top, 62)
                }
            }
            .background(NativeDS.page)
        }
        .nativePageCover(item: $reconfigureDevice) { device in
            ProvisioningView(manager: bleManager.hidProvisionManager, device: device)
                .environmentObject(bleManager)
        }
        .nativePageCover(item: $diagnosticsRoute) { route in
            HidDiagnosticsView(
                manager: bleManager.hidProvisionManager,
                deviceId: route.id,
                onReconfigure: { _ in
                    diagnosticsRoute = nil
                    presentReconfigure()
                }
            )
            .environmentObject(bleManager)
        }
        .nativePageCover(item: $gattRoute) { route in
            DeviceDetailView(deviceId: route.id)
                .environmentObject(bleManager)
        }
        .onAppear {
            if snapshot == nil {
                showMissingRecordAlert = true
            }
        }
        .alert("提示", isPresented: $showMissingRecordAlert) {
            Button("知道了") { dismiss() }
        } message: {
            Text("该历史设备记录已不存在")
        }
    }

    private var subnavigation: some View {
        HStack(spacing: 10) {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left").frame(width: 32, height: 32)
            }
            .buttonStyle(.plain)
            Text("Smart HID 设备详情").font(.title3.bold())
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.white)
        .overlay(alignment: .bottom) { Rectangle().fill(NativeDS.line).frame(height: 1) }
    }

    private func hero(_ snapshot: HidSessionSnapshot) -> some View {
        HStack(spacing: 13) {
            ZStack {
                RoundedRectangle(cornerRadius: 14).fill(NativeDS.successWeak)
                Image(systemName: "keyboard").font(.title2).foregroundColor(NativeDS.success)
            }
            .frame(width: 54, height: 54)
            VStack(alignment: .leading, spacing: 5) {
                Text(snapshot.name.isEmpty ? "Smart HID 设备" : snapshot.name).font(.title3.bold())
                Text(bleManager.isDeviceConnected(deviceId) ? "配置成功 · READY" : "会话已断开")
                    .font(.caption.weight(.bold))
                    .foregroundColor(bleManager.isDeviceConnected(deviceId) ? NativeDS.success : NativeDS.danger)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background((bleManager.isDeviceConnected(deviceId) ? NativeDS.successWeak : NativeDS.dangerWeak).clipShape(Capsule()))
            }
            Spacer()
        }
        .nativeCard()
    }

    private func identityCard(_ snapshot: HidSessionSnapshot) -> some View {
        let protocolVersion = nonEmpty(snapshot.protocolVersion)
        let firmware = nonEmpty(snapshot.firmware) ?? "—"
        return VStack(alignment: .leading, spacing: 10) {
            Label("设备身份", systemImage: "cpu").font(.headline)
            keyValue("Device ID", snapshot.deviceId, mono: true)
            keyValue("协议版本", protocolVersion.map { "Smart HID \($0)" } ?? "—")
            keyValue("固件版本", firmware, mono: true)
            if protocolVersion == nil {
                NativeStatusChip(text: "协议未记录", tone: NativeDS.muted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .nativeCard()
    }

    private func lastConfigurationCard(_ snapshot: HidSessionSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("最近配置", systemImage: "wifi").font(.headline)
            keyValue("Wi-Fi", nonEmpty(snapshot.lastWifi) ?? "—")
            keyValue("ControlHub", nonEmpty(snapshot.lastHub) ?? "—", mono: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .nativeCard()
    }

    private func keyValue(_ key: String, _ value: String, mono: Bool = false) -> some View {
        HStack(alignment: .top) {
            Text(key).foregroundColor(NativeDS.muted)
            Spacer()
            Text(value)
                .font(mono ? .system(.subheadline, design: .monospaced) : .subheadline)
                .multilineTextAlignment(.trailing)
        }
    }

    private var note: some View {
        Text("本页为本次配网会话的内存快照，退出应用后不再可见（零本地持久化）。重新配置前需让设备进入配网模式。")
            .font(.footnote)
            .foregroundColor(NativeDS.sub)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(NativeDS.primaryWeak)
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var actions: some View {
        VStack(spacing: 9) {
            Button(action: presentReconfigure) {
                Label("重新配置", systemImage: "arrow.clockwise")
                    .font(.subheadline.bold()).frame(maxWidth: .infinity).padding(.vertical, 11)
            }
            .buttonStyle(.plain).foregroundColor(.white).background(NativeDS.primary)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            HStack(spacing: 9) {
                Button(action: { diagnosticsRoute = DeviceIdRoute(id: deviceId) }) {
                    Label("运行诊断", systemImage: "waveform.path.ecg").frame(maxWidth: .infinity)
                }
                Button(action: { gattRoute = DeviceIdRoute(id: deviceId) }) {
                    Label("高级 BLE 调试", systemImage: "slider.horizontal.3").frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.plain).font(.caption.weight(.semibold)).foregroundColor(NativeDS.sub)
            .padding(.vertical, 11).background(NativeDS.fill).clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    private var snapshot: HidSessionSnapshot? {
        bleManager.hidSessionSnapshots[deviceId]
    }

    private func nonEmpty(_ value: String?) -> String? {
        guard let value, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        return value
    }

    private func presentReconfigure() {
        reconfigureDevice = bleManager.connectedDevices[deviceId]
            ?? bleManager.scanResults.first(where: { $0.id == deviceId })
    }
}
