import SwiftUI

struct WriteDialog: View {
    @EnvironmentObject var bleManager: BLEManager
    let characteristic: BLECharacteristic
    let deviceId: String
    let serviceId: String
    @Binding var isPresented: Bool

    @State private var inputText = ""
    @State private var selectedFormat: WriteFormat = .hex
    @FocusState private var isInputFocused: Bool

    enum WriteFormat: String, CaseIterable {
        case hex = "HEX"
        case utf8 = "UTF-8"
        
        var placeholder: String {
            switch self {
            case .hex: return "48 65 6C 6C 6F"
            case .utf8: return "Hello"
            }
        }
    }

    var body: some View {
        #if os(iOS)
        NavigationView {
            contentView
                .navigationTitle("写入特征值")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("取消") { isPresented = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("写入") { performWrite() }
                            .disabled(inputText.isEmpty)
                    }
                }
        }
        #else
        VStack(spacing: 0) {
            // Title bar (macOS style)
            HStack {
                Text("写入特征值")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
                Button(action: { isPresented = false }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding()
            .background(Color.gray.opacity(0.1))

            Divider()

            // Content
            ScrollView {
                contentView
            }
        }
        .frame(width: 400, height: 300)
        .onAppear {
            isInputFocused = true
        }
        #endif
    }

    private var contentView: some View {
        Form {
            Section(header: Text("特征值信息")) {
                HStack {
                    Text("UUID")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(characteristic.uuid)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundColor(.primary)
                }
            }

            Section(header: Text("数据")) {
                Picker("格式", selection: $selectedFormat) {
                    ForEach(WriteFormat.allCases, id: \.self) { format in
                        Text(format.rawValue).tag(format)
                    }
                }
                .pickerStyle(.segmented)

                VStack(alignment: .leading, spacing: 4) {
                    Text("输入数据")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    TextField(selectedFormat.placeholder, text: $inputText)
                        .textFieldStyle(.roundedBorder)
                        #if os(iOS)
                        .autocapitalization(.allCharacters)
                        .keyboardType(selectedFormat == .hex ? .asciiCapable : .default)
                        #endif
                        .focused($isInputFocused)
                }
            }

            if selectedFormat == .hex {
                Section(header: Text("提示")) {
                    Text("HEX 格式: 输入十六进制字节，例如 48 65 6C 6C 6F")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .onSubmit {
            performWrite()
        }
    }

    private func performWrite() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        let data: Data
        switch selectedFormat {
        case .hex:
            let cleanHex = text.replacingOccurrences(of: " ", with: "")
            guard DataConverter.isValidHex(cleanHex) else {
                bleManager.log("Invalid hex input", type: .error)
                return
            }
            data = DataConverter.hexToBytes(cleanHex)
        case .utf8:
            data = text.data(using: .utf8) ?? Data()
        }

        bleManager.writeCharacteristic(
            deviceId: deviceId,
            serviceUUID: serviceId,
            characteristicUUID: characteristic.uuid,
            data: data
        )
        isPresented = false
    }
}


