import SwiftUI

#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

struct VersionHistoryView: View {
    @Environment(\.dismiss) private var dismiss
    private let metadata = ReleaseMetadata.load()
    @State private var copied = false

    var body: some View {
        VStack(spacing: 0) {
            subnavigation
            ScrollView {
                VStack(spacing: 14) {
                    currentVersionCard
                    limitationsCard
                    historyCard(
                        title: "正式发布历史",
                        icon: "checkmark.circle",
                        emptyTitle: "暂无正式发布版本",
                        emptyDescription: "产品当前处于 PREVIEW 阶段，首个正式版发布后将在此列出。"
                    )
                    historyCard(
                        title: "预览记录",
                        icon: "arrow.down.circle",
                        emptyTitle: metadata.releaseTag == nil ? "暂无预览记录" : metadata.releaseTag!,
                        emptyDescription: metadata.releaseTag == nil ? "" : "当前 Release tag"
                    )
                    Text("本页数据来自 Release Metadata 投影，不是手写版本事实源。")
                        .scaledFont(11)
                        .foregroundColor(NativeDS.muted)
                        .padding(.vertical, 8)
                }
                .padding(16)
            }
            .background(NativeDS.page)
        }
    }

    private var subnavigation: some View {
        NativeSubnavBar(title: "版本记录", onBack: { dismiss() })
    }

    private var currentVersionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            NativeSectionHeading(icon: "doc.text", title: "当前版本")
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(displayVersion)
                    .scaledFont(24, .heavy)
                    .foregroundColor(NativeDS.primary)
                Text(metadata.channel)
                    .scaledFont(12, .bold)
                    .foregroundColor(NativeDS.primary)
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(NativeDS.primaryWeak.clipShape(Capsule()))
            }
            keyValue("构建", "\(metadata.appBuildCode)" + (metadata.commit.map { " · \($0.prefix(8))" } ?? ""))
            keyValue("Release tag", metadata.releaseTag ?? "未登记（preview）")
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 122), spacing: 6)], alignment: .leading, spacing: 6) {
                surfaceChip("App · Android", metadata.publicSurfaces["android"]?.releaseStatus ?? "UNKNOWN")
                surfaceChip("App · iOS", metadata.publicSurfaces["ios"]?.releaseStatus ?? "UNKNOWN")
                surfaceChip("H5 / Web", metadata.publicSurfaces["h5"]?.releaseStatus ?? "UNKNOWN")
                surfaceChip("桌面端", metadata.publicSurfaces["flutter_tauri_native"]?.releaseStatus ?? "UNKNOWN")
            }
            Button(action: copyVersion) {
                Label(copied ? "已复制" : "复制版本信息", systemImage: "doc.on.doc")
                    .scaledFont(12, .bold)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.plain)
            .foregroundColor(NativeDS.sub)
            .background(NativeDS.fill)
            .clipShape(RoundedRectangle(cornerRadius: 9))
            .nativeHitTarget()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .nativeCard()
    }

    private var limitationsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            NativeSectionHeading(icon: "exclamationmark.triangle", title: "当前限制", tone: NativeDS.warning)
            if metadata.knownLimitations.isEmpty {
                Text("暂无已知限制条目").scaledFont(13).foregroundColor(NativeDS.muted)
            } else {
                ForEach(Array(metadata.knownLimitations.enumerated()), id: \.offset) { _, limitation in
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .scaledFont(12).foregroundColor(NativeDS.warning)
                        Text(limitation).scaledFont(13).foregroundColor(NativeDS.sub)
                    }
                    Divider()
                }
            }
            Text(metadata.artifacts.isEmpty ? "当前无 Artifact，不提供下载入口。" : "Artifact 以 Release Metadata 为准。")
                .scaledFont(12)
                .foregroundColor(NativeDS.sub)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(NativeDS.primaryWeak)
                .clipShape(RoundedRectangle(cornerRadius: 9))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .nativeCard()
    }

    private func historyCard(title: String, icon: String, emptyTitle: String, emptyDescription: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            NativeSectionHeading(icon: icon, title: title)
            VStack(spacing: 8) {
                NativeIllustration(name: "doc", width: 72)
                Text(emptyTitle).font(.subheadline.weight(.semibold))
                if !emptyDescription.isEmpty {
                    Text(emptyDescription).scaledFont(12).foregroundColor(NativeDS.muted).multilineTextAlignment(.center)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .nativeCard()
    }

    private func keyValue(_ key: String, _ value: String) -> some View {
        HStack {
            Text(key).foregroundColor(NativeDS.muted)
            Spacer()
            Text(value).font(.system(.subheadline, design: .monospaced)).multilineTextAlignment(.trailing)
        }
        .font(.subheadline)
    }

    private func surfaceChip(_ name: String, _ status: String) -> some View {
        let color: Color
        switch status {
        case "BLOCKED": color = NativeDS.warning
        case "NOT_RELEASED": color = NativeDS.danger
        case "UNSUPPORTED": color = NativeDS.muted
        case "VERIFIED": color = NativeDS.success
        default: color = NativeDS.primary
        }
        return Text("\(name) \(status)")
            .scaledFont(11, .bold)
            .foregroundColor(color)
            .padding(.horizontal, 7).padding(.vertical, 4)
            .background(color.opacity(0.12).clipShape(Capsule()))
    }

    private func copyVersion() {
        let value = "BLE Toolkit+ v\(metadata.appVersion) (\(metadata.appBuildCode)) · \(metadata.channel) · \(metadata.overallStatus)"
        #if os(iOS)
        UIPasteboard.general.string = value
        #elseif os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(value, forType: .string)
        #endif
        copied = true
    }

    private var displayVersion: String {
        metadata.channel == "preview" ? "\(metadata.appVersion)-preview" : metadata.appVersion
    }
}
