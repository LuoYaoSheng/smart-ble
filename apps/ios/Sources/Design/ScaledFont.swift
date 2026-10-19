//
//  ScaledFont.swift — HTML 令牌字号的 Dynamic Type 适配（Apple 无障碍 Gate）
//
//  设计令牌字号来自桌面/移动正典 HTML（固定 pt）。默认档（.large）下
//  UIFontMetrics.scaledValue(for:compatibleWith:) 与原字号逐点相等——已通过四轮
//  UI 审计的默认态不回归；用户调大正文/辅助功能字号时按对应 text style 曲线缩放。
//  relativeTo 按字号自动归档：≥24 .title2 · 17..<24 .body · 13..<17 .subheadline · 其余 .caption。
//  本包的 macOS 切片仅服务于 swift-test 宿主构建（真 macOS 客户端是独立 AppKit 应用），
//  故 UIKit 缩放以 canImport(UIKit) 门控，macOS 回退为固定字号。
//

import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

extension View {
    /// `.font(.system(size:))` 的 Dynamic Type 等价物；weight/design 参数语义不变。
    func scaledFont(_ size: CGFloat, _ weight: Font.Weight = .regular,
                    design: Font.Design = .default) -> some View {
        modifier(ScaledFontModifier(size: size, weight: weight, design: design,
                                    relativeTo: Self.scaledFontTextStyle(for: size)))
    }

    private static func scaledFontTextStyle(for size: CGFloat) -> Font.TextStyle {
        switch size {
        case 24...: return .title2
        case 17..<24: return .body
        case 13..<17: return .subheadline
        default: return .caption
        }
    }
}

private struct ScaledFontModifier: ViewModifier {
    @Environment(\.sizeCategory) private var sizeCategory
    let size: CGFloat
    let weight: Font.Weight
    let design: Font.Design
    let relativeTo: Font.TextStyle

    func body(content: Content) -> some View {
        #if canImport(UIKit)
        // UIFontMetrics.scaledFont 产出的字体描述符携带 text style（无障碍审计可识别
        // 为支持 Dynamic Type；.system(size:) 直构则被判定为固定字号）。
        // 默认档 traits 下返回与基础字号逐点相等的字体——UI 审计基线不回归。
        let traits = UITraitCollection(preferredContentSizeCategory: sizeCategory.uiKitValue)
        let metrics = UIFontMetrics(forTextStyle: relativeTo.uiKitValue)
        let base = Self.baseFont(size: size, weight: weight, design: design)
        return content.font(Font(metrics.scaledFont(for: base, compatibleWith: traits)))
        #else
        return content.font(.system(size: size, weight: weight, design: design))
        #endif
    }

    #if canImport(UIKit)
    private static func baseFont(size: CGFloat, weight: Font.Weight, design: Font.Design) -> UIFont {
        let w = weight.uiKitValue
        switch design {
        case .monospaced:
            return .monospacedSystemFont(ofSize: size, weight: w)
        case .rounded:
            let base = UIFont.systemFont(ofSize: size, weight: w)
            let descriptor = base.fontDescriptor.withDesign(.rounded)
            return descriptor.map { UIFont(descriptor: $0, size: size) } ?? base
        default:
            return .systemFont(ofSize: size, weight: w)
        }
    }
    #endif
}

#if canImport(UIKit)
private extension Font.Weight {
    var uiKitValue: UIFont.Weight {
        switch self {
        case .ultraLight: return .ultraLight
        case .thin: return .thin
        case .light: return .light
        case .regular: return .regular
        case .medium: return .medium
        case .semibold: return .semibold
        case .bold: return .bold
        case .heavy: return .heavy
        case .black: return .black
        default: return .regular
        }
    }
}
#endif

#if canImport(UIKit)
private extension Font.TextStyle {
    var uiKitValue: UIFont.TextStyle {
        switch self {
        case .largeTitle: return .largeTitle
        case .title: return .title1
        case .title2: return .title2
        case .title3: return .title3
        case .headline: return .headline
        case .subheadline: return .subheadline
        case .body: return .body
        case .callout: return .callout
        case .footnote: return .footnote
        case .caption, .caption2: return .caption1
        @unknown default: return .body
        }
    }
}

private extension ContentSizeCategory {
    var uiKitValue: UIContentSizeCategory {
        switch self {
        case .extraSmall: return .extraSmall
        case .small: return .small
        case .medium: return .medium
        case .large: return .large
        case .extraLarge: return .extraLarge
        case .extraExtraLarge: return .extraExtraLarge
        case .extraExtraExtraLarge: return .extraExtraExtraLarge
        case .accessibilityMedium: return .accessibilityMedium
        case .accessibilityLarge: return .accessibilityLarge
        case .accessibilityExtraLarge: return .accessibilityExtraLarge
        case .accessibilityExtraExtraLarge: return .accessibilityExtraExtraLarge
        case .accessibilityExtraExtraExtraLarge: return .accessibilityExtraExtraExtraLarge
        @unknown default: return .large
        }
    }
}
#endif
