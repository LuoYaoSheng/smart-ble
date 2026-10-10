import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

enum NativeTab: Int, CaseIterable, Identifiable {
    case scan
    case connected
    case broadcast
    case about

    var id: Int { rawValue }

    var title: String {
        switch self {
        case .scan: return "扫描"
        case .connected: return "已连接"
        case .broadcast: return "广播"
        case .about: return "关于"
        }
    }

    var iconAsset: String {
        switch self {
        case .scan: return "tab-scan"
        case .connected: return "tab-link"
        case .broadcast: return "tab-cast"
        case .about: return "tab-info"
        }
    }
}

struct NativeTabBar: View {
    @Binding var selection: NativeTab
    let connectedCount: Int

    var body: some View {
        HStack(spacing: 0) {
            ForEach(NativeTab.allCases) { tab in
                Button(action: { selection = tab }) {
                    VStack(spacing: 3) {
                        ZStack(alignment: .topTrailing) {
                            NativeResourceImage(name: tab.iconAsset, template: true)
                                .scaledToFit()
                                .frame(width: 23, height: 23)
                            if tab == .connected, connectedCount > 0 {
                                Text("\(min(connectedCount, 99))")
                                    .scaledFont(9, .bold)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 4)
                                    .frame(minWidth: 16, minHeight: 16)
                                    .background(NativeDS.danger)
                                    .clipShape(Capsule())
                                    .offset(x: 10, y: -6)
                            }
                        }
                        Text(tab.title)
                            .scaledFont(10, selection == tab ? .bold : .medium)
                    }
                    .foregroundColor(selection == tab ? NativeDS.primary : NativeDS.muted)
                    .frame(maxWidth: .infinity)
                    .frame(maxHeight: .infinity)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(
                    tab == .connected && connectedCount > 0
                        ? "\(tab.title)，\(min(connectedCount, 99))"
                        : tab.title
                )
                .accessibilityValue(selection == tab ? "已选择" : "")
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 4)
        .padding(.bottom, 16)
        .frame(height: 64)
        .background(Color.white.opacity(0.98).ignoresSafeArea(edges: .bottom))
        .overlay(alignment: .top) { Rectangle().fill(NativeDS.lineSoft).frame(height: 1) }
    }
}

struct NativeNavbar<Trailing: View>: View {
    let kicker: String
    let title: String
    @ViewBuilder let trailing: () -> Trailing

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(kicker)
                .tracking(2)
                .scaledFont(10, .heavy)
                .foregroundColor(NativeDS.primary)
            HStack {
                Text(title)
                    .scaledFont(20, .heavy)
                    .foregroundColor(NativeDS.ink)
                Spacer()
                trailing()
            }
        }
        .padding(.horizontal, 18)
        .padding(.top, 8)
        .padding(.bottom, 12)
        .background(
            LinearGradient(colors: [.white, NativeDS.page], startPoint: .top, endPoint: .bottom)
        )
        .overlay(alignment: .bottom) { Rectangle().fill(NativeDS.lineSoft).frame(height: 1) }
    }
}

extension NativeNavbar where Trailing == EmptyView {
    init(kicker: String, title: String) {
        self.init(kicker: kicker, title: title, trailing: { EmptyView() })
    }
}

struct NativeSectionHeading<Trailing: View>: View {
    let icon: String
    let title: String
    var tone: Color = NativeDS.primary
    @ViewBuilder let trailing: () -> Trailing

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .scaledFont(17, .semibold)
                .foregroundColor(tone)
                // 装饰性节图标：对辅助技术隐藏，语义由标题文本承担
                .accessibilityHidden(true)
            Text(title)
                .scaledFont(17, .bold)
                .foregroundColor(NativeDS.ink)
            Spacer()
            trailing()
        }
    }
}

extension NativeSectionHeading where Trailing == EmptyView {
    init(icon: String, title: String, tone: Color = NativeDS.primary) {
        self.init(icon: icon, title: title, tone: tone, trailing: { EmptyView() })
    }
}

/// 统一的子页返回按钮：32×32 圆角方块，全 App 五个子页共用同一规格
struct NativeBackButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "chevron.left")
                .scaledFont(15, .semibold)
                .foregroundColor(NativeDS.ink)
                .frame(width: 32, height: 32)
                .background(NativeDS.fill)
                .overlay(RoundedRectangle(cornerRadius: 9).stroke(NativeDS.line))
                .clipShape(RoundedRectangle(cornerRadius: 9))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("返回")
    }
}

