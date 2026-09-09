import 'package:flutter/material.dart';
import 'app_tokens.dart';
import 'app_ill.dart';
import 'app_button.dart';

/// 正典空态（COMPONENT_CONTRACT B6 · 原型 C.empty）
///
/// ill: radar(扫描空)/link(无连接)/doc(无记录)/box(容器空)。
/// P001 双空态：未扫描(radar+action) / 筛选无匹配(link 无 action)。
class AppEmpty extends StatelessWidget {
  const AppEmpty({
    super.key,
    this.ill = 'box',
    required this.title,
    this.description,
    this.actionLabel,
    this.actionIcon,
    this.onAction,
  });

  final String ill;
  final String title;
  final String? description;
  final String? actionLabel;
  final String? actionIcon;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 38),
      child: Column(
        children: [
          AppIll(ill, width: 118),
          const SizedBox(height: AppTokens.sp4),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: AppTokens.fsH1,
              fontWeight: AppTokens.fsH1W,
              color: AppTokens.cText,
            ),
          ),
          if (description != null) ...[
            const SizedBox(height: 6),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 250),
              child: Text(
                description!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: AppTokens.fsBody,
                  color: AppTokens.cMut,
                  height: 1.6,
                ),
              ),
            ),
          ],
          if (actionLabel != null) ...[
            const SizedBox(height: AppTokens.sp4),
            AppButton(
              label: actionLabel!,
              tone: AppButtonTone.soft,
              icon: actionIcon,
              onTap: onAction,
            ),
          ],
        ],
      ),
    );
  }
}
