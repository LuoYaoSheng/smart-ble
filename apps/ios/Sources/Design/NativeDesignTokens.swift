import SwiftUI

enum NativeDS {
    static let primary = Color(red: 27 / 255, green: 109 / 255, blue: 1)
    static let primaryWeak = Color(red: 232 / 255, green: 241 / 255, blue: 1)
    static let success = Color(red: 23 / 255, green: 199 / 255, blue: 168 / 255)
    static let successWeak = Color(red: 226 / 255, green: 248 / 255, blue: 244 / 255)
    static let danger = Color(red: 242 / 255, green: 85 / 255, blue: 95 / 255)
    static let dangerWeak = Color(red: 1, green: 238 / 255, blue: 240 / 255)
    static let warning = Color(red: 1, green: 159 / 255, blue: 67 / 255)
    static let ink = Color(red: 24 / 255, green: 34 / 255, blue: 46 / 255)
    static let sub = Color(red: 66 / 255, green: 83 / 255, blue: 106 / 255)
    static let muted = Color(red: 96 / 255, green: 117 / 255, blue: 141 / 255)
    static let line = Color(red: 227 / 255, green: 234 / 255, blue: 243 / 255)
    static let fill = Color(red: 241 / 255, green: 245 / 255, blue: 251 / 255)
    static let page = Color(red: 248 / 255, green: 251 / 255, blue: 1)
}

struct NativeCard: ViewModifier {
    var padding: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.white)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(NativeDS.line, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 14))
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
}
