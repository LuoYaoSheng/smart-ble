//
// SmartBLE - Log View
//

import SwiftUI

struct LogView: View {
    @EnvironmentObject var bleManager: BLEManager

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("操作日志")
                    .font(.headline)

                Spacer()

                if !bleManager.logs.isEmpty {
                    Button("清空") {
                        bleManager.clearLogs()
                    }
                    .font(.subheadline)
                    .foregroundColor(.blue)
                }
            }
            .padding()
            .background(Color(.systemBackground))

            // Logs
            if bleManager.logs.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "doc.text")
                        .font(.system(size: 50))
                        .foregroundColor(.gray.opacity(0.5))

                    Text("暂无日志")
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 4) {
                        ForEach(bleManager.logs.reversed()) { log in
                            LogRow(log: log)
                        }
                    }
                    .padding()
                }
            }
        }
    }
}

struct LogRow: View {
    let log: LogEntry

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            // Icon
            icon
                .font(.caption)

            // Content
            VStack(alignment: .leading, spacing: 2) {
                Text(log.message)
                    .font(.caption)

                Text(timeString)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 2)
    }

    private var icon: some View {
        switch log.type {
        case .info:
            return Image(systemName: "info.circle").foregroundColor(.blue)
        case .success:
            return Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
        case .error:
            return Image(systemName: "xmark.circle.fill").foregroundColor(.red)
        case .receive:
            return Image(systemName: "arrow.down.circle.fill").foregroundColor(.green)
        case .send:
            return Image(systemName: "arrow.up.circle.fill").foregroundColor(.orange)
        }
    }

    private var timeString: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .medium
        return formatter.string(from: log.timestamp)
    }
}