/// 统一的子页导航栏：返回按钮 + 17pt 标题 + lineSoft 分割线
struct NativeSubnavBar<Trailing: View>: View {
    let title: String
    let onBack: () -> Void
    @ViewBuilder let trailing: () -> Trailing

    var body: some View {
        HStack(spacing: 10) {
            NativeBackButton(action: onBack)
            Text(title)
                .scaledFont(17, .bold)
                .foregroundColor(NativeDS.ink)
            Spacer()
            trailing()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .background(Color.white)
        .overlay(alignment: .bottom) { Rectangle().fill(NativeDS.lineSoft).frame(height: 1) }
    }
}

extension NativeSubnavBar where Trailing == EmptyView {
    init(title: String, onBack: @escaping () -> Void) {
        self.init(title: title, onBack: onBack, trailing: { EmptyView() })
    }
}

struct NativeIllustration: View {
    let name: String
    var width: CGFloat = 118

    var body: some View {
        NativeResourceImage(name: name)
            .scaledToFit()
            .frame(width: width, height: width * 86 / 118)
            // 装饰性插画：对辅助技术隐藏，语义由相邻标题/描述文本承担
            .accessibilityHidden(true)
    }
}

struct NativeResourceImage: View {
    let name: String
    var template = false

    var body: some View { resourceImage.resizable() }

    private var resourceImage: Image {
        let resourceBundle: Bundle = {
            #if SWIFT_PACKAGE
            return .module
            #else
            return .main
            #endif
        }()

        guard let url = resourceBundle.url(forResource: name, withExtension: "png") else {
            assertionFailure("Missing illustration resource: \(name).png")
            return Image(systemName: "photo")
        }

        #if canImport(UIKit)
        guard let bitmap = UIImage(contentsOfFile: url.path) else {
            assertionFailure("Unreadable illustration resource: \(url.path)")
            return Image(systemName: "photo")
        }
        return Image(uiImage: bitmap.withRenderingMode(template ? .alwaysTemplate : .alwaysOriginal))
        #elseif canImport(AppKit)
        guard let bitmap = NSImage(contentsOf: url) else {
            assertionFailure("Unreadable illustration resource: \(url.path)")
            return Image(systemName: "photo")
        }
        bitmap.isTemplate = template
        return Image(nsImage: bitmap)
        #else
        return Image(name, bundle: resourceBundle)
        #endif
    }
}

extension View {
    /// 无障碍命中目标下限：可点元素 ≥44pt（正典 TabBar 同标准）。
    /// 只撑命中/AX 帧，不改变文本排版；带背景的控件视觉高度不变。
    func nativeHitTarget(minHeight: CGFloat = 44) -> some View {
        frame(minHeight: minHeight, alignment: .center)
            .contentShape(.rect)
    }
}

struct NativeEmptyState: View {
    let illustration: String
    let title: String
    let description: String
    var actionTitle: String?
    var actionIcon: String? = nil
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 0) {
            NativeIllustration(name: illustration)
                .padding(.bottom, 16)
            Text(title)
                .scaledFont(17, .bold)
                .foregroundColor(NativeDS.ink)
                .padding(.bottom, 6)
            Text(description)
                .scaledFont(13)
                .foregroundColor(NativeDS.muted)
                .multilineTextAlignment(.center)
                .lineSpacing(3)
                .frame(maxWidth: 250)
            if let actionTitle, let action {
                Button(action: action) {
                    if let actionIcon {
                        Label(actionTitle, systemImage: actionIcon)
                    } else {
                        Text(actionTitle)
                    }
                }
                    .buttonStyle(.plain)
                    .scaledFont(13, .semibold)
                    .foregroundColor(NativeDS.ink)
                    .padding(.horizontal, 13)
                    .frame(minHeight: 32)
                    .background(NativeDS.fill)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(NativeDS.line))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .nativeHitTarget()
                    .padding(.top, 16)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 24)
        .padding(.vertical, 38)
    }
}

struct NativeStatusChip: View {
    let text: String
    let tone: Color

    var body: some View {
        Text(text)
            .scaledFont(10, .bold, design: .monospaced)
            .foregroundColor(tone)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(tone.opacity(0.11))
            .clipShape(RoundedRectangle(cornerRadius: 5))
    }
}
