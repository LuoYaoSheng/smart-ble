import 'package:flutter/material.dart';
import 'app_tokens.dart';
import 'app_icon.dart';

/// 正典状态图标（COMPONENT_CONTRACT B7 · 原型 C.stIcon 五态）
///
/// ok→check/successDeep · warn→warn/warningDeep · fail→x/danger ·
/// active→primary 脉冲点 · pending→空心 dashed 点。
/// （active/pending 不使用字符，以样式点表达 —— UI-PARITY-G0 整改项）
class AppStatusIcon extends StatefulWidget {
  const AppStatusIcon({super.key, required this.state, this.size = 24});

  final AppStatusIconState state;
  final double size;

  @override
  State<AppStatusIcon> createState() => _AppStatusIconState();
}

enum AppStatusIconState { ok, warn, fail, active, pending }

class _AppStatusIconState extends State<AppStatusIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse =
      AnimationController(vsync: this, duration: const Duration(seconds: 1))..repeat();

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.size;
    switch (widget.state) {
      case AppStatusIconState.ok:
        return _wrap(AppTokens.cSuccessWeak,
            AppIcon('check', size: s * 0.55, color: AppTokens.cSuccessDeep));
      case AppStatusIconState.warn:
        return _wrap(AppTokens.cWarningWeak,
            AppIcon('warn', size: s * 0.55, color: AppTokens.cWarningDeep));
      case AppStatusIconState.fail:
        return _wrap(
            AppTokens.cDangerWeak, AppIcon('x', size: s * 0.55, color: AppTokens.cDanger));
      case AppStatusIconState.active:
        return _wrap(
          AppTokens.cPrimaryWeak,
          FadeTransition(
            opacity: Tween(begin: 1.0, end: 0.25).animate(_pulse),
            child: Container(
              width: s * 0.33,
              height: s * 0.33,
              decoration: const BoxDecoration(
                color: AppTokens.cPrimary,
                shape: BoxShape.circle,
              ),
            ),
          ),
        );
      case AppStatusIconState.pending:
        return Container(
          width: s,
          height: s,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppTokens.cLine, width: 1.5),
          ),
        );
    }
  }

  Widget _wrap(Color bg, Widget child) {
    return Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
      alignment: Alignment.center,
      child: child,
    );
  }
}
