import SwiftUI

#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

private struct AboutVersionRoute: Identifiable {
    let id: String
}

private struct SharePayload: Identifiable {
    let id = UUID()
    let items: [Any]
}

struct AboutView: View {
    private let metadata = ReleaseMetadata.load()
    @State private var versionRoute: AboutVersionRoute?
    @State private var sharePayload: SharePayload?
    @State private var feedbackVisible = false

    var body: some View {
        VStack(spacing: 0) {
            NativeNavbar(kicker: "ABOUT", title: "关于") {
                NativeStatusChip(text: displayVersion, tone: NativeDS.muted)
            }

            ScrollView(showsIndicators: false) {
                VStack(spacing: 12) {
                    brandCard

                    NativeSectionHeading(icon: "info.circle", title: "应用信息") {
                        EmptyView()
                    }
                    applicationCard
                    platformStatusCard
                    menuCard

                    VStack(spacing: 2) {
                        Text("日志全局脱敏：敏感凭据显示为 token=***")
                        Text("BLE Toolkit+ · Smart BLE 产品家族")
                    }
                    .scaledFont(10)
                    .foregroundColor(NativeDS.placeholder)
                    .multilineTextAlignment(.center)
                    .padding(.vertical, 8)
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 20)
            }
            .background(NativeDS.page)
        }
        .nativePageCover(item: $versionRoute) { _ in
            VersionHistoryView()
        }
        .sheet(isPresented: $feedbackVisible) {
            FeedbackSheet()
        }
        .sheet(item: $sharePayload) { payload in
            NativeShareSheet(items: payload.items)
        }
    }

    private var brandCard: some View {
        HStack(spacing: 12) {
            ZStack {
                LinearGradient(
                    colors: [NativeDS.primary, NativeDS.primaryDeep],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                NativeResourceImage(name: "bt")
                    .scaledToFit()
                    .frame(width: 22, height: 22)
            }
            .frame(width: 42, height: 42)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            // 品牌字装饰：语义由相邻 "BLE Toolkit+" 文本承担
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text("BLE Toolkit+")
                    .scaledFont(15, .bold)
                    .foregroundColor(NativeDS.ink)
                Text("v\(displayVersion) · \(metadata.channel) · 零后端 · 零本地持久化")
                    .scaledFont(10)
                    .foregroundColor(NativeDS.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            Spacer()
        }
        .nativeCard(padding: 14)
    }

    // F028 推广跳转（更多小程序卡）2026-09-10 移除——promotionCard/promotionRow 随之退役

    private var applicationCard: some View {
        VStack(spacing: 0) {
            keyValue("当前环境", "原生 iOS · CoreBluetooth")
            keyValue("设备型号", deviceModel)
            keyValue("构建", metadata.commit.map { "v+\($0.prefix(8))（Release Metadata 投影）" } ?? "Release Metadata · preview")

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 118), spacing: 6)], alignment: .leading, spacing: 6) {
                ForEach(featureTitles, id: \.self) { featureChip($0) }
            }
            .padding(.vertical, 12)

        }
        .nativeCard(padding: 14)
    }

    private var platformStatusCard: some View {
        VStack(spacing: 2) {
            platformRow("App · Android", capability: "PREVIEW", release: "NOT_RELEASED")
            platformRow(
                "App · iOS",
                capability: metadata.publicSurfaces["ios"]?.capabilityStatus ?? "NOT_RELEASED",
                release: metadata.publicSurfaces["ios"]?.releaseStatus ?? "NOT_RELEASED"
            )
            platformRow("H5 / Web", capability: "UNSUPPORTED", release: "NOT_RELEASED")
            platformRow("桌面端", capability: "REFERENCE", release: "NOT_RELEASED")
        }
        .nativeCard(padding: 14)
    }

    private var menuCard: some View {
        VStack(spacing: 0) {
            Link(destination: URL(string: "https://lightble.i2kai.com/")!) {
                menuRow(icon: "arrow.up.right.square", title: "官方网站")
            }
            Divider()
            // 问题反馈：GitHub Issues 引导（2026-09-11 小程序反馈通道裁撤）
            Button(action: { feedbackVisible = true }) {
                menuRow(icon: "paperplane", title: "问题反馈")
            }
            .accessibilityIdentifier("about-feedback-row")
            Divider()
            Button(action: { versionRoute = AboutVersionRoute(id: "versions") }) {
                menuRow(icon: "doc.text", title: "版本记录")
            }
            .accessibilityIdentifier("about-version-row")
            Divider()
            Button(action: {
                sharePayload = SharePayload(items: [
                    "BLE Toolkit+ · 跨平台 BLE 调试工具",
                    URL(string: "https://lightble.i2kai.com/")!,
                ])
            }) {
                menuRow(icon: "square.and.arrow.up", title: "分享应用")
            }
        }
        .buttonStyle(.plain)
        .foregroundColor(NativeDS.ink)
        .nativeCard(padding: 0)
    }

    private func menuRow(icon: String, title: String) -> some View {
        HStack(spacing: 11) {
            Image(systemName: icon)
                .scaledFont(15)
                .foregroundColor(NativeDS.muted)
                .frame(width: 20)
            Text(title)
                .scaledFont(13, .semibold)
            Spacer()
            Image(systemName: "chevron.right")
                .scaledFont(11, .semibold)
                .foregroundColor(NativeDS.placeholder)
        }
        .padding(.horizontal, 14)
        .frame(height: 46)
        .frame(maxWidth: .infinity)
        .contentShape(Rectangle())
    }

    private func keyValue(_ key: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(key)
                .scaledFont(12, .semibold)
                .foregroundColor(NativeDS.muted)
                .frame(width: 88, alignment: .leading)
            Text(value)
                .scaledFont(13)
                .foregroundColor(NativeDS.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 9)
        .overlay(alignment: .bottom) { Rectangle().fill(NativeDS.lineSoft).frame(height: 1) }
    }

    private func featureChip(_ title: String) -> some View {
        Text(title)
            .scaledFont(10, .semibold)
            .foregroundColor(NativeDS.primary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(NativeDS.primaryWeak)
            .clipShape(Capsule())
    }

    private func platformRow(_ name: String, capability: String, release: String) -> some View {
        HStack(spacing: 7) {
            Text(name)
                .scaledFont(12, .semibold)
                .frame(width: 92, alignment: .leading)
            NativeStatusChip(text: capability, tone: statusColor(capability))
            NativeStatusChip(text: release, tone: statusColor(release))
            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "VERIFIED": return NativeDS.success
        case "PREVIEW": return NativeDS.primary
        case "BLOCKED": return NativeDS.warning
        case "NOT_RELEASED": return NativeDS.danger
        default: return NativeDS.muted
        }
    }

    private var displayVersion: String {
        metadata.channel == "preview" ? "\(metadata.appVersion)-preview" : metadata.appVersion
    }

    private var featureTitles: [String] {
        [
            "01 蓝牙扫描与筛选", "02 GATT 读写与监听", "03 多设备会话管理",
            "04 BLE 广播发射", "05 Smart HID 配网", "06 固件升级（受限）",
        ]
    }

    private var deviceModel: String {
        #if os(iOS)
        UIDevice.current.userInterfaceIdiom == .pad ? "iPad" : "iPhone"
        #else
        "Mac"
        #endif
    }
}

