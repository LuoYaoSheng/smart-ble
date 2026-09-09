//
// DSTokens.swift — 设计令牌（唯一数值来源 = docs/specs/prototype/v1-new/assets/tokens.css）
// 对齐声明：颜色/字号/间距/圆角逐一映射 tokens.css，不产生圈外值（07_design_system/TOKEN.md）。
//

import AppKit

enum DS {
    // MARK: 品牌与语义
    static let primary      = #colorLiteral(red: 0x1B/255, green: 0x6D/255, blue: 0xFF/255, alpha: 1) // --c-primary
    static let primaryDeep  = #colorLiteral(red: 0x0E/255, green: 0x4F/255, blue: 0xC4/255, alpha: 1) // --c-primary-deep
    static let primaryWeak  = #colorLiteral(red: 0xE8/255, green: 0xF1/255, blue: 0xFF/255, alpha: 1) // --c-primary-weak
    static let success      = #colorLiteral(red: 0x17/255, green: 0xC7/255, blue: 0xA8/255, alpha: 1) // --c-success
    static let successDeep  = #colorLiteral(red: 0x0E/255, green: 0x9A/255, blue: 0x80/255, alpha: 1)
    static let successWeak  = #colorLiteral(red: 0xE2/255, green: 0xF8/255, blue: 0xF4/255, alpha: 1) // --c-success-weak
    static let danger       = #colorLiteral(red: 0xF2/255, green: 0x55/255, blue: 0x5F/255, alpha: 1) // --c-danger
    static let dangerWeak   = #colorLiteral(red: 0xFD/255, green: 0xEB/255, blue: 0xEC/255, alpha: 1) // --c-danger-weak
    static let warning      = #colorLiteral(red: 0xFF/255, green: 0x9F/255, blue: 0x43/255, alpha: 1) // --c-warning
    static let warningDeep  = #colorLiteral(red: 0xC7/255, green: 0x7E/255, blue: 0x14/255, alpha: 1)
    static let warningWeak  = #colorLiteral(red: 0xFF/255, green: 0xF3/255, blue: 0xE4/255, alpha: 1) // --c-warning-weak

    // MARK: 中性
    static let text   = #colorLiteral(red: 0x18/255, green: 0x22/255, blue: 0x2E/255, alpha: 1) // --c-text
    static let sub    = #colorLiteral(red: 0x42/255, green: 0x53/255, blue: 0x6A/255, alpha: 1) // --c-sub
    static let mut    = #colorLiteral(red: 0x60/255, green: 0x75/255, blue: 0x8D/255, alpha: 1) // --c-mut
    static let ph     = #colorLiteral(red: 0x9A/255, green: 0xA8/255, blue: 0xB6/255, alpha: 1) // --c-ph
    static let line   = #colorLiteral(red: 0xE3/255, green: 0xEA/255, blue: 0xF3/255, alpha: 1) // --c-line
    static let lineSoft = #colorLiteral(red: 0xED/255, green: 0xF2/255, blue: 0xF9/255, alpha: 1) // --c-line-soft
    static let fill   = #colorLiteral(red: 0xF1/255, green: 0xF5/255, blue: 0xFB/255, alpha: 1) // --c-fill
    static let bg     = #colorLiteral(red: 0xF8/255, green: 0xFB/255, blue: 0xFF/255, alpha: 1) // --c-bg
    static let card   = NSColor.white

    // MARK: 控制台深色（ad-sec / bytebar / 评审深色块）
    static let ink     = #colorLiteral(red: 0x10/255, green: 0x15/255, blue: 0x21/255, alpha: 1) // --c-ink
    static let inkLine = #colorLiteral(red: 0x26/255, green: 0x31/255, blue: 0x49/255, alpha: 1) // --c-ink-line
    static let inkText = #colorLiteral(red: 0xD6/255, green: 0xE2/255, blue: 0xF5/255, alpha: 1) // --c-ink-text
    static let inkMut  = #colorLiteral(red: 0x8F/255, green: 0xA3/255, blue: 0xC0/255, alpha: 1)

    // MARK: 日志六色
    static let logSys     = #colorLiteral(red: 0x5E/255, green: 0x7E/255, blue: 0xA6/255, alpha: 1)
    static let logSysBg   = #colorLiteral(red: 0xED/255, green: 0xF3/255, blue: 0xFA/255, alpha: 1)
    static let logErr     = danger
    static let logErrBg   = dangerWeak
    static let logRead    = warningDeep
    static let logReadBg  = #colorLiteral(red: 0xFF/255, green: 0xF6/255, blue: 0xE8/255, alpha: 1)
    static let logWrite   = primary
    static let logWriteBg = primaryWeak
    static let logRecv    = #colorLiteral(red: 0x7C/255, green: 0x5C/255, blue: 0xFF/255, alpha: 1)
    static let logRecvBg  = #colorLiteral(red: 0xF0/255, green: 0xEB/255, blue: 0xFF/255, alpha: 1)
    static let logOk      = success
    static let logOkBg    = successWeak

    // MARK: 字号/字重（tokens --fs-*)
    static func font(_ size: CGFloat, _ weight: NSFont.Weight = .regular) -> NSFont {
        NSFont.systemFont(ofSize: size, weight: weight)
    }
    static let monoFont = NSFont.monospacedSystemFont(ofSize: 11, weight: .regular)
    static func mono(_ size: CGFloat) -> NSFont {
        NSFont.monospacedSystemFont(ofSize: size, weight: .regular)
    }

    // MARK: 间距（4 基准 --sp-1..8）
    static let sp1: CGFloat = 4, sp2: CGFloat = 8, sp3: CGFloat = 12, sp4: CGFloat = 16
    static let sp5: CGFloat = 20, sp6: CGFloat = 24, sp7: CGFloat = 28, sp8: CGFloat = 32

    // MARK: 圆角（--r-*）
    static let rSm: CGFloat = 8, rMd: CGFloat = 12, rLg: CGFloat = 16, rXl: CGFloat = 20

    // MARK: 探针构建元数据（P009/P010 投影；对应 spike 分支与运行轮次）
    static let probeChannel = "preview"
    static let probeVersion = "1.0.5-preview"
    static let probeBranch  = "refactor/uniapp-v1"
}
