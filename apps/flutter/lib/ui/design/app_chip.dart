import 'package:flutter/material.dart';
import 'app_tokens.dart';

/// 正典标签（COMPONENT_CONTRACT B2 · prototype components.css .chip）
///
/// tone: neutral / primary / success / danger / warning / mono
class AppChip extends StatelessWidget {
  const AppChip(this.text, {super.key, this.tone = AppChipTone.neutral});

  final String text;
  final AppChipTone tone;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, mono) = switch (tone) {
      AppChipTone.neutral => (AppTokens.cFill, AppTokens.cSub, false),
      AppChipTone.primary => (AppTokens.cPrimaryWeak, AppTokens.cPrimary, false),
      AppChipTone.success => (AppTokens.cSuccessWeak, AppTokens.cSuccessDeep, false),
      AppChipTone.danger => (AppTokens.cDangerWeak, AppTokens.cDanger, false),
      AppChipTone.warning => (AppTokens.cWarningWeak, AppTokens.cWarningDeep, false),
      AppChipTone.mono => (AppTokens.cFill, AppTokens.cSub, true),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppTokens.rRound),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: fg,
          fontSize: mono ? AppTokens.fsMicro : AppTokens.fsMini,
          fontWeight: AppTokens.fsMiniW,
          fontFamily: mono ? AppTokens.fontMono : null,
          height: 1.7,
        ),
      ),
    );
  }
}

enum AppChipTone { neutral, primary, success, danger, warning, mono }