#if os(iOS)
private struct NativeShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
#else
private struct NativeShareSheet: View {
    let items: [Any]

    var body: some View {
        Text("请在 iOS 上使用系统分享")
            .padding()
    }
}
#endif

/// 问题反馈弹窗（P009）：GitHub Issues 引导；
/// 2026-09-11 小程序反馈通道裁撤，码图与微信文案一并移除。
private struct FeedbackSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var linkCopied = false

    private let feedbackUrl = "https://github.com/luoyaosheng/smart-ble/issues"

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Text("问题反馈")
                    .scaledFont(16, .bold)
                    .foregroundColor(NativeDS.ink)
                Spacer()
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .scaledFont(13, .semibold)
                        .foregroundColor(NativeDS.muted)
                        .frame(width: 30, height: 30)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("feedback-close")
            }

            VStack(spacing: 4) {
                Text("通过 GitHub Issues 提交问题反馈")
                Text("描述复现步骤与环境信息，我们会尽快跟进处理")
                Text(feedbackUrl)
                    .foregroundColor(NativeDS.primary)
            }
            .scaledFont(11)
            .foregroundColor(NativeDS.sub)
            .multilineTextAlignment(.center)

            if linkCopied {
                Text("反馈链接已复制")
                    .scaledFont(11, .semibold)
                    .foregroundColor(NativeDS.success)
            }

            HStack(spacing: 10) {
                Button(action: copyLink) {
                    Text(linkCopied ? "已复制" : "复制反馈链接")
                        .scaledFont(13, .semibold)
                        .foregroundColor(NativeDS.primary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 42)
                        .background(NativeDS.primaryWeak)
                        .clipShape(RoundedRectangle(cornerRadius: NativeDS.radiusMedium))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("feedback-copy")

                Button(action: { dismiss() }) {
                    Text("我知道了")
                        .scaledFont(13, .semibold)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 42)
                        .background(
                            LinearGradient(
                                colors: [NativeDS.primary, NativeDS.primaryDeep],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .clipShape(RoundedRectangle(cornerRadius: NativeDS.radiusMedium))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("feedback-done")
            }
        }
        .padding(20)
        .frame(width: 320)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: NativeDS.radiusLarge))
        .overlay(RoundedRectangle(cornerRadius: NativeDS.radiusLarge).stroke(NativeDS.line, lineWidth: 1))
        .padding(24)
    }

    private func copyLink() {
        #if os(iOS)
        UIPasteboard.general.string = feedbackUrl
        #else
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(feedbackUrl, forType: .string)
        #endif
        withAnimation(.easeInOut(duration: 0.2)) { linkCopied = true }
    }
}
