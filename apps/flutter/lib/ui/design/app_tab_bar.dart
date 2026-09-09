import 'package:flutter/material.dart';
import 'app_tokens.dart';
import 'app_icon.dart';

/// 正典 TabBar（COMPONENT_CONTRACT A3 · prototype pages.css .tabbar）
///
/// F-AND 实现：BottomNavigationBar 封装（AppIcon 字形）。
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
    final activeIndex =
        tabs.indexWhere((t) => t.$1.key == activeKey).clamp(0, tabs.length - 1);
    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      currentIndex: activeIndex,
      onTap: (i) => onSwitch(tabs[i].$1.key),
      selectedItemColor: AppTokens.cPrimary,
      unselectedItemColor: AppTokens.cMut,
      selectedFontSize: 10,
      unselectedFontSize: 10,
      items: [
        for (final (tab, _) in tabs)
          BottomNavigationBarItem(
            icon: _TabIcon(
              icon: tab.icon,
              active: tab.key == activeKey,
              badge: tab.key == 'connected' ? connectedBadge : 0,
            ),
            label: tab.label,
          ),
      ],
    );
  }
}

class _Tab {
  const _Tab(this.key, this.label, this.icon);
  final String key;
  final String label;
  final String icon;
}

class _TabIcon extends StatelessWidget {
  const _TabIcon({required this.icon, required this.active, this.badge = 0});

  final String icon;
  final bool active;
  final int badge;

  @override
  Widget build(BuildContext context) {
    // AppIcon 不消费 IconTheme，选中/未选中色显式烘焙（PARITY-ICON 约定）
    return Stack(
      clipBehavior: Clip.none,
      children: [
        AppIcon(icon, size: 23, color: active ? AppTokens.cPrimary : AppTokens.cMut),
        if (badge > 0)
          Positioned(
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
                  color: AppTokens.cCard,
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
