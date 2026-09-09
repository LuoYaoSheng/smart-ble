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
                        .font(.caption2)
                        .foregroundColor(NativeDS.muted)
                        .padding(.vertical, 8)
                }
                .padding(16)
            }
            .background(NativeDS.page)
        }
    }

    private var subnavigation: some View {
        HStack(spacing: 10) {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left").frame(width: 32, height: 32)
            }
            .buttonStyle(.plain)
            Text("版本记录").font(.title3.bold())
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.white)
        .overlay(alignment: .bottom) { Rectangle().fill(NativeDS.line).frame(height: 1) }
    }

    private var currentVersionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("当前版本", systemImage: "doc.text").font(.headline)
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("v\(metadata.appVersion)")
                    .font(.system(size: 30, weight: .heavy))
                    .foregroundColor(NativeDS.primary)
                Text(metadata.channel.uppercased())
                    .font(.caption.weight(.bold))
                    .foregroundColor(NativeDS.primary)
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(NativeDS.primaryWeak.clipShape(Capsule()))
            }
            keyValue("构建", "\(metadata.appBuildCode)" + (metadata.commit.map { " · \($0.prefix(8))" } ?? ""))
            keyValue("Release tag", metadata.releaseTag ?? "未登记（preview）")
            HStack(spacing: 6) {
                surfaceChip("iOS", metadata.publicSurfaces["ios"]?.releaseStatus ?? "UNKNOWN")
                surfaceChip("Native", metadata.publicSurfaces["flutter_tauri_native"]?.releaseStatus ?? "UNKNOWN")
                surfaceChip("OTA", metadata.publicSurfaces["ota"]?.capabilityStatus ?? "UNKNOWN")
            }
            Button(action: copyVersion) {
                Label(copied ? "已复制" : "复制版本信息", systemImage: "doc.on.doc")
                    .font(.caption.weight(.bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.plain)
            .foregroundColor(NativeDS.sub)
            .background(NativeDS.fill)
            .clipShape(RoundedRectangle(cornerRadius: 9))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .nativeCard()
    }

    private var limitationsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("当前限制", systemImage: "exclamationmark.triangle").font(.headline)
            if metadata.knownLimitations.isEmpty {
                Text("暂无已知限制条目").font(.footnote).foregroundColor(NativeDS.muted)
            } else {
                ForEach(Array(metadata.knownLimitations.enumerated()), id: \.offset) { _, limitation in
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption).foregroundColor(NativeDS.warning)
                        Text(limitation).font(.footnote).foregroundColor(NativeDS.sub)
                    }
                    Divider()
                }
            }
            Text(metadata.artifacts.isEmpty ? "当前无 Artifact，不提供下载入口。" : "Artifact 以 Release Metadata 为准。")
                .font(.caption)
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
            Label(title, systemImage: icon).font(.headline)
            VStack(spacing: 8) {
                Image(systemName: "doc.text").font(.title2).foregroundColor(NativeDS.muted)
                Text(emptyTitle).font(.subheadline.weight(.semibold))
                if !emptyDescription.isEmpty {
                    Text(emptyDescription).font(.caption).foregroundColor(NativeDS.muted).multilineTextAlignment(.center)
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
        let color = status == "BLOCKED" ? NativeDS.warning : status.contains("RELEASED") ? NativeDS.muted : NativeDS.primary
        return Text("\(name) \(status)")
            .font(.caption2.weight(.bold))
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
}
