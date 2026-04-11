import SwiftUI

struct LogPanel: View {
    let deviceId: String
    let logs: [LogEntry]
    let onClear: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Label("通信日志", systemImage: "doc.text.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.primary)

                Spacer()

                if !logs.isEmpty {
                    Button("清空") { onClear() }
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(.systemBackground))

            Divider()

            // Log entries
            if logs.isEmpty {
                HStack {
                    Spacer()
                    Text("暂无日志")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .frame(height: 80)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 2) {
                        ForEach(logs) { entry in
                            LogRow(entry: entry)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                }
                .frame(height: 160)
            }
        }
        .background(Color(.secondarySystemBackground))
        .overlay(Divider(), alignment: .top)
    }
}

struct LogRow: View {
    let entry: LogEntry

    private var formatter: DateFormatter {
        let f = DateFormatter()
        f.timeStyle = .medium
        return f
    }

    var body: some View {
        HStack(alignment: .top, spacing: 6) {
            // Time
            Text(formatter.string(from: entry.timestamp))
                .font(.system(size: 10, design: .monospaced))
                .foregroundColor(.secondary)
                .fixedSize()

            // Type badge
            Text(typeLabel)
                .font(.system(size: 10).weight(.semibold))
                .foregroundColor(typeColor)
                .fixedSize()

            // Message (supports HEX\nTEXT multi-line)
            Text(entry.message)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.primary)
                .lineLimit(3)
        }
        .padding(.vertical, 2)
    }

    private var typeLabel: String {
        switch entry.type {
        case .info:    return "[系统]"
        case .success: return "[成功]"
        case .error:   return "[错误]"
        case .receive: return "[接收]"
        case .send:    return "[发送]"
        }
    }

    private var typeColor: Color {
        switch entry.type {
        case .info:    return .blue
        case .success: return .green
        case .error:   return .red
        case .receive: return .green
        case .send:    return .orange
        }
    }
}
