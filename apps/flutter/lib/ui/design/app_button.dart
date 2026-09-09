import 'package:flutter/material.dart';
import 'app_tokens.dart';
import 'app_icon.dart';

/// 正典按钮（COMPONENT_CONTRACT B1 · prototype components.css .btn）
///
/// tone: primary / danger / ghost / soft；size: md(高40) / sm(高32)；
/// dangerText: ghost/soft 的红字变体；loading: spinner + 禁用。
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.tone = AppButtonTone.primary,
    this.size = AppButtonSize.md,
    this.icon,
    this.loading = false,
    this.disabled = false,
    this.block = false,
    this.dangerText = false,
    this.onTap,
  });

  final String label;
  final AppButtonTone tone;
  final AppButtonSize size;
  final String? icon; // semantic icon id（ICON_CATALOG）
  final bool loading;
  final bool disabled;
  final bool block;
  final bool dangerText;
  final VoidCallback? onTap;

  bool get _disabled => disabled || loading;

  @override
  Widget build(BuildContext context) {
    final colors = _AppButtonColors.of(tone, dangerText, _disabled);
    final sm = size == AppButtonSize.sm;
    return AnimatedScale(
      scale: 1,
      duration: const Duration(milliseconds: AppTokens.durFast),
      child: Material(
        color: colors.background,
        borderRadius: BorderRadius.circular(sm ? AppTokens.rSm : AppTokens.rMd),
        child: InkWell(
          onTap: _disabled ? null : onTap,
          borderRadius: BorderRadius.circular(sm ? AppTokens.rSm : AppTokens.rMd),
          child: Opacity(
            opacity: _disabled ? 1 : 1,
            child: Container(
              height: sm ? 32.0 : 40.0,
              padding: EdgeInsets.symmetric(horizontal: sm ? 13.0 : 18.0),
              decoration: BoxDecoration(
                gradient: colors.gradient,
                borderRadius: BorderRadius.circular(sm ? AppTokens.rSm : AppTokens.rMd),
                border: colors.border,
                boxShadow: colors.shadow,
              ),
              child: Row(
                mainAxisSize: block ? MainAxisSize.max : MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (loading)
                    SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(colors.foreground),
                      ),
                    )
                  else if (icon != null)
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: AppIcon(icon!, size: sm ? 15.0 : 17.0, color: colors.foreground),
                    ),
                  Flexible(
                    child: Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: colors.foreground,
                        fontSize: sm ? AppTokens.fsBody : AppTokens.fsH2,
                        fontWeight: sm ? AppTokens.fsBodyW : AppTokens.fsH2W,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

enum AppButtonTone { primary, danger, ghost, soft }
enum AppButtonSize { md, sm }

class _AppButtonColors {
  const _AppButtonColors({
    required this.background,
    required this.foreground,
    this.gradient,
    this.border,
    this.shadow,
  });
  final Color background;
  final Color foreground;
  final Gradient? gradient;
  final BoxBorder? border;
  final List<BoxShadow>? shadow;

  static _AppButtonColors of(AppButtonTone tone, bool dangerText, bool disabled) {
    if (disabled) {
      return const _AppButtonColors(
        background: AppTokens.cFill,
        foreground: AppTokens.cPh,
      );
    }
    switch (tone) {
      case AppButtonTone.primary:
        return const _AppButtonColors(
          background: Colors.transparent,
          foreground: AppTokens.cCard,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppTokens.cPrimary, AppTokens.cPrimaryDeep],
          ),
          shadow: AppTokens.shadowPrimary,
        );
      case AppButtonTone.danger:
        return const _AppButtonColors(
          background: Colors.transparent,
          foreground: AppTokens.cCard,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppTokens.cDangerGradHi, AppTokens.cDanger],
          ),
          shadow: [BoxShadow(offset: Offset(0, 6), blurRadius: 16, color: Color.fromRGBO(242, 85, 95, 0.28))],
        );
      case AppButtonTone.ghost:
        return _AppButtonColors(
          background: Colors.transparent,
          foreground: dangerText ? AppTokens.cDanger : AppTokens.cPrimary,
          border: Border.all(
            color: dangerText ? AppTokens.cDanger : AppTokens.cPrimary,
            width: 1.5,
          ),
        );
      case AppButtonTone.soft:
        return _AppButtonColors(
          background: dangerText ? AppTokens.cDangerWeak : AppTokens.cFill,
          foreground: dangerText ? AppTokens.cDanger : AppTokens.cText,
          border: dangerText ? null : Border.all(color: AppTokens.cLine),
        );
    }
  }
}
