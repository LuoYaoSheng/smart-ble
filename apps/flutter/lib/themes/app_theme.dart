import 'package:flutter/material.dart';
import '../ui/design/app_tokens.dart'; // [SSOT] design-tokens.json 生成（UI-PARITY-G0）

/// 应用主题配置 —— 全部取值 AppTokens（docs/specs/07_design_system/TOKEN_REFERENCE.md）。
/// 2026-09-09 UI-PARITY-G0：旧 iOS 色双轨（#007AFF/#34C759/#F2F2F7）清除；
/// 正典无全局深色模式（TOKEN.md §9.4），darkTheme 复用正典值。
class AppTheme {
  /// 主色 - 蓝色
  static const Color primaryColor   = AppTokens.cPrimary;
  static const Color secondaryColor = AppTokens.cPrimaryWeak;
  static const Color successColor   = AppTokens.cSuccess;
  static const Color warningColor   = AppTokens.cWarning;
  static const Color errorColor     = AppTokens.cDanger;
  static const Color backgroundColor = AppTokens.cBg;
  static const Color cardColor      = AppTokens.cCard;
  static const Color textPrimary    = AppTokens.cText;
  static const Color textSecondary  = AppTokens.cSub;
  static const Color borderColor    = AppTokens.cLine;

  // ── Light Theme ────────────────────────────────────────────────────────────
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: primaryColor,
      colorScheme: const ColorScheme.light(
        primary: primaryColor,
        secondary: secondaryColor,
        error: errorColor,
        surface: cardColor,
      ),
      scaffoldBackgroundColor: backgroundColor,
      appBarTheme: const AppBarTheme(
        backgroundColor: cardColor,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: AppTokens.fsH1,
          fontWeight: AppTokens.fsH1W,
        ),
      ),
      cardTheme: CardThemeData(
        color: cardColor,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppTokens.rLg),
          side: const BorderSide(color: borderColor, width: 0.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: AppTokens.cCard,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.rMd),
          ),
          textStyle: const TextStyle(
            fontSize: AppTokens.fsH2,
            fontWeight: AppTokens.fsH2W,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryColor,
          side: const BorderSide(color: primaryColor, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTokens.rMd),
          ),
          textStyle: const TextStyle(
            fontSize: AppTokens.fsH2,
            fontWeight: AppTokens.fsH2W,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primaryColor,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          textStyle: const TextStyle(
            fontSize: AppTokens.fsCap,
            fontWeight: AppTokens.fsCapW,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppTokens.cFill,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.rSm),
          borderSide: const BorderSide(color: AppTokens.cLine),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.rSm),
          borderSide: const BorderSide(color: AppTokens.cLine),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.rSm),
          borderSide: const BorderSide(color: primaryColor, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppTokens.rSm),
          borderSide: const BorderSide(color: errorColor),
        ),
      ),
      listTileTheme: const ListTileThemeData(
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      ),
      dividerTheme: const DividerThemeData(
        color: AppTokens.cLineSoft,
        thickness: 0.5,
        space: 1,
      ),
    );
  }

  // ── Dark Theme ─────────────────────────────────────────────────────────────
  // 正典无全局深色模式（TOKEN.md §9.4）：dark 请求回落正典（= light）值。
  static ThemeData get darkTheme => lightTheme.copyWith(
        brightness: Brightness.dark,
        colorScheme: lightTheme.colorScheme.copyWith(
          brightness: Brightness.dark,
          surface: cardColor,
        ),
      );
}

/// 常用样式工具类 —— 取值全部对齐正典 Token。
class AppStyles {
  /// 卡片阴影（--shadow-1）
  static const List<BoxShadow> cardShadow = AppTokens.shadow1;

  /// 主按钮渐变（--c-primary → --c-primary-deep）
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppTokens.cPrimary, AppTokens.cPrimaryDeep],
  );

  /// 连接状态颜色
  static Color getConnectionColor(bool connected) {
    return connected ? AppTokens.cSuccess : AppTokens.cSub;
  }

  /// 信号强度颜色（P001 信号条分档：≥-60 四格 / ≥-70 三 / ≥-80 二 / 其余一）
  static Color getRssiColor(int rssi) {
    if (rssi >= -70) return AppTokens.cSuccess;
    if (rssi >= -80) return AppTokens.cWarning;
    return AppTokens.cDanger;
  }

  /// 信号强度档位（DeviceCard 信号条共用分档）
  static int getRssiLevel(int rssi) {
    if (rssi >= -60) return 4;
    if (rssi >= -70) return 3;
    if (rssi >= -80) return 2;
    return 1;
  }

  /// 信号强度描述
  static String getRssiLabel(int rssi) {
    final level = getRssiLevel(rssi);
    return const ['较弱', '较弱', '一般', '较好', '强'][level];
  }
}
