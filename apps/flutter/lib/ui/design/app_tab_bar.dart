import 'package:flutter/material.dart';
import 'app_tokens.dart';
import 'app_icon.dart';

/// 正典 TabBar（COMPONENT_CONTRACT A3 · prototype.css .tabbar）
///
/// 自绘正典底栏（非 Material BottomNavigationBar——其默认 56px 高与
/// Material 内边距不合正典）：border-box 64px 高含 1px 顶线、四枚
/// `flex:1` 等宽、图标 23px + 文字 10px、纯色彩选中态（无下划线）。
/// 仅 switchTab 语义；角标口径 = 通用连接 + SHID 会话在线（PRD）。
class AppTabBar extends StatelessWidget {
  const AppTabBar({
    super.key,
    required this.activeKey,
    required this.onSwitch,
    this.connectedBadge = 0,
  });

  final String activeKey;
  final ValueChanged<String> onSwitch;
  final int connectedBadge;

  static const List<(_Tab, String)> tabs = [
    (_Tab('scan', '扫描', 'scan'), 'scan'),
    (_Tab('connected', '已连接', 'link'), 'link'),
    (_Tab('cast', '广播', 'cast'), 'cast'),
    (_Tab('info', '关于', 'info'), 'info'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      // 正典 .tabbar：rgba(255,255,255,.96) 底 + blur 顶线（桌面实底取不透明近似）
      decoration: const BoxDecoration(
        color: Color(0xF5FFFFFF),
        border: Border(top: BorderSide(color: AppTokens.cLineSoft, width: 1)),
      ),
      height: 64, // border-box：含 1px 顶线
      padding: const EdgeInsets.fromLTRB(8, 4, 8, 16),
      child: Row(
        children: [
          for (final (tab, _) in tabs)
            Expanded( // 正典 .tb flex:1 等宽
              child: _TabButton(
                tab: tab,
                active: tab.key == activeKey,
                badge: tab.key == 'connected' ? connectedBadge : 0,
                onTap: () => onSwitch(tab.key),
              ),
            ),
        ],
      ),
    );
  }
}

class _Tab {
  const _Tab(this.key, this.label, this.icon);
  final String key;
  final String label;
  final String icon;
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.tab,
    required this.active,
    required this.badge,
    required this.onTap,
  });

  final _Tab tab;
  final bool active;
  final int badge;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    // 正典 .tb：color 态级联（图标 currentColor + span 同色）
    final color = active ? AppTokens.cPrimary : AppTokens.cMut;
    return GestureDetector(
      behavior: HitTestBehavior.opaque, // flex:1 全格可点
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          _TabIcon(icon: tab.icon, color: color, badge: badge),
          const SizedBox(height: 3), // 正典 gap:3px
          Text(
            tab.label,
            style: TextStyle(
              fontSize: 10, // 正典 .tb span
              fontWeight: active ? AppTokens.fwBold : AppTokens.fwMed,
              color: color,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}

class _TabIcon extends StatelessWidget {
  const _TabIcon({required this.icon, required this.color, this.badge = 0});

  final String icon;
  final Color color;
  final int badge;

  @override
  Widget build(BuildContext context) {
    // AppIcon 不消费 IconTheme，选中/未选中色显式烘焙（PARITY-ICON 约定）
    return Stack(
      clipBehavior: Clip.none,
      children: [
        AppIcon(icon, size: 23, color: color), // 正典 .tb .ic 23px
        if (badge > 0)
          Positioned(
            // 正典 .n：top:2px / right:calc(50% - 21px) ≈ 图标右上 -2/-10
            top: -2,
            right: -10,
            child: Container(
              constraints: const BoxConstraints(minWidth: 16),
              height: 16,
              padding: const EdgeInsets.symmetric(horizontal: 4),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppTokens.cDanger,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                badge > 99 ? '99+' : '$badge',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 9,
                  fontWeight: AppTokens.fwBold,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
