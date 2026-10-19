import 'package:flutter/material.dart';
import 'app_tokens.dart';

/// 正典键值行 kv（COMPONENT_CONTRACT A4 · prototype components.css .kv）
///
/// 缺失值显示「—」不隐藏行（PAGE003 规则）。
class AppListRow extends StatelessWidget {
  const AppListRow({super.key, required this.label, this.value, this.mono = false});

  final String label;
  final Object? value;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    final empty = value == null || value.toString().isEmpty;
    final text = empty ? '—' : value.toString();
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppTokens.cLineSoft)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: AppTokens.fsCap,
                color: AppTokens.cMut,
                fontWeight: AppTokens.fsCapW,
              ),
            ),
          ),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: AppTokens.fsBody,
                color: empty ? AppTokens.cPh : AppTokens.cText,
                fontFamily: mono ? AppTokens.fontMono : null,
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
