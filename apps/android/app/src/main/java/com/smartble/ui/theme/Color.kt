package com.smartble.ui.theme

import androidx.compose.ui.graphics.Color

// ===== Smart BLE 设计系统正典 Token（docs/specs/07_design_system/TOKEN.md · 唯一数值来源）=====
// 语义名（c*）供新组件直接引用；下方旧命名（Primary/Success/...）映射同一批正典值，
// 存量 Material 组件经 colorScheme 全局变色，不产生圈外值。
val cPrimary = Color(0xFF1B6DFF)      // --c-primary 品牌蓝
val cPrimaryDeep = Color(0xFF0E4FC4)  // --c-primary-deep 渐变深端
val cPrimaryWeak = Color(0xFFE8F1FF)  // --c-primary-weak
val cSuccess = Color(0xFF17C7A8)      // --c-success
val cSuccessWeak = Color(0xFFE2F8F4)
val cWarning = Color(0xFFFF9F43)
val cWarningWeak = Color(0xFFFFF3E4)
val cDanger = Color(0xFFF2555F)       // --c-danger
val cDangerWeak = Color(0xFFFDEBEC)
val cText = Color(0xFF18222E)         // --c-text
val cSub = Color(0xFF42536A)          // --c-sub
val cMut = Color(0xFF60758D)          // --c-mut
val cPh = Color(0xFF9AA8B6)           // --c-ph
val cLine = Color(0xFFE3EAF3)         // --c-line
val cLineSoft = Color(0xFFEDF2F9)     // --c-line-soft
val cFill = Color(0xFFF1F5FB)         // --c-fill
val cBg = Color(0xFFF8FBFF)           // --c-bg 页面背景
val cCard = Color(0xFFFFFFFF)         // --c-card
// 控制台深色（LogPanel dock / bytebar）
val cInk = Color(0xFF101521)          // --c-ink
val cInkLine = Color(0xFF263149)      // --c-ink-line
val cInkText = Color(0xFFD6E2F5)      // --c-ink-text
// 强文本（weak 底上的深色字：success-strong #0E9A80 / warn-strong #C77E14 / note 文本）
val cSuccessStrong = Color(0xFF0E9A80)
val cWarnStrong = Color(0xFFC77E14)
val cNoteInfoText = Color(0xFF2E5290) // note.info 文本
val cNoteWarnText = Color(0xFF8A5410) // note.warn 文本
// 日志六色（浅色变体；dock 深色变体见 LogPanel）
val cLogSys = Color(0xFF5E7EA6); val cLogSysBg = Color(0xFFEDF3FA)
val cLogErr = Color(0xFFF2555F); val cLogErrBg = Color(0xFFFDEBEC)
val cLogRead = Color(0xFFC77E14); val cLogReadBg = Color(0xFFFFF6E8)
val cLogWrite = Color(0xFF1B6DFF); val cLogWriteBg = Color(0xFFE8F1FF)
val cLogRecv = Color(0xFF7C5CFF); val cLogRecvBg = Color(0xFFF0EBFF)
val cLogOk = Color(0xFF17C7A8); val cLogOkBg = Color(0xFFE2F8F4)
// 插画/头像渐变端点（components.css .dev .ava）
val cAvaGradEnd = Color(0xFFDCE9FF)

// Primary Colors（旧名 → 正典）
val Primary = cPrimary
val PrimaryDark = cPrimaryDeep
val PrimaryContainer = cPrimaryWeak

// Secondary（次要色并入品牌深蓝，弃 iOS 紫）
val Secondary = cPrimaryDeep
val SecondaryContainer = cPrimaryWeak

// Status Colors
val Success = cSuccess
val SuccessContainer = cSuccessWeak
val Warning = cWarning
val WarningContainer = cWarningWeak
val Error = cDanger
val ErrorContainer = cDangerWeak

// Neutral Colors
val Background = cBg
val Surface = cCard
val SurfaceVariant = cFill
val Border = cLine

// Text Colors
val TextPrimary = cText
val TextSecondary = cMut
val TextTertiary = cPh

// RSSI Colors（信号四档：success/success/warning/danger）
val RssiExcellent = cSuccess
val RssiGood = cSuccess
val RssiFair = cWarning
val RssiWeak = cDanger
