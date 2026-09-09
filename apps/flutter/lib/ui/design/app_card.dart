import 'package:flutter/material.dart';
import 'app_tokens.dart';

/// 正典卡片容器（COMPONENT_CONTRACT · prototype components.css .card）
class AppCard extends StatelessWidget {
  const AppCard({super.key, this.title, this.desc, this.padding, this.child});

  final String? title;
  final String? desc;
  final EdgeInsets? padding;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: AppTokens.sp3),
      padding: padding ?? const EdgeInsets.all(AppTokens.sp4),
      decoration: BoxDecoration(
        color: AppTokens.cCard,
        borderRadius: BorderRadius.circular(AppTokens.rLg),
        border: Border.all(color: AppTokens.cLine),
        boxShadow: AppTokens.shadow1,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null)
            Text(
              title!,
              style: const TextStyle(
                fontSize: AppTokens.fsH1,
                fontWeight: AppTokens.fsH1W,
                color: AppTokens.cText,
              ),
            ),
          if (desc != null) ...[
            const SizedBox(height: 4),
            Text(
              desc!,
              style: const TextStyle(
                fontSize: AppTokens.fsCap,
                color: AppTokens.cMut,
                height: 1.5,
              ),
            ),
          ],
          if (child != null) child!,
        ],
      ),
    );
  }
}
