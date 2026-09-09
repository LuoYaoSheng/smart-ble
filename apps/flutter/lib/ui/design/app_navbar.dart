import 'package:flutter/material.dart';
import 'app_tokens.dart';

/// 正典 tab 页自绘导航栏（COMPONENT_CONTRACT A1 · prototype pages.css .navbar）
///
/// kicker（--fs-micro 品牌蓝 +2px 字距）+ 标题（--fs-title w800）+ 右侧蓝牙状态 chip。
/// [statusTone]: on=就绪(success 点微光) / off=未开启(danger 点) / null=平台不支持(ph 点)。
/// [status]: 自定义右区（P007 会话 chip / P008 平台 chip + badge / P009 版本 chip），提供时覆盖默认点+词。
class AppNavbar extends StatelessWidget {
  const AppNavbar({
    super.key,
    this.kicker = 'BLE TOOLKIT+',
    required this.title,
    this.statusText = '',
    this.statusTone,
    this.status,
  });

  final String kicker;
  final String title;
  final String statusText;
  final BtStatusTone? statusTone;
  final Widget? status;

  @override
  Widget build(BuildContext context) {
    final dotColor = switch (statusTone) {
      BtStatusTone.on => AppTokens.cSuccess,
      BtStatusTone.off => AppTokens.cDanger,
      null => AppTokens.cPh,
    };
    return Container(
      padding: const EdgeInsets.fromLTRB(2, 8, 2, 12),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppTokens.cCard, AppTokens.cBg],
        ),
        border: Border(bottom: BorderSide(color: AppTokens.cLineSoft)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            kicker,
            style: const TextStyle(
              fontSize: AppTokens.fsMicro,
              letterSpacing: 2,
              color: AppTokens.cPrimary,
              fontWeight: AppTokens.fsMicroW,
            ),
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: AppTokens.fsTitle,
                    fontWeight: AppTokens.fsTitleW,
                    color: AppTokens.cText,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              if (status != null)
                status!
              else ...[
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                    boxShadow: statusTone == BtStatusTone.on
                        ? const [BoxShadow(color: Color.fromRGBO(23, 199, 168, 0.55), blurRadius: 8)]
                        : null,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  statusText,
                  style: const TextStyle(
                    fontSize: AppTokens.fsMini,
                    color: AppTokens.cMut,
                    fontWeight: AppTokens.fsMiniW,
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

enum BtStatusTone { on, off }
