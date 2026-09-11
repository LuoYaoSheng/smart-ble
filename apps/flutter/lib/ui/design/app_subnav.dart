import 'package:flutter/material.dart';
import 'app_tokens.dart';
import 'app_icon.dart';

/// 正典二级页导航栏（COMPONENT_CONTRACT A2 · prototype pages.css .subnav）
///
/// 返回键（30×30 --c-fill 圆角方块 + chev-r rotate180）+ 标题（--fs-h1）+ 右槽 action。
class AppSubnav extends StatelessWidget implements PreferredSizeWidget {
  const AppSubnav({super.key, required this.title, this.action, this.onBack});

  final String title;
  final Widget? action;
  final VoidCallback? onBack;

  @override
  Size get preferredSize => const Size.fromHeight(52);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 8, 16, 10),
      decoration: const BoxDecoration(
        color: AppTokens.cCard,
        border: Border(bottom: BorderSide(color: AppTokens.cLineSoft)),
      ),
      child: Row(
        children: [
          _BackButton(onBack: onBack),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: AppTokens.fsH1,
                fontWeight: AppTokens.fsH1W,
                color: AppTokens.cText,
              ),
            ),
          ),
          if (action != null) action!,
        ],
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({this.onBack});

  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppTokens.cFill,
      borderRadius: BorderRadius.circular(9),
      child: InkWell(
        onTap: onBack ?? () => _defaultBack(context),
        borderRadius: BorderRadius.circular(9),
        child: const SizedBox(
          width: 30,
          height: 30,
          child: Center(
            child: AppIcon('chev-r', size: 17, color: AppTokens.cText, rotate: 180),
          ),
        ),
      ),
    );
  }

  void _defaultBack(BuildContext context) {
    final navigator = Navigator.of(context);
    if (navigator.canPop()) {
      navigator.pop();
    } else {
      navigator.popUntil((route) => route.isFirst);
    }
  }
}
