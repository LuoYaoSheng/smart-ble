import SwiftUI

enum NativeDS {
    // @generated:ios-tokens begin（generate_assets.py --theme-only 生成段 · 源=meta/design-tokens.json · 勿手改）
    // MARK: 品牌与语义（--c-*）
    static let primary     = Color(red: 27 / 255, green: 109 / 255, blue: 1) // #1B6DFF --c-primary
    static let primaryDeep = Color(red: 14 / 255, green: 79 / 255, blue: 196 / 255) // #0E4FC4 --c-primary-deep
    static let primaryWeak = Color(red: 232 / 255, green: 241 / 255, blue: 1) // #E8F1FF --c-primary-weak
    static let success     = Color(red: 23 / 255, green: 199 / 255, blue: 168 / 255) // #17C7A8 --c-success
    static let successWeak = Color(red: 226 / 255, green: 248 / 255, blue: 244 / 255) // #E2F8F4 --c-success-weak
    static let danger      = Color(red: 242 / 255, green: 85 / 255, blue: 95 / 255) // #F2555F --c-danger
    static let dangerWeak  = Color(red: 253 / 255, green: 235 / 255, blue: 236 / 255) // #FDEBEC --c-danger-weak
    static let warning     = Color(red: 1, green: 159 / 255, blue: 67 / 255) // #FF9F43 --c-warning
    static let warningWeak = Color(red: 1, green: 243 / 255, blue: 228 / 255) // #FFF3E4 --c-warning-weak
    // MARK: 中性（iOS 命名 ≙ 正典 neutral.*）
    static let ink         = Color(red: 24 / 255, green: 34 / 255, blue: 46 / 255) // #18222E --c-text
    static let sub         = Color(red: 66 / 255, green: 83 / 255, blue: 106 / 255) // #42536A --c-sub
    static let muted       = Color(red: 96 / 255, green: 117 / 255, blue: 141 / 255) // #60758D --c-mut
    static let placeholder = Color(red: 154 / 255, green: 168 / 255, blue: 182 / 255) // #9AA8B6 --c-ph
    static let line        = Color(red: 227 / 255, green: 234 / 255, blue: 243 / 255) // #E3EAF3 --c-line
    static let lineSoft    = Color(red: 237 / 255, green: 242 / 255, blue: 249 / 255) // #EDF2F9 --c-line-soft
    static let fill        = Color(red: 241 / 255, green: 245 / 255, blue: 251 / 255) // #F1F5FB --c-fill
    static let page        = Color(red: 248 / 255, green: 251 / 255, blue: 1) // #F8FBFF --c-bg
    // MARK: 圆角（--r-sm/md/lg）
    static let radiusSmall: CGFloat = 8
    static let radiusMedium: CGFloat = 12
    static let radiusLarge: CGFloat = 16
    // @generated:ios-tokens end
}

struct NativeCard: ViewModifier {
    var padding: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.white)
            .overlay(RoundedRectangle(cornerRadius: NativeDS.radiusLarge).stroke(NativeDS.line, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: NativeDS.radiusLarge))
    }
}

extension View {
    func nativeCard(padding: CGFloat = 16) -> some View {
        modifier(NativeCard(padding: padding))
    }

    @ViewBuilder
    func nativePageCover<Item: Identifiable, Content: View>(
        item: Binding<Item?>,
        @ViewBuilder content: @escaping (Item) -> Content
    ) -> some View {
        #if os(iOS)
        fullScreenCover(item: item, content: content)
        #else
        sheet(item: item, content: content)
        #endif
    }

    @ViewBuilder
    func nativeNavigationBarHidden() -> some View {
        #if os(iOS)
        navigationBarHidden(true)
        #else
        self
        #endif
    }
}
