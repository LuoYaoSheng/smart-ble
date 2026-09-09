import SwiftUI

struct BroadcastView: View {
    @EnvironmentObject var bleManager: BLEManager
    @State private var advertiseName = "SmartBLE"
    @State private var serviceUUID = "FFE0"
    @State private var manufacturerId = "0001"
    @State private var manufacturerData = "BLE"
    @State private var checked = false
    @State private var localLogs: [String] = []

    var body: some View {
        VStack(spacing: 0) {
            NativeNavbar(kicker: "PERIPHERAL", title: "广播") {
                HStack(spacing: 6) {
                    Text("平台：iOS")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(NativeDS.sub)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(NativeDS.fill).clipShape(Capsule())
                    Text(statusText)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(statusColor)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(statusColor.opacity(0.11)).clipShape(Capsule())
                }
            }

            ScrollView(showsIndicators: false) {
                VStack(spacing: 12) {
                    formCard
                    logCard
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 20)
            }
            .background(NativeDS.page)
        }
    }

    private var formCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            field("设备名称") {
                fieldInput {
                    TextField("SmartBLE", text: $advertiseName)
                        .onChange(of: advertiseName) { advertiseName = String($0.prefix(20)) }
                }
            }

            field("服务 UUID") {
                VStack(alignment: .leading, spacing: 6) {
                    fieldInput {
                        TextField("4 / 8 / 36 位 HEX", text: $serviceUUID)
                            #if os(iOS)
                            .autocapitalization(.allCharacters)
                            #endif
                    }
                    if uuidInvalid {
                        Label("UUID 需为 4 / 8 / 36 位十六进制", systemImage: "exclamationmark.triangle.fill")
                            .font(.system(size: 11))
                            .foregroundColor(Color(red: 199 / 255, green: 126 / 255, blue: 20 / 255))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(NativeDS.warningWeak)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                }
            }

            field("厂商 ID（HEX）") {
                fieldInput {
                    TextField("0001", text: $manufacturerId)
                        .onChange(of: manufacturerId) { manufacturerId = String($0.prefix(4)) }
                }
            }

            field("厂商数据（ASCII）") {
                fieldInput {
                    TextField("BLE", text: $manufacturerData)
                        .onChange(of: manufacturerData) { manufacturerData = String($0.prefix(26)) }
                }
            }

            HStack(spacing: 6) {
                Text("ADV 负载预算")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(Color(red: 143 / 255, green: 163 / 255, blue: 192 / 255))
                Spacer()
                Text("\(payloadBytes.total)")
                    .font(.system(size: 15, weight: .bold, design: .monospaced))
                    .foregroundColor(payloadOver ? Color(red: 1, green: 139 / 255, blue: 148 / 255) : .white)
                Text("/ 31 字节")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(Color(red: 124 / 255, green: 141 / 255, blue: 166 / 255))
            }
            .padding(.horizontal, 13)
            .frame(height: 40)
            .background(NativeDS.ink)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(spacing: 5) {
                budgetRow("完整名称 (0x09)", payloadBytes.name)
                budgetRow("服务 UUID (0x03/0x07)", payloadBytes.uuid)
                budgetRow("厂商块 (0xFF = 2+2+\(manufacturerData.utf8.count))", payloadBytes.manufacturer)
                Divider()
                budgetRow(payloadOver ? "合计 · 超限，启动将被拦截" : "合计", payloadBytes.total, bold: true)
            }
            .padding(12)
            .background(NativeDS.fill)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            HStack(spacing: 9) {
                Button(action: toggleAdvertising) {
                    Label(bleManager.isAdvertising ? "停止广播" : "开始广播", systemImage: bleManager.isAdvertising ? "stop.fill" : "dot.radiowaves.up.forward")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .frame(height: 40)
                        .background(bleManager.isAdvertising ? NativeDS.danger : NativeDS.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
                .disabled(payloadOver || uuidInvalid)
                .opacity(payloadOver || uuidInvalid ? 0.45 : 1)

                Button(action: checkSupport) {
                    Label("检查支持", systemImage: "arrow.clockwise")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(NativeDS.ink)
                        .padding(.horizontal, 13)
                        .frame(height: 40)
                        .background(NativeDS.fill)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(NativeDS.line))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .buttonStyle(.plain)
                .disabled(bleManager.isAdvertising)
            }
        }
        .nativeCard()
    }

    private var logCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            NativeSectionHeading(icon: "doc.text", title: "通信日志") {
                if !localLogs.isEmpty {
                    Button("清空") { localLogs.removeAll() }
                        .buttonStyle(.plain)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(NativeDS.danger)
                }
            }
            if localLogs.isEmpty {
                Text("暂无日志 · 开始广播或检查支持后，操作记录会显示在这里")
                    .font(.system(size: 11))
                    .foregroundColor(NativeDS.muted)
                    .padding(.vertical, 8)
            } else {
                ForEach(Array(localLogs.enumerated()), id: \.offset) { _, log in
                    Text(log)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(NativeDS.sub)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .nativeCard()
    }

    private func field<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(NativeDS.sub)
            content()
        }
    }

    private func fieldInput<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .font(.system(size: 13))
            .textFieldStyle(.plain)
            .padding(.horizontal, 12)
            .frame(height: 42)
            .background(NativeDS.fill)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.clear, lineWidth: 1.5))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .disabled(bleManager.isAdvertising)
    }

    private func budgetRow(_ title: String, _ bytes: Int, bold: Bool = false) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text("\(bytes) B")
        }
        .font(.system(size: 11, weight: bold ? .bold : .regular, design: .monospaced))
        .foregroundColor(payloadOver && bold ? NativeDS.danger : NativeDS.sub)
    }

    private var statusText: String {
        if bleManager.isAdvertising { return "广播中" }
        return checked ? "已就绪" : "未就绪"
    }

    private var statusColor: Color {
        if bleManager.isAdvertising { return NativeDS.success }
        return checked ? NativeDS.warning : NativeDS.muted
    }

    private var uuidInvalid: Bool {
        let value = serviceUUID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else { return false }
        return value.range(of: #"^([0-9a-fA-F]{4}|[0-9a-fA-F]{8}|[0-9a-fA-F-]{36})$"#, options: .regularExpression) == nil
    }

    private var payloadBytes: (name: Int, uuid: Int, manufacturer: Int, total: Int) {
        let nameBytes = advertiseName.isEmpty ? 0 : 2 + advertiseName.utf8.count
        let hexCount = serviceUUID.filter(\.isHexDigit).count
        let uuidBytes = serviceUUID.isEmpty ? 0 : 2 + hexCount / 2
        let manufacturerBytes = manufacturerId.isEmpty && manufacturerData.isEmpty ? 0 : 4 + manufacturerData.utf8.count
        return (nameBytes, uuidBytes, manufacturerBytes, nameBytes + uuidBytes + manufacturerBytes)
    }

    private var payloadOver: Bool { payloadBytes.total > 31 }

    private func checkSupport() {
        checked = true
        localLogs.append("Peripheral capability checked · iOS CoreBluetooth")
    }

    private func toggleAdvertising() {
        if bleManager.isAdvertising {
            bleManager.stopAdvertising()
            localLogs.append("Advertising stopped")
        } else {
            checked = true
            bleManager.startAdvertising(name: advertiseName, serviceUUIDs: [serviceUUID])
            localLogs.append("Advertising requested · \(advertiseName) · \(serviceUUID)")
        }
    }
}
