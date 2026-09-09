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

    var icon: String {
        switch self {
        case .scan: return "magnifyingglass"
        case .connected: return "link"
        case .broadcast: return "dot.radiowaves.up.forward"
        case .about: return "info.circle"
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
                            Image(systemName: tab.icon)
                                .font(.system(size: 20, weight: selection == tab ? .semibold : .regular))
                                .frame(width: 26, height: 24)
                            if tab == .connected, connectedCount > 0 {
                                Text("\(min(connectedCount, 99))")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 4)
                                    .frame(minWidth: 16, minHeight: 16)
                                    .background(NativeDS.danger)
                                    .clipShape(Capsule())
                                    .offset(x: 10, y: -6)
                            }
                        }
                        Text(tab.title)
                            .font(.system(size: 10, weight: selection == tab ? .bold : .semibold))
                    }
                    .foregroundColor(selection == tab ? NativeDS.primary : NativeDS.muted)
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 5)
        .padding(.bottom, 10)
        .frame(height: 62)
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
                .font(.system(size: 10, weight: .heavy))
                .tracking(2)
                .foregroundColor(NativeDS.primary)
            HStack {
                Text(title)
                    .font(.system(size: 20, weight: .heavy))
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
    @ViewBuilder let trailing: () -> Trailing

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(NativeDS.primary)
            Text(title)
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(NativeDS.ink)
            Spacer()
            trailing()
        }
    }
}

struct NativeIllustration: View {
    let name: String
    var width: CGFloat = 118

    var body: some View {
        NativeResourceImage(name: name)
            .scaledToFit()
            .frame(width: width, height: width * 86 / 118)
    }
}

struct NativeResourceImage: View {
    let name: String

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
        return Image(uiImage: bitmap)
        #elseif canImport(AppKit)
        guard let bitmap = NSImage(contentsOf: url) else {
            assertionFailure("Unreadable illustration resource: \(url.path)")
            return Image(systemName: "photo")
        }
        return Image(nsImage: bitmap)
        #else
        return Image(name, bundle: resourceBundle)
        #endif
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
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(NativeDS.ink)
                .padding(.bottom, 6)
            Text(description)
                .font(.system(size: 13))
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
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(NativeDS.ink)
                    .padding(.horizontal, 13)
                    .frame(height: 32)
                    .background(NativeDS.fill)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(NativeDS.line))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
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
            .font(.system(size: 10, weight: .bold, design: .monospaced))
            .foregroundColor(tone)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(tone.opacity(0.11))
            .clipShape(RoundedRectangle(cornerRadius: 5))
    }
}
