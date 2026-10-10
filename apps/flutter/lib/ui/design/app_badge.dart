import 'package:flutter/material.dart';
import 'app_tokens.dart';

/// 正典状态徽章（COMPONENT_CONTRACT B3 · prototype components.css .badge）
///
/// tone: dim / on / err / warn；dot=true 显示状态点（on 态点发光）。
class AppBadge extends StatelessWidget {
  const AppBadge(this.text, {super.key, this.tone = AppBadgeTone.dim, this.dot = true});

  final String text;
  final AppBadgeTone tone;
  final bool dot;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, dotColor, dotGlow) = switch (tone) {
      AppBadgeTone.dim => (AppTokens.cFill, AppTokens.cSub, AppTokens.cPh, false),
      AppBadgeTone.on => (AppTokens.cSuccessWeak, AppTokens.cSuccessDeep, AppTokens.cSuccess, true),
      AppBadgeTone.err => (AppTokens.cDangerWeak, AppTokens.cDanger, AppTokens.cDanger, false),
      AppBadgeTone.warn => (AppTokens.cWarningWeak, AppTokens.cWarningDeep, AppTokens.cWarning, false),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(AppTokens.rRound),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot) ...[
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
                boxShadow: dotGlow
                    ? const [BoxShadow(color: Color.fromRGBO(23, 199, 168, 0.6), blurRadius: 6)]
                    : null,
              ),
            ),
            const SizedBox(width: 5),
          ],
          Text(
            text,
            style: TextStyle(color: fg, fontSize: AppTokens.fsMini, fontWeight: AppTokens.fwBold),
          ),
        ],
      ),
    );
  }
}

enum AppBadgeTone { dim, on, err, warn }
