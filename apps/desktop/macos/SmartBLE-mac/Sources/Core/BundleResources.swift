import Foundation

#if !SWIFT_PACKAGE
// Xcode embeds the same illustrations directly in the application resources.
extension Bundle {
    static var module: Bundle { .main }
}
#endif
